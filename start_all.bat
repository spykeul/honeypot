@echo off
echo ===============================
echo  STARTING HONEYPOT SYSTEM...
echo ===============================

echo.
echo Starting Backend (Port 5001)...
start cmd /k "cd server && npm install && node server.js"

echo.
echo Starting Frontend (Port 5173)...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Everything is running!
echo Backend: http://localhost:5001
echo Frontend: http://localhost:5173
echo.
pause