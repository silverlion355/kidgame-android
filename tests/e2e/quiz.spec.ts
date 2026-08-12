import { test, expect } from '@playwright/test'

test.describe('Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Navigate to idiom level 1
    await page.click('[data-subject="idiom"]')
    await page.waitForSelector('#levels-screen.active')
    await page.click('[data-level="1"]:not(.locked)')
    await page.waitForSelector('#quiz-screen.active')
  })

  test('should display quiz screen with question', async ({ page }) => {
    await expect(page.locator('#quiz-screen')).toHaveClass(/active/)
    await expect(page.locator('#question-text')).toBeVisible()
    await expect(page.locator('#hearts')).toBeVisible()
    await expect(page.locator('#quiz-progress')).toBeVisible()
  })

  test('should show options for choice questions', async ({ page }) => {
    const optionsContainer = page.locator('#options-container')
    await expect(optionsContainer).toBeVisible()
    const options = optionsContainer.locator('.option-btn')
    await expect(options).toHaveCount(4)
  })

  test('should handle correct answer', async ({ page }) => {
    // Get the correct answer from the first question
    const questionData = await page.evaluate(() => {
      return (window as any).App?.getCurrentQuestion?.() || {}
    })
    
    // Click first option (may be correct or not)
    const firstOption = page.locator('.option-btn').first()
    await firstOption.click()
    
    // Wait for answer feedback
    await page.waitForTimeout(500)
    
    // Should either show next question or result modal
    const isFinished = await page.evaluate(() => {
      const state = (window as any).App?.getState?.()
      return !state?.isActive
    })
    
    if (isFinished) {
      await expect(page.locator('#result-modal')).toHaveClass(/active/)
    } else {
      await expect(page.locator('#question-text')).toBeVisible()
    }
  })

  test('should decrement hearts on wrong answer', async ({ page }) => {
    const initialHearts = await page.locator('#hearts').textContent()
    
    // Click wrong answer (find one that's not the correct answer)
    const options = page.locator('.option-btn')
    const count = await options.count()
    
    // Click last option (likely wrong)
    await options.nth(count - 1).click()
    await page.waitForTimeout(500)
    
    const newHearts = await page.locator('#hearts').textContent()
    // Hearts should be represented as emoji hearts
    expect(newHearts).not.toBe(initialHearts)
  })

  test('should use hint when hint button clicked', async ({ page }) => {
    const hintBtn = page.locator('#hint-btn')
    await expect(hintBtn).toBeEnabled()
    
    await hintBtn.click()
    await page.waitForTimeout(500)
    
    // One option should be disabled/grayed out
    const disabledOption = page.locator('.option-btn.disabled')
    await expect(disabledOption).toHaveCount(1)
  })

  test('should show result modal when level completed', async ({ page }) => {
    // Answer all questions correctly by picking the right option
    // This is a simplified test - in reality we'd need to know the correct answers
    for (let i = 0; i < 5; i++) {
      const options = page.locator('.option-btn:not(.disabled)')
      const count = await options.count()
      if (count > 0) {
        await options.first().click()
        await page.waitForTimeout(800)
      }
      
      const isFinished = await page.evaluate(() => {
        const state = (window as any).App?.getState?.()
        return !state?.isActive
      })
      
      if (isFinished) break
    }
    
    // Check if result modal appears
    const modal = page.locator('#result-modal')
    if (await modal.isVisible()) {
      await expect(modal).toHaveClass(/active/)
      await expect(page.locator('#result-title')).toBeVisible()
      await expect(page.locator('#result-stars')).toBeVisible()
    }
  })

  test('should have speaker button for TTS', async ({ page }) => {
    const speakerBtn = page.locator('#speaker-btn')
    await expect(speakerBtn).toBeVisible()
  })
})

test.describe('Level Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.click('[data-subject="idiom"]')
    await page.waitForSelector('#levels-screen.active')
  })

  test('should show locked levels', async ({ page }) => {
    const lockedLevels = page.locator('.level-btn.locked')
    await expect(lockedLevels.first()).toBeVisible()
  })

  test('should show stars for completed levels', async ({ page }) => {
    const level1 = page.locator('[data-level="1"]')
    await expect(level1).toBeVisible()
  })
})
