package com.icestream.pipeline.util;

public final class Constants {

    private Constants() {
    }

    // Kafka
    public static final String KAFKA_TOPIC = "checkout_events";
    public static final String KAFKA_GROUP = "icestream-flink";
    public static final String BOOTSTRAP_SERVERS = "kafka:9092";

    // Iceberg
    public static final String MAIN_TABLE = "ecommerce_events";
    public static final String DLQ_TABLE = "ecommerce_events_dlq";

    // Circuit Breaker
    public static final double ERROR_THRESHOLD = 0.02;
    public static final long MIN_RECORDS = 50;

    // Checkpointing
    public static final long CHECKPOINT_INTERVAL = 10000L;
}