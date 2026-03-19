"""
Azure Key Vault Setup Script for CTM Credentials

This script stores CTM API credentials in Azure Key Vault instead of local .env files.

Usage:
    python setup_azure_keyvault.py

Prerequisites:
    az login
    pip install azure-identity azure-keyvault-secrets
"""

import os
import sys


def setup_azure_keyvault():
    """Store CTM credentials in Azure Key Vault"""
    try:
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient
    except ImportError:
        print("Installing azure dependencies...")
        os.system("pip install azure-identity azure-keyvault-secrets")
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient

    # Get Key Vault URL
    keyvault_url = os.getenv("AZURE_KEYVAULT_URL", "")
    if not keyvault_url:
        print("Enter your Azure Key Vault URL:")
        print("(e.g., https://your-vault-name.vault.azure.net/)")
        keyvault_url = input("> ").strip()

    if not keyvault_url:
        print("Error: AZURE_KEYVAULT_URL is required")
        sys.exit(1)

    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=keyvault_url, credential=credential)

    print("\n=== CTM Credentials Setup ===\n")

    # Get CTM Access Key
    access_key = os.getenv("CTM_ACCESS_KEY", "")
    if not access_key:
        print("Enter CTM Access Key:")
        access_key = input("> ").strip()

    # Get CTM Secret Key
    secret_key = os.getenv("CTM_SECRET_KEY", "")
    if not secret_key:
        print("Enter CTM Secret Key:")
        secret_key = input("> ").strip()

    # Get CTM Account ID
    account_id = os.getenv("CTM_ACCOUNT_ID", "")
    if not account_id:
        print("Enter CTM Account ID:")
        account_id = input("> ").strip()

    # Store secrets
    print("\nStoring secrets in Azure Key Vault...")

    client.set_secret("CTM-AccessKey", access_key)
    print("  [OK] CTM-AccessKey stored")

    client.set_secret("CTM-SecretKey", secret_key)
    print("  [OK] CTM-SecretKey stored")

    if account_id:
        client.set_secret("CTM-AccountId", account_id)
        print("  [OK] CTM-AccountId stored")

    print("\n=== Setup Complete ===")
    print(f"\nAdd to your environment or Azure App Settings:")
    print(f"  AZURE_KEYVAULT_URL={keyvault_url}")
    print(f"  CTM_ACCOUNT_ID={account_id}")


def check_keyvault_access():
    """Verify access to Azure Key Vault"""
    try:
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient
    except ImportError:
        print("azure-identity or azure-keyvault-secrets not installed")
        return False

    keyvault_url = os.getenv("AZURE_KEYVAULT_URL", "")
    if not keyvault_url:
        print("AZURE_KEYVAULT_URL not set")
        return False

    try:
        credential = DefaultAzureCredential()
        client = SecretClient(vault_url=keyvault_url, credential=credential)

        # Try to list secrets to verify access
        secrets = list(client.list_properties_of_secrets())
        print(f"Connected to Key Vault. Found {len(secrets)} secrets.")

        # Check for CTM secrets
        ctm_secrets = [s for s in secrets if s.name.startswith("CTM-")]
        if ctm_secrets:
            print(f"CTM secrets found: {[s.name for s in ctm_secrets]}")
        else:
            print("No CTM secrets found. Run setup_azure_keyvault() first.")

        return True

    except Exception as e:
        print(f"Failed to connect to Key Vault: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        check_keyvault_access()
    else:
        setup_azure_keyvault()
