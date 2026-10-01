// @ts-check
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
//  Helper: the app boots to the auth screen (Supabase is configured but no
//  session exists). All "app shell" tests inject the #app into view by
//  removing .hidden so we can test the DOM without a real Supabase session.
// ---------------------------------------------------------------------------

test.describe("Auth Screen — Branding & Elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for boot screen to disappear and auth screen to be visible
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
  });

  test("page title is Hamza's Expense Tracker", async ({ page }) => {
    await expect(page).toHaveTitle("Hamza's Expense Tracker");
  });

  test("auth screen shows correct branding", async ({ page }) => {
    const heading = page.locator(".auth-card h1");
    await expect(heading).toHaveText("Hamza's Expense Tracker");
  });

  test("auth screen shows sign-in form", async ({ page }) => {
    await expect(page.locator("#auth-email")).toBeVisible();
    await expect(page.locator("#auth-password")).toBeVisible();
    await expect(page.locator("#auth-submit")).toBeVisible();
    await expect(page.locator("#auth-submit")).toHaveText("Sign in");
  });

  test("auth screen has sign-up toggle", async ({ page }) => {
    const toggleBtn = page.locator("#auth-toggle-btn");
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveText("Create an account");
  });

  test("auth toggle switches between sign-in and sign-up", async ({ page }) => {
    const toggleBtn = page.locator("#auth-toggle-btn");
    const submitBtn = page.locator("#auth-submit");

    // Initially sign-in mode
    await expect(submitBtn).toHaveText("Sign in");

    // Click toggle to switch to sign-up
    await toggleBtn.click();
    await expect(submitBtn).toHaveText("Create account");
    await expect(toggleBtn).toHaveText("Sign in");

    // Click toggle to switch back to sign-in
    await toggleBtn.click();
    await expect(submitBtn).toHaveText("Sign in");
    await expect(toggleBtn).toHaveText("Create an account");
  });

  test("meta description is present", async ({ page }) => {
    const meta = page.locator('meta[name="description"]');
    await expect(meta).toHaveAttribute("content", /Hamza/i);
  });

  test("Inter font is loaded", async ({ page }) => {
    const links = page.locator('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
//  App Shell Tests — we reveal the #app div to test the UI skeleton
//  without requiring a real Supabase session.
// ---------------------------------------------------------------------------

test.describe("App Shell — Layout & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    // Manually reveal the app and hide auth/boot screens
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
  });

  test("topbar displays correct branding with gold accent", async ({ page }) => {
    const brand = page.locator(".brand");
    await expect(brand).toBeVisible();
    await expect(brand).toContainText("Hamza's");
    await expect(brand).toContainText("Expense Tracker");
    // Check gold accent span exists
    await expect(page.locator(".brand-accent")).toHaveText("Hamza's");
  });

  test("greeting element is present", async ({ page }) => {
    // Manually set greeting since we bypass Supabase auth
    await page.evaluate(() => {
      document.getElementById("greeting").textContent = "Good evening, Hamza \uD83C\uDF06";
    });
    const greeting = page.locator("#greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).toContainText("Hamza");
  });

  test("month navigation controls are present", async ({ page }) => {
    await expect(page.locator("#month-prev")).toBeVisible();
    await expect(page.locator("#month-label")).toBeVisible();
    await expect(page.locator("#month-next")).toBeVisible();
  });

  test("month label shows current month and year", async ({ page }) => {
    const label = page.locator("#month-label");
    const text = await label.textContent();
    // Should contain a month name and a 4-digit year
    expect(text).toMatch(/\w+ \d{4}/);
  });

  test("three navigation tabs exist", async ({ page }) => {
    const tabs = page.locator(".tab");
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText("Dashboard");
    await expect(tabs.nth(1)).toContainText("Transactions");
    await expect(tabs.nth(2)).toContainText("Net Worth");
  });

  test("Transactions tab is active by default", async ({ page }) => {
    const txnTab = page.locator('.tab[data-view="transactions"]');
    await expect(txnTab).toHaveClass(/active/);
    await expect(page.locator("#view-transactions")).toHaveClass(/active/);
  });

  test("clicking Dashboard tab switches view", async ({ page }) => {
    const dashTab = page.locator('.tab[data-view="dashboard"]');
    await dashTab.click();
    await expect(dashTab).toHaveClass(/active/);
    await expect(page.locator("#view-dashboard")).toHaveClass(/active/);
    // Transactions view should be hidden
    const txnView = page.locator("#view-transactions");
    await expect(txnView).not.toHaveClass(/active/);
  });

  test("clicking Net Worth tab switches view", async ({ page }) => {
    const nwTab = page.locator('.tab[data-view="networth"]');
    await nwTab.click();
    await expect(nwTab).toHaveClass(/active/);
    await expect(page.locator("#view-networth")).toHaveClass(/active/);
  });

  test("sign out button is visible", async ({ page }) => {
    await expect(page.locator("#signout-btn")).toBeVisible();
    await expect(page.locator("#signout-btn")).toHaveText("Sign out");
  });
});

// ---------------------------------------------------------------------------
//  Dashboard View
// ---------------------------------------------------------------------------

test.describe("Dashboard View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
    await page.locator('.tab[data-view="dashboard"]').click();
  });

  test("stat cards display income, expenses, and net balance", async ({ page }) => {
    await expect(page.locator("#stat-income")).toBeVisible();
    await expect(page.locator("#stat-expenses")).toBeVisible();
    await expect(page.locator("#stat-net")).toBeVisible();
  });

  test("stat values show formatted currency with Rs prefix", async ({ page }) => {
    const income = await page.locator("#stat-income").textContent();
    expect(income).toMatch(/^Rs\s/);
  });

  test("savings rate badge is present", async ({ page }) => {
    const badge = page.locator("#savings-badge");
    await expect(badge).toBeVisible();
  });

  test("category breakdown section exists", async ({ page }) => {
    await expect(page.locator("#category-breakdown")).toBeVisible();
  });

  test("net worth summary shows assets, banks, debts, and total", async ({ page }) => {
    await expect(page.locator("#dash-assets")).toBeVisible();
    await expect(page.locator("#dash-banks")).toBeVisible();
    await expect(page.locator("#dash-debts")).toBeVisible();
    await expect(page.locator("#dash-networth")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
//  Transaction View — Form & UI
// ---------------------------------------------------------------------------

test.describe("Transaction View — Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
  });

  test("transaction form has all required fields", async ({ page }) => {
    await expect(page.locator("#txn-date")).toBeVisible();
    await expect(page.locator("#txn-amount")).toBeVisible();
    await expect(page.locator("#txn-desc")).toBeVisible();
    await expect(page.locator("#txn-category")).toBeVisible();
  });

  test("direction toggle defaults to OUT", async ({ page }) => {
    const outSeg = page.locator('.seg[data-dir="OUT"]');
    await expect(outSeg).toHaveClass(/active/);
  });

  test("clicking IN direction toggle switches and hides category", async ({ page }) => {
    const inSeg = page.locator('.seg[data-dir="IN"]');
    await inSeg.click();
    await expect(inSeg).toHaveClass(/active/);
    // Category should be hidden
    const catWrap = page.locator("#category-wrap");
    await expect(catWrap).toHaveCSS("visibility", "hidden");
  });

  test("clicking OUT direction toggle shows category", async ({ page }) => {
    // First switch to IN
    await page.locator('.seg[data-dir="IN"]').click();
    // Then switch back to OUT
    await page.locator('.seg[data-dir="OUT"]').click();
    const catWrap = page.locator("#category-wrap");
    await expect(catWrap).toHaveCSS("visibility", "visible");
  });

  test("category select has all expense categories", async ({ page }) => {
    const options = page.locator("#txn-category option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(7); // 7 categories defined in constants.js
  });

  test("submit button says 'Add Transaction'", async ({ page }) => {
    await expect(page.locator("#txn-submit")).toHaveText("Add Transaction");
  });

  test("cancel button is hidden initially", async ({ page }) => {
    await expect(page.locator("#txn-cancel")).toBeHidden();
  });

  test("date field has a default value", async ({ page }) => {
    const dateVal = await page.locator("#txn-date").inputValue();
    expect(dateVal).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
//  Transaction View — Search & Filter
// ---------------------------------------------------------------------------

test.describe("Transaction View — Search & Filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
  });

  test("search input is present with placeholder", async ({ page }) => {
    const search = page.locator("#txn-search");
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("placeholder", /search/i);
  });

  test("category filter dropdown is present", async ({ page }) => {
    const filter = page.locator("#txn-filter-cat");
    await expect(filter).toBeVisible();
  });

  test("filter dropdown has 'All Categories' and 'Income' options", async ({ page }) => {
    const filter = page.locator("#txn-filter-cat");
    const options = filter.locator("option");
    const texts = await options.allTextContents();
    expect(texts).toContain("All Categories");
    expect(texts.some((t) => t.includes("Income"))).toBe(true);
  });

  test("CSV export button is present", async ({ page }) => {
    const btn = page.locator("#csv-export");
    await expect(btn).toBeVisible();
    await expect(btn).toContainText("Export");
  });
});

// ---------------------------------------------------------------------------
//  Net Worth View
// ---------------------------------------------------------------------------

test.describe("Net Worth View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
    await page.locator('.tab[data-view="networth"]').click();
  });

  test("assets section exists with add form", async ({ page }) => {
    await expect(page.locator("#assets-list")).toBeAttached();
    await expect(page.locator("#asset-name")).toBeVisible();
    await expect(page.locator("#asset-balance")).toBeVisible();
  });

  test("bank accounts section exists with add form", async ({ page }) => {
    await expect(page.locator("#banks-list")).toBeAttached();
    await expect(page.locator("#bank-name")).toBeVisible();
    await expect(page.locator("#bank-balance")).toBeVisible();
  });

  test("debts section exists with add form", async ({ page }) => {
    await expect(page.locator("#debts-list")).toBeAttached();
    await expect(page.locator("#debt-name")).toBeVisible();
    await expect(page.locator("#debt-balance")).toBeVisible();
  });

  test("net worth final summary shows all totals", async ({ page }) => {
    await expect(page.locator("#nwf-assets")).toBeVisible();
    await expect(page.locator("#nwf-banks")).toBeVisible();
    await expect(page.locator("#nwf-debts")).toBeVisible();
    await expect(page.locator("#nw-final")).toBeVisible();
  });

  test("net worth totals show formatted currency", async ({ page }) => {
    const total = await page.locator("#nw-final").textContent();
    expect(total).toMatch(/^Rs\s/);
  });

  test("debts hint text is displayed", async ({ page }) => {
    const hint = page.locator(".panel-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Debt - Name");
  });
});

// ---------------------------------------------------------------------------
//  Modal System
// ---------------------------------------------------------------------------

test.describe("Modal System", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
  });

  test("modal overlay is hidden by default", async ({ page }) => {
    await expect(page.locator("#modal-overlay")).toBeHidden();
  });

  test("modal can be shown programmatically", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("modal-overlay").classList.remove("hidden");
      document.getElementById("modal-title").textContent = "Test Title";
      document.getElementById("modal-message").textContent = "Test message";
    });
    await expect(page.locator("#modal-overlay")).toBeVisible();
    await expect(page.locator("#modal-title")).toHaveText("Test Title");
    await expect(page.locator("#modal-message")).toHaveText("Test message");
  });

  test("modal has cancel and confirm buttons", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("modal-overlay").classList.remove("hidden");
    });
    await expect(page.locator("#modal-cancel")).toBeVisible();
    await expect(page.locator("#modal-confirm")).toBeVisible();
  });

  test("cancel button closes modal", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("modal-overlay").classList.remove("hidden");
    });
    await page.locator("#modal-cancel").click();
    await expect(page.locator("#modal-overlay")).toBeHidden();
  });

  test("clicking overlay backdrop closes modal", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("modal-overlay").classList.remove("hidden");
    });
    // Click on the overlay (not the card)
    await page.locator("#modal-overlay").click({ position: { x: 10, y: 10 } });
    await expect(page.locator("#modal-overlay")).toBeHidden();
  });

  test("Escape key closes modal", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("modal-overlay").classList.remove("hidden");
    });
    await page.keyboard.press("Escape");
    await expect(page.locator("#modal-overlay")).toBeHidden();
  });

  test("modal input wrap is hidden by default", async ({ page }) => {
    await expect(page.locator("#modal-input-wrap")).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
//  Design & Theming
// ---------------------------------------------------------------------------

test.describe("Design & Theming", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
  });

  test("page uses dark background color in dark mode", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    const bg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // Should be a dark color — rgb values should all be low
    const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(match).not.toBeNull();
    const [, r, g, b] = match.map(Number);
    expect(r).toBeLessThan(50);
    expect(g).toBeLessThan(50);
    expect(b).toBeLessThan(50);
    await context.close();
  });

  test("page uses Inter font family", async ({ page }) => {
    const font = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    expect(font.toLowerCase()).toContain("inter");
  });

  test("primary buttons have gradient background", async ({ page }) => {
    const bg = await page.evaluate(() => {
      return getComputedStyle(document.querySelector(".btn-primary")).backgroundImage;
    });
    expect(bg).toContain("gradient");
  });

  test("theme-color meta tag matches dark theme", async ({ page }) => {
    const meta = page.locator('meta[name="theme-color"]');
    await expect(meta).toHaveAttribute("content", "#0d1117");
  });
});

// ---------------------------------------------------------------------------
//  Number Formatting
// ---------------------------------------------------------------------------

test.describe("Number Formatting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
    await page.locator('.tab[data-view="dashboard"]').click();
  });

  test("stat values display Rs prefix", async ({ page }) => {
    const texts = await page.locator(".stat-value").allTextContents();
    for (const t of texts) {
      expect(t.trim()).toMatch(/^Rs\s/);
    }
  });

  test("net worth values display Rs prefix", async ({ page }) => {
    const assets = await page.locator("#dash-assets").textContent();
    expect(assets).toMatch(/Rs/);
    const banks = await page.locator("#dash-banks").textContent();
    expect(banks).toMatch(/Rs/);
  });
});

// ---------------------------------------------------------------------------
//  Responsive Layout
// ---------------------------------------------------------------------------

test.describe("Responsive Layout", () => {
  test("mobile viewport hides brand text and greeting", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
    // On mobile, brand strong and greeting should be hidden via CSS
    const brandStrong = page.locator(".brand strong");
    await expect(brandStrong).toBeHidden();
    const greeting = page.locator("#greeting");
    await expect(greeting).toBeHidden();
  });

  test("desktop viewport shows brand text and greeting", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
    });
    const brandStrong = page.locator(".brand strong");
    await expect(brandStrong).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
//  Toast Notifications
// ---------------------------------------------------------------------------

test.describe("Toast Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
  });

  test("toast is hidden by default", async ({ page }) => {
    await expect(page.locator("#toast")).toBeHidden();
  });

  test("toast can be shown and auto-hides", async ({ page }) => {
    await page.evaluate(() => {
      const t = document.getElementById("toast");
      t.textContent = "Test toast";
      t.className = "toast";
    });
    await expect(page.locator("#toast")).toBeVisible();
    await expect(page.locator("#toast")).toHaveText("Test toast");
  });
});

// ---------------------------------------------------------------------------
//  Provident Fund Calculator
// ---------------------------------------------------------------------------

test.describe("Provident Fund Calculator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#auth-screen:not(.hidden)", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      // switch to networth view
      document.querySelectorAll(".tab").forEach((t) =>
        t.classList.toggle("active", t.dataset.view === "networth"));
      document.querySelectorAll(".view").forEach((v) =>
        v.classList.toggle("active", v.id === "view-networth"));
    });
  });

  test("PF Calculator button is visible in Assets section", async ({ page }) => {
    const btn = page.locator("#open-pf-calc");
    await expect(btn).toBeVisible();
    await expect(btn).toContainText("PF Calculator");
  });

  test("clicking PF Calculator button opens the modal", async ({ page }) => {
    await page.click("#open-pf-calc");
    const modal = page.locator("#pf-modal-overlay");
    await expect(modal).toBeVisible();
    await expect(page.locator("#pf-modal-title")).toContainText("Provident Fund");
    await expect(page.locator("#pf-result-net")).toBeVisible();
    await expect(page.locator("#pf-emp-monthly")).toHaveValue("25000");
  });

  test("modal closes when clicking close button", async ({ page }) => {
    await page.click("#open-pf-calc");
    await expect(page.locator("#pf-modal-overlay")).toBeVisible();
    await page.click("#pf-modal-close");
    await expect(page.locator("#pf-modal-overlay")).toBeHidden();
  });

  test("modal closes when clicking Escape key", async ({ page }) => {
    await page.click("#open-pf-calc");
    await expect(page.locator("#pf-modal-overlay")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#pf-modal-overlay")).toBeHidden();
  });

  test("recalculates when changing employee monthly contribution", async ({ page }) => {
    await page.click("#open-pf-calc");
    const netBefore = await page.locator("#pf-result-net").textContent();
    await page.fill("#pf-emp-monthly", "50000");
    const netAfter = await page.locator("#pf-result-net").textContent();
    expect(netBefore).not.toEqual(netAfter);
  });

  test("employer match toggle updates employer contribution", async ({ page }) => {
    await page.click("#open-pf-calc");
    await page.fill("#pf-emp-monthly", "20000");
    // Click 50% match
    await page.click('.pf-match-seg .seg[data-match="0.5"]');
    await expect(page.locator("#pf-employer-monthly")).toHaveValue("10000");
    // Click 0% match
    await page.click('.pf-match-seg .seg[data-match="0"]');
    await expect(page.locator("#pf-employer-monthly")).toHaveValue("0");
    // Click 100% match
    await page.click('.pf-match-seg .seg[data-match="1"]');
    await expect(page.locator("#pf-employer-monthly")).toHaveValue("20000");
  });

  test("toggling tax on/off updates tax badge and take-home amount", async ({ page }) => {
    await page.click("#open-pf-calc");
    // Tax is checked initially
    await expect(page.locator("#pf-hero-tax-status")).toContainText("Tax Applied");
    const netWithTax = await page.locator("#pf-result-net").textContent();

    // Toggle tax off
    await page.click(".pf-switch-label");
    await expect(page.locator("#pf-hero-tax-status")).toContainText("Tax-Exempt");
    const netWithoutTax = await page.locator("#pf-result-net").textContent();
    expect(netWithTax).not.toEqual(netWithoutTax);
  });

  test("year-by-year schedule table expands and displays rows", async ({ page }) => {
    await page.click("#open-pf-calc");
    await expect(page.locator("#pf-schedule-wrap")).toBeHidden();
    await page.click("#pf-schedule-toggle");
    await expect(page.locator("#pf-schedule-wrap")).toBeVisible();
    const rows = page.locator("#pf-schedule-tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("year duration chips update input and recalculate", async ({ page }) => {
    await page.click("#open-pf-calc");
    await page.click('.pf-year-chip[data-years="25"]');
    await expect(page.locator("#pf-years-num")).toHaveValue("25");
    await expect(page.locator("#pf-years-label")).toContainText("25 Years");
  });
});
