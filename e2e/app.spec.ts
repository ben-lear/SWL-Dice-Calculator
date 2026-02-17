import { test, expect } from '@playwright/test';

/**
 * Basic E2E test for the Star Wars: Legion Dice Calculator
 */
test.describe('SWL Dice Calculator', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that the title is visible
    await expect(page).toHaveTitle(/Just Roll Crits/i);
    
    // Check that main components are present
    await expect(page.getByText(/attacker/i)).toBeVisible();
    await expect(page.getByText(/defender/i)).toBeVisible();
  });
  
  test('can interact with dice calculator', async ({ page }) => {
    await page.goto('/');
    
    // Basic smoke test - verify the app is interactive
    // Add more specific tests based on your UI structure
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
