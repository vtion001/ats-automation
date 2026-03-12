from typing import Optional, Dict, Any, List
from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext
import logging

logger = logging.getLogger(__name__)


class BrowserManager:
    """Manages Playwright browser lifecycle."""

    def __init__(self, headless: bool = False):
        self.headless = headless
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.contexts: List[BrowserContext] = []

    def start(self) -> Browser:
        """Start the browser."""
        if self.browser:
            return self.browser

        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )
        logger.info("Browser started")
        return self.browser

    def new_context(self, **kwargs) -> BrowserContext:
        """Create a new browser context."""
        if not self.browser:
            self.start()

        context = self.browser.new_context(viewport={"width": 1280, "height": 720}, **kwargs)
        self.contexts.append(context)
        return context

    def new_page(self, context: Optional[BrowserContext] = None) -> Page:
        """Create a new page."""
        if not context:
            context = self.new_context()

        return context.new_page()

    def close_context(self, context: BrowserContext) -> None:
        """Close a specific context."""
        if context in self.contexts:
            context.close()
            self.contexts.remove(context)

    def stop(self) -> None:
        """Stop the browser and cleanup."""
        for context in self.contexts:
            try:
                context.close()
            except Exception as e:
                logger.warning(f"Error closing context: {e}")

        self.contexts.clear()

        if self.browser:
            self.browser.close()
            self.browser = None

        if self.playwright:
            self.playwright.stop()
            self.playwright = None

        logger.info("Browser stopped")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()


class TabController:
    """Manages multiple tabs in a browser context."""

    def __init__(self, context: BrowserContext):
        self.context = context
        self.pages: Dict[str, Page] = {}

    def open_tab(self, name: str, url: str) -> Page:
        """Open a new tab with a name."""
        page = self.context.new_page()
        page.goto(url)
        self.pages[name] = page
        logger.info(f"Opened tab: {name} -> {url}")
        return page

    def get_tab(self, name: str) -> Optional[Page]:
        """Get a tab by name."""
        return self.pages.get(name)

    def close_tab(self, name: str) -> None:
        """Close a tab by name."""
        if name in self.pages:
            self.pages[name].close()
            del self.pages[name]
            logger.info(f"Closed tab: {name}")

    def get_active_tab(self) -> Optional[Page]:
        """Get the currently active tab."""
        for page in self.pages.values():
            if page.is_visible():
                return page
        return None

    def switch_to_tab(self, name: str) -> Optional[Page]:
        """Switch to a tab by name."""
        page = self.pages.get(name)
        if page:
            page.bring_to_front()
        return page

    def close_all(self) -> None:
        """Close all tabs."""
        for page in self.pages.values():
            try:
                page.close()
            except Exception as e:
                logger.warning(f"Error closing page: {e}")
        self.pages.clear()
