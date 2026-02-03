@echo off
REM MCP Proxy Server Start Script (Windows)

echo Starting MCP HTTP-to-STDIO Proxy Server...
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the server
echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop
echo.
node index.js

pause
