#!/bin/bash

# Stop AI Services Script

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping AI Services...${NC}"

# Stop Backend Service
if [ -f logs/ai-backend.pid ]; then
    BACKEND_PID=$(cat logs/ai-backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${GREEN}Stopping AI Backend Service (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        rm logs/ai-backend.pid
    else
        echo -e "${RED}AI Backend Service is not running.${NC}"
    fi
else
    echo -e "${RED}AI Backend Service PID file not found.${NC}"
fi

# Stop Frontend Service
if [ -f logs/ai-studio.pid ]; then
    FRONTEND_PID=$(cat logs/ai-studio.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${GREEN}Stopping AI Studio Frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID
        rm logs/ai-studio.pid
    else
        echo -e "${RED}AI Studio Frontend is not running.${NC}"
    fi
else
    echo -e "${RED}AI Studio Frontend PID file not found.${NC}"
fi

echo -e "${BLUE}AI Services stopped.${NC}"
