# Playwright E2E Testing

This project now includes Playwright for end-to-end testing.

## Installation

Playwright and browsers are already installed. If you need to install additional browsers:

```bash
npx playwright install
```

## Running Tests

- **Run all E2E tests:** `npm run test:e2e`
- **Run with UI mode:** `npm run test:e2e:ui`
- **Run with visible browser:** `npm run test:e2e:headed`

## Test Location

E2E tests are located in the `e2e/` directory.

## Configuration

Playwright configuration is in `playwright.config.ts`.

The tests will automatically start the development server on `http://localhost:5173` before running.

## Writing Tests

See the example test in `e2e/app.spec.ts` to get started.

For more information, visit: https://playwright.dev/docs/intro
