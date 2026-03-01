#!/bin/bash

# ======================================
# STRIAE WORKERS NPM INSTALL SCRIPT
# ======================================
# This script installs npm dependencies for all Striae workers:
# 1. audit-worker
# 2. data-worker
# 3. image-worker
# 4. keys-worker
# 5. pdf-worker
# 6. turnstile-worker
# 7. user-worker

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Striae Workers NPM Install Script${NC}"
echo "========================================"
echo ""

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WORKERS_DIR="$PROJECT_ROOT/workers"

# Check if workers directory exists
if [ ! -d "$WORKERS_DIR" ]; then
    echo -e "${RED}❌ Error: Workers directory not found at $WORKERS_DIR${NC}"
    exit 1
fi

# List of workers
WORKERS=("audit-worker" "data-worker" "image-worker" "keys-worker" "pdf-worker" "turnstile-worker" "user-worker")

echo -e "${PURPLE}Installing npm dependencies for all workers...${NC}"
echo ""

# Counter for progress
total=${#WORKERS[@]}
current=0

# Install dependencies for each worker
for worker in "${WORKERS[@]}"; do
    current=$((current + 1))
    worker_path="$WORKERS_DIR/$worker"
    
    echo -e "${YELLOW}[$current/$total] Installing dependencies for $worker...${NC}"
    
    # Check if worker directory exists
    if [ ! -d "$worker_path" ]; then
        echo -e "${RED}❌ Warning: Worker directory not found: $worker_path${NC}"
        continue
    fi
    
    # Check if package.json exists
    if [ ! -f "$worker_path/package.json" ]; then
        echo -e "${RED}❌ Warning: package.json not found in $worker_path${NC}"
        continue
    fi
    
    # Change to worker directory and install dependencies
    cd "$worker_path"
    
    echo "   Running npm install in $worker_path..."
    if npm install; then
        echo -e "${GREEN}✅ Successfully installed dependencies for $worker${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies for $worker${NC}"
        exit 1
    fi
    
    echo ""
done

# Return to original directory
cd "$PROJECT_ROOT"

echo -e "${GREEN}🎉 All worker dependencies installed successfully!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "- Installed dependencies for $total workers"
echo "- All workers are ready for development/deployment"
echo ""
