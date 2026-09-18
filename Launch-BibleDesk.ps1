#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Turnkey 1-Click Launcher for BibleDesk on Windows & PowerShell
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
    cmd.exe /c "npm install --no-audit --no-fund"
}

Write-Host "Select an option to launch BibleDesk:"
Write-Host "  [1] Open BibleDesk in Web Browser (Default / Recommended)" -ForegroundColor Cyan
Write-Host "  [2] Run Environment & Health Doctor (Checks keys, database, setup)" -ForegroundColor Cyan
Write-Host "  [3] Build Production Web App" -ForegroundColor Cyan
Write-Host "  [4] Launch with Docker (Containerized)" -ForegroundColor Cyan
Write-Host "  [5] Exit"

$choice = Read-Host "Enter option (1-5, default 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

switch ($choice) {
    "1" {
        Write-Host "`n[*] Starting BibleDesk..." -ForegroundColor Green
        Start-Process "http://localhost:3000"
        cmd.exe /c "npm run dev"
    }
    "2" {
        Write-Host "`n[*] Running BibleDesk Health Doctor..." -ForegroundColor Green
        cmd.exe /c "npm run check:env"
    }
    "3" {
        Write-Host "`n[*] Building production web app..." -ForegroundColor Green
        cmd.exe /c "npm run build"
    }
    "4" {
        Write-Host "`n[*] Launching with Docker..." -ForegroundColor Green
        docker compose up -d
        Write-Host "`n[✓] BibleDesk running in Docker at http://localhost:3000" -ForegroundColor Green
    }
    Default {
        Write-Host "`nGoodbye!"
    }
}
