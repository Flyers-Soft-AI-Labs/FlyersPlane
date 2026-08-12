# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views import CSVImportEndpoint


urlpatterns = [
    path(
        "workspaces/<str:slug>/csv-import/",
        CSVImportEndpoint.as_view(),
        name="csv-import",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/csv-import/",
        CSVImportEndpoint.as_view(),
        name="csv-import-create",
    ),
]
