@echo off
echo Stopping Dyad and all related processes...

:: Kill Dyad processes specifically
taskkill /f /im dyad.exe 2>nul
taskkill /f /im "Dyad.exe" 2>nul

:: Kill all node and electron processes
taskkill /f /im node.exe 2>nul
taskkill /f /im electron.exe 2>nul
taskkill /f /im "Super Comic Organizer.exe" 2>nul

:: Wait for processes to fully terminate
timeout /t 5 /nobreak >nul

echo Removing locked directories...

:: Remove release directory completely
if exist "release" (
    echo Removing release directory...
    rmdir /s /q "release" 2>nul
    if exist "release" (
        echo Trying alternative removal method...
        rd /s /q "release" 2>nul
        if exist "release" (
            echo Some files may still be locked. Please run LockHunter on any remaining files.
        )
    )
)

:: Remove dist directory
if exist "dist" (
    echo Removing dist directory...
    rmdir /s /q "dist" 2>nul
)

echo Waiting for file system to settle...
timeout /t 3 /nobreak >nul

echo Cleanup complete!
echo.
echo Next steps:
echo 1. Make sure Dyad editor is completely closed
echo 2. Run: npm run package:win
echo.
pause