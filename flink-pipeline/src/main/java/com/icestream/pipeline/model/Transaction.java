package com.icestream.pipeline.model;

import java.io.Serializable;

public class Transaction implements Serializable {

    private String orderId;
    private String customerId;
    private Double amount;
    private Double taxAmount;
    private String paymentMethod;
    private Long timestamp;

    public Transaction() {
    }

    public Transaction(
            String orderId,
            String customerId,
            Double amount,
            Double taxAmount,
            String paymentMethod,
            Long timestamp) {

        this.orderId = orderId;
        this.customerId = customerId;
        this.amount = amount;
        this.taxAmount = taxAmount;
        this.paymentMethod = paymentMethod;
        this.timestamp = timestamp;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Double getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(Double taxAmount) {
        this.taxAmount = taxAmount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "Transaction{" +
                "orderId='" + orderId + '\'' +
                ", customerId='" + customerId + '\'' +
                ", amount=" + amount +
                ", taxAmount=" + taxAmount +
                ", paymentMethod='" + paymentMethod + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}