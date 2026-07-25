package com.icestream.pipeline.model;

import java.io.Serializable;

public class Transaction implements Serializable {

    private String transactionId;
    private String userId;
    private String productId;
    private int quantity;
    private double price;
    private Double taxAmount;
    private String paymentMethod;
    private String eventTimestamp;

    public Transaction() {
    }

    public Transaction(
            String transactionId,
            String userId,
            String productId,
            int quantity,
            double price,
            Double taxAmount,
            String paymentMethod,
            String eventTimestamp) {

        this.transactionId = transactionId;
        this.userId = userId;
        this.productId = productId;
        this.quantity = quantity;
        this.price = price;
        this.taxAmount = taxAmount;
        this.paymentMethod = paymentMethod;
        this.eventTimestamp = eventTimestamp;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
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

    public String getEventTimestamp() {
        return eventTimestamp;
    }

    public void setEventTimestamp(String eventTimestamp) {
        this.eventTimestamp = eventTimestamp;
    }

    @Override
    public String toString() {
        return "Transaction{" +
                "transactionId='" + transactionId + '\'' +
                ", userId='" + userId + '\'' +
                ", productId='" + productId + '\'' +
                ", quantity=" + quantity +
                ", price=" + price +
                ", taxAmount=" + taxAmount +
                ", paymentMethod='" + paymentMethod + '\'' +
                ", eventTimestamp='" + eventTimestamp + '\'' +
                '}';
    }
}