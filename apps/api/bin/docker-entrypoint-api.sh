#!/bin/bash
set -e
python manage.py wait_for_db

# Apply migrations before any startup command touches database tables.
#
# `migrate --check` builds the same migration graph as a full `migrate` and
# still has to query django_migrations to compute the plan, but when the
# plan is empty it exits immediately instead of also running post_migrate
# signal work (content-type/permission sync, etc.) that a full `migrate
# --noinput` performs on every invocation regardless of whether anything
# was actually applied. Render's free tier has no Pre-Deploy Command to
# move migrations out of the boot path entirely, so this keeps the common
# "nothing to apply" case cheap on every cold start while still running
# the real migrate whenever there's something pending.
#
# Note: this must use the `if <cmd>; then` form. Under `set -e`, a bare
# non-zero exit would abort the script, but a command used directly as an
# `if`/`while` condition is exempt from errexit - so a "migrations
# pending" result (exit 1) is handled below instead of crashing the boot.
if [ "${RUN_MIGRATIONS_ON_START:-1}" = "1" ]; then
    if python manage.py migrate --check --noinput; then
        echo "No pending migrations, skipping full migrate."
    else
        echo "Pending migrations detected, applying..."
        python manage.py migrate --noinput
    fi
fi

# Wait for migrations
python manage.py wait_for_migrations

# Collect system information
HOSTNAME=$(hostname)
MAC_ADDRESS=""
if command -v ip >/dev/null 2>&1; then
    MAC_ADDRESS=$(ip link show | awk '/ether/ {print $2}' | head -n 1)
fi
CPU_INFO=$(cat /proc/cpuinfo 2>/dev/null || true)
MEMORY_INFO=$(free -h 2>/dev/null || true)
DISK_INFO=$(df -h 2>/dev/null || true)

# Concatenate information and compute SHA-256 hash
SIGNATURE=$(echo "$HOSTNAME$MAC_ADDRESS$CPU_INFO$MEMORY_INFO$DISK_INFO" | sha256sum | awk '{print $1}')

# Export the variables
export MACHINE_SIGNATURE=$SIGNATURE

# Register instance
if [ "${REGISTER_INSTANCE_ON_START:-1}" = "1" ]; then
    python manage.py register_instance "$MACHINE_SIGNATURE"
fi

# Load the configuration variable
python manage.py configure_instance

# Create the default bucket
python manage.py create_bucket

# Clear Cache before starting to remove stale values
python manage.py clear_cache

GUNICORN_WORKERS="${GUNICORN_WORKERS:-${WEB_CONCURRENCY:-1}}"

exec gunicorn -w "$GUNICORN_WORKERS" -k uvicorn.workers.UvicornWorker plane.asgi:application --bind 0.0.0.0:"${PORT:-8000}" --max-requests 1200 --max-requests-jitter 1000 --access-logfile -
