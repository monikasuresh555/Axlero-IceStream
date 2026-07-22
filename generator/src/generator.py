import random
from datetime import datetime, timezone
from typing import Dict, Any
from faker import Faker

fake = Faker()

class PurchaseGenerator:
    """Generates synthetic checkout transactions with optional anomaly injection."""
    
    def __init__(self, mode: str = "normal"):
        self.mode = mode

    def generate_event(self) -> Dict[str, Any]:
        """Generates a rich checkout transaction. Injects anomalies if mode is 'anomaly'."""
        order_id = fake.uuid4()
        user_id = fake.uuid4()
        
        # Standard country and payment choices
        country = random.choice(["USA", "IND", "DEU", "FRA", "GBR", "CAN"])
        payment_method = random.choice(["CREDIT_CARD", "UPI", "PAYPAL", "APPLE_PAY", "STRIPE"])
        timestamp = datetime.now(timezone.utc).isoformat()

        # Define normal/anomaly threshold levels
        if self.mode == "anomaly":
            # high null tax rate (~15%), negative amount possibility (~10%), bad currency possibility (~10%)
            tax_null_probability = 0.15
            amount_negative_probability = 0.10
            bad_currency_probability = 0.10
        else:
            # low null tax rate (~1%), clean positive amounts, clean valid currencies
            tax_null_probability = 0.01
            amount_negative_probability = 0.00
            bad_currency_probability = 0.00

        # 1. Amount Calculation
        if random.random() < amount_negative_probability:
            # Negative amount anomaly
            amount = round(random.uniform(-100.00, -5.00), 2)
        else:
            amount = round(random.uniform(10.00, 500.00), 2)

        # 2. Tax Calculation
        if random.random() < tax_null_probability:
            tax_amount = None
        else:
            tax_amount = round(amount * 0.08, 2) if amount > 0 else 0.00

        # 3. Currency Calculation
        if random.random() < bad_currency_probability:
            currency = random.choice(["XYZ", "ERR", "NULL", "INVALID"])
        else:
            currency = random.choice(["USD", "INR", "EUR"])

        # Build payload schema
        event = {
            "order_id": order_id,
            "user_id": user_id,
            "amount": amount,
            "tax_amount": tax_amount,
            "currency": currency,
            "country": country,
            "payment_method": payment_method,
            "timestamp": timestamp
        }

        # Extra field for schema drift (~5% of events, regardless of mode)
        if random.random() < 0.05:
            event["extra_field"] = fake.word()

        return event
