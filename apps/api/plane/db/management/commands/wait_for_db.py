# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import time
from django.db import connections
from django.db.utils import OperationalError
from django.core.management import BaseCommand


class Command(BaseCommand):
    """Django command to pause execution until db is available"""

    # `connections["default"]` only returns a lazy wrapper and never raises,
    # so the previous version of this loop exited on the first iteration
    # without ever actually testing connectivity. Probe with
    # ensure_connection() instead, and cap the wait so an unreachable DB
    # fails fast and loud rather than letting `migrate` hang indefinitely.
    max_attempts = 30

    def handle(self, *args, **options):
        self.stdout.write("Waiting for database...")
        for attempt in range(1, self.max_attempts + 1):
            try:
                connections["default"].ensure_connection()
                self.stdout.write(self.style.SUCCESS("Database available!"))
                return
            except OperationalError:
                self.stdout.write(f"Database unavailable ({attempt}/{self.max_attempts}), waiting 1 second...")
                time.sleep(1)

        raise OperationalError(f"Database still unavailable after {self.max_attempts} seconds")
