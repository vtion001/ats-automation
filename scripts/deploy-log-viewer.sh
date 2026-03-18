#!/bin/bash
# Deploy Remote Log Viewer to Azure
# Usage: ./deploy-log-viewer.sh

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Deploy ATS Remote Log Viewer to Azure               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
RESOURCE_GROUP="ags-rg"
LOCATION="eastus"
WEBAPP_NAME="ats-log-viewer"
PLAN_NAME="ats-log-plan"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../log-viewer-app"

echo "Step 1: Creating web app..."
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  App Name: $WEBAPP_NAME"
echo ""

# Create the web app
az webapp up --name "$WEBAPP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --plan "$PLAN_NAME" \
    --runtime "PYTHON|3.11" \
    --sku "B1" \
    2>&1 || true

# Get the URL
URL=$(az webapp show --name "$WEBAPP_NAME" --resource-group "$RESOURCE_GROUP" --query "defaultHostName" -o tsv 2>/dev/null)
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Deployment Complete!                      ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  URL: https://$URL"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "On Windows, run in Chrome DevTools:"
echo "  chrome.storage.local.set({ remoteLogUrl: 'https://$URL' });"
echo ""
