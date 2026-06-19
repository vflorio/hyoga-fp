# hyoga-fp

## Prerequisites

Install [pnpm](https://pnpm.io/):

```bash
npm install -g pnpm
```

## Setup

```bash
pnpm install
```

## Development

Build all packages:

```bash
pnpm build
```

Run all packages in watch mode:

```bash
pnpm dev
```

### Running Specific Applications

**Runtime Demo**

Run the standalone runtime demo:

```bash
pnpm --filter @hyoga-fp/runtime-demo dev
```

Clean build artifacts:

```bash
pnpm clean
```

Format code:

```bash
pnpm format
```

Lint code:

```bash
pnpm lint
```

## Testing

### Unit & integration tests (Vitest)

```bash
pnpm --filter @hyoga-fp/freewheel test
```

### E2E tests (Playwright)

The E2E suite uses an **in-process mock** of the FreeWheel SDK so it runs fully
offline without touching the ad server.  All FreeWheel anti-fraud / IVT checks
(headless-browser detection via `navigator.webdriver`, `window.chrome`,
`Navigator.permissions`, etc.) are irrelevant for the mock-based tests.

```bash
cd apps/demo
pnpm test:e2e        # runs all specs except the capture helper
```

#### Vendor SDK (`apps/demo/e2e/capture.spec.ts`)

The capture spec records a **real ad response** from `demo.v.fwmrm.net` as a
local fixture (`e2e/fixtures/ad-response.xml`).  It requires:

1. **The FreeWheel AdManager SDK** placed at `.vendor/AdManager.js` (gitignored).
   Download it once:

   ```bash
   mkdir -p .vendor
   curl -o .vendor/AdManager.js \
     https://mssl.fwmrm.net/libs/adm/7.0.0/AdManager.js
   ```

   Update the URL to target a different SDK version when needed.

2. A **headed browser** — FreeWheel's backend detects headless environments
   through several signals (`navigator.webdriver = true`, absence of
   `window.chrome`, and contradictory `Notification.permission` vs
   `navigator.permissions.query` results) and will return empty or blocked
   responses for headless traffic.

   ```bash
   cd apps/demo
   pnpm test:e2e:capture --headed
   ```

Once the fixture is captured the main E2E suite serves it from disk and the
vendor SDK is not needed again.

## Package Management

Check for version mismatches:

```bash
pnpm syncpack:check
```

Fix version mismatches:

```bash
pnpm syncpack:fix
```