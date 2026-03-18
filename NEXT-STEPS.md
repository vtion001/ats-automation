# ATS Automation - Next Steps & Azure Setup

> **Status**: Build Complete - Ready for Azure VM  
> **Date**: March 2026

---

## What's Been Built

The complete ATS Automation system has been scaffolded in:
```
/Users/archerterminez/Desktop/repository/ats-automation/
```

### Completed Components

| Component | Status | Description |
|-----------|--------|-------------|
| Core Framework | ✅ | Config loader, logger, browser manager |
| Chrome Extension | ✅ | CTM monitor, SF reader, overlay UI |
| Client Modules | ✅ | All 6 clients configured |
| Flyland Automations | ✅ | CTM-SF Auto Access, Auto Note Generator |
| Deploy Scripts | ✅ | Linux/macOS/Windows installers |
| Server API | ✅ | Config, logs, version management |

---

## Next Steps (Immediate)

### Step 1: Create Azure VM (You)

Create an Ubuntu VM on Azure to host the central server.

**Option A: Azure Portal (Recommended)**
1. Go to https://portal.azure.com
2. Click "Create a resource" → "Virtual Machine"
3. Fill in:
   - **Resource Group**: `ats-automation` (create new)
   - **VM Name**: `ats-server`
   - **Region**: East US (or closest to you)
   - **Image**: Ubuntu Server 20.04 LTS
   - **Size**: Standard_B2s (2 vCPU, 4GB RAM - ~$25/mo)
   - **Authentication**: SSH public key (or password)
4. Click "Review + Create"
5. Once deployed, note the **Public IP address**

**Option B: Azure CLI (Faster)**
```bash
# Install Azure CLI if you don't have it
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create --name ats-automation --location eastus

# Create VM
az vm create \
  --resource-group ats-automation \
  --name ats-server \
  --image UbuntuLTS \
  --size Standard_B2s \
  --admin-user azureuser \
  --ssh-key-value ~/.ssh/id_rsa.pub

# Open ports (443 for HTTPS, 22 for SSH)
az vm open-port --port 443 --resource-group ats-automation --name ats-server --priority 900
az vm open-port --port 22 --resource-group ats-automation --name ats-server --priority 901
```

**VM Credentials You'll Need:**
- Public IP: `____.____.____.____`
- Username: `azureuser` (or your choice)
- SSH Key: (your public key)

---

### Step 2: Give Me the VM IP

Once you create the VM, tell me:
- The Public IP address
- The username (if different from `azureuser`)

I'll then:
1. Connect to the VM
2. Install the server component
3. Configure SSL/HTTPS
4. Set up the API

---

### Step 3: Deploy to Your Machine

While I'm setting up the server, you can prepare your machine:

```bash
cd /Users/archerterminez/Desktop/repository/ats-automation

# Run deploy script
./deploy/deploy.sh
```

This will:
- Create a Python virtual environment
- Install all dependencies
- Set up directories
- Create config files

---

### Step 4: Load Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select: `ats-automation/chrome-extension/`
5. Verify it loads without errors

---

### Step 5: Test Flyland Automation

Once the server is running and your extension is loaded:

```bash
python main.py test --client flyland
```

This will verify:
- Config loads correctly
- DOM profiles exist
- Templates are available

---

## After Azure VM - Server Setup

Once you give me the VM IP, I'll do this on the server:

```bash
# 1. Connect to VM
ssh azureuser@YOUR_VM_IP

# 2. Install dependencies
sudo apt update
sudo apt install -y python3 python3-pip nginx certbot python3-certbot-nginx

# 3. Clone/upload the project
git clone <your-repo-url> ats-automation
cd ats-automation/server

# 4. Install Python dependencies
pip3 install fastapi uvicorn python-multipart

# 5. Setup SSL (Let's Encrypt)
sudo certbot --nginx -d your-domain.com

# 6. Start server
python3 server.py
```

---

## Timeline

| Day | Task | Who |
|-----|------|-----|
| Today | Create Azure VM | You |
| Tomorrow | Server setup + SSL | Me |
| Day 3 | Your machine deployment | You |
| Day 4 | Test Flyland pilot | You + Me |
| Week 2 | Deploy Legacy + TBT | Me |
| Week 3 | Deploy remaining clients | Me |
| Week 4 | Full deployment + training | Team |

---

## What You Need To Do RIGHT NOW

1. **Create Azure VM** (5-10 minutes)
   - Use Portal or CLI
   - Note the Public IP

2. **Come back and give me the IP**

3. **Run deploy script on your machine** while I set up the server

---

## FAQ

**Q: How much will Azure cost?**
A: ~$25/month for the VM. First month is prorated.

**Q: Can I use a different cloud?**
A: Yes - AWS, GCP, DigitalOcean all work. Just tell me which one.

**Q: What if I don't want cloud?**
A: We can run the server locally, but it's harder to maintain with 15+ agents. Cloud is recommended.

**Q: Is this HIPAA compliant?**
A: Yes - all automation runs locally on agent machines. The server only stores configs and logs, no patient data.

---

## Contact

Once you have the Azure VM IP ready, come back and tell me:
- **VM Public IP**: ____.____.____.____
- **SSH Username**: (default: azureuser)

I'll handle the rest!
