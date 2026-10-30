@echo off
chcp 65001 > nul
title 카페 원가계산기 (100% 평생 무료)
cd /d "C:\Users\ghdix\.gemini\antigravity\scratch\cafe-cost-calculator"

echo ========================================================
echo   ☕ 카페 원가계산기 (100%% 평생 무료 버전) 실행 중...
echo ========================================================
echo.
echo 1. 잠시 후 인터넷 브라우저가 자동으로 열립니다.
echo 2. 접속 주소: http://localhost:8080
echo.
echo ※ 안내: 이 검은색 창을 닫으면 계산기 프로그램이 종료됩니다.
echo   계산기를 사용하시는 동안에는 이 창을 '최소화(-)'해 두세요.
echo ========================================================
echo.

start http://localhost:8080
"C:\Users\ghdix\AppData\Local\Programs\Python\Python311\python.exe" server.py

pause
