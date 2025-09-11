import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Main Application Flow
 * 
 * These tests verify the complete user experience by testing real interactions
 * with the running Tauri application. They complement our unit and integration tests
 * by ensuring the entire application works as expected from a user's perspective.
 */

test.describe('AI File Organizer - Main Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the main content to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should display the main application interface', async ({ page }) => {
    // Verify main application elements are visible
    await expect(page.locator('h1')).toContainText('AI File Organizer');
    await expect(page.locator('text=Organize your files intelligently')).toBeVisible();
    
    // Verify main sections are present
    await expect(page.locator('[data-testid="file-explorer"]')).toBeVisible();
    await expect(page.locator('[data-testid="organization-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
  });

  test('should test Tauri backend communication', async ({ page }) => {
    // Find and interact with the Tauri test section
    const nameInput = page.locator('input[placeholder="Enter a name..."]');
    const greetButton = page.locator('button:has-text("Greet")');
    
    // Test the greet functionality
    await nameInput.fill('Playwright Test');
    await greetButton.click();
    
    // Verify the response appears (this tests Rust backend communication)
    await expect(page.locator('text=Hello Playwright Test!')).toBeVisible({ timeout: 5000 });
  });

  test('should handle initial application state correctly', async ({ page }) => {
    // Verify initial progress state
    const progressIndicator = page.locator('[data-testid="progress-indicator"]');
    await expect(progressIndicator).toBeVisible();
    
    // Check that progress shows "Ready to organize files"
    await expect(page.locator('text=Ready to organize files')).toBeVisible();
    
    // Verify file explorer shows sample data
    const treeView = page.locator('[data-testid="tree-view"]');
    await expect(treeView).toBeVisible();
    
    // Check for sample files in the tree
    await expect(page.locator('[data-testid="tree-node-root"]')).toBeVisible();
  });
});

test.describe('File Explorer Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should expand and collapse file tree nodes', async ({ page }) => {
    // Find a collapsible node
    const documentsFolderToggle = page.locator('[data-testid="tree-toggle-Documents"]');
    
    if (await documentsFolderToggle.isVisible()) {
      // Click to expand
      await documentsFolderToggle.click();
      await page.waitForTimeout(300); // Small delay for animation
      
      // Verify expansion (check for expanded attribute)
      const documentsNode = page.locator('[data-testid="tree-node-Documents"]');
      await expect(documentsNode).toHaveAttribute('aria-expanded', 'true');
      
      // Click to collapse
      await documentsFolderToggle.click();
      await page.waitForTimeout(300);
      
      // Verify collapse
      await expect(documentsNode).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('should select files and update selection state', async ({ page }) => {
    // Click on a file to select it
    const firstFile = page.locator('[data-testid^="tree-node-"]').first();
    await firstFile.click();
    
    // Verify selection styling or state (adjust based on implementation)
    await expect(firstFile).toHaveAttribute('aria-selected', 'true');
    
    // Verify selection count in organization panel
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    if (await selectionInfo.isVisible()) {
      await expect(selectionInfo).toContainText('1 item selected');
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Focus on tree view
    const treeView = page.locator('[data-testid="tree-view"]');
    await treeView.click();
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Test Enter key for selection
    await page.keyboard.press('Enter');
    
    // Verify that keyboard navigation works (focus should be visible)
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Organization Panel Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should trigger AI analysis workflow', async ({ page }) => {
    // First select some files
    const firstFile = page.locator('[data-testid^="tree-node-"]').first();
    await firstFile.click();
    
    // Click the Analyze Files button
    const analyzeButton = page.locator('button:has-text("Analyze Files")');
    await analyzeButton.click();
    
    // Verify progress indicator shows analysis in progress
    await expect(page.locator('[data-testid="progress-container"] .progress-indicator__label')).toContainText('Analyzing files with AI...');
    
    // Wait for analysis to complete (simulated)
    await page.waitForTimeout(3000);
    
    // Verify completion state
    await expect(page.locator('text=Analysis complete')).toBeVisible({ timeout: 5000 });
  });

  test('should display and interact with organization suggestions', async ({ page }) => {
    // Trigger analysis first
    const analyzeButton = page.locator('button:has-text("Analyze Files")');
    await analyzeButton.click();
    
    // Wait for analysis to complete
    await page.waitForTimeout(3500);
    
    // Check for suggestions section
    const suggestionsSection = page.locator('[data-testid="suggestions-list"]');
    if (await suggestionsSection.isVisible()) {
      // Verify suggestions are displayed
      await expect(suggestionsSection).toBeVisible();
      
      // Test suggestion interaction (accept/reject buttons)
      const firstAcceptButton = page.locator('[data-testid="accept-suggestion"]').first();
      if (await firstAcceptButton.isVisible()) {
        await firstAcceptButton.click();
        
        // Verify feedback
        await expect(page.locator('text=Suggestion accepted')).toBeVisible();
      }
    }
  });

  test('should update confidence threshold setting', async ({ page }) => {
    // Find and interact with confidence threshold slider
    const confidenceSlider = page.locator('[data-testid="confidence-threshold"]');
    
    if (await confidenceSlider.isVisible()) {
      // Get initial value
      const initialValue = await confidenceSlider.getAttribute('value');
      
      // Adjust the slider
      await confidenceSlider.fill('80');
      
      // Verify the value changed
      await expect(confidenceSlider).toHaveValue('80');
      
      // Verify the display updates
      await expect(page.locator('text=80%')).toBeVisible();
    }
  });

  test('should toggle preview mode', async ({ page }) => {
    // Find and toggle preview mode checkbox
    const previewCheckbox = page.locator('[data-testid="preview-mode"]');
    
    if (await previewCheckbox.isVisible()) {
      // Check initial state
      const isInitiallyChecked = await previewCheckbox.isChecked();
      
      // Toggle the checkbox
      await previewCheckbox.click();
      
      // Verify state changed
      await expect(previewCheckbox).toBeChecked({ checked: !isInitiallyChecked });
      
      // Toggle back
      await previewCheckbox.click();
      
      // Verify state reverted
      await expect(previewCheckbox).toBeChecked({ checked: isInitiallyChecked });
    }
  });
});

test.describe('Progress Indicator Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should show progress during AI analysis', async ({ page }) => {
    // Start analysis
    const analyzeButton = page.locator('button:has-text("Analyze Files")');
    await analyzeButton.click();
    
    // Verify progress indicator shows analysis state
    const progressIndicator = page.locator('[data-testid="progress-indicator"]');
    await expect(progressIndicator).toBeVisible();
    
    // Check for progress bar or loading state
    const progressBar = page.locator('[data-testid="progress-bar"]');
    if (await progressBar.isVisible()) {
      await expect(progressBar).toBeVisible();
    }
    
    // Verify status text
    await expect(page.locator('[data-testid="progress-container"] .progress-indicator__label')).toContainText('Analyzing files with AI...');
    
    // Wait for completion
    await page.waitForTimeout(3500);
    
    // Verify completion state
    await expect(page.locator('text=Analysis complete')).toBeVisible();
  });

  test('should display file processing information', async ({ page }) => {
    // Start analysis to see progress details
    const analyzeButton = page.locator('button:has-text("Analyze Files")');
    await analyzeButton.click();
    
    // Check for file processing details
    const processingInfo = page.locator('[data-testid="processing-info"]');
    if (await processingInfo.isVisible()) {
      await expect(processingInfo).toContainText('Processing');
    }
  });
});

test.describe('Accessibility Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should support keyboard navigation throughout the app', async ({ page }) => {
    // Test Tab navigation through main elements
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify we can reach and interact with main controls
    focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check tree view accessibility
    const treeView = page.locator('[data-testid="tree-view"]');
    await expect(treeView).toHaveAttribute('role', 'tree');
    
    // Check buttons have proper labels
    const analyzeButton = page.locator('button:has-text("Analyze Files")');
    await expect(analyzeButton).toHaveAttribute('type', 'button');
    
    // Check form controls have proper labeling
    const confidenceSlider = page.locator('[data-testid="confidence-threshold"]');
    if (await confidenceSlider.isVisible()) {
      await expect(confidenceSlider).toHaveAttribute('role', 'slider');
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Test landmark navigation
    const main = page.locator('main');
    if (await main.isVisible()) {
      await expect(main).toBeVisible();
    }
    
    // Test heading structure
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toContainText('AI File Organizer');
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should handle analysis errors gracefully', async ({ page }) => {
    // This test would be more meaningful with actual error simulation
    // For now, we'll test that the app doesn't crash with rapid interactions
    
    const analyzeButton = page.locator('button:has-text("Analyze Files")');
    
    // Rapidly click analyze button multiple times
    await analyzeButton.click();
    await analyzeButton.click();
    await analyzeButton.click();
    
    // Verify app remains stable
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    
    // Verify no JavaScript errors crashed the app
    await expect(page.locator('h1')).toContainText('AI File Organizer');
  });
});