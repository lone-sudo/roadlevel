@echo off
title RoadLevel Server
cls
echo ================================================================
echo                   ROADLEVEL IS STARTING UP
echo ================================================================
echo.
echo 1. Opening RoadLevel on your laptop in your browser...
echo.
echo 2. TO OPEN ON YOUR PHONE:
echo    a) Make sure your phone is connected to the same Wi-Fi.
echo    b) Open Chrome on your phone.
echo    c) Type this exact address into Chrome's top address bar:
echo.
echo          http://192.168.88.125:5173
echo.
echo ================================================================
echo NOTE: Leave this black window OPEN while you use RoadLevel.
echo When you are done, you can close this window.
echo ================================================================
echo.
start http://localhost:5173
npm run dev -- --host 0.0.0.0
