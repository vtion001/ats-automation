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
echo "📋 Checking prerequisites..."
command -v az >/dev/null 2>&1 || { echo "❌ Azure CLI not found. Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"; exit 1; }
echo "✅ Azure CLI found"

# Step 2: Login check
echo "🔐 Checking Azure login..."
az account show >/dev/null 2>&1 || { echo "❌ Not logged in. Run: az login"; exit 1; }
echo "✅ Logged in to Azure"

# Step 3: Create resource group if not exists
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output table

# Step 4: Create Azure Container Registry
echo "🐳 Creating Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true --output table

# Step 5: Build and push Docker image
echo "🔨 Building Docker image..."
cd /Users/archerterminez/Desktop/REPOSITORY/ats-automation
az acr build --registry $ACR_NAME --image $IMAGE_NAME:$IMAGE_TAG --file Dockerfile .

# Step 6: Create Container Apps environment
echo "🚀 Creating Container Apps environment..."
az containerapp env create \
  --name "ags-env" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --output table

# Step 7: Deploy Container App
echo "📡 Deploying Container App..."
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

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
  --registry-password "$ACR_PASSWORD" \
  --env-vars PORT=8000 PYTHONUNBUFFERED=1 \
  --output table

# Step 8: Get the URL
echo ""
echo "============================================"
echo "✅ Deployment Complete!"
echo "============================================"

APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "properties.provisioningState" -o tsv)
FULL_URL="https://$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)"

echo "📍 AI Server URL: $FULL_URL"
echo "📋 Health Check: $FULL_URL/health"
echo "📋 API Endpoint: $FULL_URL/api/analyze"
echo ""
echo "⚠️  Update your Chrome extension config to use:"
echo "   $FULL_URL"
