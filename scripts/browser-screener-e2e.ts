/**
 * Browser E2E: answer all screener questions rapidly, exit via Journey, reopen, verify.
 * Success is determined from browser/network/UI only (not Prisma queries).
 */
import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3040";
const MODULE = "nonlinear-screener";

async function createIntakeToken(): Promise<{ token: string; episodeId: string }> {
  const prisma = new PrismaClient();
  try {
    const token = randomBytes(24).toString("hex");
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const episode = await prisma.assessmentEpisode.create({
      data: {
        clinicianId: "browser-e2e-fix-nav",
        clientName: "Browser E2E Screener",
        modules: {
          create: [
            {
              moduleKey: MODULE,
              moduleVersion: "1",
              audience: "CLIENT",
              status: "NOT_STARTED",
              token,
              tokenExpiresAt: expires,
              consentAcceptedAt: new Date(),
            },
            {
              moduleKey: "developmental-life-map",
              moduleVersion: "1",
              audience: "CLIENT",
              status: "NOT_STARTED",
            },
            {
              moduleKey: "guided-reflection",
              moduleVersion: "1",
              audience: "CLIENT",
              status: "NOT_STARTED",
            },
          ],
        },
      },
    });
    return { token, episodeId: episode.id };
  } finally {
    await prisma.$disconnect();
  }
}

async function clickFirstVisible(page: Page, selectors: string[]) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      await loc.click({ timeout: 5000 });
      return true;
    }
  }
  return false;
}

async function main() {
  const { token, episodeId } = await createIntakeToken();
  const journeyUrl = `${BASE}/intake/${token}`;
  const screenerUrl = `${BASE}/intake/${token}/modules/${MODULE}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const patchBodies: Array<{ itemIds: string[]; status: number }> = [];
  page.on("response", async (res) => {
    try {
      if (res.request().method() === "PATCH" && res.url().includes(`/modules/${MODULE}`)) {
        const post = res.request().postDataJSON() as { data?: Record<string, string> } | null;
        const itemIds = post?.data ? Object.keys(post.data).sort() : [];
        patchBodies.push({ itemIds, status: res.status() });
      }
    } catch {
      /* ignore */
    }
  });

  console.log(JSON.stringify({ phase: "open", journeyUrl, screenerUrl, episodeId }));
  await page.goto(screenerUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".assessment-root", { timeout: 60_000 });

  await clickFirstVisible(page, [
    'button:has-text("Begin exploring")',
    'button:has-text("I understand")',
  ]);

  const maxSteps = 250;
  let steps = 0;
  let reachedConfirm = false;
  let answersClicked = 0;

  while (steps < maxSteps) {
    steps += 1;
    const bodyText = await page.locator("body").innerText();
    if (/Ready to share|Share with my clinician/i.test(bodyText)) {
      reachedConfirm = true;
      break;
    }

    // Chapter intro
    if (await page.getByRole("button", { name: /^Begin chapter$/i }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /^Begin chapter$/i }).click();
      await page.waitForTimeout(120);
      continue;
    }

    const scaleVisible = await page.locator(".assessment-scale-option").first().isVisible().catch(() => false);
    const selectedVisible = await page
      .locator(".assessment-scale-option--selected, .assessment-scale-not-sure--selected")
      .first()
      .isVisible()
      .catch(() => false);
    const textarea = page.locator("textarea.assessment-textarea").first();
    const textareaVisible = await textarea.isVisible().catch(() => false);
    const continueBtn = page.getByRole("button", { name: /^Continue$/i });
    const continueVisible = await continueBtn.isVisible().catch(() => false);
    const continueEnabled = continueVisible && (await continueBtn.isEnabled().catch(() => false));

    if (scaleVisible && !selectedVisible) {
      const sometimes = page.locator(".assessment-scale-option", { hasText: /^Sometimes$/ });
      const often = page.locator(".assessment-scale-option", { hasText: /^Often$/ });
      const agree = page.locator(".assessment-scale-option", { hasText: /^Agree$/ });
      if ((await sometimes.count()) > 0) await sometimes.first().click();
      else if ((await often.count()) > 0) await often.first().click();
      else if ((await agree.count()) > 0) await agree.first().click();
      else await page.locator(".assessment-scale-option").nth(2).click();
      answersClicked += 1;
      await page.waitForTimeout(320); // auto-advance delay + paint
      // If still on a boundary question (Continue enabled), click it after answer selected
      if (
        (await continueBtn.isVisible().catch(() => false)) &&
        (await continueBtn.isEnabled().catch(() => false)) &&
        (await page
          .locator(".assessment-scale-option--selected, .assessment-scale-not-sure--selected")
          .count()) > 0
      ) {
        await continueBtn.click();
        await page.waitForTimeout(120);
      }
      continue;
    }

    if (scaleVisible && selectedVisible && continueEnabled) {
      await continueBtn.click();
      await page.waitForTimeout(120);
      continue;
    }

    if (textareaVisible) {
      const existing = await textarea.inputValue();
      if (!existing.trim()) {
        await textarea.fill(`browser e2e reflection ${answersClicked + 1}`);
        answersClicked += 1;
      }
      if (await continueBtn.isEnabled().catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(120);
      }
      continue;
    }

    // Fallback primary
    const primary = page.locator("button.assessment-btn--primary").first();
    if ((await primary.isVisible().catch(() => false)) && (await primary.isEnabled().catch(() => false))) {
      await primary.click();
      await page.waitForTimeout(120);
      continue;
    }

    console.log(JSON.stringify({ phase: "stuck", step: steps, snippet: bodyText.slice(0, 500) }));
    break;
  }

  console.log(JSON.stringify({ phase: "answered_loop_done", steps, reachedConfirm, answersClicked }));

  // Immediately exit via Journey
  await page.getByRole("button", { name: /Assessment Journey/i }).click({ timeout: 15_000 });

  const leaveDialog = page.getByRole("dialog");
  if (await leaveDialog.isVisible().catch(() => false)) {
    const msg = await leaveDialog.innerText();
    console.log(JSON.stringify({ phase: "leave_dialog", msg: msg.slice(0, 500) }));
    const retry = leaveDialog.getByRole("button", { name: /Retry saving/i });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click();
      await page.waitForTimeout(3000);
    }
    if (await leaveDialog.isVisible().catch(() => false)) {
      throw new Error("Leave dialog still open after retry — flush failed in browser");
    }
  }

  await page.waitForURL(/\/intake\/[^/]+$/, { timeout: 90_000 });
  console.log(JSON.stringify({ phase: "on_journey", url: page.url() }));

  // Reopen
  await page.goto(screenerUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1500);

  const api = await page.evaluate(async (moduleKey) => {
    const tok = location.pathname.split("/")[2];
    const res = await fetch(`/api/intake/${tok}/modules/${moduleKey}`);
    const json = await res.json();
    const data = (json.module?.data ?? {}) as Record<string, string>;
    const ids = Object.keys(data)
      .filter((k) => /^q\d+$/i.test(k))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const all = Array.from({ length: 49 }, (_, i) => `q${String(i + 1).padStart(2, "0")}`);
    const missing = all.filter((id) => !ids.includes(id));
    return {
      status: res.status,
      responseRevision: json.module?.responseRevision ?? null,
      itemCount: ids.length,
      itemIds: ids,
      missingItemIds: missing,
      moduleStatus: json.module?.status ?? null,
    };
  }, MODULE);

  // UI restore check: walk questions and ensure selected values exist
  let restoredChecked = 0;
  let restoredMissingValue = 0;
  for (let i = 0; i < 120; i++) {
    const bodyText = await page.locator("body").innerText();
    if (/Ready to share/i.test(bodyText)) break;

    if (await page.getByRole("button", { name: /^Begin chapter$/i }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /^Begin chapter$/i }).click();
      await page.waitForTimeout(100);
      continue;
    }

    const selected = page.locator(
      ".assessment-scale-option--selected, .assessment-scale-not-sure--selected",
    );
    const scale = page.locator(".assessment-scale-option");
    if ((await scale.count()) > 0 && (await scale.first().isVisible().catch(() => false))) {
      if ((await selected.count()) > 0) restoredChecked += 1;
      else restoredMissingValue += 1;

      const cont = page.getByRole("button", { name: /^Continue$/i });
      if ((await cont.isVisible().catch(() => false)) && (await cont.isEnabled().catch(() => false))) {
        await cont.click();
      } else if ((await selected.count()) > 0) {
        await selected.first().click();
        await page.waitForTimeout(320);
      } else {
        break;
      }
      await page.waitForTimeout(80);
      continue;
    }

    const ta = page.locator("textarea.assessment-textarea").first();
    if (await ta.isVisible().catch(() => false)) {
      const val = await ta.inputValue();
      if (val.trim()) restoredChecked += 1;
      else restoredMissingValue += 1;
      const cont = page.getByRole("button", { name: /^Continue$/i });
      if (await cont.isEnabled().catch(() => false)) await cont.click();
      await page.waitForTimeout(80);
      continue;
    }

    const primary = page.locator("button.assessment-btn--primary").first();
    if ((await primary.isVisible().catch(() => false)) && (await primary.isEnabled().catch(() => false))) {
      await primary.click();
      await page.waitForTimeout(100);
      continue;
    }
    break;
  }

  const unionPatched = [...new Set(patchBodies.flatMap((p) => p.itemIds))].sort();
  const result = {
    ok:
      api.status === 200 &&
      api.itemCount === 49 &&
      api.missingItemIds.length === 0 &&
      restoredMissingValue === 0,
    episodeId,
    token,
    journeyUrl,
    steps,
    reachedConfirm,
    answersClicked,
    patchRequestCount: patchBodies.length,
    patchStatuses: [...new Set(patchBodies.map((p) => p.status))],
    unionPatchedCount: unionPatched.length,
    unionPatchedItemIds: unionPatched,
    api,
    restoredChecked,
    restoredMissingValue,
  };

  writeFileSync("/tmp/screener-browser-e2e-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
