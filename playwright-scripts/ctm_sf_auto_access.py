"""
Salesforce Automation Test Script
Tests Salesforce form filling for Log Call and Task creation
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, Page, Browser, BrowserContext


class SalesforceAutomation:
    def __init__(self, client: str = "flyland"):
        self.client = client
        self.config = self._load_config()
        self.browser: Browser = None
        self.context: BrowserContext = None
        self.page: Page = None
        self.salesforce_url = "https://flyland.lightning.force.com"

    def _load_config(self) -> dict:
        config_path = Path(__file__).parent.parent / "clients" / self.client / "config.json"
        if config_path.exists():
            with open(config_path) as f:
                return json.load(f)
        return {}

    async def init_browser(self, headless: bool = True):
        """Initialize browser"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=headless)
        self.context = await self.browser.new_context(viewport={"width": 1280, "height": 720})
        self.page = await self.context.new_page()
        print(f"Browser initialized (headless={headless})")

    async def login_salesforce(self, username: str, password: str) -> bool:
        """Login to Salesforce"""
        print(f"Logging into Salesforce as {username}...")

        # Go to login page
        await self.page.goto("https://flyland.lightning.force.com/")
        await self.page.wait_for_load_state("networkidle")

        # Check if already logged in
        if "lightning" in self.page.url:
            print("Already logged in to Salesforce")
            return True

        # If not logged in, enter credentials
        try:
            # Enter username
            await self.page.fill("#username", username)
            await self.page.fill("#password", password)
            await self.page.click("#Login")

            # Wait for navigation
            await self.page.wait_for_load_state("networkidle")
            await asyncio.sleep(3)

            if "lightning" in self.page.url:
                print("Successfully logged in to Salesforce")
                return True
            else:
                print("Login may have failed, continuing anyway...")
                return True
        except Exception as e:
            print(f"Login error: {e}")
            return False

    async def search_contact(self, phone_number: str) -> dict:
        """Search for contact by phone number"""
        clean_phone = self._clean_phone(phone_number)

        print(f"Searching for contact with phone: {clean_phone}")

        # Go to search page
        search_url = f"{self.salesforce_url}/lightning/setup/Search/home?ws=%2Fsearch%2F%3FsearchType%3D2%26q%3D{clean_phone}"
        await self.page.goto(search_url)
        await self.page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # Extract results
        results = await self._extract_search_results()
        print(f"Search results: {results}")

        return results

    async def _extract_search_results(self) -> dict:
        """Extract contact search results"""
        try:
            # Try to find contact name
            name = await self.page.locator(
                ".forceCommunityRecordName, .slds-truncate, [class*='record']"
            ).first.text_content(timeout=3000)
        except:
            name = None

        try:
            # Try to find phone
            phone = await self.page.locator(
                "[data-field-name='Phone'], [class*='Phone']"
            ).first.text_content(timeout=3000)
        except:
            phone = None

        return {"name": name, "phone": phone, "url": self.page.url}

    def _clean_phone(self, phone: str) -> str:
        """Clean phone number"""
        return "".join(c for c in phone if c.isdigit())

    async def open_log_call_form(self, record_id: str = None) -> bool:
        """Open Log a Call form"""
        print("Opening Log a Call form...")

        if record_id:
            # Navigate to specific contact
            log_call_url = f"{self.salesforce_url}/lightning/actions/quickAction/LogCall/LogCall?recordId={record_id}&quickActionName=LogCall"
        else:
            # Open generic log call from home
            log_call_url = f"{self.salesforce_url}/lightning/actions/quickAction/LogCall/LogCall"

        await self.page.goto(log_call_url)
        await self.page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # Check if form is visible
        form_visible = await self._is_log_call_form_visible()
        print(f"Log Call form visible: {form_visible}")

        return form_visible

    async def _is_log_call_form_visible(self) -> bool:
        """Check if Log Call form is visible"""
        try:
            # Look for Subject field or form elements
            subject = await self.page.locator(
                "[name='Subject'], input[class*='subject'], .subject-input"
            ).is_visible(timeout=2000)
            return subject
        except:
            return False

    async def fill_log_call_form(self, subject: str, description: str) -> dict:
        """Fill Log a Call form"""
        print(f"Filling Log Call form: Subject={subject}")

        try:
            # Fill Subject
            await self.page.fill(
                "[name='Subject'], input[class*='subject'], .subject-input", subject
            )
            await asyncio.sleep(0.5)

            # Fill Description/Comments
            await self.page.fill(
                "[name='Description'], textarea[class*='description'], .comments-input", description
            )
            await asyncio.sleep(0.5)

            # Get field values to verify
            subject_value = await self.page.locator(
                "[name='Subject'], input[class*='subject']"
            ).input_value()
            description_value = await self.page.locator(
                "[name='Description'], textarea[class*='description']"
            ).input_value()

            print(f"Verified - Subject: {subject_value}, Description: {description_value[:50]}...")

            return {
                "success": True,
                "subject_filled": subject_value == subject,
                "description_filled": description_value == description,
            }
        except Exception as e:
            print(f"Error filling Log Call form: {e}")
            return {"success": False, "error": str(e)}

    async def open_task_form(self, record_id: str = None) -> bool:
        """Open New Task form"""
        print("Opening New Task form...")

        if record_id:
            task_url = f"{self.salesforce_url}/lightning/actions/quickAction/NewTask/NewTask?recordId={record_id}&quickActionName=NewTask"
        else:
            task_url = f"{self.salesforce_url}/lightning/actions/quickAction/NewTask/NewTask"

        await self.page.goto(task_url)
        await self.page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        form_visible = await self._is_task_form_visible()
        print(f"Task form visible: {form_visible}")

        return form_visible

    async def _is_task_form_visible(self) -> bool:
        """Check if Task form is visible"""
        try:
            subject = await self.page.locator(
                "[name='Subject'], input[class*='subject'], .subject-input"
            ).is_visible(timeout=2000)
            return subject
        except:
            return False

    async def fill_task_form(
        self, subject: str, due_date: str, priority: str, description: str
    ) -> dict:
        """Fill New Task form"""
        print(f"Filling Task form: Subject={subject}, Due={due_date}, Priority={priority}")

        try:
            # Fill Subject
            await self.page.fill(
                "[name='Subject'], input[class*='subject'], .subject-input", subject
            )
            await asyncio.sleep(0.5)

            # Fill Due Date
            if due_date:
                await self.page.fill(
                    "[name='DueDate'], input[class*='date'], .due-date-input", due_date
                )
                await asyncio.sleep(0.5)

            # Fill Priority (select)
            if priority:
                try:
                    await self.page.select_option(
                        "[name='Priority'], select[class*='priority']", priority
                    )
                except:
                    pass
                await asyncio.sleep(0.5)

            # Fill Description
            await self.page.fill(
                "[name='Description'], textarea[class*='description'], .comments-input", description
            )
            await asyncio.sleep(0.5)

            # Verify
            subject_value = await self.page.locator(
                "[name='Subject'], input[class*='subject']"
            ).input_value()

            return {"success": True, "subject_filled": subject_value == subject}
        except Exception as e:
            print(f"Error filling Task form: {e}")
            return {"success": False, "error": str(e)}

    async def run_full_test(self, phone: str, action_data: dict):
        """Run full automation test"""
        print(f"\n{'=' * 50}")
        print(f"Starting Salesforce Automation Test")
        print(f"{'=' * 50}\n")

        # Step 1: Search contact
        print("\n[Step 1] Searching for contact...")
        contact = await self.search_contact(phone)
        print(f"Contact found: {contact}")

        # Step 2: Determine action
        action_type = action_data.get("action", "log_call")

        if action_type == "new_task":
            print(f"\n[Step 2] Testing Task Creation Form...")
            form_opened = await self.open_task_form()

            if form_opened:
                result = await self.fill_task_form(
                    subject=action_data.get("task_subject", "Follow-up Call"),
                    due_date=action_data.get("task_due_date", ""),
                    priority=action_data.get("priority", "Normal"),
                    description=action_data.get("call_notes", ""),
                )
                print(f"Task form fill result: {result}")
            else:
                print("Could not open Task form - may need valid record ID")
        else:
            print(f"\n[Step 2] Testing Log Call Form...")
            form_opened = await self.open_log_call_form()

            if form_opened:
                result = await self.fill_log_call_form(
                    subject=action_data.get("call_subject", "Inbound Call"),
                    description=action_data.get("call_notes", ""),
                )
                print(f"Log Call form fill result: {result}")
            else:
                print("Could not open Log Call form - may need valid record ID")

        print(f"\n{'=' * 50}")
        print(f"Test Complete")
        print(f"{'=' * 50}\n")

    async def close(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
            print("Browser closed")


async def main():
    """Main test function"""
    # Test action data (simulating AI decision)
    test_action_data = {
        "action": "log_call",  # or "new_task"
        "call_subject": "Inbound Call - Treatment Inquiry",
        "call_notes": "Caller interested in addiction treatment. Has Blue Cross insurance. 30 days sober.",
        "task_subject": "Follow-up: Treatment Inquiry",
        "task_due_date": "2026-03-20",
        "priority": "High",
    }

    automation = SalesforceAutomation("flyland")

    try:
        # Initialize browser (headless=False to see what's happening)
        await automation.init_browser(headless=False)

        # If you have credentials, uncomment and fill:
        # await automation.login_salesforce("your_username", "your_password")

        # Run the test
        await automation.run_full_test("5551234567", test_action_data)

    except Exception as e:
        print(f"Test error: {e}")
    finally:
        await automation.close()


if __name__ == "__main__":
    asyncio.run(main())
