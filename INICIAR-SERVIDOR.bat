@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js desde https://nodejs.org y vuelva a ejecutar este archivo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias la primera vez...
  call npm install
)
echo.
echo Arrancando servidor. En el movil abra la IP que aparezca, puerto 8787.
echo Contraseña inicial: afid2026
echo.
call npm start
pause
