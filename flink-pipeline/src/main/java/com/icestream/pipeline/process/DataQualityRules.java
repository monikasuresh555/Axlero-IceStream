package com.icestream.pipeline.process;

import com.icestream.pipeline.model.Transaction;

public class DataQualityRules {

    private DataQualityRules() {
    }

    public static boolean hasNullTax(Transaction transaction) {
        return transaction.getTaxAmount() == null;
    }

    public static boolean hasNegativeAmount(Transaction transaction) {
        return transaction.getAmount() != null
                && transaction.getAmount() < 0;
    }

    public static boolean isValid(Transaction transaction) {
        return !hasNullTax(transaction)
                && !hasNegativeAmount(transaction);
    }
}