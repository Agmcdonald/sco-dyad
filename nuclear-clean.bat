@echo off
echo ========================================
echo NUCLEAR CLEANUP - Clearing ALL locks
echo ========================================

REM Stop all Node.js and Electron processes
echo Killing all Node.js processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im electron.exe 2>nul
taskkill /f /im "Super Comic Organizer.exe" 2>nul

REM Wait for processes to fully terminate
echo Waiting for processes to terminate...
timeout /t 5 /nobreak >nul

REM Use PowerShell to force unlock files
echo Unlocking files with PowerShell...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*node*' -or $_.ProcessName -like '*electron*'} | Stop-Process -Force" 2>nul

REM Another wait
timeout /t 2 /nobreak >nul

REM Remove the problematic directories with retries
echo Removing problematic directories...

for /L %%i in (1,1,3) do (
    if exist "node_modules\.ignored_electron" (
        echo Attempt %%i: Removing .ignored_electron...
        rmdir /s /q "node_modules\.ignored_electron" 2>nul
        if not exist "node_modules\.ignored_electron" goto :electron_removed
        timeout /t 2 /nobreak >nul
    )
)
:electron_removed

REM Remove other cache directories
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul
if exist ".vite" rmdir /s /q ".vite" 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul

REM Clear all npm caches
echo Clearing npm cache...
npm cache clean --force 2>nul

REM Clear Windows temp files that might be holding locks
echo Clearing Windows temp files...
del /q /s "%TEMP%\electron*" 2>nul
del /q /s "%TEMP%\node*" 2>nul

echo ========================================
echo Cleanup complete!
echo You can now run: npm install
echo ========================================
pause