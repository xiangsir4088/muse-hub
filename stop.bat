@echo off
rem ===================================================================
rem  Virtual Museum 3D Hall - STOP
rem
rem  Kills the process listening on the museum port (started by
rem  start.bat) and verifies the port is free again.
rem
rem  Port: PORT environment variable, default 3001
rem
rem  ASCII only on purpose.
rem ===================================================================
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not defined PORT set "PORT=3001"
echo [museum3d] stop, port %PORT%

set "FOUND=0"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%PORT% "') do (
  set "FOUND=1"
  echo [museum3d] stopping PID %%p ...
  taskkill /F /T /PID %%p >nul 2>&1
)

if "!FOUND!"=="0" (
  echo [museum3d] nothing was listening on port %PORT%.
  exit /b 0
)

rem Give the port a few seconds to actually close.
set /a TRIES=0
:wait
ping -n 2 127.0.0.1 >nul 2>&1
netstat -ano | findstr "LISTENING" | findstr ":%PORT% " >nul 2>&1
if errorlevel 1 goto :done
set /a TRIES+=1
if !TRIES! LSS 10 goto :wait

echo [museum3d] ERROR: port %PORT% is still busy. Try running as administrator.
exit /b 1

:done
echo [museum3d] stopped.
exit /b 0
