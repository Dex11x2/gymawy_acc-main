#!/bin/bash

# Daily MongoDB Backup Script
# Runs daily and saves compressed backups to /var/backups/gemawi/
# Keeps last 30 days of backups, deletes older ones

BACKUP_DIR="/var/backups/gemawi"
CONTAINER_NAME="gemawi-mongodb"
DB_NAME="gemawi"
DB_USER="gemawi_admin"
DB_PASS="Gymmawy036211"
RETENTION_DAYS=30
LOG_FILE="/var/log/gemawi_backup.log"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="gemawi_backup_${DATE}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

mkdir -p "$BACKUP_DIR"

log "=== Starting backup: $BACKUP_NAME ==="

docker exec "$CONTAINER_NAME" mongodump \
    --username "$DB_USER" \
    --password "$DB_PASS" \
    --authenticationDatabase admin \
    --db "$DB_NAME" \
    --out "/tmp/${BACKUP_NAME}" 2>&1 | tee -a "$LOG_FILE"

if [ $? -ne 0 ]; then
    log "ERROR: mongodump failed!"
    exit 1
fi

docker cp "${CONTAINER_NAME}:/tmp/${BACKUP_NAME}" "$BACKUP_PATH"
docker exec "$CONTAINER_NAME" rm -rf "/tmp/${BACKUP_NAME}"

cd "$BACKUP_DIR" && tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" && rm -rf "$BACKUP_NAME"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    log "SUCCESS: Backup saved as ${BACKUP_NAME}.tar.gz (Size: $SIZE)"
else
    log "ERROR: Compression failed!"
    exit 1
fi

log "Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "gemawi_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

TOTAL=$(ls "$BACKUP_DIR"/gemawi_backup_*.tar.gz 2>/dev/null | wc -l)
log "=== Backup complete. Total backups stored: $TOTAL ==="
