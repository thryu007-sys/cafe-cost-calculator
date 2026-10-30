@echo off
chcp 65001 > nul
title 깃허브(GitHub) 자동 업로드
cd /d "C:\Users\ghdix\.gemini\antigravity\scratch\cafe-cost-calculator"

echo ========================================================
echo   ☕ 카페 원가계산기를 깃허브에 업로드합니다...
echo ========================================================
echo.

git add -A
git commit -m "100%% 무료 평생 버전 업데이트"
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   ★ 깃허브 업로드가 성공적으로 완료되었습니다!
    echo   확인 주소: https://github.com/thryu007-sys/cafe-cost-calculator
    echo ========================================================
) else (
    echo.
    echo ※ 업로드 중 오류가 발생했습니다. 창의 내용을 확인해 주세요.
)
echo.
pause
