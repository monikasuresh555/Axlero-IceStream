import json
import logging
from typing import Optional, Dict, Any
from kafka import KafkaProducer

logger = logging.getLogger("icestream-generator")

class EventProducer:
    """Kafka Producer wrapper for sending structured events to Kafka topics."""
    
    def __init__(self, bootstrap_servers: str, client_id: str = 'icestream-generator-producer'):
        self.bootstrap_servers = bootstrap_servers
        self.client_id = client_id
        self.producer: Optional[KafkaProducer] = None
        self.setup_producer()

    def setup_producer(self) -> None:
        """Establish connection to Apache Kafka broker cluster."""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                request_timeout_ms=5000,
                client_id=self.client_id
            )
            logger.info(f"Connected to Kafka broker at {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to create Kafka producer: {e}. Running in simulation/stdout mode.")
            self.producer = None

    def send_event(self, topic: str, key: str, value: Dict[str, Any], mode: str = "normal") -> None:
        """Publish event payload to specified Kafka topic or fallback to stdout."""
        if self.producer:
            try:
                self.producer.send(
                    topic=topic,
                    key=key,
                    value=value
                )
                self.producer.flush()
                logger.info(f"Published Event [Mode: {mode.upper()}]: {json.dumps(value)}")
            except Exception as e:
                logger.error(f"Error publishing event to Kafka: {e}")
        else:
            logger.info(f"[SIMULATOR STDOUT - Mode: {mode.upper()}] {json.dumps(value)}")

    def close(self) -> None:
        """Gracefully close Kafka producer connections."""
        if self.producer:
            logger.info("Closing Kafka producer connections...")
            self.producer.close(timeout=5.0)
