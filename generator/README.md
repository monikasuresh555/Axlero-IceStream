# IceStream Data Generator Service

The **IceStream Data Generator** is a production-ready microservice responsible for generating synthetic e-commerce checkout events and streaming them to Apache Kafka.

## Architecture & Structure

```
generator/
├── Dockerfile
├── README.md
├── .env.example
├── requirements.txt
└── src/
    ├── __init__.py
    ├── config.py       # Configuration loading (Env & CLI parsing)
    ├── producer.py     # KafkaProducer setup and fallback handling
    ├── generator.py    # Synthetic purchase event payload generation
    └── main.py         # Microservice execution entry point
```

## Environment Variables & Configuration

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:29092` | Kafka broker host and port |
| `KAFKA_TOPIC_CHECKOUT` | `checkout_events` | Kafka topic for checkout events |
| `MOCK_DATA_INTERVAL_MS` | `200` | Delay between event emissions in milliseconds |
| `ICESTREAM_MODE` | `normal` | Operating mode: `normal` or `anomaly` |

## Operating Modes

- **`normal`**: Generates clean telemetry with valid amounts, standard currencies (`USD`, `INR`, `EUR`), and minimal null tax fields (~1%).
- **`anomaly`**: Simulates pipeline data quality failures by injecting high null tax rates (~15%), negative order amounts (~10%), and invalid currency codes (`XYZ`, `ERR`).

## Running the Service

### CLI Flags
You can override the operating mode via command-line arguments:
```bash
python -m src.main --mode anomaly
```

### Local Execution
```bash
pip install -r requirements.txt
python -m src.main
```

### Docker
```bash
docker build -t icestream-generator .
docker run -e KAFKA_BOOTSTRAP_SERVERS=kafka:9092 -e ICESTREAM_MODE=normal icestream-generator
```
