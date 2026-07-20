#!/usr/bin/env python3
"""
IceStream Great Expectations Data Quality Validator
Loads streaming or batched transactional records, evaluates them against 
predefined expectation suites, and writes a status report for the observability API.
"""

import os
import sys
import json
import logging
import pandas as pd
import great_expectations as ge
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("icestream-validator")

REPORT_OUTPUT_PATH = os.getenv("VALIDATION_REPORT_PATH", "/tmp/validation_report.json")

def generate_sample_batch(include_errors: bool = False) -> List[Dict[str, Any]]:
    """Generates a temporary batch of transactions for assessment."""
    batch = []
    for i in range(100):
        amount = round(random_uniform(10.0, 300.0), 2) if not (include_errors and i < 5) else -10.0 # amount <= 0
        tax = round(amount * 0.08, 2) if not (include_errors and i >= 85) else None # >10% null values if errors included
        batch.append({
            "order_id": f"ORD-{100000 + i}",
            "user_id": f"USR-{5000 + i}",
            "amount": amount,
            "tax_amount": tax,
            "status": "COMPLETED",
            "timestamp": int(time_time() * 1000)
        })
    return batch

# Helper to prevent NameErrors if ran as a standalone mock
import random
import time
random_uniform = random.uniform
time_time = time.time

class IceStreamDataValidator:
    def __init__(self):
        logger.info("Initializing Great Expectations dataset compiler...")

    def run_validation(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Wraps records in a Great Expectations PandasDataset and asserts requirements:
        1. Amount must always be greater than 0
        2. Tax amount must not be null more than 10% of the time (mostly=0.90)
        """
        if not records:
            return {
                "status": "WARNING",
                "message": "Empty batch received. Skip validation.",
                "success_percent": 100.0
            }

        # Load into Pandas
        df = pd.DataFrame(records)
        
        # Convert to Great Expectations dataset wrapper
        ge_df = ge.from_pandas(df)

        results = []
        
        # Rule 1: amount must be positive (amount > 0)
        r1 = ge_df.expect_column_values_to_be_greater_than("amount", min_value=0)
        results.append(r1)

        # Rule 2: tax_amount cannot be null more than 10% of rows (not null at least 90%)
        r2 = ge_df.expect_column_values_to_not_be_null("tax_amount", mostly=0.90)
        results.append(r2)

        # Compile statistics
        total_rules = len(results)
        successful_rules = sum(1 for r in results if r.success)
        
        # Determine operational status:
        # - OK: All expectations pass
        # - WARNING: Tax null rate exceeded (fails mostly=0.90 but sits above some floor)
        # - ERROR: Critical rule failed (e.g. any negative amounts or severe null tax rates)
        status = "OK"
        failure_reasons = []

        if not r1.success:
            status = "ERROR"
            failure_reasons.append("CRITICAL_RULE_FAILED: Negative amounts detected in transaction logs.")
        
        if not r2.success:
            # If r1 passed but r2 failed, set to WARNING (non-blocking null-rate warning)
            if status != "ERROR":
                status = "WARNING"
            failure_reasons.append("WARNING_THRESHOLD_EXCEEDED: Null tax_amount rate exceeds 10.0%.")

        report = {
            "timestamp": int(time.time() * 1000),
            "status": status,
            "total_assertions": total_rules,
            "successful_assertions": successful_rules,
            "success_rate_percent": round((successful_rules / total_rules) * 100.0, 2),
            "failures": failure_reasons,
            "metrics": {
                "total_rows_evaluated": len(df),
                "null_tax_count": int(df["tax_amount"].isna().sum()),
                "negative_amount_count": int((df["amount"] <= 0).sum())
            }
        }

        logger.info(f"Data validation report complete: STATUS: {status} | Success: {report['success_rate_percent']}%")
        return report

    def save_report(self, report: Dict[str, Any]):
        """Persists the validation output as a local shared JSON schema."""
        try:
            os.makedirs(os.path.dirname(REPORT_OUTPUT_PATH), exist_ok=True)
            with open(REPORT_OUTPUT_PATH, "w") as f:
                json.dump(report, f, indent=2)
            logger.info(f"Validation report successfully exported to {REPORT_OUTPUT_PATH}")
        except Exception as e:
            logger.error(f"Failed to write validation report: {e}")

if __name__ == "__main__":
    # Check if a payload was passed via sys.argv, otherwise run on mock data
    validator = IceStreamDataValidator()
    
    # Simulate standard conditions
    logger.info("Running validation on standard synthetic dataset...")
    standard_records = generate_sample_batch(include_errors=False)
    report = validator.run_validation(standard_records)
    validator.save_report(report)
    
    # If explicitly requested via env/args, simulate anomalous checks
    if len(sys.argv) > 1 and sys.argv[1] == "--anomaly":
        logger.info("Running validation on anomalous synthetic dataset...")
        anomalous_records = generate_sample_batch(include_errors=True)
        report = validator.run_validation(anomalous_records)
        validator.save_report(report)
