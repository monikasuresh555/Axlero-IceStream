import pandas as pd
import random
import time
from datetime import datetime

def generate_transaction():
    transaction_id = random.randint(1000, 9999)
    user_id = "U" + str(random.randint(100, 999))
    amount = random.randint(100, 5000)
    tax_amount = round(amount * 0.18, 2)
    timestamp = datetime.now()

    return {
        "transaction_id": transaction_id,
        "user_id": user_id,
        "amount": amount,
        "tax_amount": tax_amount,
        "timestamp": str(timestamp)
    }

transactions = []

for i in range(100):
    transaction = generate_transaction()
    transactions.append(transaction)

print(transactions) 

df = pd.DataFrame(transactions)

print(df) 

df.to_csv("transactions.csv", index=False)

print("CSV file created successfully!")
