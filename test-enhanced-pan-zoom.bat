@echo off
echo ============================================
echo Enhanced Pan and Zoom Testing
echo ============================================
echo.
echo Starting the development server...
echo.
echo ENHANCED PAN AND ZOOM TEST CHECKLIST:
echo ====================================
echo.
echo PANNING TESTS:
echo -------------
echo [ ] Left-click and drag on empty canvas (should pan)
echo [ ] Middle-click and drag anywhere (should pan)
echo [ ] Hold Space + left-click drag (should pan with blue indicator)
echo [ ] Left-click on nodes (should select, not pan)
echo [ ] Cursor changes: default -^> grab -^> grabbing
echo.
echo ZOOM TESTS:
echo ----------
echo [ ] Mouse wheel scroll (should zoom toward mouse)
echo [ ] Zoom sensitivity adapts to current level
echo [ ] + and - toolbar buttons work
echo [ ] Ctrl/Cmd + Plus/Minus keyboard shortcuts
echo [ ] Ctrl/Cmd + 0 resets view
echo [ ] Zoom indicator updates in real-time
echo.
echo VISUAL FEEDBACK TESTS:
echo ---------------------
echo [ ] Space key shows "SPACE: Pan Mode" indicator
echo [ ] Cursor states change appropriately
echo [ ] Help text shows all available controls
echo [ ] Smooth 60fps performance during operations
echo.
echo PERFORMANCE TESTS:
echo -----------------
echo [ ] No frame drops during continuous pan/zoom
echo [ ] Smooth operation with multiple nodes
echo [ ] No lag when switching between operations
echo.
echo Press Ctrl+C to stop the server when testing is complete
echo.

npm run dev
