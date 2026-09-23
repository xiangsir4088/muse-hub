@echo off
rem ===================================================================
rem  Virtual Museum 3D Hall - RESTART
rem
rem  Stops whatever runs on the museum port, then starts the server
rem  again in this window (same behaviour as start.bat).
rem
rem  ASCII only on purpose.
rem ===================================================================
setlocal EnableExtensions
cd /d "%~dp0"

call "%~dp0stop.bat"
if errorlevel 1 (
  echo [museum3d] ERROR: stop step failed, not starting.
  pause
  exit /b 1
)
call "%~dp0start.bat"
