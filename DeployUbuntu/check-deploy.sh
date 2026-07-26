#!/bin/bash

# Ensure full PATH environment for aaPanel Cron executor
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin

# Configuration
BASE_DIR="/www/wwwroot/ZYPO-AUTO-DEPLOY"
REPO_DIR="$BASE_DIR/Repo"
REPO_URL="https://github.com/denisovPlay/ancial.git"
BRANCH="main"
LOG_FILE="$BASE_DIR/deploy.log"
CONTAINER_NAME="zypo-app"

# Prevent multiple concurrent script executions
LOCK_FILE="/tmp/zypo_deploy.lock"
exec 200>"$LOCK_FILE"
flock -n 200 || exit 0

# Create base directory if it doesn't exist
mkdir -p "$BASE_DIR"

IS_FIRST_RUN=false

# Step 1: Initial Clone if Repo directory or .git is missing
if [ ! -d "$REPO_DIR/.git" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📦 Первый запуск. Клонируем $REPO_URL в $REPO_DIR..." >> "$LOG_FILE"
    rm -rf "$REPO_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$REPO_DIR" >> "$LOG_FILE" 2>&1
    IS_FIRST_RUN=true
fi

cd "$REPO_DIR" || exit 1

# Ensure git remote URL is correctly set
git remote set-url origin "$REPO_URL" >> "$LOG_FILE" 2>&1

# Fetch latest changes from GitHub
git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1

LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null)
REMOTE_HASH=$(git rev-parse origin/"$BRANCH" 2>/dev/null)

# Check if Docker container is currently running
IS_RUNNING=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -w "$CONTAINER_NAME")

if [ "$IS_FIRST_RUN" = true ] || [ -z "$IS_RUNNING" ] || [ -z "$LOCAL_HASH" ] || [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    if [ -z "$IS_RUNNING" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Контейнер $CONTAINER_NAME не запущен! Запуск сборки..." >> "$LOG_FILE"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Найдено обновление (${LOCAL_HASH:0:7} -> ${REMOTE_HASH:0:7}). Пересборка..." >> "$LOG_FILE"
    fi
    
    # Pull latest changes
    git reset --hard origin/"$BRANCH" >> "$LOG_FILE" 2>&1
    git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1
    
    # Используется docker-compose.yml из корня репозитория (cd $REPO_DIR выше).
    # Сборка отдельно от запуска: при падении сборки старый контейнер
    # продолжает работать, а в лог попадает явная ошибка, а не "успешно запущен"
    if ! docker compose build --no-cache >> "$LOG_FILE" 2>&1; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ОШИБКА СБОРКИ! Контейнер не обновлён, смотрите лог выше." >> "$LOG_FILE"
        exit 1
    fi

    docker compose up -d >> "$LOG_FILE" 2>&1

    # Cleanup unused build layers
    docker image prune -f >> "$LOG_FILE" 2>&1

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Контейнер $CONTAINER_NAME успешно запущен!" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️ Обновлений нет, контейнер $CONTAINER_NAME работает" >> "$LOG_FILE"
fi
