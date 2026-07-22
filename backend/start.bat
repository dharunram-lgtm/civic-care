@echo off
title CIVIC CARE Platform
cd /d "%~dp0"

echo ============================================
echo    CIVIC CARE - Intelligent Automation
echo    AI-Powered Civic Issue Management
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if MongoDB is running
echo [*] Checking MongoDB connection...
node -e "require('net').connect(27017, 'localhost', () => { process.exit(0); }).on('error', () => { process.exit(1); })" >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Warning: MongoDB is not running on localhost:27017
    echo [!] The app will start but database features won't work.
    echo [!] Make sure MongoDB is installed and running.
    echo.
)

:: Install dependencies if needed
if not exist "node_modules\" (
    echo [*] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [!] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [+] Dependencies installed successfully.
    echo.
)

:: Start the server
echo [*] Starting CIVIC CARE server...
echo [*] Open http://localhost:3000 in your browser
echo.
echo    Landing Page:  http://localhost:3000
echo    Report Issue:  http://localhost:3000/citizen-report.html
echo    Dashboard:     http://localhost:3000/officer-dashboard.html
echo.
echo ============================================
echo.

call npx node server.js

pause
