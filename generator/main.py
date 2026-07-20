#!/usr/bin/env python3
"""
IceStream Mock Data Generator
Generates synthetic e-commerce transactions and publishes them to Apache Kafka.
Injects data quality anomalies (null tax amounts, schema drift) to test Flink circuit breakers.
"""

import os
import time
import random
import json
import logging
from datetime import datetime, timezone
from faker import Faker
from kafka import KafkaProducer

# Configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("icestream-generator")

KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_NAME = "checkout_events"
MOCK_DATA_INTERVAL_MS = float(os.getenv("MOCK_DATA_INTERVAL_MS", "1000"))
SEND_INTERVAL_SEC = MOCK_DATA_INTERVAL_MS / 1000.0

fake = Faker()

class PurchaseGenerator:
    def __init__(self):
        self.producer = None
        self.setup_producer()

    def setup_producer(self):
        """Establish connection to Apache Kafka broker cluster."""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=KAFKA_BROKER,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                request_timeout_ms=5000,
                client_id='icestream-generator-producer'
            )
            logger.info(f"Connected to Kafka broker at {KAFKA_BROKER}")
        except Exception as e:
            logger.error(f"Failed to create Kafka producer: {e}. Running in simulation/stdout mode.")
            self.producer = None

    def generate_event(self):
        """Generates a single structured checkout transaction using Faker."""
        order_id = fake.uuid4()
        user_id = fake.uuid4()
        amount = round(random.uniform(5.00, 500.00), 2)
        
        # Standard tax (e.g., 8%)
        tax_amount = round(amount * 0.08, 2)
        status = random.choice(["SUCCESS", "SUCCESS", "SUCCESS", "FAILED"])
        timestamp = datetime.now(timezone.utc).isoformat()

        # Check if we should inject anomalies
        rand_val = random.random()
        
        # ~10% probability of null tax_amount
        if rand_val < 0.10:
            tax_amount = None
            
        event = {
            "order_id": order_id,
            "user_id": user_id,
            "amount": amount,
            "tax_amount": tax_amount,
            "status": status,
            "timestamp": timestamp
        }

        # ~5% probability of schema drift (extra_field)
        if random.random() < 0.05:
            event["extra_field"] = fake.word()

        return event

    def start(self):
        """Generator main loop."""
        logger.info(f"Starting mock transaction generator... target topic: {TOPIC_NAME}")
        try:
            while True:
                event = self.generate_event()
                
                # Publish to Kafka
                if self.producer:
                    try:
                        self.producer.send(
                            topic=TOPIC_NAME,
                            key=event["order_id"],
                            value=event
                        )
                        # Flush to ensure immediate delivery
                        self.producer.flush()
                        logger.info(f"Sent event to Kafka: {json.dumps(event)}")
                    except Exception as e:
                        logger.error(f"Error publishing: {e}")
                else:
                    logger.info(f"[SIMULATED STDOUT] {json.dumps(event)}")
                
                time.sleep(SEND_INTERVAL_SEC)
                
        except KeyboardInterrupt:
            logger.info("Generator stopped by user.")
        finally:
            if self.producer:
                logger.info("Flushing pending events...")
                self.producer.close(timeout=5.0)

if __name__ == "__main__":
    generator = PurchaseGenerator()
    generator.start()
