@echo off
rem ===================================================================
rem  Virtual Museum 3D Hall - START (foreground)
rem
rem  Double-click this file. A console window opens, the server runs
rem  in it, and the browser is opened automatically.
rem  To stop: close this window or press Ctrl+C.
rem
rem  Usage:  start.bat        (server in this window + open browser)
rem  Port:   PORT environment variable, default 3001
rem
rem  ASCII only on purpose: non-ASCII bytes inside a .bat get mangled
rem  by the default console code page.
rem ===================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title Virtual Museum 3D Hall - server (port %PORT%)

if not defined PORT set "PORT=3001"
echo [museum3d] start, port %PORT%

where node >nul 2>&1
if errorlevel 1 (
  echo [museum3d] ERROR: Node.js not found in PATH.
  echo [museum3d] Install Node.js 20 or newer: https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [museum3d] first run: installing dependencies, please wait ...
  call npm install
  if errorlevel 1 (
    echo [museum3d] ERROR: npm install failed.
    pause
    exit /b 1
  )
)

if not exist "web\dist\index.html" (
  echo [museum3d] first run: building the frontend, please wait ...
  call npm run build
  if errorlevel 1 (
    echo [museum3d] ERROR: build failed.
    pause
    exit /b 1
  )
)

rem If something already listens on our port, just open the browser.
netstat -ano | findstr "LISTENING" | findstr ":%PORT% " >nul 2>&1
if not errorlevel 1 (
  echo [museum3d] port %PORT% is already in use, opening browser only.
  start "" "http://localhost:%PORT%"
  exit /b 0
)

echo [museum3d] browser will open in a few seconds.
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:%PORT%"

echo [museum3d] server is starting. Keep this window open.
echo [museum3d] Close this window or press Ctrl+C to stop the server.
echo ---------------------------------------------------------------
call npm run start
echo ---------------------------------------------------------------
echo [museum3d] server exited. Read the messages above for the cause.
pause
exit /b 0
