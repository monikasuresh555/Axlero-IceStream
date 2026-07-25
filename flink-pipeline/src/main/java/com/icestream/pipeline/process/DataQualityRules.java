package com.icestream.pipeline.process;

import com.icestream.pipeline.model.Transaction;

public class DataQualityRules {

    private DataQualityRules() {
    }

    public static boolean hasNullTax(Transaction transaction) {
        return transaction.getTaxAmount() == null;
    }

    public static boolean hasNegativePrice(Transaction transaction) {
        return transaction.getPrice() < 0;
    }

    public static boolean isValid(Transaction transaction) {
        return !hasNullTax(transaction)
                && !hasNegativePrice(transaction);
    }
}