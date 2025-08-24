@echo off
echo Clearing all locked files for packaging...

REM Stop any running processes
echo Stopping Super Comic Organizer processes...
taskkill /f /im "Super Comic Organizer.exe" 2>nul
taskkill /f /im electron.exe 2>nul
taskkill /f /im node.exe 2>nul

REM Wait a moment for processes to fully terminate
echo Waiting for processes to terminate...
timeout /t 3 /nobreak >nul

REM Force remove problematic directories
echo Removing locked directories...
rmdir /s /q "node_modules\.ignored" 2>nul
rmdir /s /q "node_modules\electron" 2>nul
rmdir /s /q "release" 2>nul

echo Cleanup complete! You can now run the package command.
pause