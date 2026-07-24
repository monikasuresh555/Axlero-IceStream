package com.icestream.pipeline.process;


import org.apache.flink.util.OutputTag;


public class IceStreamPipelineDLQ {


    public static final OutputTag<String> DLQ_TAG =
            new OutputTag<String>(
                    "ecommerce-events-dlq"
            ){};

}