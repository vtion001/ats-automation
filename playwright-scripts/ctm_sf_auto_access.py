"""
CTM-SF Auto-Account Access
Automatically opens Salesforce account when call comes via CTM
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, Page, Browser


class CTMSFAutoAccess:
    def __init__(self, client: str = "flyland"):
        self.client = client
        self.config = self._load_config()
        self.browser: Browser = None
        self.page: Page = None

    def _load_config(self) -> dict:
        config_path = Path(__file__).parent.parent / "clients" / self.client / "config.json"
        if config_path.exists():
            with open(config_path) as f:
                return json.load(f)
        return {}

    async def init_browser(self, headless: bool = False):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=headless)
        context = await self.browser.new_context()
        self.page = await context.new_page()

    async def search_salesforce(self, phone_number: str) -> dict:
        clean_phone = self._clean_phone(phone_number)
        
        sf_url = f"https://flyland.my.salesforce.com/lightning/setup/Search/home?ws=%2Fsearch%2F%3FsearchType%3D2%26q%3D{clean_phone}"
        
        await self.page.goto(sf_url)
        await self.page.wait_for_load_state("networkidle")
        
        await asyncio.sleep(2)
        
        results = await self._extract_search_results()
        
        return results

    async def _extract_search_results(self) -> dict:
        try:
            name = await self.page.locator(".forceCommunityRecordName, .slds-truncate").first.text_content(timeout=3000)
        except:
            name = None

        try:
            phone = await self.page.locator("[data-field-name='Phone']").first.text_content(timeout=3000)
        except:
            phone = None

        try:
            status = await self.page.locator("[data-field-name='Status']").first.text_content(timeout=3000)
        except:
            status = None

        return {
            "name": name,
            "phone": phone,
            "status": status,
            "url": self.page.url
        }

    def _clean_phone(self, phone: str) -> str:
        return "".join(c for c in phone if c.isdigit())

    async def open_account_in_new_tab(self, phone_number: str):
        results = await self.search_salesforce(phone_number)
        
        if results.get("name"):
            await self.page.click(".forceListRecordSelector, .slds-table tr:first-child")
        
        return results

    async def close(self):
        if self.browser:
            await self.browser.close()


async def main():
    automation = CTMSFAutoAccess("flyland")
    
    try:
        await automation.init_browser(headless=False)
        results = await automation.open_account_in_new_tab("5551234567")
        print("Results:", results)
    finally:
        await automation.close()


if __name__ == "__main__":
    asyncio.run(main())
