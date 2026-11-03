from django.apps import AppConfig


class ModelEvaluationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.model_evaluation"
    verbose_name = "Model Integrity & Synthetic Dataset Evaluation"
