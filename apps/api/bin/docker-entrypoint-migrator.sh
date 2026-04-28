#!/bin/bash
set -e
export DJANGO_SETTINGS_MODULE=plane.settings.local

python manage.py wait_for_db $1

python manage.py migrate $1
