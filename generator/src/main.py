#!/usr/bin/env python3
"""
IceStream Mock Data Generator Microservice Entry Point
Initializes settings, connects producer, and executes main event generation loop.
"""

import sys
import os
import time
import logging

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.config import Config
from src.producer import EventProducer
from src.generator import PurchaseGenerator

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("icestream-generator")

def main():
    """Main execution entry point for the Generator service."""
    config = Config.from_env_and_cli()
    logger.info(f"Initializing IceStream Generator Service in '{config.generator_mode.upper()}' mode.")

    producer = EventProducer(bootstrap_servers=config.kafka_broker)
    generator = PurchaseGenerator(mode=config.generator_mode)

    logger.info(f"Starting stream telemetry transmission to topic '{config.topic_name}'...")
    try:
        while True:
            event = generator.generate_event()
            producer.send_event(
                topic=config.topic_name,
                key=event["order_id"],
                value=event,
                mode=config.generator_mode
            )
            time.sleep(config.send_interval_sec)
    except KeyboardInterrupt:
        logger.info("Generator stopped by operator.")
    finally:
        producer.close()

if __name__ == "__main__":
    main()
