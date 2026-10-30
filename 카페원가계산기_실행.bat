@echo off
title Cafe Cost Calculator PRO
cd /d "C:\Users\ghdix\.gemini\antigravity\scratch\cafe-cost-calculator"

echo ========================================================
echo   [Cafe Cost Calculator PRO] Starting...
echo ========================================================
echo.
echo 1. Browser will open in Owner VIP mode.
echo 2. Address: http://localhost:8080
echo.
echo * Keep this black window minimized while using the calculator.
echo ========================================================
echo.

start http://localhost:8080?admin_secret=CAFE702-BOSS
"C:\Users\ghdix\AppData\Local\Programs\Python\Python311\python.exe" server.py

pause
