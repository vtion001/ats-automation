#!/bin/bash
# Build script to package ATS Automation extension

set -e

VERSION=${1:-$(grep '"version"' chrome-extension/manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')}
EXTENSION_DIR="chrome-extension"
OUTPUT_DIR="dist"

echo "Building ATS Automation Extension v${VERSION}..."

# Create dist directory
mkdir -p $OUTPUT_DIR

# Copy extension to temp directory (exclude unnecessary files)
rm -rf temp-ext
cp -r $EXTENSION_DIR temp-ext

# Remove development files
rm -f temp-ext/popup/popup.html.orig
find temp-ext -name "*.orig" -delete 2>/dev/null || true

# Also exclude non-essential files for smaller package
rm -f temp-ext/images/screenshot-*.png 2>/dev/null || true
rm -f temp-ext/images/marquee.png 2>/dev/null || true

# Create zip package
cd temp-ext
zip -r "../$OUTPUT_DIR/ats-automation-v${VERSION}.zip" .
cd ..

# Get extension size
SIZE=$(ls -lh $OUTPUT_DIR/ats-automation-v${VERSION}.zip | awk '{print $5}')

echo "========================================="
echo "Build Complete!"
echo "========================================="
echo "Version: $VERSION"
echo "Size: $SIZE"
echo "Output: $OUTPUT_DIR/ats-automation-v${VERSION}.zip"
echo ""
echo "To install locally:"
echo "1. Extract the zip file"
echo "2. Go to chrome://extensions/"
echo "3. Enable Developer mode"
echo "4. Click 'Load unpacked'"
echo "5. Select the extracted folder"
echo ""
echo "To publish to Chrome Web Store:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Upload the zip file"
echo "3. Submit for review"
echo "========================================="
