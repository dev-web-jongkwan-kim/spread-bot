#!/bin/bash

# Database backup script
# Usage: ./backup-database.sh [backup_name]

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/cryptospreadbot}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Database: $DATABASE_URL"
echo "Backup file: $BACKUP_FILE"

# Perform backup
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Compress backup
gzip -f "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✓ Backup completed successfully"
echo "  File: $BACKUP_FILE"
echo "  Size: $FILE_SIZE"

# Optional: Keep only last N backups (default 7)
KEEP_BACKUPS="${KEEP_BACKUPS:-7}"
if [ "$KEEP_BACKUPS" -gt 0 ]; then
  echo "Cleaning up old backups (keeping last $KEEP_BACKUPS)..."
  cd "$BACKUP_DIR"
  ls -t *.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm
  echo "✓ Cleanup completed"
fi

