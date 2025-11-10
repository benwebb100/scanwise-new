#!/bin/bash

# Render.com build script for ScanWise backend with Playwright support

echo "🚀 Starting ScanWise backend build..."

# Install Python dependencies
echo "📦 Installing Python packages..."
pip install -r requirements.txt

# Install system dependencies for Playwright
echo "🔧 Installing system dependencies for Playwright..."
apt-get update
apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2

# Install Playwright browsers
echo "🌐 Installing Playwright Chromium browser..."
playwright install chromium

# Verify installation
echo "✅ Verifying Playwright installation..."
python -c "
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        browser.close()
    print('✅ Playwright Chromium installed successfully!')
except Exception as e:
    print(f'❌ Playwright verification failed: {e}')
    exit(1)
"

echo "🎉 Build complete! ScanWise backend ready with Playwright support."
