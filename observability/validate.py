#!/usr/bin/env python3
"""
IceStream Great Expectations Data Quality Validator

Loads streaming or batched transactional records, evaluates them against
predefined data-quality rules, and writes a validation status report.
"""

import os
import sys
import json
import logging
import random
import time
from typing import Dict, Any, List

import pandas as pd
import great_expectations as ge


# -------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

logger = logging.getLogger("icestream-validator")

REPORT_OUTPUT_PATH = os.getenv(
    "VALIDATION_REPORT_PATH",
    "/tmp/validation_report.json"
)


# -------------------------------------------------------------------
# Synthetic test data generator
# -------------------------------------------------------------------

def generate_sample_batch(
    include_errors: bool = False
) -> List[Dict[str, Any]]:
    """Generate a synthetic batch of transaction records."""

    batch = []

    for i in range(100):

        # First 5 records become invalid when anomaly mode is enabled
        if include_errors and i < 5:
            amount = -10.0
        else:
            amount = round(random.uniform(10.0, 300.0), 2)

        # Last 15 records have missing tax values in anomaly mode
        if include_errors and i >= 85:
            tax = None
        else:
            tax = round(amount * 0.08, 2)

        batch.append({
            "order_id": f"ORD-{100000 + i}",
            "user_id": f"USR-{5000 + i}",
            "amount": amount,
            "tax_amount": tax,
            "status": "COMPLETED",
            "timestamp": int(time.time() * 1000)
        })

    return batch


# -------------------------------------------------------------------
# IceStream Data Validator
# -------------------------------------------------------------------

class IceStreamDataValidator:

    def __init__(self):
        logger.info(
            "Initializing Great Expectations dataset compiler..."
        )

    def run_validation(
        self,
        records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validate transaction records.

        Rules:
        1. Amount must be greater than 0.
        2. At least 90% of tax_amount values must be non-null.
        """

        # -----------------------------------------------------------
        # Empty batch handling
        # -----------------------------------------------------------

        if not records:
            return {
                "status": "WARNING",
                "message": "Empty batch received. Skip validation.",
                "success_percent": 100.0
            }

        # -----------------------------------------------------------
        # Convert records to Pandas DataFrame
        # -----------------------------------------------------------

        df = pd.DataFrame(records)

        # -----------------------------------------------------------
        # Convert Pandas DataFrame to Great Expectations dataset
        # -----------------------------------------------------------

        ge_df = ge.from_pandas(df)

        results = []

        # -----------------------------------------------------------
        # Rule 1:
        # Amount must be greater than 0
        # -----------------------------------------------------------

        r1 = ge_df.expect_column_values_to_be_between(
            "amount",
            min_value=0,
            strict_min=True
        )

        results.append(r1)

        # -----------------------------------------------------------
        # Rule 2:
        # At least 90% of tax_amount values must be non-null
        # -----------------------------------------------------------

        r2 = ge_df.expect_column_values_to_not_be_null(
            "tax_amount",
            mostly=0.90
        )

        results.append(r2)

        # -----------------------------------------------------------
        # Calculate validation statistics
        # -----------------------------------------------------------

        total_rules = len(results)

        successful_rules = sum(
            1 for result in results
            if result.success
        )

        success_rate = (
            successful_rules / total_rules
        ) * 100.0

        # -----------------------------------------------------------
        # Determine operational status
        # -----------------------------------------------------------

        status = "OK"
        failure_reasons = []

        # Critical rule: amount
        if not r1.success:
            status = "ERROR"

            failure_reasons.append(
                "CRITICAL_RULE_FAILED: "
                "Negative or zero amounts detected in transaction logs."
            )

        # Warning rule: tax_amount
        if not r2.success:

            if status != "ERROR":
                status = "WARNING"

            failure_reasons.append(
                "WARNING_THRESHOLD_EXCEEDED: "
                "Null tax_amount rate exceeds 10.0%."
            )

        # -----------------------------------------------------------
        # Build validation report
        # -----------------------------------------------------------

        report = {
            "timestamp": int(time.time() * 1000),

            "status": status,

            "total_assertions": total_rules,

            "successful_assertions": successful_rules,

            "success_rate_percent": round(
                success_rate,
                2
            ),

            "failures": failure_reasons,

            "metrics": {
                "total_rows_evaluated": len(df),

                "null_tax_count": int(
                    df["tax_amount"].isna().sum()
                ),

                "negative_amount_count": int(
                    (df["amount"] <= 0).sum()
                )
            }
        }

        # -----------------------------------------------------------
        # Logging
        # -----------------------------------------------------------

        logger.info(
            "Data validation report complete: "
            f"STATUS: {status} | "
            f"Success: {report['success_rate_percent']}%"
        )

        return report

    # ----------------------------------------------------------------
    # Save validation report
    # ----------------------------------------------------------------

    def save_report(
        self,
        report: Dict[str, Any]
    ):
        """Persist validation output as a JSON report."""

        try:

            report_directory = os.path.dirname(
                REPORT_OUTPUT_PATH
            )

            if report_directory:
                os.makedirs(
                    report_directory,
                    exist_ok=True
                )

            with open(
                REPORT_OUTPUT_PATH,
                "w"
            ) as f:

                json.dump(
                    report,
                    f,
                    indent=2
                )

            logger.info(
                "Validation report successfully exported to "
                f"{REPORT_OUTPUT_PATH}"
            )

        except Exception as e:

            logger.error(
                f"Failed to write validation report: {e}"
            )


# -------------------------------------------------------------------
# Main
# -------------------------------------------------------------------

if __name__ == "__main__":

    validator = IceStreamDataValidator()

    # ---------------------------------------------------------------
    # Standard validation
    # ---------------------------------------------------------------

    logger.info(
        "Running validation on standard synthetic dataset..."
    )

    standard_records = generate_sample_batch(
        include_errors=False
    )

    report = validator.run_validation(
        standard_records
    )

    validator.save_report(
        report
    )

    # ---------------------------------------------------------------
    # Optional anomaly validation
    # ---------------------------------------------------------------

    if (
        len(sys.argv) > 1
        and sys.argv[1] == "--anomaly"
    ):

        logger.info(
            "Running validation on anomalous synthetic dataset..."
        )

        anomalous_records = generate_sample_batch(
            include_errors=True
        )

        report = validator.run_validation(
            anomalous_records
        )

        validator.save_report(
            report
        )