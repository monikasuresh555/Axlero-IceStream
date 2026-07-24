package com.icestream.pipeline;


import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;

import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;

import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;

import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;

import com.icestream.pipeline.process.StreamingCircuitBreaker;
import com.icestream.pipeline.process.IceStreamPipelineDLQ;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;



public class IceStreamPipeline {


    private static final Logger LOG =
            LoggerFactory.getLogger(
                    IceStreamPipeline.class
            );



    public static void main(String[] args)
            throws Exception {



        LOG.info(
                "Starting IceStream Real Time Lakehouse Pipeline"
        );



        final StreamExecutionEnvironment env =
                StreamExecutionEnvironment.getExecutionEnvironment();




        /*
         * Checkpointing
         * Required for Iceberg exactly once processing
         */

        env.enableCheckpointing(10000);




        String kafkaBroker =
                System.getenv()
                .getOrDefault(
                        "KAFKA_BOOTSTRAP_SERVERS",
                        "localhost:29092"
                );



        String topic =
                System.getenv()
                .getOrDefault(
                        "KAFKA_TOPIC",
                        "checkout_events"
                );





        KafkaSource<String> source =
                KafkaSource.<String>builder()

                .setBootstrapServers(kafkaBroker)

                .setTopics(topic)

                .setGroupId(
                        "icestream-flink-consumer"
                )

                .setStartingOffsets(
                        OffsetsInitializer.latest()
                )

                .setValueOnlyDeserializer(
                        new SimpleStringSchema()
                )

                .build();






        DataStream<String> inputStream =
                env.fromSource(
                        source,
                        WatermarkStrategy.noWatermarks(),
                        "Kafka Checkout Stream"
                );







        /*
         * Flink Data Quality + Circuit Breaker
         */

        SingleOutputStreamOperator<String> processedStream =
                inputStream

                .process(
                        new StreamingCircuitBreaker(
                                0.02,
                                50
                        )
                );








        /*
         * Main valid data stream
         *
         * Future:
         * This goes to Iceberg ecommerce_events table
         */

        DataStream<String> mainStream =
                processedStream;






        /*
         * Bad records stream
         *
         * Future:
         * This goes to Iceberg DLQ table
         */

        DataStream<String> dlqStream =
                processedStream.getSideOutput(
                        IceStreamPipelineDLQ.DLQ_TAG
                );







        mainStream.print(
                "ICEBERG_MAIN_TABLE"
        );



        dlqStream.print(
                "ICEBERG_DLQ_TABLE"
        );






        env.execute(
                "IceStream Lakehouse Observability Pipeline"
        );


    }

}