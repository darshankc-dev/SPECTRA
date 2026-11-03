"""Celery tasks for asynchronous batch inspection processing."""
from celery import shared_task
from services.inspection_lifecycle import execute_inspection_item_task


@shared_task(
    bind=True,
    name="batch_processing.process_inspection_item_task",
    max_retries=3,
    default_retry_delay=3,
    acks_late=True,
)
def process_inspection_item_task(self, inspection_id: int) -> str:
    """
    Process a single inspection record asynchronously by database ID.
    Deterministic validation failures are recorded as FAILED and never retried.
    Transient runtime/IO failures are retried with exponential backoff.
    """
    try:
        return execute_inspection_item_task(int(inspection_id))
    except Exception as exc:
        countdown = 2 ** (self.request.retries + 1)
        raise self.retry(exc=exc, countdown=countdown)
