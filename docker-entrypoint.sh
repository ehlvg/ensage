#!/bin/sh
set -e

# Fix volume permissions if /data is mounted and owned by root
chown -R ensage:ensage /data 2>/dev/null || true

# Drop to the ensage user and run the command
exec su-exec ensage "$@"
