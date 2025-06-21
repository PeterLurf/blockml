@echo off
echo Starting BlockML Desktop Application...
echo.

echo [1/3] Installing dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [2/3] Building Next.js application...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build application!
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Electron application...
call npm run electron

pause
