#!/bin/bash

# Foodism Web Admin Panel Startup Script

echo "🍎 Starting Foodism Web Admin Panel..."
echo "=================================="

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the web-admin directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
fi

# Check if Firebase Functions backend is running
echo "🔍 Checking if Firebase Functions backend is running..."
if curl -s "http://192.168.1.130:5001/fudism-7fae8/us-central1/api/health" > /dev/null; then
    echo "✅ Firebase Functions backend is running"
else
    echo "⚠️  Warning: Firebase Functions backend may not be running"
    echo "   Please make sure to start it with: cd backend/functions && npm run serve"
    echo "   Continuing anyway..."
fi

echo ""
echo "🚀 Starting Web Admin Panel Server..."
echo "   Main URL: http://localhost:3000"
echo "   Admin Panel: http://localhost:3000/admin"
echo "   Health Check: http://localhost:3000/health"
echo ""
echo "💡 Tips:"
echo "   - Press Ctrl+C to stop the server"
echo "   - Make sure Firebase Functions backend is running"
echo "   - Check the browser console for any errors"
echo ""

# Start the server
npm start