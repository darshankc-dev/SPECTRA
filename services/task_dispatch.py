"""Task dispatch and expired-lease reconciliation service for Celery + Redis."""
import threading
from datetime import timedelta
from typing import Iterable

from django.db.models import Q
from django.utils import timezone

from apps.inspections.models import Inspection, InspectionStatus


def dispatch_batch_inspection_tasks(inspection_ids: Iterable[int]) -> None:
    """
    Dispatch each inspection item ID as an independent Celery task.
    If broker enqueue fails or no live Celery worker picks up the item quickly,
    includes a safe non-blocking reconciliation fallback so items never get stuck.
    """
    from apps.batch_processing.tasks import process_inspection_item_task

    ids_list = list(inspection_ids)
    enqueued_via_celery = True

    for ins_id in ids_list:
        try:
            process_inspection_item_task.delay(ins_id)
        except Exception:
            enqueued_via_celery = False

    # Also schedule a background reconciliation check in 1.5s in case Celery worker
    # is not running or a task was dropped before worker claim.
    def _reconcile_soon():
        import time
        from django.db import close_old_connections
        from .inspection_lifecycle import execute_inspection_item_task

        if enqueued_via_celery:
            time.sleep(1.5)
        try:
            close_old_connections()
            for ins_id in ids_list:
                ins = Inspection.objects.filter(pk=ins_id).first()
                if ins and ins.status == InspectionStatus.QUEUED:
                    execute_inspection_item_task(ins_id)
        except Exception:
            pass
        finally:
            close_old_connections()

    t = threading.Thread(target=_reconcile_soon, daemon=True)
    t.start()


def reconcile_pending_and_expired_inspections(batch_id: int | None = None) -> int:
    """
    Recover any QUEUED items whose task enqueue failed or PROCESSING items
    whose worker lease has expired.
    """
    from .inspection_lifecycle import execute_inspection_item_task, recalculate_batch_status

    now = timezone.now()
    stale_cutoff = now - timedelta(seconds=5)

    qs = Inspection.objects.filter(
        Q(status=InspectionStatus.QUEUED, created_at__lte=stale_cutoff)
        | Q(
            status=InspectionStatus.PROCESSING,
            lease_expires_at__isnull=False,
            lease_expires_at__lte=now,
        )
    )
    if batch_id is not None:
        qs = qs.filter(batch_id=batch_id)

    recovered = 0
    for ins_id in qs.values_list("id", flat=True)[:20]:
        res = execute_inspection_item_task(ins_id)
        if res in ("COMPLETED", "FAILED_VALIDATION", "FAILED_STORAGE"):
            recovered += 1

    if batch_id is not None:
        try:
            recalculate_batch_status(batch_id)
        except Exception:
            pass

    return recovered
