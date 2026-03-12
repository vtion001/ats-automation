# Azure VM Setup Guide - Detailed Instructions

> Complete step-by-step guide to create the Azure VM for ATS Automation Server

---

## Prerequisites

- Azure account (sign up at https://portal.azure.com if you don't have one)
- A method to access Azure (Portal or CLI)

---

## Option 1: Azure Portal (GUI)

### Step 1: Login to Azure Portal

1. Go to https://portal.azure.com
2. Sign in with your Microsoft account

### Step 2: Create a Virtual Machine

1. Click **"Create a resource"** (the + button in top-left)
2. Search for **"Virtual Machine"**
3. Click **"Create"** → **"Virtual machine"**

### Step 3: Configure the VM

Fill in these exact values:

| Setting | Value |
|---------|-------|
| **Resource Group** | `ats-automation` (click "Create new") |
| **Virtual machine name** | `ats-server` |
| **Region** | `East US` (or closest to your location) |
| **Image** | `Ubuntu Server 20.04 LTS` |
| **Size** | `Standard_B2s` (click "See all sizes" if not visible) |
| **Authentication type** | `SSH public key` |
| **Username** | `azureuser` |
| **SSH public key** | Generate new or use existing |

> **Important**: Click "Change size" → Search for "B2s" → Select Standard_B2s

### Step 4: Configure Networking (Critical!)

1. Click **"Next: Networking"**
2. Under **"NIC network security group"**, select **"Advanced"**
3. Click **"Create new"** under "Configure network security group"
4. Add these rules:

| Priority | Name | Port | Protocol | Source | Destination |
|----------|------|------|----------|--------|-------------|
| 100 | SSH | 22 | TCP | Your IP | Any |
| 110 | HTTPS | 443 | TCP | Any | Any |
| 120 | HTTP | 80 | TCP | Any | Any |

5. Click **"OK"**

### Step 5: Review and Create

1. Click **"Review + Create"**
2. Wait for validation to pass
3. Click **"Create"**
4. Wait 2-3 minutes for deployment

### Step 6: Get Your VM IP

1. Once deployed, go to the resource
2. Look for **"Public IP address"** in the left menu
3. Copy the IP address (e.g., `20.55.123.456`)

**Congratulations!** You now have a running Azure VM!

---

## Option 2: Azure CLI (Faster)

### Step 1: Install Azure CLI

**macOS:**
```bash
brew install azure-cli
```

**Windows:**
```powershell
# Download and install from:
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
```

**Linux:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Step 2: Login

```bash
az login
```

This will open a browser window. Sign in with your Azure account.

### Step 3: Create the VM

Run this entire block:

```bash
# Set variables
RESOURCE_GROUP="ats-automation"
VM_NAME="ats-server"
LOCATION="eastus"
USERNAME="azureuser"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create VM
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image UbuntuLTS \
  --size Standard_B2s \
  --admin-user $USERNAME \
  --ssh-key-value ~/.ssh/id_rsa.pub

# Open ports
az vm open-port --port 443 --resource-group $RESOURCE_GROUP --name $VM_NAME --priority 900
az vm open-port --port 22 --resource-group $RESOURCE_GROUP --name $VM_NAME --priority 901
az vm open-port --port 80 --resource-group $RESOURCE_GROUP --name $VM_NAME --priority 902

# Get public IP
az vm show \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --show-details | grep -i "publicIpAddress" | awk '{print $2}' | tr -d '"'
```

### Step 4: Note Your IP

The last command will output your VM's public IP address. Save this!

---

## Option 3: Quick Create (Simplest)

If you just want to get started fast:

```bash
# One-liner (make sure you've run 'az login' first)
az vm create --resource-group ats-automation --name ats-server --image UbuntuLTS --size Standard_B2s --admin-user azureuser --ssh-key-value ~/.ssh/id_rsa.pub --open-port 443 --open-port 22
```

---

## Connecting to Your VM

### From macOS/Linux

```bash
ssh azureuser@YOUR_VM_IP
```

### From Windows

1. **PowerShell**: `ssh azureuser@YOUR_VM_IP`
2. **PuTTY**: Host = YOUR_VM_IP, Port = 22, Username = azureuser

---

## Troubleshooting

### "VM size not available"
- Try a different region (West US, Central US)
- Try a different size (Standard_B1s if B2s unavailable)

### "SSH key not found"
- Generate one: `ssh-keygen -t rsa -b 4096`
- Or use password authentication instead

### "Port 443 not accessible"
- Check the Network Security Group rules
- Make sure you added the inbound rules in Step 4

---

## Cost Breakdown

| Resource | Size | Estimated Cost |
|----------|------|----------------|
| VM (B2s) | 2 vCPU, 4GB RAM | ~$25/month |
| Public IP | 1 static | Free |
| Bandwidth | ~10 GB | ~$0.50/month |
| **Total** | | **~$25-30/month** |

---

## Next Step After VM Creation

Once your VM is running with a public IP:

1. **Come back here** and note your IP
2. Tell me the IP address
3. I'll set up the server software

---

## Need Help?

If you get stuck at any step, take a screenshot of the error and share it. I'm here to help!
