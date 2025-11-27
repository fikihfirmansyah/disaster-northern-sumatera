# Puppeteer Setup for Firebase App Hosting

## Problem

Puppeteer requires Chrome/Chromium to run, but Firebase App Hosting (Cloud Run) doesn't include Chrome by default. This causes errors like:

```
Error: Could not find Chrome (ver. 142.0.7444.175)
```

## Solution

We've configured the app to use `puppeteer-core` instead of `puppeteer`, which doesn't bundle Chrome. Chrome needs to be installed in the runtime environment.

## Configuration

### 1. Environment Variables (apphosting.yaml)

The following environment variables are set in `apphosting.yaml`:

```yaml
- variable: CHROME_PATH
  value: /usr/bin/chromium
  availability:
    - RUNTIME

- variable: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
  value: "true"
  availability:
    - BUILD
    - RUNTIME

- variable: PUPPETEER_EXECUTABLE_PATH
  value: /usr/bin/chromium
  availability:
    - RUNTIME
```

### 2. Code Changes

- Switched from `puppeteer` to `puppeteer-core` (lighter, doesn't bundle Chrome)
- Added `getChromeExecutablePath()` function to find Chrome in system paths
- Configured Puppeteer launch options for serverless environments

### 3. Chrome Installation

For Firebase App Hosting, Chrome needs to be installed in the build/runtime environment. Options:

#### Option A: Custom Buildpack (Recommended)

Create a `.buildpacks` file or configure buildpacks in Firebase Console to install Chrome during build:

```bash
# Install Chromium
apt-get update && apt-get install -y chromium chromium-sandbox
```

#### Option B: Use Dockerfile (if supported)

If Firebase App Hosting supports custom Dockerfile, use the provided `Dockerfile` which installs Chrome.

#### Option C: Pre-installed Chrome

If the base image already has Chrome installed, ensure the path matches `/usr/bin/chromium`.

## Troubleshooting

### Error: "Could not find Chrome"

1. **Check if Chrome is installed**:
   ```bash
   which chromium
   which google-chrome
   ```

2. **Verify environment variables**:
   - `CHROME_PATH` should point to Chrome executable
   - `PUPPETEER_EXECUTABLE_PATH` should be set

3. **Check build logs**:
   - Look for Chrome installation steps
   - Verify the path exists in the runtime environment

### Alternative: Use @sparticuz/chromium

If system Chrome is not available, consider using `@sparticuz/chromium` which is optimized for serverless:

```bash
npm install @sparticuz/chromium
```

Then update `lib/instagram-scraper.ts`:

```typescript
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// In getBrowser():
const executablePath = await chromium.executablePath();
browserInstance = await puppeteer.launch({
  executablePath,
  args: chromium.args,
  headless: true,
});
```

## Current Status

- ✅ Switched to `puppeteer-core`
- ✅ Added Chrome path detection
- ✅ Configured environment variables
- ⚠️ Chrome installation needs to be configured in Firebase App Hosting build process

## Next Steps

1. Configure Firebase App Hosting to install Chrome during build
2. Or use a base image that includes Chrome
3. Or switch to `@sparticuz/chromium` if system Chrome is not available

