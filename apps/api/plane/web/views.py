# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import connections, DEFAULT_DB_ALIAS
from django.db.migrations.executor import MigrationExecutor
from django.http import HttpResponse, JsonResponse

from plane.license.models import Instance, InstanceConfiguration


def health_check(request):
    return JsonResponse({"status": "OK"})


def _pending_migrations():
    connection = connections[DEFAULT_DB_ALIAS]
    executor = MigrationExecutor(connection)
    targets = executor.loader.graph.leaf_nodes()
    return bool(executor.migration_plan(targets))


def readiness_check(request):
    # Render's health check target: liveness (health_check above) only proves
    # the process is up. This proves boot-time setup (migrate, register_instance,
    # configure_instance in docker-entrypoint-api.sh) actually completed, so a
    # rolling deploy can't cut traffic to a container that's still mid-boot.
    try:
        migrations_pending = _pending_migrations()
        instance_registered = Instance.objects.exists()
        config_loaded = InstanceConfiguration.objects.exists()
    except Exception as e:
        return JsonResponse({"status": "not ready", "reason": str(e)}, status=503)

    if migrations_pending or not instance_registered or not config_loaded:
        return JsonResponse(
            {
                "status": "not ready",
                "migrations_pending": migrations_pending,
                "instance_registered": instance_registered,
                "config_loaded": config_loaded,
            },
            status=503,
        )

    return JsonResponse({"status": "ready"})


def robots_txt(request):
    return HttpResponse("User-agent: *\nDisallow: /", content_type="text/plain")
