@echo off
echo Forcing cleanup of all locks and processes...

REM Kill any running Electron processes
taskkill /f /im electron.exe 2>nul
taskkill /f /im "Super Comic Organizer.exe" 2>nul

REM Kill any Node.js processes that might be hanging
taskkill /f /im node.exe 2>nul

REM Wait a moment for processes to fully terminate
timeout /t 3 /nobreak >nul

REM Remove problematic directories
if exist "node_modules\.ignored_electron" (
    echo Removing .ignored_electron directory...
    rmdir /s /q "node_modules\.ignored_electron" 2>nul
)

if exist "node_modules\.cache" (
    echo Removing .cache directory...
    rmdir /s /q "node_modules\.cache" 2>nul
)

if exist "dist" (
    echo Removing dist directory...
    rmdir /s /q "dist" 2>nul
)

if exist ".vite" (
    echo Removing .vite directory...
    rmdir /s /q ".vite" 2>nul
)

REM Clear npm cache
echo Clearing npm cache...
npm cache clean --force 2>nul

echo Cleanup complete. You can now run: npm install
pause