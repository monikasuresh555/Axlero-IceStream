package com.icestream.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.RichFlatMapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.Serializable;

/**
 * IceStream Stateful Stream Processor Pipeline.
 * Consumes events from Kafka, evaluates row-level null tax_amount anomalies, and triggers
 * a stream circuit-breaker side-output to DLQ if the error rate exceeds 2% in a rolling stateful window.
 */
public class IceStreamPipeline {
    private static final Logger LOG = LoggerFactory.getLogger(IceStreamPipeline.class);
    
    // Side Output Tag for the Dead Letter Queue (DLQ)
    public static final OutputTag<String> DLQ_TAG = new OutputTag<String>("ecommerce_events_dlq", TypeInformation.of(String.class));

    public static void main(String[] args) throws Exception {
        LOG.info("Initializing IceStream Real-time Lakehouse Observability Pipeline...");

        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Setup checkpointing to ensure exactly-once guarantees for Kafka/Iceberg commits
        env.enableCheckpointing(10000); // 10s checkpoints
        env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);

        String kafkaBroker = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092");
        String topic = System.getenv().getOrDefault("KAFKA_TOPIC", "checkout_events");

        LOG.info("Connecting to Kafka broker: {} | Consuming from topic: {}", kafkaBroker, topic);

        // Define Kafka Source
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(kafkaBroker)
                .setTopics(topic)
                .setGroupId("icestream-flink-processor")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        // Raw input stream
        DataStream<String> kafkaStream = env.fromSource(source, WatermarkStrategy.noWatermarks(), "KafkaCheckoutEvents");

        // Apply Stateful Circuit Breaker Routing
        // Keying by a constant string to route all events to a single stateful tracker (global statistics)
        SingleOutputStreamOperator<String> processedStream = kafkaStream
                .keyBy(value -> "global_tracker")
                .flatMap(new StreamingCircuitBreaker(0.02, 50)); // 2% threshold, 50 minimum records before trigger

        // Split streams
        DataStream<String> mainStream = processedStream; // Standard route
        DataStream<String> dlqStream = processedStream.getSideOutput(DLQ_TAG); // Anomaly diverted route

        // =========================================================================
        // ICEBERG SINKS (Simulated logical setup)
        // In full execution, Apache Iceberg's FlinkSink connects to Catalog REST API
        // =========================================================================
        mainStream.flatMap((String value, Collector<String> out) -> {
            LOG.info("Writing transactional payload to Apache Iceberg: [ecommerce_events] -> {}", value);
            out.collect(value);
        }).returns(TypeInformation.of(String.class)).name("IcebergMainTableSink");

        dlqStream.flatMap((String value, Collector<String> out) -> {
            LOG.warn("CIRCUIT BREAKER ENGAGED: Diverting anomaly payload to Iceberg DLQ: [ecommerce_events_dlq] -> {}", value);
            out.collect(value);
        }).returns(TypeInformation.of(String.class)).name("IcebergDLQTableSink");

        env.execute("IceStream-Realtime-Lakehouse-Pipeline");
    }

    /**
     * Stateful evaluator measuring data quality issues (null values)
     * and dynamically splitting the stream based on a threshold limit.
     */
    public static class StreamingCircuitBreaker extends RichFlatMapFunction<String, String> {
        private final double maxErrorPercentage;
        private final long minRecordsForTrigger;
        
        private transient ValueState<Long> countState;
        private transient ValueState<Long> nullTaxCountState;
        private transient ObjectMapper mapper;

        public StreamingCircuitBreaker(double maxErrorPercentage, long minRecordsForTrigger) {
            this.maxErrorPercentage = maxErrorPercentage;
            this.minRecordsForTrigger = minRecordsForTrigger;
        }

        @Override
        public void open(Configuration parameters) {
            countState = getRuntimeContext().getState(new ValueStateDescriptor<>("record-count", Long.class, 0L));
            nullTaxCountState = getRuntimeContext().getState(new ValueStateDescriptor<>("null-tax-count", Long.class, 0L));
            mapper = new ObjectMapper();
        }

        @Override
        public void flatMap(String value, Collector<String> out) throws Exception {
            long totalCount = countState.value() + 1;
            long nullCount = nullTaxCountState.value();
            
            boolean isNullTax = false;
            try {
                JsonNode root = mapper.readTree(value);
                if (root.has("tax_amount") && root.get("tax_amount").isNull()) {
                    isNullTax = true;
                }
            } catch (Exception e) {
                isNullTax = true; // Count malformed logs as failures
            }

            if (isNullTax) {
                nullCount++;
            }

            // Update state
            countState.update(totalCount);
            nullTaxCountState.update(nullCount);

            double errorRate = (double) nullCount / totalCount;

            // Log status
            if (totalCount % 10 == 0) {
                LOG.info("Pipeline telemetry check: Processed: {} | Null Tax Values: {} | Error Rate: {}% | Threshold: {}%", 
                        totalCount, nullCount, String.format("%.2f", errorRate * 100), maxErrorPercentage * 100);
            }

            // Circuit Breaker Logic
            if (totalCount >= minRecordsForTrigger && errorRate > maxErrorPercentage) {
                // Divert to Dead Letter Queue (DLQ) via side output
                LOG.warn("CRITICAL: Error rate {:.2f}% exceeds threshold of {:.2f}%! Routing event to DLQ side output.", 
                        errorRate * 100, maxErrorPercentage * 100);
                
                // Add validation error flags dynamically to the payload before sending
                String decoratedAnomaly = decorateWithAnomalyInfo(value, "NULL_TAX_RATE_EXCEEDED", errorRate);
                getRuntimeContext().output(DLQ_TAG, decoratedAnomaly);
            } else {
                // Route to primary tables
                out.collect(value);
            }
        }

        private String decorateWithAnomalyInfo(String rawJson, String errorCode, double currentRate) {
            try {
                JsonNode node = mapper.readTree(rawJson);
                com.fasterxml.jackson.databind.node.ObjectNode objectNode = (com.fasterxml.jackson.databind.node.ObjectNode) node;
                objectNode.put("anomaly_status", "DIVERTED");
                objectNode.put("anomaly_reason", errorCode);
                objectNode.put("current_error_rate", currentRate);
                return mapper.writeValueAsString(objectNode);
            } catch (Exception e) {
                return rawJson;
            }
        }
    }
}
