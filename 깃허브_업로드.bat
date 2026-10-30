@echo off
title GitHub Upload
cd /d "C:\Users\ghdix\.gemini\antigravity\scratch\cafe-cost-calculator"

echo ========================================================
echo   [Cafe Cost Calculator] Uploading to GitHub...
echo ========================================================
echo.
echo * If a browser popup opens, click [Sign in with your browser] or [Authorize].
echo.

git add -A
git commit -m "Update secure monetization and owner admin mode"
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] GitHub upload completed!
    echo   Check URL: https://github.com/thryu007-sys/cafe-cost-calculator
    echo ========================================================
) else (
    echo.
    echo [ERROR] Upload failed. Please check the message above.
)
echo.
pause
