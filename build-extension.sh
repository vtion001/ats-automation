#!/bin/bash
# Build script to package ATS Automation extension

VERSION="2.1.0"
EXTENSION_DIR="chrome-extension"
OUTPUT_DIR="dist"

echo "Building ATS Automation Extension v$VERSION..."

# Create dist directory
mkdir -p $OUTPUT_DIR

# Copy extension to temp directory (exclude unnecessary files)
rm -rf temp-ext
cp -r $EXTENSION_DIR temp-ext

# Remove development files
rm -f temp-ext/popup/popup.html.orig
rm -f temp-ext/**/*.orig

# Create zip package
cd temp-ext
zip -r "../$OUTPUT_DIR/ats-automation-v$VERSION.zip" .
cd ..

# Get extension size
SIZE=$(ls -lh $OUTPUT_DIR/ats-automation-v$VERSION.zip | awk '{print $5}')

echo "========================================="
echo "Build Complete!"
echo "========================================="
echo "Version: $VERSION"
echo "Size: $SIZE"
echo "Output: $OUTPUT_DIR/ats-automation-v$VERSION.zip"
echo ""
echo "To install:"
echo "1. Extract the zip file"
echo "2. Go to chrome://extensions/"
echo "3. Enable Developer mode"
echo "4. Click 'Load unpacked'"
echo "5. Select the extracted folder"
echo "========================================="
