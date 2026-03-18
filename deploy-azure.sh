#!/bin/bash
# AGS AI Server - Azure Deployment Script
# Deploys to Azure Container Apps

set -e

# Configuration
RESOURCE_GROUP="ags-rg"
LOCATION="eastus"
ACR_NAME="agscontainerreg"
CONTAINER_APP_NAME="ags-ai-server"
IMAGE_NAME="ags-ai-server"
IMAGE_TAG="latest"

echo "============================================"
echo "AGS AI Server - Azure Deployment"
echo "============================================"

# Step 1: Check prerequisites
echo "Checking prerequisites..."
command -v az >/dev/null 2>&1 || { echo "Azure CLI not found. Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"; exit 1; }
echo "Azure CLI found"

# Step 2: Login check
echo "Checking Azure login..."
az account show >/dev/null 2>&1 || { echo "Not logged in. Run: az login"; exit 1; }
echo "Logged in to Azure"

# Step 3: ACR login (prevents Docker Hub rate limits)
echo "Logging into ACR..."
az acr login --name $ACR_NAME

# Step 4: Build and push Docker image
echo "Building Docker image..."
cd /Users/archerterminez/Desktop/repository/ats-automation
az acr build --registry $ACR_NAME --image $IMAGE_NAME:$IMAGE_TAG --file Dockerfile .

# Step 5: Deploy to Container App (update if exists, create if not)
echo "Deploying to Container App..."
EXISTS=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "name" -o tsv 2>/dev/null || echo "")

if [ -n "$EXISTS" ]; then
    echo "Updating existing Container App..."
    az containerapp update \
      --name $CONTAINER_APP_NAME \
      --resource-group $RESOURCE_GROUP \
      --image "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}" \
      --output table
else
    echo "Creating new Container App..."
    az containerapp create \
      --name $CONTAINER_APP_NAME \
      --resource-group $RESOURCE_GROUP \
      --environment "ags-env" \
      --image "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}" \
      --target-port 8000 \
      --ingress external \
      --cpu 0.5 --memory 1Gi \
      --min-replicas 0 --max-replicas 10 \
      --registry-username $ACR_NAME \
      --registry-password "$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)" \
      --env-vars PORT=8000 PYTHONUNBUFFERED=1 \
      --output table
fi

# Step 6: Get the URL
echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"

FULL_URL="https://$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)"

echo "AI Server URL: $FULL_URL"
echo "Health Check: $FULL_URL/health"
echo "API Endpoint: $FULL_URL/api/analyze"
echo ""
echo "Update your Chrome extension config to use:"
echo "   $FULL_URL"
