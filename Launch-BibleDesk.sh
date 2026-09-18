#!/usr/bin/env bash
# BibleDesk — Turnkey 1-Click Launcher for macOS & Linux

set -e

echo ""
echo "✦ =============================================================== ✦"
echo "             BibleDesk — Open Bible Study Desk                    "
echo "✦ =============================================================== ✦"
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[!] Node.js was not found on your system."
    echo ""
    echo "You can use BibleDesk instantly in your browser at: https://bibledesk.org"
    echo "Or install Node.js (free): https://nodejs.org"
    echo ""
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[*] First-time setup: Installing required components..."
    npm install --no-audit --no-fund || npm install --legacy-peer-deps
fi

echo "Select an option to launch BibleDesk:"
echo "  [1] Open BibleDesk in Web Browser (Default / Recommended)"
echo "  [2] Run Environment & Health Doctor (Checks keys, database, setup)"
echo "  [3] Build Production Web App"
echo "  [4] Launch with Docker (Containerized)"
echo "  [5] Exit"
echo ""

read -p "Enter option (1-5, default 1): " choice
choice=${choice:-1}

case "$choice" in
    1)
        echo "[*] Starting BibleDesk at http://localhost:3000 ..."
        if command -v open >/dev/null 2>&1; then
            open "http://localhost:3000" &
        elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open "http://localhost:3000" &
        fi
        npm run dev
        ;;
    2)
        echo "[*] Running BibleDesk Health Doctor..."
        npm run check:env
        ;;
    3)
        echo "[*] Building production web app..."
        npm run build
        ;;
    4)
        echo "[*] Launching with Docker..."
        docker compose up -d
        echo "[✓] BibleDesk is running in Docker at http://localhost:3000"
        ;;
    *)
        echo "Goodbye!"
        exit 0
        ;;
esac
