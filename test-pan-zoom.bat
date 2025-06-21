@echo off
echo ============================================
echo Testing Pan and Zoom Functionality
echo ============================================
echo.
echo Starting the development server...
echo.
echo Pan and Zoom Test Instructions:
echo --------------------------------
echo 1. Pan: Middle-click and drag on canvas
echo 2. Zoom: Scroll mouse wheel (no Ctrl needed)
echo 3. Zoom Buttons: Use + and - buttons in top right
echo 4. Reset View: Use the maximize button to reset
echo.
echo Expected Behavior:
echo - Canvas should move when middle-click dragging
echo - Zoom should work with scroll wheel only
echo - Left-click should select/deselect without panning
echo - Zoom buttons should work correctly
echo - Zoom indicator should update in real-time
echo - Nodes should stay properly positioned during pan/zoom
echo.
echo Press Ctrl+C to stop the server when testing is complete
echo.

npm run dev
