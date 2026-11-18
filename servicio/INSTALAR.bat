@echo off
title Instalar corrector local (LanguageTool)
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Este instalador necesita permisos de administrador.
  echo  Cierra esta ventana, haz clic derecho en INSTALAR.bat
  echo  y elige "Ejecutar como administrador".
  echo.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-servicio.ps1"
echo.
pause
