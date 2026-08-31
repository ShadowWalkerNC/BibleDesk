@echo off
setlocal enabledelayedexpansion
title BibleDesk — 1-Click Bible Study Desk

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
echo Please choose how you want to open BibleDesk:
echo.
echo  [1] Start BibleDesk (Opens directly in your web browser - Recommended)
echo  [2] Start Desktop App (Native Electron window)
echo  [3] Build All Installers (.exe, Android APK, Chrome Extension)
echo  [4] Exit
echo.

set /p choice="Enter your choice (1-4, default is 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="1" goto START_WEB
if "%choice%"=="2" goto START_DESKTOP
if "%choice%"=="3" goto BUILD_ALL
if "%choice%"=="4" goto END

:START_WEB
echo.
echo [*] Starting BibleDesk at http://localhost:3000 ...
echo [*] Opening your default browser...
start http://localhost:3000
call npm run dev
goto END

:START_DESKTOP
echo.
echo [*] Checking desktop components...
if not exist "apps\desktop\node_modules\" (
    echo [*] Setting up Desktop Electron shell...
    call npm run desktop:install
)
echo [*] Launching BibleDesk Desktop App...
call npm run desktop:dev
goto END

:BUILD_ALL
echo.
echo [*] Assembling all platform packages into /dist folder...
call npm run package:all
echo.
echo [✓] Build complete! Check the /dist folder for your installers.
pause
goto END

:END
echo.
echo Thank you for using BibleDesk!
