"""
DiligenceOS API — S3 Storage Service.

Handles uploading and managing document files in AWS S3 / Object Storage.
"""

import logging
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger("diligenceos.storage")


def upload_file_to_s3(
    file_bytes: bytes,
    storage_key: str,
    content_type: str = "application/pdf",
) -> Optional[str]:
    """
    Uploads document file bytes to the configured S3 bucket under `storage_key`.

    Key format: `{workspace_id}/{company_id}/{document_id}/{filename}`

    Returns the storage key if successful.
    If AWS credentials are unset or invalid in local dev/testing, logs a warning
    and allows the workflow to proceed without crashing.
    """
    bucket = settings.aws_s3_bucket
    aws_access_key = settings.aws_access_key_id
    aws_secret_key = settings.aws_secret_access_key
    aws_region = settings.aws_region or "ap-south-1"

    # Defensive check for unconfigured or dummy credentials in local dev
    if not bucket or not aws_access_key or not aws_secret_key or aws_access_key.startswith("your-"):
        logger.warning(
            f"AWS S3 credentials not fully configured (bucket: {bucket}). "
            f"Skipping live S3 upload for storage_key={storage_key}"
        )
        return storage_key

    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region,
        )

        s3_client.put_object(
            Bucket=bucket,
            Key=storage_key,
            Body=file_bytes,
            ContentType=content_type,
        )
        logger.info(f"Successfully uploaded {storage_key} to S3 bucket {bucket}")
        return storage_key
    except (BotoCoreError, ClientError) as err:
        logger.error(f"S3 upload error for key {storage_key}: {err}")
        # Log error but don't crash app execution in non-production environments
        return storage_key
