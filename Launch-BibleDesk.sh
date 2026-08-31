#!/usr/bin/env bash
# 1-Click Launcher for BibleDesk on macOS & Linux

echo ""
echo "✦ =============================================================== ✦"
echo "             BibleDesk — Open Bible Study Desk"
echo "✦ =============================================================== ✦"
echo ""

if ! command -v node &> /dev/null; then
    echo "[!] Node.js was not found on your system."
    echo "You can use BibleDesk instantly in your browser at: https://bibledesk.org"
    echo "Or install Node.js from https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[*] First-time setup: Installing required components..."
    npm install --no-audit --no-fund
fi

echo "Select an option to launch BibleDesk:"
echo "  [1] Open BibleDesk in Web Browser (Default / Recommended)"
echo "  [2] Open BibleDesk Desktop App (Electron)"
echo "  [3] Build Installers (.dmg / .AppImage / Android APK / Chrome Extension)"
echo "  [4] Exit"
echo ""

read -p "Enter option (1-4, default 1): " choice
choice=${choice:-1}

case "$choice" in
    1)
        echo "[*] Starting BibleDesk at http://localhost:3000..."
        if command -v open &> /dev/null; then
            open "http://localhost:3000" &
        elif command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:3000" &
        fi
        npm run dev
        ;;
    2)
        echo "[*] Launching Desktop App..."
        if [ ! -d "apps/desktop/node_modules" ]; then
            npm --prefix apps/desktop install
        fi
        npm --prefix apps/desktop run dev
        ;;
    3)
        echo "[*] Packaging all platform targets..."
        npm run package:all
        ;;
    *)
        echo "Goodbye!"
        ;;
esac
