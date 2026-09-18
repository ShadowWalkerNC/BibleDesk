@echo off
setlocal enabledelayedexpansion
title BibleDesk — Turnkey Bible Study Desk

echo.
echo ===============================================================
echo            ✦ BibleDesk — Open Bible Study Desk ✦
echo ===============================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js was not found on your system.
    echo.
    echo Non-tech Quick Option:
    echo You can use BibleDesk right in your browser without installing anything!
    echo Visit: https://bibledesk.org
    echo.
    echo Or download Node.js (free): https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, install if missing
if not exist "node_modules\" (
    echo [*] First-time setup: Installing required components...
    echo     (This only happens once and takes ~30 seconds)
    echo.
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo.
        echo [!] Installation encountered an issue. Retrying with legacy peer deps...
        call npm install --legacy-peer-deps
    )
)

echo.
echo Select an option to launch BibleDesk:
echo.
echo  [1] Start BibleDesk (Opens directly in your web browser - Recommended)
echo  [2] Run Environment & Health Doctor (Checks keys, database, and setup)
echo  [3] Build Production Web App (Next.js standalone build)
echo  [4] Launch with Docker (1-Click containerized spin-up)
echo  [5] Exit
echo.

set /p choice="Enter your choice (1-5, default is 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="1" goto START_WEB
if "%choice%"=="2" goto RUN_DOCTOR
if "%choice%"=="3" goto BUILD_PROD
if "%choice%"=="4" goto START_DOCKER
if "%choice%"=="5" goto END

:START_WEB
echo.
echo [*] Starting BibleDesk at http://localhost:3000 ...
echo [*] Opening your default browser...
start http://localhost:3000
call npm run dev
goto END

:RUN_DOCTOR
echo.
echo [*] Running BibleDesk Health Doctor...
call npm run check:env
echo.
pause
goto END

:BUILD_PROD
echo.
echo [*] Building production Next.js application...
call npm run build
echo.
echo [✓] Build complete! You can run 'npm start' to serve the production build.
pause
goto END

:START_DOCKER
echo.
echo [*] Launching BibleDesk in Docker...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Docker was not found on your PATH. Please install Docker Desktop: https://docker.com
    pause
    goto END
)
call docker compose up -d
echo.
echo [✓] BibleDesk is running in Docker at http://localhost:3000!
echo     View logs with: docker compose logs -f
echo     Stop with:      docker compose down
pause
goto END

:END
echo.
echo Thank you for using BibleDesk!
