#!/usr/bin/env python3
"""
Azure Functions Infrastructure Setup Script

This script creates the Azure Functions infrastructure for the ATS AI Server.
It sets up:
- Resource Group: ags-rg (in eastus)
- Storage Account: agsaistorage
- Consumption Plan: asp-ags-functions
- Function App: ags-ai-server

Usage:
    python setup_azure_functions.py --create    # Create infrastructure
    python setup_azure_functions.py --update    # Update configuration only
    python setup_azure_functions.py --delete     # Delete resources
"""

import argparse
import subprocess
import sys
import os


def run_az_command(cmd, description, check=True):
    """Run an Azure CLI command and handle errors."""
    print(f"\n{'='*50}")
    print(f"{description}")
    print(f"{'='*50}")
    print(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=check)
        if result.stdout:
            print(result.stdout)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        if e.stdout:
            print(f"stdout: {e.stdout}")
        if e.stderr:
            print(f"stderr: {e.stderr}")
        return False
    except FileNotFoundError:
        print("Error: Azure CLI not found. Please install Azure CLI:")
        print("https://docs.microsoft.com/en-us/cli/azure/install-azure-cli")
        sys.exit(1)


def create_infrastructure(subscription_id=None):
    """Create all Azure resources for the Function App."""
    
    # Build commands with optional subscription
    sub_cmd = []
    if subscription_id:
        sub_cmd = ["--subscription", subscription_id]
    
    # 1. Login check
    run_az_command(
        ["az", "account", "show"],
        "Checking Azure login"
    )
    
    # 2. Create Resource Group
    run_az_command(
        ["az", "group", "create", "--name", "ags-rg", "--location", "eastus"] + sub_cmd,
        "Creating Resource Group (ags-rg in eastus)",
        check=False
    )
    
    # 3. Create Storage Account
    run_az_command(
        [
            "az", "storage", "account", "create",
            "--name", "agsaistorage",
            "--resource-group", "ags-rg",
            "--location", "eastus",
            "--sku", "Standard_LRS"
        ] + sub_cmd,
        "Creating Storage Account (agsaistorage)",
        check=False
    )
    
    # 4. Create Consumption Plan
    run_az_command(
        [
            "az", "functionapp", "plan", "create",
            "--name", "asp-ags-functions",
            "--resource-group", "ags-rg",
            "--location", "eastus",
            "--sku", "Consumption",
            "--min-instances", "0",
            "--max-burst", "200"
        ] + sub_cmd,
        "Creating Consumption Plan (Free Tier)",
        check=False
    )
    
    # 5. Create Function App
    run_az_command(
        [
            "az", "functionapp", "create",
            "--name", "ags-ai-server",
            "--resource-group", "ags-rg",
            "--storage-account", "agsaistorage",
            "--plan", "asp-ags-functions",
            "--runtime", "python",
            "--runtime-version", "3.11",
            "--functions-version", "4"
        ] + sub_cmd,
        "Creating Azure Function App (ags-ai-server)",
        check=False
    )
    
    # 6. Configure App Settings
    print("\n" + "="*50)
    print("Configuring Application Settings")
    print("="*50)
    
    # Note: ATS_API_KEY should be set from environment variable
    run_az_command(
        [
            "az", "functionapp", "config", "appsettings", "set",
            "--name", "ags-ai-server",
            "--resource-group", "ags-rg",
            "--settings",
            "PYTHON_VERSION=3.11",
            "WEBSITES_ENABLE_APP_SERVICE_STORAGE=false",
            "AzureWebJobsFeatureFlags=EnableWorkerIndex",
            "ENABLE_ORYX_BUILD=true",
            "SCM_DO_BUILD_DURING_DEPLOYMENT=true",
            "FRAMEWORK_VERSION=3.11"
        ] + sub_cmd,
        "Setting Application Settings",
        check=False
    )
    
    # 7. Configure CORS
    run_az_command(
        [
            "az", "functionapp", "cors", "update",
            "--name", "ags-ai-server",
            "--resource-group", "ags-rg",
            "--allowed-origins", "*",
            "--allowed-methods", "GET POST OPTIONS PUT DELETE PATCH",
            "--allowed-headers", "*",
            "--allow-credentials"
        ] + sub_cmd,
        "Configuring CORS (allowing all origins)",
        check=False
    )
    
    print("\n" + "="*50)
    print("Infrastructure Setup Complete!")
    print("="*50)
    print("\nIMPORTANT URLs:")
    print("  Server URL: https://ags-ai-server.azurewebsites.net")
    print("  Health:     https://ags-ai-server.azurewebsites.net/health")
    print("  API:        https://ags-ai-server.azurewebsites.net/api/analyze")
    print("\nNext steps:")
    print("  1. Set ATS_API_KEY in Azure Portal or use:")
    print("     az functionapp config appsettings set \\")
    print("       --name ags-ai-server \\")
    print("       --resource-group ags-rg \\")
    print('       --settings ATS_API_KEY="your-api-key"')
    print("  2. Deploy your code using GitHub Actions or:")
    print("     func azure functionapp publish ags-ai-server")


def update_configuration(subscription_id=None):
    """Update Function App configuration."""
    
    sub_cmd = []
    if subscription_id:
        sub_cmd = ["--subscription", subscription_id]
    
    # Configure CORS
    run_az_command(
        [
            "az", "functionapp", "cors", "update",
            "--name", "ags-ai-server",
            "--resource-group", "ags-rg",
            "--allowed-origins", "*",
            "--allowed-methods", "GET POST OPTIONS PUT DELETE PATCH",
            "--allowed-headers", "*",
            "--allow-credentials"
        ] + sub_cmd,
        "Updating CORS Configuration"
    )
    
    print("\nConfiguration updated successfully!")


def delete_infrastructure(subscription_id=None):
    """Delete all Azure resources."""
    
    sub_cmd = []
    if subscription_id:
        sub_cmd = ["--subscription", subscription_id]
    
    confirm = input("Are you sure you want to delete all resources? This cannot be undone! (yes/no): ")
    if confirm.lower() != "yes":
        print("Aborted.")
        return
    
    # Delete Function App
    run_az_command(
        [
            "az", "functionapp", "delete",
            "--name", "ags-ai-server",
            "--resource-group", "ags-rg"
        ] + sub_cmd,
        "Deleting Function App"
    )
    
    # Delete App Service Plan
    run_az_command(
        [
            "az", "functionapp", "plan", "delete",
            "--name", "asp-ags-functions",
            "--resource-group", "ags-rg"
        ] + sub_cmd,
        "Deleting App Service Plan"
    )
    
    # Delete Storage Account
    run_az_command(
        [
            "az", "storage", "account", "delete",
            "--name", "agsaistorage",
            "--resource-group", "ags-rg",
            "--yes"
        ] + sub_cmd,
        "Deleting Storage Account"
    )
    
    # Delete Resource Group
    run_az_command(
        [
            "az", "group", "delete",
            "--name", "ags-rg",
            "--yes"
        ] + sub_cmd,
        "Deleting Resource Group"
    )
    
    print("\nAll resources deleted successfully!")


def main():
    parser = argparse.ArgumentParser(
        description="Azure Functions Infrastructure Setup for ATS AI Server"
    )
    parser.add_argument(
        "--create",
        action="store_true",
        help="Create Azure Functions infrastructure"
    )
    parser.add_argument(
        "--update",
        action="store_true",
        help="Update Function App configuration"
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete all Azure resources"
    )
    parser.add_argument(
        "--subscription",
        help="Azure Subscription ID (optional)"
    )
    
    args = parser.parse_args()
    
    if args.create:
        create_infrastructure(args.subscription)
    elif args.update:
        update_configuration(args.subscription)
    elif args.delete:
        delete_infrastructure(args.subscription)
    else:
        parser.print_help()
        print("\n" + "="*50)
        print("Example usage:")
        print("  python setup_azure_functions.py --create")
        print("  python setup_azure_functions.py --update")
        print("  python setup_azure_functions.py --delete")
        print("="*50)


if __name__ == "__main__":
    main()
