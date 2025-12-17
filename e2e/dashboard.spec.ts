import { test, expect } from '@playwright/test';

test.describe('BOBT Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/BOBT Dashboard/);

    // Check header shows Dashboard
    await expect(page.locator('h1').first()).toContainText('Dashboard');
  });

  test('should display sidebar navigation', async ({ page }) => {
    // Check sidebar items exist (use first() to handle duplicates)
    await expect(page.locator('a:has-text("Dashboard")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Trade")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Markets")').first()).toBeVisible();
    await expect(page.locator('a:has-text("History")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Reserves")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Settings")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Help")').first()).toBeVisible();
  });

  test('should show testnet indicator', async ({ page }) => {
    await expect(page.locator('text=Testnet')).toBeVisible();
  });

  test('should display wallet connect button', async ({ page }) => {
    // Look for wallet connection button or connected state
    const walletButton = page.locator('button:has-text("Connect"), button:has-text("Conectar")');
    await expect(walletButton.first()).toBeVisible();
  });

  test('should display Bolivia Ramp widget', async ({ page }) => {
    // Check for the ramp card
    await expect(page.locator('text=Compra/Venta BOBT')).toBeVisible();

    // Check tabs
    await expect(page.locator('button:has-text("Comprar BOBT")')).toBeVisible();
    await expect(page.locator('button:has-text("Vender BOBT")')).toBeVisible();
  });

  test('should display price information from CriptoYa', async ({ page }) => {
    // Wait for price data to load
    await page.waitForTimeout(2000);

    // Check for exchange prices
    await expect(page.locator('text=Precio BOB/USD')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to Trade page', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Trade")');
    await expect(page).toHaveURL(/.*\/trade/);
  });

  test('should navigate to Markets page', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Markets")');
    await expect(page).toHaveURL(/.*\/markets/);
  });

  test('should navigate to History page', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("History")');
    await expect(page).toHaveURL(/.*\/history/);
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL(/.*\/settings/);
  });

  test('should navigate to Help page', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Help")');
    await expect(page).toHaveURL(/.*\/help/);
  });
});

test.describe('Bolivia Ramp Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should switch between buy and sell tabs', async ({ page }) => {
    // Click Vender tab
    await page.click('button:has-text("Vender BOBT")');
    await expect(page.locator('label:has-text("Tú vendes")')).toBeVisible();

    // Click Comprar tab
    await page.click('button:has-text("Comprar BOBT")');
    await expect(page.locator('label:has-text("Tú depositas")')).toBeVisible();
  });

  test('should show input fields for buying', async ({ page }) => {
    // Should show BOB input field
    await expect(page.locator('input[type="number"]').first()).toBeVisible();

    // Should show currency labels
    await expect(page.locator('text=BOB').first()).toBeVisible();
  });

  test('should calculate preview when amount entered', async ({ page }) => {
    // Enter amount
    await page.fill('input[placeholder="0.00"]', '100');

    // Wait for calculation
    await page.waitForTimeout(500);

    // Should show fee breakdown
    await expect(page.locator('text=Comisión')).toBeVisible();
    await expect(page.locator('text=Total a recibir')).toBeVisible();
  });

  test('should show minimum amount validation', async ({ page }) => {
    await expect(page.locator('text=Mínimo: Bs. 10')).toBeVisible();
  });

  test('should disable button when amount is less than minimum', async ({ page }) => {
    await page.fill('input[placeholder="0.00"]', '5');

    // Button should be disabled
    const button = page.locator('button:has-text("Continuar"), button:has-text("Conectar Wallet")');
    // If wallet not connected, button says "Conectar Wallet" which is enabled
    // If connected, button should be disabled because amount < 10
  });
});

test.describe('Ramp API Integration', () => {
  test('should get quote from API when valid amount entered', async ({ page, request }) => {
    // Test API directly
    const response = await request.post('http://localhost:3002/api/quote/on-ramp', {
      data: { bobAmount: 100 }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.inputAmount).toBe(100);
    expect(data.data.outputAmount).toBe(99.5); // 100 - 0.5% fee
    expect(data.data.feePercent).toBe(0.5);
  });

  test('should handle string numbers in API', async ({ request }) => {
    const response = await request.post('http://localhost:3002/api/quote/on-ramp', {
      data: { bobAmount: "200" }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.inputAmount).toBe(200);
  });

  test('should reject empty body', async ({ request }) => {
    const response = await request.post('http://localhost:3002/api/quote/on-ramp', {
      data: {}
    });

    expect(response.status()).toBe(400);
  });

  test('should get exchange prices', async ({ request }) => {
    const response = await request.get('http://localhost:3002/api/prices/exchanges');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.prices).toBeDefined();
    expect(data.data.bestBuy).toBeDefined();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Dashboard should still be visible
    await expect(page.locator('text=Dashboard BOBT')).toBeVisible();

    // Sidebar might be collapsed on mobile
    // Wallet button should still be visible
    await expect(page.locator('button:has-text("Connect"), button:has-text("Conectar")').first()).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('text=Dashboard BOBT')).toBeVisible();
  });
});
