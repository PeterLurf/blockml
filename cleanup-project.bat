@echo off
echo ============================================
echo BlockML - Cleanup Script
echo ============================================
echo.
echo This script will remove redundant files and documentation
echo to keep the project clean and organized.
echo.
echo Files to be removed:
echo - Old debug batch files
echo - Redundant documentation files
echo - Backup files
echo.
pause
echo.

REM Remove old debug and test files
if exist "debug-connections.bat" del "debug-connections.bat"
if exist "debug-double-lines.bat" del "debug-double-lines.bat"
if exist "delete-connections-fix.bat" del "delete-connections-fix.bat"
if exist "clean-fix.bat" del "clean-fix.bat"
if exist "final-fix.bat" del "final-fix.bat"
if exist "final-optimizer-fix.bat" del "final-optimizer-fix.bat"
if exist "light-gray-only.bat" del "light-gray-only.bat"
if exist "quick-test.bat" del "quick-test.bat"

REM Remove redundant documentation
if exist "CONNECTION_DEBUG_STATUS.md" del "CONNECTION_DEBUG_STATUS.md"
if exist "CONNECTION_DELETE_COMPLETE.md" del "CONNECTION_DELETE_COMPLETE.md"
if exist "CONNECTION_FIX_DOCUMENTATION.md" del "CONNECTION_FIX_DOCUMENTATION.md"
if exist "CONNECTION_ISSUE_RESOLVED.md" del "CONNECTION_ISSUE_RESOLVED.md"
if exist "DESKTOP_CONVERSION_COMPLETE.md" del "DESKTOP_CONVERSION_COMPLETE.md"
if exist "UI_IMPROVEMENTS_COMPLETE.md" del "UI_IMPROVEMENTS_COMPLETE.md"

REM Remove old test files
if exist "test-connections-fix.js" del "test-connections-fix.js"
if exist "test-training.js" del "test-training.js"

REM Keep only essential files
echo.
echo Cleanup completed!
echo.
echo Remaining essential files:
echo - README.md (main documentation)
echo - DEVELOPMENT_GUIDE.md (development instructions)
echo - CODE_CLEANUP_COMPLETE.md (cleanup summary)
echo - PAN_ZOOM_ENHANCED.md (zoom/pan documentation)
echo - test-enhanced-pan-zoom.bat (current test script)
echo - start-desktop.bat (desktop launcher)
echo - build-desktop.bat (build script)
echo.
echo The project is now clean and organized!
pause
