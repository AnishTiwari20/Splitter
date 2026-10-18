@echo off
title Splitter - Public Internet Sharing
cd /d "%~dp0"
echo ==============================================================
echo   Generating a free public HTTPS internet link for Splitter...
echo ==============================================================
echo.
echo Make sure your server is running (double-click start.bat first).
echo.
npx localtunnel --port 3000
pause
