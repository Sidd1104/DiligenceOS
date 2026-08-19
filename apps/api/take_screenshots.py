import os
import time
from playwright.sync_api import sync_playwright

DOCS_SCREENSHOTS = r"c:\Users\asus\OneDrive\Desktop\PROJECTS\DiligenceOS\docs\screenshots"
ARTIFACT_SCREENSHOTS = r"C:\Users\asus\.gemini\antigravity-ide\brain\b7d59217-607b-4373-994d-6b564d4f43d6\screenshots"

os.makedirs(DOCS_SCREENSHOTS, exist_ok=True)
os.makedirs(ARTIFACT_SCREENSHOTS, exist_ok=True)

def save_screenshot(page, filename, full_page=True):
    path1 = os.path.join(DOCS_SCREENSHOTS, filename)
    path2 = os.path.join(ARTIFACT_SCREENSHOTS, filename)
    page.screenshot(path=path1, full_page=full_page)
    page.screenshot(path=path2, full_page=full_page)
    print(f"Saved screenshot: {filename}")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Desktop viewport width
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Login Page
        page.goto("http://localhost:3000/login", wait_until="networkidle")
        time.sleep(1)
        save_screenshot(page, "01-login.png")

        # 2. Register Page
        page.goto("http://localhost:3000/register", wait_until="networkidle")
        time.sleep(1)
        save_screenshot(page, "02-register.png")

        # Perform Login
        page.goto("http://localhost:3000/login", wait_until="networkidle")
        page.fill("#email", "analyst@firm.com")
        page.fill("#password", "password123")
        page.click("button[type='submit']")
        page.wait_for_url("**/dashboard", timeout=10000)
        time.sleep(1.5)

        # 3. Dashboard Page
        save_screenshot(page, "03-dashboard.png")

        # 4. Company Overview Page
        company_url = "http://localhost:3000/companies/c1111111-1111-1111-1111-111111111111"
        page.goto(company_url, wait_until="networkidle")
        time.sleep(1.5)
        save_screenshot(page, "04-company-overview.png")

        # 5. Document Upload & List Section
        save_screenshot(page, "05-document-upload-list.png")

        # 6. AI Research Page
        research_url = "http://localhost:3000/companies/c1111111-1111-1111-1111-111111111111/research"
        page.goto(research_url, wait_until="networkidle")
        time.sleep(2)
        save_screenshot(page, "06-ai-research.png")

        # 7. Document Viewer Page
        viewer_url = "http://localhost:3000/companies/c1111111-1111-1111-1111-111111111111/documents/d1111111-1111-1111-1111-111111111111"
        page.goto(viewer_url, wait_until="networkidle")
        time.sleep(2)
        save_screenshot(page, "07-document-viewer.png")

        browser.close()
        print("All screenshots captured successfully!")

if __name__ == "__main__":
    run()
