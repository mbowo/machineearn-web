@echo off
title MachineEarn V16
cd /d "%~dp0web"
echo Starting MachineEarn V16...
echo Open http://localhost:3000 in your browser.
echo Keep this window open while using the website.
echo.
node server.js
pause
