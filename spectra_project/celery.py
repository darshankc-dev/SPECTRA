"""Celery configuration for SPECTRΛ asynchronous batch inspection processing."""
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "spectra_project.settings")

app = Celery("spectra_project")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
