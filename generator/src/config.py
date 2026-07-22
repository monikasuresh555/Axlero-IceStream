import os
import argparse
from dataclasses import dataclass

@dataclass
class Config:
    """Configuration settings for the IceStream Generator Microservice."""
    kafka_broker: str
    topic_name: str
    mock_data_interval_ms: float
    send_interval_sec: float
    generator_mode: str

    @classmethod
    def from_env_and_cli(cls) -> "Config":
        """Load configuration settings from environment variables and CLI arguments."""
        parser = argparse.ArgumentParser(description="IceStream Stream Data Generator")
        parser.add_argument(
            "--mode",
            type=str,
            choices=["normal", "anomaly"],
            default=os.getenv("ICESTREAM_MODE", "normal"),
            help="Generator mode: normal (clean streams) or anomaly (data quality violations)"
        )
        args, _ = parser.parse_known_args()

        kafka_broker = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
        topic_name = os.getenv("KAFKA_TOPIC_CHECKOUT", "checkout_events")
        mock_interval_ms = float(os.getenv("MOCK_DATA_INTERVAL_MS", "200"))
        send_interval_sec = mock_interval_ms / 1000.0
        generator_mode = args.mode

        return cls(
            kafka_broker=kafka_broker,
            topic_name=topic_name,
            mock_data_interval_ms=mock_interval_ms,
            send_interval_sec=send_interval_sec,
            generator_mode=generator_mode
        )
