@echo off
TITLE Lumina Invest Launcher
COLOR 0B
echo ===================================================
echo             🌟 LUMINA INVEST LAUNCHER 🌟
echo ===================================================
echo.
echo Starting the application... Please wait.

:: Check if node_modules exists, if not, run npm install
IF NOT EXIST "node_modules\" (
    echo [INFO] First time setup detected. Installing dependencies...
    call npm install
    echo.
)

:: Start the Backend Server in a new minimized window
echo [INFO] Starting Backend Server (Port 3001)...
start "Lumina Backend" /MIN cmd /c "node server.js"

:: Give the server a couple of seconds to start
timeout /t 2 /nobreak > NUL

:: Start the Frontend Server in a new window
echo [INFO] Starting Frontend Interface (Vite)...
start "Lumina Frontend" cmd /k "npm run dev"

echo.
echo ===================================================
echo ✅ All systems go! 
echo.
echo The Backend is running quietly in the background.
echo The Frontend window will stay open to show you logs.
echo.
echo Open your browser and go to: http://localhost:5173
echo ===================================================
echo.
echo Press any key to close this launcher menu...
pause > NUL
