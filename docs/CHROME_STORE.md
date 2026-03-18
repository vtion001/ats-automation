# Chrome Web Store Publishing Guide

## Prerequisites

1. **Google Developer Account**: Pay $5 one-time fee at https://chrome.google.com/webstore/devconsole
2. **Extension already packaged** as a zip file
3. **Chrome Web Store listing assets** (already prepared in `chrome-extension/images/`)

## Steps to Publish

### 1. Create Developer Account

1. Go to https://chrome.google.com/webstore/devconsole
2. Click "Enter" to accept terms
3. Pay the $5 developer fee
4. You'll be redirected to the developer dashboard

### 2. First-Time Setup (if extension not yet registered)

If this is the first time publishing:

1. Click **"New Item"**
2. Upload the zip file from `dist/ats-automation-v{VERSION}.zip`
3. Fill in the store listing details (see below)
4. Submit for review

### 3. Update Existing Extension

1. Go to https://chrome.google.com/webstore/devconsole
2. Click on **"ATS Automation"** in your item list
3. Click **"Package"** in the left sidebar
4. Upload the new zip file (version must be higher than previous)
5. Click **"Submit for review"**

## Store Listing Configuration

### Required Fields

| Field | Value |
|-------|-------|
| **Title** | ATS Automation |
| **Summary** | BPO workflow automation - CTM call monitoring + audio capture + markdown logging |
| **Description** | (long description - see below) |
| **Category** | Productivity |
| **Language** | English |
| **Icon** | `images/store-icon.png` (512x512) |

### Description (copy-paste this)

```
ATS Automation transforms your CTM (CallTrackingMetrics) workflow with automatic call detection, AI-powered analysis, and seamless call documentation.

=== KEY FEATURES ===

AUTOMATIC CALL MONITORING
• Detects inbound and outbound calls on CTM softphone automatically
• Shows INBOUND/OUTBOUND call info with caller phone number and name
• No manual activation needed - works silently in the background

AI-POWERED LEAD QUALIFICATION
• Transcribes every call using Whisper speech recognition
• Scores leads as Hot, Warm, or Cold based on call content
• Extracts caller details: name, state, insurance, substance use history
• Sentiment analysis and call quality metrics included

AUTOMATIC FILE SAVING
• Saves audio recordings (.webm) to Downloads/ATS_Recordings/
• Generates markdown analysis reports with score, tags, and summary
• All data stays on your machine - full privacy control

SEAMLESS INTEGRATION
• Works with CallTrackingMetrics softphone
• Optional Zoho CRM integration for lead management
• Optional Salesforce sync for call logging

=== HOW IT WORKS ===

1. Install the extension
2. Open the CTM softphone at /calls/phone
3. ATS Automation automatically detects when calls arrive
4. It records, transcribes, and analyzes each call
5. Results appear on screen and files are saved locally

=== PRIVACY ===

• Audio is processed by our Azure AI server for transcription only
• No data is stored on third-party servers
• All recordings saved locally to your device
• Full privacy policy available in extension settings

=== REQUIREMENTS ===

• Google Chrome browser
• CTM (CallTrackingMetrics) account for call monitoring
• Internet connection for AI transcription
```

### Screenshots (upload these 3)

Located in `chrome-extension/images/`:
- `screenshot-1-call-monitoring.png` (1280x800)
- `screenshot-2-ai-analysis.png` (1280x800)
- `screenshot-3-file-saving.png` (1280x800)

### Additional Assets

| Asset | File | Size |
|-------|------|------|
| Marquee | `images/marquee.png` | 440x280 |
| Store Icon | `images/store-icon.png` | 512x512 |

### Privacy Policy URL

Host the privacy policy somewhere publicly accessible and enter the URL:
- Option 1: Upload `chrome-extension/privacy-policy.html` to a web server
- Option 2: Use a GitHub Pages site
- Option 3: Use a storage bucket (Azure Blob, S3, etc.)

Example: `https://your-domain.com/ats-automation/privacy-policy.html`

### Content Ratings

1. Click **"Content ratings"** in the left sidebar
2. Complete the questionnaire (about data collection)
3. Generate the content rating certificate

### Pricing

Set to **"Free"** (default)

## Review Process

- Initial review: 1-7 days
- Updates to existing items: typically faster (hours to days)
- If rejected, you'll get specific reasons to fix

## Auto-Update

Once published, Chrome handles updates automatically:
- Users get notified when a new version is available
- Chrome downloads and installs updates in the background
- **No more manual update.ps1 needed!**

## Extension ID

The extension ID is: `jncbpgnflmcfnehadjjgddmhgecbelkf`

This ID is used in:
- Update URLs (if self-hosting)
- OAuth configurations (if any)

## Troubleshooting

### "Package is invalid"

- Check that version in manifest.json is higher than previous upload
- Ensure no `.git` folders or unrelated files in zip
- Make sure manifest.json has `manifest_version: 3`

### "Extension not loading"

- Check `chrome://extensions/` for error messages
- Verify all permissions are valid
- Make sure `background.service_worker` path is correct

### "Content script not running"

- Verify `content_scripts` matches in manifest
- Check that the target URL patterns are correct
- Ensure `run_at` is appropriate for your script

## Useful Links

- Developer Dashboard: https://chrome.google.com/webstore/devconsole
- Policy FAQ: https://developer.chrome.com/docs/webstore/program-policies/
- Distribution FAQ: https://developer.chrome.com/docs/webstore/distribution/
