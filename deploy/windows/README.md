# AGS Automation Tool - Windows Installation

## Quick Install

1. **Download the extension**
   - Clone this repository or download ZIP
   - Extract to a folder (e.g., Desktop)

2. **Run the installer**
   - Double-click `install.bat`
   - Follow the prompts

3. **Done!** Extension is loaded in Chrome

---

## First-Time Setup

After installation:

1. **Pin the extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Click "Pin" next to "AGS Automation Tool"

2. **Configure Salesforce**
   - Click the extension icon
   - Click "Config"
   - Enter your Salesforce URL (e.g., `https://yourcompany.my.salesforce.com`)
   - Click Save

3. **Ready to use!**

---

## Updating

### Option A: Git (Automatic)
If you cloned the repository:
```bash
git pull origin main
```
Then run `update.bat`

### Option B: Manual
1. Download latest ZIP from GitHub
2. Extract to same folder
3. Run `update.bat`

---

## Files Included

| File | Purpose |
|------|---------|
| `install.bat` | Main installer (run once) |
| `update.bat` | Quick updater |
| `chrome-loader.ps1` | Helper script |
| `config.json` | Pre-configured settings |

---

## Troubleshooting

### Extension not loading?
- Run `install.bat` again
- Or manually: Open Chrome → `chrome://extensions/` → Enable Developer Mode → Load Unpacked

### Chrome not found?
- Install Chrome from https://www.google.com/chrome/

### Need to configure AI Server URL?
- Click extension icon → Config
- Enter: `http://4.157.143.70:8000`

---

## Support

For issues, check:
- Chrome DevTools Console (F12)
- GitHub Issues: https://github.com/vtion001/ats-automation/issues
