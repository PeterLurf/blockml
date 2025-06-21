@echo off
echo Building BlockML Desktop Application...
echo.

echo [1/4] Installing dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [2/4] Building Next.js application...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build Next.js application!
    pause
    exit /b 1
)

echo.
echo [3/4] Building Electron application...
call npm run electron-pack
if %errorlevel% neq 0 (
    echo Failed to build Electron application!
    pause
    exit /b 1
)

echo.
echo [4/4] Build completed successfully!
echo Check the 'dist' folder for the installer.
echo.

dir dist /b
echo.
echo Build completed! You can now distribute the installer.
pause
