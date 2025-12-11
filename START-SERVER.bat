@echo off
echo ========================================
echo   JaZeR Visual Effects - Local Server
echo ========================================
echo.
echo Starting local server on port 8000...
echo.
echo Once started, open your browser to:
echo   http://localhost:8000/TEST-FIXES.html
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0"

rem Try Python 3 first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python...
    echo.
    python -m http.server 8000
    goto :end
)

rem Try Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 2...
    echo.
    python2 -m SimpleHTTPServer 8000
    goto :end
)

rem Try Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server...
    echo Installing http-server (one-time setup)...
    call npm install -g http-server
    echo.
    http-server -p 8000
    goto :end
)

rem No server found
echo ERROR: No server found!
echo.
echo Please install one of the following:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause

:end
