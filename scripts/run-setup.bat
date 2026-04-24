@echo off
echo ========================================
echo  CoimpactoB CRM - Azure Auto-Setup
echo ========================================
echo.
echo Este archivo ejecutara el script de PowerShell.
echo Si se cierra la ventana muy rapido, es porque no tienes Azure CLI instalado.
echo.
echo Presiona cualquier tecla para continuar...
pause >nul

echo.
echo Verificando PowerShell...

powershell -ExecutionPolicy Bypass -Command "& { .\scripts\setup-azure.ps1 }"

echo.
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
