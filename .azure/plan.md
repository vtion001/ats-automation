# Azure Deployment Plan - AGS AI Server

## Project Overview
- **Project Name**: AGS Automation Tool - AI Server
- **Type**: Cloud Deployment (FastAPI Python Server)
- **Location**: `~/Desktop/REPOSITORY/ats-automation`

## Current Analysis

### Technology Stack
- **Runtime**: Python 3.11
- **Framework**: FastAPI
- **Dependencies**: uvicorn, loguru, pydantic
- **Container**: Docker

### Component: AI Server
- **Purpose**: Transcription analysis, call insights
- **Port**: 8000 (internal)
- **Endpoints**:
  - `GET /` - Root
  - `GET /health` - Health check
  - `POST /api/analyze` - Analyze transcription
  - `POST /api/tag-salesforce` - Salesforce tagging (placeholder)

## Deployment Plan

### Target: Azure Container Apps
- **Service**: Azure Container Apps (ACA)
- **Benefits**: 
  - Serverless containers
  - Auto-scaling
  - HTTPS/TLS built-in
  - Cost-effective for low traffic

### Infrastructure
```
┌─────────────────────────┐
│   Azure Container Apps │
│   (FastAPI Server)     │
└───────────┬─────────────┘
            │ HTTPS
┌───────────▼─────────────┐
│   Azure CDN (optional) │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│   Chrome Extension      │
│   (AGS Automation)     │
└─────────────────────────┘
```

## Deployment Steps

### Step 1: Update Dockerfile
- [ ] Update Dockerfile for production
- [ ] Set environment variables
- [ ] Configure health check endpoint

### Step 2: Create Azure Infrastructure (Bicep)
- [ ] Azure Container Registry (ACR)
- [ ] Azure Container Apps Environment
- [ ] Container App with ingress
- [ ] Health probe configuration

### Step 3: Build & Deploy
- [ ] Build Docker image
- [ ] Push to ACR
- [ ] Deploy to Container Apps
- [ ] Configure environment variables

### Step 4: Update Extension Config
- [ ] Get deployed URL
- [ ] Update extension config with cloud URL

## Configuration

### Environment Variables
| Variable | Value | Description |
|----------|-------|-------------|
| PORT | 8000 | Server port |
| LOG_LEVEL | info | Logging level |
| PYTHONUNBUFFERED | 1 | Unbuffered output |

### Container Resources
- **CPU**: 0.5 vCPU
- **Memory**: 1Gi
- **Scale**: 0-10 instances (based on traffic)

## Estimated Cost
- Azure Container Apps: ~$10-30/month
- (Pay per use pricing)

## Status
- [x] Plan created
- [x] Dockerfile updated
- [x] Deployment scripts created
- [ ] Approved by user
- [ ] Deployed to Azure
