@echo off
echo Clearing locked Electron files...

REM Stop any running Node processes
taskkill /f /im node.exe 2>nul
taskkill /f /im electron.exe 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Force remove the problematic directory
rmdir /s /q "node_modules\.ignored" 2>nul
rmdir /s /q "node_modules\electron" 2>nul

echo Done! You can now try the rebuild again.
pause