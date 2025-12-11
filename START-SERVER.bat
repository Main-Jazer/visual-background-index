@echo off
cls
echo.
echo ========================================
echo    IMPORTANT: HOW TO VIEW EFFECTS
echo ========================================
echo.
echo ERROR: You are trying to open files directly!
echo.
echo Files opened with "file://" will NOT work because:
echo   - ES6 modules require HTTP protocol
echo   - Security restrictions block file:// imports
echo.
echo ========================================
echo    CORRECT WAY TO VIEW EFFECTS:
echo ========================================
echo.
echo 1. Double-click THIS FILE to start server
echo 2. Wait for "Serving HTTP" message
echo 3. Open browser to: http://localhost:8000
echo 4. Click any effect from the gallery
echo.
echo DO NOT double-click the HTML files directly!
echo.
echo ========================================
echo    Starting Server Now...
echo ========================================
echo.
echo Server will start on: http://localhost:8000
echo.
echo After server starts:
echo   1. Open: http://localhost:8000/index.html
echo   2. Browse effects
echo   3. Click to launch
echo.
echo Press Ctrl+C to stop server
echo ========================================
echo.

cd /d "%~dp0"

python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting Python HTTP Server...
    echo.
    echo READY! Open your browser to: http://localhost:8000/index.html
    echo.
    start http://localhost:8000/index.html
    python -m http.server 8000
    goto :end
)

python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting Python HTTP Server...
    echo.
    echo READY! Open your browser to: http://localhost:8000/index.html
    echo.
    start http://localhost:8000/index.html
    python3 -m http.server 8000
    goto :end
)

node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Installing http-server...
    call npm install -g http-server
    echo.
    echo READY! Open your browser to: http://localhost:8000/index.html
    echo.
    start http://localhost:8000/index.html
    http-server -p 8000
    goto :end
)

echo.
echo ERROR: No server found!
echo Please install Python or Node.js first.
echo.
pause

:end
