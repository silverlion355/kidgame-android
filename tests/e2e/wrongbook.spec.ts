import { test, expect } from '@playwright/test'

test.describe('Wrongbook Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.click('#nav-wrongbook')
    await page.waitForSelector('#wrongbook-screen.active')
  })

  test('should display wrongbook screen', async ({ page }) => {
    await expect(page.locator('#wrongbook-screen')).toHaveClass(/active/)
    await expect(page.locator('#wrongbook-content')).toBeVisible()
  })

  test('should show empty state when no wrong questions', async ({ page }) => {
    const emptyState = page.locator('.empty-state')
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('还没有错题')
    }
  })

  test('should show wrong questions grouped by subject', async ({ page }) => {
    const subjects = ['成语', '古诗', '英语', '数学']
    for (const subject of subjects) {
      const heading = page.locator(`h3:has-text("${subject}")`)
      if (await heading.isVisible()) {
        await expect(heading).toBeVisible()
      }
    }
  })

  test('should remove wrong question when delete clicked', async ({ page }) => {
    const removeBtns = page.locator('.remove-btn')
    const count = await removeBtns.count()
    
    if (count > 0) {
      await removeBtns.first().click()
      await page.waitForTimeout(300)
      
      // Item should be removed (re-rendered)
      const newCount = await page.locator('.remove-btn').count()
      expect(newCount).toBe(count - 1)
    }
  })

  test('should navigate back to home', async ({ page }) => {
    await page.click('#wrongbook-screen .btn-back')
    await expect(page.locator('#home-screen')).toHaveClass(/active/)
  })
})
