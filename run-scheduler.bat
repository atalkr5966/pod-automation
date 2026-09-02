@echo off
title POD Automation - Background Scheduler Daemon
cd /d "%~dp0"
echo Starting POD Automation Background Scheduler Daemon...
node automation.js
pause
