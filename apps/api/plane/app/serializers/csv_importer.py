# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Module imports
from .base import BaseSerializer
from .project import ProjectLiteSerializer
from .user import UserLiteSerializer
from plane.db.models import CSVImportHistory


class CSVImportHistorySerializer(BaseSerializer):
    initiated_by_detail = UserLiteSerializer(source="initiated_by", read_only=True)
    project_detail = ProjectLiteSerializer(source="project", read_only=True)

    class Meta:
        model = CSVImportHistory
        fields = [
            "id",
            "workspace",
            "project",
            "project_detail",
            "file_name",
            "status",
            "total_rows",
            "imported_count",
            "failed_count",
            "error_report",
            "initiated_by",
            "initiated_by_detail",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = fields
