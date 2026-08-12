# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.conf import settings
from django.db import models

# Module imports
from .base import BaseModel


class CSVImportHistory(BaseModel):
    workspace = models.ForeignKey("db.Workspace", on_delete=models.CASCADE, related_name="workspace_csv_imports")
    project = models.ForeignKey("db.Project", on_delete=models.CASCADE, related_name="project_csv_imports")
    file_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=50,
        choices=(
            ("queued", "Queued"),
            ("processing", "Processing"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ),
        default="queued",
    )
    total_rows = models.PositiveIntegerField(default=0)
    imported_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    error_report = models.JSONField(default=list, blank=True, null=True)
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_csv_imports",
    )

    class Meta:
        verbose_name = "CSV Import"
        verbose_name_plural = "CSV Imports"
        db_table = "csv_imports"
        ordering = ("-created_at",)

    def __str__(self):
        """Return the file name of the import"""
        return f"{self.file_name} <{self.workspace.name}>"
