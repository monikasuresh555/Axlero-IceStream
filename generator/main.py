#!/usr/bin/env python3

import os
import time
import random
import json
import logging
from datetime import datetime, timezone

from faker import Faker
from kafka import KafkaProducer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

logger = logging.getLogger("icestream-generator")

KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_NAME = "checkout_events"
SEND_INTERVAL = 1

fake = Faker()


class PurchaseGenerator:

    def __init__(self):
        self.producer = None
        self.setup_producer()

    def setup_producer(self):
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=KAFKA_BROKER,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8"),
            )
            logger.info("Kafka Connected")
        except Exception:
            logger.warning("Kafka not running. Using simulation mode.")
            self.producer = None

    def generate_event(self):

        order_id = fake.uuid4()
        user_id = fake.uuid4()

        amount = round(random.uniform(5, 500), 2)
        tax_amount = round(amount * 0.08, 2)

        payment_method = random.choice([
            "UPI",
            "Credit Card",
            "Debit Card",
            "Cash",
            "Net Banking"
        ])

        product_category = random.choice([
            "Electronics",
            "Fashion",
            "Books",
            "Grocery",
            "Home"
        ])

        city = fake.city()

        quantity = random.randint(1, 5)

        discount = round(random.uniform(0, 100), 2)

        currency = "INR"

        status = random.choice([
            "SUCCESS",
            "SUCCESS",
            "SUCCESS",
            "FAILED"
        ])

        timestamp = datetime.now(timezone.utc).isoformat()

        if random.random() < 0.10:
            tax_amount = None

        event = {
            "order_id": order_id,
            "user_id": user_id,
            "amount": amount,
            "tax_amount": tax_amount,
            "discount": discount,
            "quantity": quantity,
            "payment_method": payment_method,
            "product_category": product_category,
            "city": city,
            "currency": currency,
            "status": status,
            "timestamp": timestamp
        }

        if random.random() < 0.05:
            event["amount"] = -event["amount"]

        if random.random() < 0.05:
            event["city"] = None

        if random.random() < 0.05:
            event["extra_field"] = fake.word()

        return event

    def start(self):

        logger.info("Starting Generator...")

        while True:

            event = self.generate_event()

            if self.producer:
                self.producer.send(
                    TOPIC_NAME,
                    key=event["order_id"],
                    value=event
                )
                self.producer.flush()
                logger.info(event)

            else:
                print(json.dumps(event, indent=2))

            time.sleep(SEND_INTERVAL)


if __name__ == "__main__":
    generator = PurchaseGenerator()
    generator.start()