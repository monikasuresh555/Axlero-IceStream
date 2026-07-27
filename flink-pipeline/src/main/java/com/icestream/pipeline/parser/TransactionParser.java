package com.icestream.pipeline.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.icestream.pipeline.model.Transaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class TransactionParser {

    private static final Logger LOG =
            LoggerFactory.getLogger(TransactionParser.class);

    private static final ObjectMapper mapper =
            new ObjectMapper();

    private TransactionParser() {
    }

    public static Transaction parse(String json) {

        try {

            return mapper.readValue(json, Transaction.class);

        } catch (Exception e) {

            LOG.error("Failed to parse transaction JSON: {}", json);
            LOG.error("Reason: {}", e.getMessage());

            return null;
        }
    }

    public static String toJson(Transaction transaction) {

        try {

            return mapper.writeValueAsString(transaction);

        } catch (Exception e) {

            LOG.error("Failed to convert transaction to JSON");
            LOG.error("Reason: {}", e.getMessage());

            return "{}";
        }
    }

    public static boolean isValidJson(String json) {

        try {

            mapper.readTree(json);
            return true;

        } catch (Exception e) {

            return false;
        }
    }
}