#!/bin/bash

# Start AI Services Script
# This script starts both the AI Backend Service and AI Studio Frontend

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting AI Services...${NC}"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi

# Function to check if a port is in use
is_port_in_use() {
    if command -v lsof &> /dev/null; then
        lsof -i:"$1" &> /dev/null
        return $?
    elif command -v netstat &> /dev/null; then
        netstat -tuln | grep ":$1 " &> /dev/null
        return $?
    else
        echo -e "${RED}Warning: Cannot check if port $1 is in use. Neither lsof nor netstat is available.${NC}"
        return 1
    fi
}

# Check if ports are available
if is_port_in_use 3000; then
    echo -e "${RED}Error: Port 3000 is already in use. AI Studio frontend cannot start.${NC}"
    exit 1
fi

if is_port_in_use 3001; then
    echo -e "${RED}Error: Port 3001 is already in use. AI Backend service cannot start.${NC}"
    exit 1
fi

# Create log directory if it doesn't exist
mkdir -p logs

# Start AI Backend Service
echo -e "${GREEN}Starting AI Backend Service...${NC}"
cd ai-backend
npm install &> ../logs/ai-backend-install.log
if [ $? -ne 0 ]; then
    echo -e "${RED}Error installing AI Backend dependencies. Check logs/ai-backend-install.log for details.${NC}"
    exit 1
fi

# Start the backend service in the background
echo -e "${GREEN}AI Backend Service installing dependencies completed. Starting server...${NC}"
npm run dev > ../logs/ai-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}AI Backend Service started with PID: $BACKEND_PID${NC}"
echo $BACKEND_PID > ../logs/ai-backend.pid

# Wait a bit to ensure the backend starts
sleep 2

# Check if backend is still running
if ! kill -0 $BACKEND_PID &> /dev/null; then
    echo -e "${RED}Error: AI Backend Service failed to start. Check logs/ai-backend.log for details.${NC}"
    exit 1
fi

# Change back to the parent directory
cd ..

# Start AI Studio Frontend
echo -e "${GREEN}Starting AI Studio Frontend...${NC}"
cd ai-studio
npm install &> ../logs/ai-studio-install.log
if [ $? -ne 0 ]; then
    echo -e "${RED}Error installing AI Studio dependencies. Check logs/ai-studio-install.log for details.${NC}"
    # Kill backend process before exiting
    kill $BACKEND_PID
    exit 1
fi

# Start the frontend in the background
echo -e "${GREEN}AI Studio installing dependencies completed. Starting application...${NC}"
npm start > ../logs/ai-studio.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}AI Studio Frontend started with PID: $FRONTEND_PID${NC}"
echo $FRONTEND_PID > ../logs/ai-studio.pid

# Wait a bit to ensure the frontend starts
sleep 2

# Check if frontend is still running
if ! kill -0 $FRONTEND_PID &> /dev/null; then
    echo -e "${RED}Error: AI Studio Frontend failed to start. Check logs/ai-studio.log for details.${NC}"
    # Kill backend process before exiting
    kill $BACKEND_PID
    exit 1
fi

# Change back to the parent directory
cd ..

echo -e "${BLUE}Services started successfully!${NC}"
echo -e "${GREEN}AI Backend Service is running on http://localhost:3001${NC}"
echo -e "${GREEN}AI Studio Frontend is running on http://localhost:3000${NC}"
echo -e "${BLUE}To stop the services, run: ./stop-ai-services.sh${NC}"

# Create a stop script
cat > stop-ai-services.sh << 'EOL'
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
EOL

chmod +x stop-ai-services.sh

exit 0