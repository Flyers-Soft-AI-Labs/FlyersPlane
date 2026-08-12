# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import allow_permission, ROLE
from plane.app.serializers import CSVImportHistorySerializer
from plane.bgtasks.csv_import_task import MAX_ROWS_PER_IMPORT, csv_import_task
from plane.db.models import CSVImportHistory, Project, Workspace

from ..base import BaseAPIView


class CSVImportEndpoint(BaseAPIView):
    model = CSVImportHistory
    serializer_class = CSVImportHistorySerializer

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def post(self, request, slug, project_id):
        workspace = Workspace.objects.get(slug=slug)
        project = Project.objects.filter(pk=project_id, workspace=workspace).first()
        if project is None:
            return Response(
                {"error": "Project not found in this workspace."},
                status=status.HTTP_404_NOT_FOUND,
            )

        rows = request.data.get("rows")
        file_name = str(request.data.get("file_name") or "").strip()[:255]

        if not isinstance(rows, list) or len(rows) == 0:
            return Response({"error": "No rows found to import."}, status=status.HTTP_400_BAD_REQUEST)

        if len(rows) > MAX_ROWS_PER_IMPORT:
            return Response(
                {"error": f"A single import is limited to {MAX_ROWS_PER_IMPORT} rows."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        csv_import = CSVImportHistory.objects.create(
            workspace=workspace,
            project=project,
            file_name=file_name,
            initiated_by=request.user,
            total_rows=len(rows),
            status="queued",
        )

        csv_import_task.delay(
            import_id=str(csv_import.id),
            workspace_id=str(workspace.id),
            project_id=str(project.id),
            rows=rows,
            actor_id=str(request.user.id),
        )

        return Response(CSVImportHistorySerializer(csv_import).data, status=status.HTTP_202_ACCEPTED)

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def get(self, request, slug):
        csv_imports = CSVImportHistory.objects.filter(workspace__slug=slug).select_related(
            "workspace", "project", "initiated_by"
        )

        if request.GET.get("per_page") and request.GET.get("cursor"):
            return self.paginate(
                order_by=request.GET.get("order_by", "-created_at"),
                request=request,
                queryset=csv_imports,
                on_results=lambda csv_imports: CSVImportHistorySerializer(csv_imports, many=True).data,
            )

        return Response(
            CSVImportHistorySerializer(csv_imports[:20], many=True).data,
            status=status.HTTP_200_OK,
        )
