package com.icestream.pipeline.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;


public class JsonUtils {


    private static final ObjectMapper mapper =
            new ObjectMapper();



    private JsonUtils() {
    }



    public static ObjectMapper getMapper() {

        return mapper;

    }




    public static String addAnomalyDetails(
            String json,
            String reason,
            double errorRate) {


        try {


            JsonNode node =
                    mapper.readTree(json);



            ObjectNode objectNode =
                    (ObjectNode) node;



            objectNode.put(
                    "anomaly_status",
                    "DIVERTED"
            );


            objectNode.put(
                    "anomaly_reason",
                    reason
            );


            objectNode.put(
                    "error_rate",
                    errorRate
            );



            return mapper.writeValueAsString(
                    objectNode
            );



        }
        catch(Exception e){


            return json;


        }

    }

}