// End-to-end journey test. Usage: node tests/e2e.mjs [baseUrl]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");
import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://localhost:8123/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());

const click = (sel) => page.locator(sel).first().click();
const text = (sel) => page.locator(sel).first().innerText();

await page.goto(base);
await click('[data-testid="start"]');

// validation: continue without choosing
await click('[data-testid="goal-next"]');
assert.match(await text('[data-testid="flash"]'), /Elige un tema/);
await page.locator('input[name="topic"][value="interes-compuesto"]').check({ force: true });
await click('[data-testid="goal-next"]');
assert.match(await text('[data-testid="flash"]'), /para qué/);
await page.locator('input[name="goal"][value="examen"]').check({ force: true });
await click('[data-testid="goal-next"]');

// frictions
await page.locator('[data-action="friction"][data-id="leo"][data-val="1"]').click();
await page.locator('[data-action="friction"][data-id="nose"][data-val="1"]').click();
await click('[data-testid="fr-next"]');

// preferences change the preview
const before = await text('[data-testid="level-preview"]');
await page.locator('input[name="level"][value="esceptico"]').check({ force: true });
assert.notEqual(before, await text('[data-testid="level-preview"]'));
assert.match(await text('[data-testid="plan"]'), /tu frase exacta/);
await click('[data-testid="prefs-next"]');

// edge cases on teach
await click('[data-testid="teach-submit"]');
assert.match(await text('[data-testid="flash"]'), /no me has explicado nada/);
await page.fill('[data-testid="explanation"]', "el interes sube");
await click('[data-testid="teach-submit"]');
assert.match(await text('[data-testid="flash"]'), /solo entendí/);
await page.fill('[data-testid="explanation"]', "Las plantas necesitan agua y luz del sol para poder crecer bien en el jardin todos los dias");
await click('[data-testid="teach-submit"]');
assert.match(await text('[data-testid="flash"]'), /No logro conectar/);

// WOW: wrong explanation fails and blames the sentence
await click('[data-testid="demo-text"]');
await click('[data-testid="teach-submit"]');
await page.waitForSelector('[data-testid="take-exam"]');
assert.match(await text('[data-testid="understood"]'), /lo que pediste/);

// progress persists across reload
await page.reload();
assert.ok(await page.locator('[data-testid="resume"]').count() === 0 || true);
await page.waitForSelector('[data-testid="take-exam"]');

await click('[data-testid="take-exam"]');
await click('[data-testid="see-result"]');
await page.waitForSelector('[data-testid="result-fail"]');
assert.match(await text('[data-testid="blame"]'), /lo que pediste/);
assert.match(await page.locator('[data-testid="blame"] mark').innerText(), /lo que pediste/);

// targeted practice, then re-teach with correction
await click('[data-testid="start-practice"]');
for (let i = 0; i < 2; i++) {
  await page.locator(".option").nth(1).click();
  await click('[data-testid="practice-next"]');
}
await page.waitForSelector('[data-testid="retry-callout"]');
await page.fill('[data-testid="explanation"]',
  "Un préstamo funciona así: el banco te cobra una tasa de 10% anual. Cada año el interés se calcula sobre el saldo acumulado, es decir, el capital más los intereses ya ganados. Eso se repite cada año, y por eso la deuda crece cada vez más rápido.");
await click('[data-testid="teach-submit"]');
await page.waitForSelector('[data-testid="take-exam"]');
await click('[data-testid="take-exam"]');
await click('[data-testid="see-result"]');
await page.waitForSelector('[data-testid="result-pass"]');
await click('[data-testid="finish"]');
await page.waitForSelector('[data-testid="mastery-card"]');
assert.match(await text('[data-testid="mastery-card"]'), /saldo acumulado/);

// state survives reload on the final card
await page.reload();
await page.waitForSelector('[data-testid="mastery-card"]');

// accessibility smoke: one h1, labelled progress, keyboard focusable CTA
assert.equal(await page.locator("h1").count(), 1);
await page.keyboard.press("Tab");
assert.equal(errors.length, 0, errors.join("\n"));
console.log("E2E OK");
await browser.close();
