// AGS AI Server - Azure Container Apps Deployment
// Target: Azure Container Apps

// Parameters
@description('Environment name (dev, staging, prod)')
@minLength(2)
@maxLength(10)
param environmentName string = 'ags'

@description('Azure region for deployment')
param location string = resourceGroup().location

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
var containerAppsEnvName = 'ags-env-${environmentName}'
var containerAppName = 'ags-ai-server-${environmentName}'
var logAnalyticsName = 'ags-la-${environmentName}'

// Azure Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-06-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  adminEnabled: true
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  sku: {
    name: 'PerGB2018'
  }
}

// Container Apps Environment
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
      }
      registries: [
        {
          server: '${acr.name}.azurecr.io'
          username: acr.properties.adminUserEnabled ? acr.properties.adminUserEnabled ? acr.name : '' : ''
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acrPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'ai-server'
          image: '${acr.properties.loginServer}/${imageName}:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'PORT'
              value: '8000'
            }
            {
              name: 'PYTHONUNBUFFERED'
              value: '1'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling'
            http: {}
          }
        ]
      }
    }
  }
}

// Output the FQDN
output aiServerUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerAppName string = containerApp.name
output acrName string = acr.name
