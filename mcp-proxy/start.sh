#!/bin/bash

# MCP Proxy Server Start Script (Unix/macOS)

echo "Starting MCP HTTP-to-STDIO Proxy Server..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "Starting server on http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""
node index.js
