import { test, expect, type Page } from "@playwright/test";

// Pantallas que una usuaria catalana recorre. Para cada una se comprueba que la
// interfaz no muestre inglés ni voseo rioplatense.
const ROUTES = [
  "/",
  "/conversation",
  "/chunks",
  "/correct",
  "/roleplay",
  "/reading",
  "/stories",
  "/sounds",
  "/review",
  "/listening",
  "/progress",
  "/profile",
];

// Palabras de interfaz en inglés que nunca deberían verse con learning_language='ca'.
const ENGLISH_UI = [
  /\bStart talking\b/,
  /\bContinue\b/,
  /\bTry again\b/,
  /\bSpeak now\b/,
  /\bPractice now\b/,
  /\bBack to\b/,
  /\bYour settings\b/,
  /\bHow you're doing\b/,
  /\bNo reports yet\b/,
];

// Voseo rioplatense que nunca debe aparecer.
const VOSEO = /\b(Probá|Intentá|Tocá|acá|podés|Tenés|Terminá|Empezá|completá)\b/;

async function login(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, "Define E2E_EMAIL y E2E_PASSWORD (cuenta con learning_language='ca').");
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(email!);
  await page.getByPlaceholder(/password|contraseña/i).fill(password!);
  await page.getByRole("button", { name: /log ?in|entra|inicia|sign ?in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}

test.describe("interfaz en catalán", () => {
  test("ninguna pantalla muestra inglés ni voseo", async ({ page }) => {
    await login(page);
    const problems: string[] = [];

    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const text = (await page.locator("main, body").first().innerText()).trim();
      for (const re of ENGLISH_UI) if (re.test(text)) problems.push(`${route}: inglés (${re})`);
      if (VOSEO.test(text)) problems.push(`${route}: voseo rioplatense`);
    }

    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("el coach responde en catalán al primer mensaje", async ({ page }) => {
    await login(page);
    await page.goto("/conversation");
    await page.getByRole("button", { name: /comença|començar|start/i }).first().click();
    // La respuesta del coach debe contener marcadores del catalán.
    const reply = page.locator("[data-role='assistant']").last();
    await expect(reply).toContainText(/\b(que|per|amb|els|les|també)\b/i, { timeout: 30_000 });
  });
});
