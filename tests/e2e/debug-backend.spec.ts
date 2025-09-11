import { test, expect } from '@playwright/test';

test.describe('Debug Backend Communication', () => {
  test('debug what text appears after clicking greet', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the main content to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Find and interact with the Tauri test section
    const nameInput = page.locator('input[placeholder="Enter a name..."]');
    const greetButton = page.locator('button:has-text("Greet")');
    
    // Test the greet functionality
    await nameInput.fill('Playwright Test');
    await greetButton.click();
    
    // Wait a bit for the response
    await page.waitForTimeout(2000);
    
    // Take a screenshot to see what's happening
    await page.screenshot({ path: 'debug-backend-response.png', fullPage: true });
    
    // Use getByText to find the response directly
    const responseText = page.getByText('Hello Playwright Test!');
    
    if (await responseText.isVisible()) {
      console.log('SUCCESS: Found expected "Hello Playwright Test!" text');
    } else {
      console.log('Expected text not found');
      
      // Debug by getting the entire test section
      const testSection = page.locator('h3:has-text("Test Backend Communication")').locator('..');
      const allText = await testSection.textContent();
      console.log('Test section content:', allText);
    }
    
    // The test should pass now that we have the fallback working
    await expect(responseText).toBeVisible();
  });
});