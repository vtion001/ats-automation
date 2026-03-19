#!/bin/bash
# Build script to package ATS Automation extension
# Supports two modes:
#   - api: Uses CTM API (no DOM monitoring, credentials in Azure Key Vault)
#   - dom: Uses DOM monitoring (legacy mode)

set -e

MODE=${1:-api}
VERSION=${2:-$(grep '"version"' chrome-extension/manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')}

if [ "$MODE" = "api" ]; then
    MANIFEST="manifest.api.json"
    echo "Building API-mode extension (CTM API integration)"
elif [ "$MODE" = "dom" ]; then
    MANIFEST="manifest.json"
    echo "Building DOM-mode extension (legacy DOM monitoring)"
else
    echo "Unknown mode: $MODE"
    echo "Usage: $0 [api|dom] [version]"
    exit 1
fi

EXTENSION_DIR="chrome-extension"
OUTPUT_DIR="dist"

echo "Building ATS Automation Extension v${VERSION} in $MODE mode..."

# Create dist directory
mkdir -p $OUTPUT_DIR

# Copy extension to temp directory
rm -rf temp-ext
cp -r $EXTENSION_DIR temp-ext

# Use specified manifest
cp "temp-ext/$MANIFEST" "temp-ext/manifest.json"

# Remove development files
rm -f temp-ext/popup/popup.html.orig
rm -f temp-ext/manifest.api.json  # Remove alternative manifest
find temp-ext -name "*.orig" -delete 2>/dev/null || true

# Remove DOM content scripts if in API mode
if [ "$MODE" = "api" ]; then
    rm -f temp-ext/content-scripts/ctm-monitor.js
    rm -f temp-ext/content-scripts/overlay.js
    rm -f temp-ext/content-scripts/console-interceptor.js
    rm -f temp-ext/content-scripts/sf-reader.js
    rm -f temp-ext/content-scripts/zoho-chat.js
    echo "Removed DOM-based content scripts"
fi

# Also exclude non-essential files for smaller package
rm -f temp-ext/images/screenshot-*.png 2>/dev/null || true
rm -f temp-ext/images/marquee.png 2>/dev/null || true

# Create zip package
cd temp-ext
zip -r "../$OUTPUT_DIR/ats-automation-v${VERSION}-${MODE}.zip" .
cd ..

# Get extension size
SIZE=$(ls -lh $OUTPUT_DIR/ats-automation-v${VERSION}-${MODE}.zip | awk '{print $5}')

echo "========================================="
echo "Build Complete!"
echo "========================================="
echo "Version: $VERSION"
echo "Mode: $MODE"
echo "Size: $SIZE"
echo "Output: $OUTPUT_DIR/ats-automation-v${VERSION}-${MODE}.zip"
echo ""
echo "To install locally:"
echo "1. Extract the zip file"
echo "2. Go to chrome://extensions/"
echo "3. Enable Developer mode"
echo "4. Click 'Load unpacked'"
echo "5. Select the extracted folder"
echo ""
echo "========================================="
