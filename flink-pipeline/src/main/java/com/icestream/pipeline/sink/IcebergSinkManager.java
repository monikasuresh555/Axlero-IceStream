package com.icestream.pipeline.sink;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class IcebergSinkManager {


    private static final Logger LOG =
            LoggerFactory.getLogger(IcebergSinkManager.class);



    public void writeToMainTable(String record){

        /*
         * Later this will connect to:
         *
         * Apache Iceberg FlinkSink
         * Catalog
         * S3 / MinIO warehouse
         *
         */

        LOG.info(
            "ICEBERG MAIN TABLE WRITE -> {}",
            record
        );

    }




    public void writeToDLQTable(String record){


        /*
         * Failed records are stored here.
         *
         * Table:
         * ecommerce_events_dlq
         *
         */


        LOG.warn(
            "ICEBERG DLQ TABLE WRITE -> {}",
            record
        );

    }

}