package com.icestream.pipeline.process;


import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;

import org.apache.flink.configuration.Configuration;

import org.apache.flink.streaming.api.functions.ProcessFunction;

import org.apache.flink.util.Collector;

import com.icestream.pipeline.util.JsonUtils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;



public class StreamingCircuitBreaker
        extends ProcessFunction<String, String> {


    private static final Logger LOG =
            LoggerFactory.getLogger(
                    StreamingCircuitBreaker.class
            );


    private final double errorThreshold;

    private final long minimumRecords;



    private transient ValueState<Long> totalRecords;

    private transient ValueState<Long> failedRecords;


    private transient ObjectMapper mapper;




    public StreamingCircuitBreaker(
            double errorThreshold,
            long minimumRecords) {


        this.errorThreshold = errorThreshold;

        this.minimumRecords = minimumRecords;

    }





    @Override
    public void open(Configuration parameters)
            throws Exception {


        totalRecords =
                getRuntimeContext()
                .getState(
                        new ValueStateDescriptor<>(
                                "total-records",
                                Long.class,
                                0L
                        )
                );



        failedRecords =
                getRuntimeContext()
                .getState(
                        new ValueStateDescriptor<>(
                                "failed-records",
                                Long.class,
                                0L
                        )
                );



        mapper = new ObjectMapper();

    }







    @Override
    public void processElement(
            String value,
            Context ctx,
            Collector<String> out)
            throws Exception {



        long total =
                totalRecords.value() + 1;



        long failed =
                failedRecords.value();




        boolean anomaly = false;



        try {


            JsonNode node =
                    mapper.readTree(value);



            /*
             * Data quality rule:
             * tax_amount should not be NULL
             */


            if(node.has("tax_amount")
                    &&
               node.get("tax_amount").isNull()) {


                anomaly = true;

            }



        }
        catch(Exception e){


            // Invalid JSON treated as bad data

            anomaly = true;


        }





        if(anomaly){

            failed++;

        }




        totalRecords.update(total);

        failedRecords.update(failed);




        double errorRate =
                (double) failed / total;





        LOG.info(
                "Processed={} Failed={} ErrorRate={}",
                total,
                failed,
                errorRate
        );








        /*
         * Circuit Breaker
         *
         * If bad data > threshold:
         * send to DLQ
         */

        if(total >= minimumRecords
                &&
           errorRate > errorThreshold){



            LOG.warn(
                    "Circuit breaker triggered. Sending record to DLQ"
            );



            String badRecord =
                    JsonUtils.addAnomalyDetails(
                            value,
                            "NULL_TAX_AMOUNT",
                            errorRate
                    );



            ctx.output(
                    IceStreamPipelineDLQ.DLQ_TAG,
                    badRecord
            );



        }

        else {


            // Normal data flow

            out.collect(value);


        }


    }


}