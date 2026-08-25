"""
DiligenceOS API — S3 Storage Service.

Handles uploading and managing document files in AWS S3 / Object Storage.
Includes local filesystem caching for offline dev & test environments.
"""

import logging
import os
import tempfile
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger("diligenceos.storage")


def save_local_fallback(file_bytes: bytes, storage_key: str) -> None:
    """Caches uploaded document bytes to OS temp directory for dev/test worker processing."""
    try:
        clean_key = storage_key.replace("/", os.sep)
        local_path = os.path.join(tempfile.gettempdir(), clean_key)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
    except Exception as err:
        logger.warning(f"Failed to cache document locally at {storage_key}: {err}")


def upload_file_to_s3(
    file_bytes: bytes,
    storage_key: str,
    content_type: str = "application/pdf",
) -> Optional[str]:
    """
    Uploads document file bytes to the configured S3 bucket under `storage_key`.

    Key format: `{workspace_id}/{company_id}/{document_id}/{filename}`

    Returns the storage key if successful.
    In local dev/testing, also caches file bytes locally for worker access.
    """
    # Always save local fallback cache for dev/test worker tasks
    save_local_fallback(file_bytes, storage_key)

    bucket = settings.aws_s3_bucket
    aws_access_key = settings.aws_access_key_id
    aws_secret_key = settings.aws_secret_access_key
    aws_region = settings.aws_region or "ap-south-1"

    # Defensive check for unconfigured or dummy credentials in local dev
    if not bucket or not aws_access_key or not aws_secret_key or aws_access_key.startswith("your-"):
        logger.info(
            f"AWS S3 credentials not fully configured (bucket: {bucket}). "
            f"Cached storage_key={storage_key} locally."
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
        logger.warning(f"S3 upload warning for key {storage_key}: {err}. Using local fallback cache.")
        return storage_key


def generate_presigned_url_for_document(
    document_id: str,
    storage_key: str,
    expires_in: int = 900,
) -> str:
    """
    Generates a short-lived signed S3 URL (default 15 mins = 900s) for document viewing.
    If S3 is unconfigured or fails, returns local file streaming endpoint URL `/api/v1/documents/{document_id}/file`.
    """
    bucket = settings.aws_s3_bucket
    aws_access_key = settings.aws_access_key_id
    aws_secret_key = settings.aws_secret_access_key
    aws_region = settings.aws_region or "ap-south-1"

    if bucket and aws_access_key and aws_secret_key and not aws_access_key.startswith("your-"):
        try:
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region,
            )
            url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": storage_key},
                ExpiresIn=expires_in,
            )
            return url
        except Exception as err:
            logger.warning(f"Failed to generate S3 presigned URL for {storage_key}: {err}")

    # Fallback to local streaming endpoint
    return f"/api/v1/documents/{document_id}/file"


def delete_file_from_s3(storage_key: str) -> bool:
    """
    Deletes a document file from S3 and local fallback cache.

    Returns True if deletion succeeded or was skipped (unconfigured S3).
    Logs warnings on failure but does not raise — DB cleanup should still proceed.
    """
    # Delete local fallback cache
    try:
        clean_key = storage_key.replace("/", os.sep)
        local_path = os.path.join(tempfile.gettempdir(), clean_key)
        if os.path.exists(local_path):
            os.remove(local_path)
            logger.info(f"Deleted local cached file: {local_path}")
    except Exception as err:
        logger.warning(f"Failed to delete local cache for {storage_key}: {err}")

    bucket = settings.aws_s3_bucket
    aws_access_key = settings.aws_access_key_id
    aws_secret_key = settings.aws_secret_access_key
    aws_region = settings.aws_region or "ap-south-1"

    if not bucket or not aws_access_key or not aws_secret_key or aws_access_key.startswith("your-"):
        logger.info(f"AWS S3 not configured — skipping S3 deletion for {storage_key}.")
        return True

    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region,
        )
        s3_client.delete_object(Bucket=bucket, Key=storage_key)
        logger.info(f"Successfully deleted {storage_key} from S3 bucket {bucket}")
        return True
    except (BotoCoreError, ClientError) as err:
        logger.warning(f"S3 delete warning for key {storage_key}: {err}")
        return False

