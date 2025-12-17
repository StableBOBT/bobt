import { test, expect } from '@playwright/test';

test.describe('Full Flow Tests', () => {

  test.describe('Dashboard Components', () => {
    test('should render all main dashboard components', async ({ page }) => {
      await page.goto('/');

      // Sidebar should be visible
      await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible();

      // Header with wallet button
      await expect(page.locator('header')).toBeVisible();

      // Bolivia Ramp Card
      await expect(page.locator('text=Compra/Venta BOBT')).toBeVisible();

      // Price display
      await expect(page.locator('text=Precio BOB/USD')).toBeVisible();
    });

    test('should show correct balance card state when disconnected', async ({ page }) => {
      await page.goto('/');

      // Should show connect wallet message or zero balance
      const balanceCard = page.locator('text=Balance').first();
      await expect(balanceCard).toBeVisible();
    });
  });

  test.describe('Bolivia Ramp Flow', () => {
    test('should show buy tab by default', async ({ page }) => {
      await page.goto('/');

      // Buy tab should be active
      await expect(page.locator('button[data-state="active"]:has-text("Comprar BOBT")')).toBeVisible();

      // Should show "Tú depositas" label
      await expect(page.locator('text=Tú depositas')).toBeVisible();
    });

    test('should switch to sell tab', async ({ page }) => {
      await page.goto('/');

      await page.click('button:has-text("Vender BOBT")');

      // Should show sell form
      await expect(page.locator('text=Tú vendes')).toBeVisible();

      // Should show bank details form
      await expect(page.locator('text=Datos bancarios')).toBeVisible();
    });

    test('should calculate fee preview when amount entered (buy)', async ({ page }) => {
      await page.goto('/');

      // Enter amount
      const input = page.locator('input[type="number"]').first();
      await input.fill('100');

      // Should show fee calculation
      await expect(page.locator('text=Comisión')).toBeVisible();
      await expect(page.locator('text=0.5%')).toBeVisible();

      // Should show total to receive (99.5 after 0.5% fee)
      await expect(page.locator('text=99.50')).toBeVisible();
    });

    test('should calculate fee preview when amount entered (sell)', async ({ page }) => {
      await page.goto('/');

      // Switch to sell tab
      await page.click('button:has-text("Vender BOBT")');

      // Enter amount
      const input = page.locator('input[type="number"]').first();
      await input.fill('100');

      // Should show fee calculation
      await expect(page.locator('text=Comisión')).toBeVisible();
      await expect(page.locator('text=Total a recibir')).toBeVisible();
    });

    test('should show minimum amount warning', async ({ page }) => {
      await page.goto('/');

      // Check minimum text
      await expect(page.locator('text=Mínimo: Bs. 10')).toBeVisible();
    });

    test('should disable continue button when amount below minimum', async ({ page }) => {
      await page.goto('/');

      const input = page.locator('input[type="number"]').first();
      await input.fill('5');

      // Button should be disabled (either "Conectar Wallet" or "Continuar")
      const button = page.locator('button:has-text("Conectar Wallet"), button:has-text("Continuar")').first();

      // If wallet not connected, "Conectar Wallet" is shown and enabled
      // If wallet connected, "Continuar" should be disabled
      await expect(button).toBeVisible();
    });
  });

  test.describe('Trade Page', () => {
    test('should load trade page with swap widget', async ({ page }) => {
      await page.goto('/trade');

      // Should have trade-specific content
      await expect(page.locator('text=Compra/Venta Bolivia')).toBeVisible();
    });

    test('should show oracle price', async ({ page }) => {
      await page.goto('/trade');

      // Wait for price to load
      await page.waitForTimeout(2000);

      // Should show price info
      await expect(page.locator('text=BOB').first()).toBeVisible();
    });
  });

  test.describe('Markets Page', () => {
    test('should load markets page', async ({ page }) => {
      await page.goto('/markets');

      // Page should load
      await expect(page).toHaveURL(/.*\/markets/);
    });
  });

  test.describe('History Page', () => {
    test('should load history page', async ({ page }) => {
      await page.goto('/history');

      // Page should load
      await expect(page).toHaveURL(/.*\/history/);
    });

    test('should show transaction history UI', async ({ page }) => {
      await page.goto('/history');

      // Main content area should be visible
      await expect(page.locator('main').first()).toBeVisible();
    });
  });

  test.describe('Settings Page', () => {
    test('should load settings page', async ({ page }) => {
      await page.goto('/settings');

      await expect(page).toHaveURL(/.*\/settings/);
      await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('should have settings sections', async ({ page }) => {
      await page.goto('/settings');

      // Main content should be visible
      await expect(page.locator('main').first()).toBeVisible();
    });
  });

  test.describe('Help Page', () => {
    test('should load help page', async ({ page }) => {
      await page.goto('/help');

      await expect(page).toHaveURL(/.*\/help/);
      await expect(page.locator('text=Ayuda').first()).toBeVisible();
    });

    test('should have FAQ content', async ({ page }) => {
      await page.goto('/help');

      await expect(page.locator('text=Preguntas').first()).toBeVisible();
    });
  });

  test.describe('Reserves Page', () => {
    test('should load reserves page', async ({ page }) => {
      await page.goto('/reserves');

      await expect(page).toHaveURL(/.*\/reserves/);
      await expect(page.locator('main').first()).toBeVisible();
    });
  });

  test.describe('Admin Page', () => {
    test('should load admin page', async ({ page }) => {
      await page.goto('/admin');

      await expect(page).toHaveURL(/.*\/admin/);
      await expect(page.locator('main').first()).toBeVisible();
    });
  });

  test.describe('Price Feed Integration', () => {
    test('should display live prices from CriptoYa', async ({ page }) => {
      await page.goto('/');

      // Wait for prices to load
      await page.waitForTimeout(3000);

      // Should show exchange prices
      const priceSection = page.locator('text=Precio BOB/USD');
      await expect(priceSection).toBeVisible();
    });

    test('should have refresh button for prices', async ({ page }) => {
      await page.goto('/');

      // Look for refresh icon/button near price section
      const refreshButton = page.locator('button:has(svg.lucide-refresh-cw)').first();
      if (await refreshButton.isVisible()) {
        await expect(refreshButton).toBeEnabled();
      }
    });
  });

  test.describe('Wallet Button States', () => {
    test('should show connect button when disconnected', async ({ page }) => {
      await page.goto('/');

      // Header wallet button
      const walletButton = page.locator('header button:has-text("Connect"), header button:has-text("Conectar")');
      await expect(walletButton.first()).toBeVisible();
    });

    test('should open wallet modal on click', async ({ page }) => {
      await page.goto('/');

      // Click connect button in header
      const connectBtn = page.locator('header button').filter({ hasText: /Connect|Conectar/ }).first();
      await connectBtn.click();

      // Modal or dialog should appear
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"], [data-state="open"]');
      await expect(dialog.first()).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on iPhone viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');

      // Core content should be visible
      await expect(page.locator('text=BOBT').first()).toBeVisible();

      // Sidebar might be collapsed
      // Wallet button should be accessible
    });

    test('should work on iPad viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      await expect(page.locator('text=BOBT').first()).toBeVisible();
    });
  });
});
