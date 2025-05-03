@echo off
SETLOCAL

echo Starting AI Services...

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Start AI Backend Service
echo Starting AI Backend Service...
cd ai-backend
start "AI Backend Service" /B cmd /c "npm install && npm run dev > ..\logs\ai-backend.log 2>&1"
if %ERRORLEVEL% NEQ 0 (
    echo Error starting AI Backend Service. Check logs\ai-backend.log for details.
    exit /b 1
)

REM Wait a bit to ensure the backend starts
timeout /t 5 > NUL

REM Change back to the parent directory
cd ..

REM Start AI Studio Frontend
echo Starting AI Studio Frontend...
cd ai-studio
start "AI Studio Frontend" /B cmd /c "npm install && npm start > ..\logs\ai-studio.log 2>&1"
if %ERRORLEVEL% NEQ 0 (
    echo Error starting AI Studio Frontend. Check logs\ai-studio.log for details.
    exit /b 1
)

REM Change back to the parent directory
cd ..

echo Services started successfully!
echo AI Backend Service is running on http://localhost:3001
echo AI Studio Frontend is running on http://localhost:3000
echo To stop the services, close the command prompt windows or use Task Manager

ENDLOCAL