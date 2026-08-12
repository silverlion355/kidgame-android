import { test, expect } from '@playwright/test'

test.describe('Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display home screen with four subject cards', async ({ page }) => {
    await expect(page.locator('#home-screen')).toHaveClass(/active/)
    
    // Check four subject cards exist
    await expect(page.locator('[data-subject="idiom"]')).toBeVisible()
    await expect(page.locator('[data-subject="poem"]')).toBeVisible()
    await expect(page.locator('[data-subject="english"]')).toBeVisible()
    await expect(page.locator('[data-subject="math"]')).toBeVisible()
  })

  test('should navigate to levels screen when clicking subject card', async ({ page }) => {
    await page.click('[data-subject="idiom"]')
    await expect(page.locator('#levels-screen')).toHaveClass(/active/)
    await expect(page.locator('#levels-title')).toContainText('成语')
  })

  test('should show user stats on home screen', async ({ page }) => {
    await expect(page.locator('#home-coins')).toBeVisible()
    await expect(page.locator('#home-hints')).toBeVisible()
    await expect(page.locator('#home-streak')).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should navigate to wrongbook screen', async ({ page }) => {
    await page.click('#nav-wrongbook')
    await expect(page.locator('#wrongbook-screen')).toHaveClass(/active/)
  })

  test('should navigate to shop screen', async ({ page }) => {
    await page.click('#nav-shop')
    await expect(page.locator('#shop-screen')).toHaveClass(/active/)
  })

  test('should navigate back to home from wrongbook', async ({ page }) => {
    await page.click('#nav-wrongbook')
    await page.click('#wrongbook-screen .btn-back')
    await expect(page.locator('#home-screen')).toHaveClass(/active/)
  })

  test('should navigate back to home from shop', async ({ page }) => {
    await page.click('#nav-shop')
    await page.click('#shop-screen .btn-back')
    await expect(page.locator('#home-screen')).toHaveClass(/active/)
  })
})
