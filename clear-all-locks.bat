@echo off
echo Stopping all Node.js and Electron processes...

:: Kill all node processes
taskkill /f /im node.exe 2>nul
taskkill /f /im electron.exe 2>nul
taskkill /f /im "Super Comic Organizer.exe" 2>nul

:: Wait a moment for processes to fully terminate
timeout /t 3 /nobreak >nul

echo Removing locked directories...

:: Remove release directory completely
if exist "release" (
    echo Removing release directory...
    rmdir /s /q "release" 2>nul
    if exist "release" (
        echo Some files still locked, trying alternative method...
        rd /s /q "release" 2>nul
    )
)

:: Remove dist directory
if exist "dist" (
    echo Removing dist directory...
    rmdir /s /q "dist" 2>nul
)

:: Remove node_modules if it exists (optional, uncomment if needed)
:: if exist "node_modules" (
::     echo Removing node_modules...
::     rmdir /s /q "node_modules" 2>nul
:: )

echo Waiting for file system to settle...
timeout /t 2 /nobreak >nul

echo Cleanup complete! You can now run npm run package:win
pause