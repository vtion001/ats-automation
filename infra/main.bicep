// AGS AI Server - Azure App Service Deployment
// Target: Azure App Service (Web Apps)

@description('Environment name (dev, staging, prod)')
@minLength(2)
@maxLength(10)
param environmentName string = 'ags'

@description('Azure region for deployment')
param location string = 'westus'

@description('Docker image name')
param imageName string = 'ags-ai-server'

@description('Docker image tag')
param imageTag string = 'latest'

@description('ACR username (if using existing ACR)')
@secure()
param acrPassword string = ''

@description('Azure Container Registry name')
param acrName string = 'agscontainerreg${environmentName}'

// Variables
var appServicePlanName = 'asp-ags-${environmentName}'
var webAppName = 'ags-ai-server'
var logAnalyticsName = 'ags-la-${environmentName}'
var appInsightsName = 'ai-ags-${environmentName}'
var stagingSlotName = 'staging'

// Azure Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-06-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  sku: {
    name: 'PerGB2018'
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    RetentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    WorkspaceResourceId: logAnalytics.id
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: webAppName
  location: location
  kind: 'linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${imageName}:${imageTag}'
      appCommandLine: ''
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'PORT'
          value: '8000'
        }
        {
          name: 'PYTHONUNBUFFERED'
          value: '1'
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acr.properties.loginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acr.name
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: acrPassword
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
      ]
      healthCheckPath: '/health'
    }
  }
}

// App Service Config (for ACR credentials)
resource webAppConfig 'Microsoft.Web/sites/config@2022-09-01' = {
  parent: webApp
  name: 'appsettings'
  properties: {
    PORT: '8000'
    PYTHONUNBUFFERED: '1'
    WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false'
    DOCKER_REGISTRY_SERVER_URL: 'https://${acr.properties.loginServer}'
    DOCKER_REGISTRY_SERVER_USERNAME: acr.name
    DOCKER_REGISTRY_SERVER_PASSWORD: acrPassword
    APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.properties.InstrumentationKey
  }
}

// Staging Deployment Slot
resource stagingSlot 'Microsoft.Web/sites/slots@2022-09-01' = {
  name: '${webAppName}/${stagingSlotName}'
  location: location
  kind: 'linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${imageName}:${imageTag}'
      appCommandLine: ''
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'PORT'
          value: '8000'
        }
        {
          name: 'PYTHONUNBUFFERED'
          value: '1'
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acr.properties.loginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acr.name
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: acrPassword
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
      ]
      healthCheckPath: '/health'
    }
  }
}

// Output the FQDN
output aiServerUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
output webAppId string = webApp.id
output acrName string = acr.name
output stagingSlotUrl string = 'https://${stagingSlot.properties.defaultHostName}'
