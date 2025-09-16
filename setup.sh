#!/bin/bash

# DealBase Setup Script
echo "🚀 Setting up DealBase..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 18+ and try again."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required. Please install Python 3.11+ and try again."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required. Please install pnpm 8+ and try again."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared package
echo "🔨 Building shared package..."
pnpm --filter @dealbase/shared build

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd apps/api
pip install -r requirements.txt
cd ../..

# Copy environment file
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file from .env.example"
    echo "   Please review and update the .env file with your settings"
else
    echo "✅ .env file already exists"
fi

# Install pre-commit hooks
echo "🔧 Installing pre-commit hooks..."
if command -v pre-commit &> /dev/null; then
    pre-commit install
    echo "✅ Pre-commit hooks installed"
else
    echo "⚠️  pre-commit not found. Install it with: pip install pre-commit"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start development:"
echo "  pnpm dev"
echo ""
echo "This will start:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/api/docs"
echo ""
echo "Happy coding! 🚀"
