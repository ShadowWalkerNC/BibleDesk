#!/usr/bin/env pwsh
<#
.SYNOPSIS
    1-Click Launcher for BibleDesk on Windows & PowerShell
#>

Write-Host "`n✦ =============================================================== ✦" -ForegroundColor Yellow
Write-Host "             BibleDesk — Open Bible Study Desk" -ForegroundColor Cyan
Write-Host "✦ =============================================================== ✦`n" -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js was not found on your system." -ForegroundColor Red
    Write-Host "`nYou can use BibleDesk instantly in your browser at: https://bibledesk.org" -ForegroundColor Green
    Write-Host "Or install Node.js free from: https://nodejs.org`n"
    Pause
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[*] First-time setup: Installing required components..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
}

Write-Host "Select an option to launch BibleDesk:"
Write-Host "  [1] Open BibleDesk in Web Browser (Default / Recommended)" -ForegroundColor Cyan
Write-Host "  [2] Open BibleDesk Desktop App (Electron)" -ForegroundColor Cyan
Write-Host "  [3] Build Installers (.exe, Android APK, Chrome Extension)" -ForegroundColor Cyan
Write-Host "  [4] Exit"

$choice = Read-Host "Enter option (1-4, default 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

switch ($choice) {
    "1" {
        Write-Host "`n[*] Starting BibleDesk..." -ForegroundColor Green
        Start-Process "http://localhost:3000"
        npm run dev
    }
    "2" {
        Write-Host "`n[*] Launching Desktop App..." -ForegroundColor Green
        if (-not (Test-Path "apps/desktop/node_modules")) {
            npm --prefix apps/desktop install
        }
        npm --prefix apps/desktop run dev
    }
    "3" {
        Write-Host "`n[*] Assembling packages into /dist..." -ForegroundColor Green
        npm run package:all
    }
    Default {
        Write-Host "`nGoodbye!"
    }
}
