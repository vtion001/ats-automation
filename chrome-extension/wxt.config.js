/**
 * WXT Build Configuration
 * For ATS Chrome Extension
 */

export default {
  srcDir: '.',
  outDir: 'dist',
  
  // Extension manifest configuration
  manifest: {
    manifest_version: 3,
    name: 'ATS Automation',
    version: '2.1.0',
    description: 'BPO client workflow automation - CTM monitoring, transcription, Salesforce integration',
    
    permissions: [
      'activeTab',
      'storage',
      'scripting',
      'windows',
      'desktopCapture',
      'tabCapture'
    ],
    
    host_permissions: [
      '*://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io/*',
      '*://*.calltrackingmetrics.com/*',
      '*://*.my.salesforce.com/*',
      '*://*.lightning.force.com/*',
      '*://*.zoho.com/*',
      '*://*.ringcentral.com/*',
      '*://*.kipuworks.com/*',
      '*://*.collaboratemd.com/*',
      '*://*.availity.com/*',
      '*://*.verifytx.com/*'
    ],
    
    background: {
      service_worker: 'background/service-worker.js'
    },
    
    action: {
      default_popup: 'popup/popup.html',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png'
      }
    },
    
    web_accessible_resources: [
      {
        resources: ['src/**/*', 'config/*', 'clients/**/*', 'popup/**/*'],
        matches: ['<all_urls>']
      }
    ],
    
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },
  
  // Aliases for cleaner imports
  alias: {
    '@': '/src',
    '@shared': '/src/shared',
    '@core': '/src/core',
    '@services': '/src/services',
    '@modules': '/src/modules'
  },
  
  // Build options
  build: {
    // Disable automatic HTML entry points - we use popup.html as-is
    htmlEntrypoints: false,
    
    // Minify for production
    minify: true,
    
    // Generate source maps for debugging
    sourcemap: true
  },
  
  // Dev server options
  dev: {
    // Open browser automatically
    open: true,
    
    // Port for dev server
    port: 3000
  }
};
