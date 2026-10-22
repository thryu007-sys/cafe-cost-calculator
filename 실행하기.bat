@echo off
chcp 65001 > nul
title 카페 메뉴 원가계산기 실행기
cd /d "C:\Users\ghdix\.gemini\antigravity\scratch\cafe-cost-calculator"

echo ===================================================
echo   ☕ 카페 메뉴 원가계산기를 실행하고 있습니다...
echo ===================================================
echo.
echo 1. 웹 브라우저를 자동으로 엽니다.
echo 2. 접속 주소: http://localhost:8080
echo.
echo ※ 주의: 이 검은색 창을 닫으면 원가계산기 서버가 종료됩니다.
echo   사용하시는 동안에는 이 창을 최소화해 두세요.
echo ===================================================
echo.

start http://localhost:8080
python server.py

pause
