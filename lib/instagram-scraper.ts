import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { 
  getInstagramCredentials, 
  saveInstagramCredentials, 
  saveInstagramCookies 
} from "./db";

export interface ScrapedPost {
 postUrl: string;
 imageUrl: string | null;
 text: string | null;
 caption: string | null;
 hashtags: string[];
 timestamp: string | null;
 locationText: string | null;
}

let browserInstance: Browser | null = null;
let isLoggedIn = false;
let savedCookies: any[] = [];

// Helper function to replace deprecated waitForTimeout
function delay(ms: number): Promise<void> {
 return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize credentials and cookies from database
export async function initializeCredentials(): Promise<void> {
  try {
    const creds = await getInstagramCredentials();
    if (creds) {
      savedCookies = creds.cookies || [];
      if (savedCookies.length > 0) {
        console.log(`Loaded ${savedCookies.length} cookies from database`);
      }
    }
  } catch (error) {
    console.warn('Error loading credentials from database:', error);
  }
}

// Login to Instagram
async function loginToInstagram(page: Page): Promise<boolean> {
 try {
  // Try to get credentials from database first
  let username: string | undefined;
  let password: string | undefined;
  
  try {
    const creds = await getInstagramCredentials();
    if (creds && creds.username && creds.password) {
      username = creds.username;
      password = creds.password;
      console.log("Using credentials from database");
    }
  } catch (error) {
    console.warn("Error loading credentials from database, trying environment variables");
  }
  
  // Fallback to environment variables
  if (!username || !password) {
    username = process.env.INSTAGRAM_USERNAME;
    password = process.env.INSTAGRAM_PASSWORD;
    
    // If we have env vars but no DB credentials, save them to DB
    if (username && password) {
      try {
        await saveInstagramCredentials({ username, password });
        console.log("Saved credentials to database");
      } catch (error) {
        console.warn("Error saving credentials to database:", error);
      }
    }
  }

  if (!username || !password) {
   console.warn("Instagram credentials not found in database or environment variables");
   return false;
  }

  console.log("Attempting to login to Instagram...");

  // Navigate to login page
  await page.goto("https://www.instagram.com/accounts/login/", {
   waitUntil: "domcontentloaded",
   timeout: 30000,
  });

  await delay(3000);

  // Check if already logged in
  const alreadyLoggedIn = await page.evaluate(() => {
   return (
    document.querySelector('a[href*="/direct/"]') !== null ||
    document.querySelector('svg[aria-label="Home"]') !== null
   );
  });

  if (alreadyLoggedIn) {
   console.log("Already logged in to Instagram");
   isLoggedIn = true;
   return true;
  }

  // Wait for login form
  try {
   await page.waitForSelector('input[name="username"]', { timeout: 10000 });
  } catch (e) {
   console.error("Login form not found");
   return false;
  }

  // Fill in username
  await page.type('input[name="username"]', username, { delay: 100 });
  await delay(500);

  // Fill in password
  await page.type('input[name="password"]', password, { delay: 100 });
  await delay(500);

  // Click login button and wait for navigation
  const loginButton = await page.$('button[type="submit"]');
  if (loginButton) {
   // Wait for navigation after clicking
   await Promise.all([
    page
     .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 })
     .catch(() => {}),
    loginButton.click(),
   ]);
  } else {
   // Try alternative selector
   await Promise.all([
    page
     .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 })
     .catch(() => {}),
    page.evaluate(() => {
     const buttons = Array.from(document.querySelectorAll("button"));
     const submitButton = buttons.find(
      (btn) =>
       btn.textContent?.includes("Log in") ||
       btn.textContent?.includes("Log In") ||
       btn.type === "submit"
     );
     if (submitButton) {
      (submitButton as HTMLButtonElement).click();
     }
    }),
   ]);
  }

  // Wait a bit for page to stabilize
  await delay(3000);

  // Check if login was successful (with error handling)
  let loginSuccess = false;
  try {
   loginSuccess = await page.evaluate(() => {
    // Check for home page indicators
    return (
     document.querySelector('a[href*="/direct/"]') !== null ||
     document.querySelector('svg[aria-label="Home"]') !== null ||
     document.querySelector('a[href="/"]') !== null ||
     window.location.href.includes("/accounts/login/") === false
    );
   });
  } catch (e) {
   // If evaluation fails, check URL directly
   const currentUrl = page.url();
   loginSuccess = !currentUrl.includes("/accounts/login/");
  }

  // Check for "Save Your Login Info" or "Not Now" prompts
  if (loginSuccess) {
   // Handle prompts using evaluate (more reliable)
   await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    // Find "Not Now" buttons
    const notNowButtons = buttons.filter((btn) => {
     const text = btn.textContent?.trim() || "";
     return (
      text === "Not Now" ||
      text === "Not now" ||
      text === "Not Now" ||
      text.toLowerCase().includes("not now")
     );
    });
    notNowButtons.forEach((btn) => {
     (btn as HTMLButtonElement).click();
    });
   });

   await delay(2000);
  }

  // Final check (with error handling)
  let finalCheck = false;
  try {
   finalCheck = await page.evaluate(() => {
    return (
     document.querySelector('a[href*="/direct/"]') !== null ||
     document.querySelector('svg[aria-label="Home"]') !== null ||
     window.location.href.includes("/accounts/login/") === false
    );
   });
  } catch (e) {
   // If evaluation fails, check URL directly
   const currentUrl = page.url();
   finalCheck = !currentUrl.includes("/accounts/login/");
  }

   if (finalCheck) {
    console.log("Successfully logged in to Instagram");
    isLoggedIn = true;

    // Save cookies for future use (in memory and database)
    savedCookies = await page.cookies();
    console.log(`Saved ${savedCookies.length} cookies for session persistence`);
    
    // Save cookies to database
    try {
      await saveInstagramCookies(savedCookies);
      console.log("Saved cookies to database");
    } catch (error) {
      console.warn("Error saving cookies to database:", error);
    }

    return true;
  } else {
   // Check for 2FA or security challenge
   const needs2FA = await page.evaluate(() => {
    return (
     document.body.textContent?.includes("Enter the 6-digit code") ||
     document.body.textContent?.includes("Confirm it's you") ||
     document.querySelector('input[name="verificationCode"]') !== null
    );
   });

   if (needs2FA) {
    console.warn(
     "Two-factor authentication required. Please handle manually or set up 2FA code in environment variables."
    );
    return false;
   }

   console.error(
    "Login failed - check credentials or Instagram may be blocking automated access"
   );
   return false;
  }
 } catch (error) {
  console.error("Error during Instagram login:", error);
  return false;
 }
}

// Get Chrome executable path for different environments
function getChromeExecutablePath(): string | undefined {
  // Priority 1: Environment variable (set in apphosting.yaml)
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }
  
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // Priority 2: Common system paths (for production/serverless)
  const possiblePaths = [
    '/usr/bin/chromium', // Most common in serverless environments
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows 32-bit
  ];
  
  // Try to find Chrome in system paths
  const fs = require('fs');
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log(`Found Chrome at: ${path}`);
        return path;
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  // Return undefined to let Puppeteer try to find it (for local dev with puppeteer package)
  return undefined;
}

async function getBrowser(): Promise<Browser> {
 if (!browserInstance) {
  const chromePath = getChromeExecutablePath();
  const launchOptions: any = {
   headless: true,
   args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-extensions",
    "--single-process", // Important for serverless environments
    "--no-zygote",
   ],
  };
  
  // Set executable path if found
  if (chromePath) {
    launchOptions.executablePath = chromePath;
  }
  
  try {
    browserInstance = await puppeteer.launch(launchOptions);
  } catch (error: any) {
    console.error('Error launching browser:', error.message);
    // Fallback: try without executable path (for local dev)
    if (chromePath) {
      console.log('Retrying without explicit Chrome path...');
      delete launchOptions.executablePath;
      browserInstance = await puppeteer.launch(launchOptions);
    } else {
      throw error;
    }
  }
 }
 return browserInstance;
}

// Load saved cookies into a page
async function loadCookies(page: Page): Promise<boolean> {
 // Try to load from database if memory is empty
 if (savedCookies.length === 0) {
  try {
    const creds = await getInstagramCredentials();
    if (creds && creds.cookies && creds.cookies.length > 0) {
      savedCookies = creds.cookies;
      console.log(`Loaded ${savedCookies.length} cookies from database`);
    }
  } catch (error) {
    console.warn('Error loading cookies from database:', error);
  }
 }
 
 if (savedCookies.length === 0) {
  return false;
 }

 try {
  await page.setCookie(...savedCookies);
  console.log(`Loaded ${savedCookies.length} saved cookies`);
  return true;
 } catch (error) {
  console.warn('Error loading cookies:', error);
  savedCookies = []; // Clear invalid cookies
  return false;
 }
}

// Check if we're still logged in by checking a page
async function checkLoginStatus(page: Page): Promise<boolean> {
 try {
  await page.goto('https://www.instagram.com/', {
   waitUntil: 'domcontentloaded',
   timeout: 10000,
  });
  
  await delay(2000);
  
  const loggedIn = await page.evaluate(() => {
   return (
    document.querySelector('a[href*="/direct/"]') !== null ||
    document.querySelector('svg[aria-label="Home"]') !== null ||
    window.location.href.includes('/accounts/login/') === false
   );
  });
  
  return loggedIn;
 } catch (error) {
  console.warn('Error checking login status:', error);
  return false;
 }
}

export async function closeBrowser(): Promise<void> {
 if (browserInstance) {
  await browserInstance.close();
  browserInstance = null;
 }
}

export async function scrapeInstagramAccount(
 accountUrl: string,
 limit: number = 10
): Promise<ScrapedPost[]> {
 const browser = await getBrowser();
 const page = await browser.newPage();

 try {
  // Set user agent to avoid detection
  await page.setUserAgent(
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Try to reuse saved cookies first
  if (savedCookies.length > 0) {
   const cookiesLoaded = await loadCookies(page);
   if (cookiesLoaded) {
    const stillLoggedIn = await checkLoginStatus(page);
    if (stillLoggedIn) {
     console.log("Reusing saved login session");
     isLoggedIn = true;
    } else {
     console.log("Saved cookies expired, need to login again");
     savedCookies = [];
     isLoggedIn = false;
    }
   }
  }

  // Only login if not already logged in
  if (!isLoggedIn) {
   const loginSuccess = await loginToInstagram(page);
   if (!loginSuccess) {
    console.warn(
     "Login failed, attempting to scrape without authentication..."
    );
   }
  }

  // Navigate to the account page
  await page.goto(accountUrl, {
   waitUntil: "domcontentloaded",
   timeout: 30000,
  });

  // Wait a bit for page to load
  await delay(3000);

  // Check if login is required
  const loginRequired = await page.evaluate(() => {
   return (
    document.body.textContent?.includes("Log in") ||
    document.body.textContent?.includes("Sign up") ||
    document.querySelector('input[name="username"]') !== null
   );
  });

  if (loginRequired && !isLoggedIn) {
   console.warn(`Login required for ${accountUrl}, attempting login...`);
   const loginSuccess = await loginToInstagram(page);
   if (loginSuccess) {
    // Retry navigating to account page after login
    await page.goto(accountUrl, {
     waitUntil: "domcontentloaded",
     timeout: 30000,
    });
    await delay(3000);
   }
  }

  console.log(`Scraping posts from ${accountUrl}...`);

  // Try multiple selectors for posts (with shorter timeout)
  const selectors = [
   'article a[href*="/p/"]',
   'a[href*="/p/"]',
   'div[role="main"] a[href*="/p/"]',
   'main a[href*="/p/"]',
  ];

  let postElements: any[] = [];
  for (const selector of selectors) {
   try {
    await page.waitForSelector(selector, { timeout: 2000 });
    const elements = await page.$$(selector);
    if (elements.length > 0) {
     postElements = elements;
     console.log(
      `Found ${elements.length} post links using selector: ${selector}`
     );
     break;
    }
   } catch (e) {
    // Try next selector
    continue;
   }
  }

  // If no posts found with selectors, try to extract from page content directly
  if (postElements.length === 0) {
   console.log("No posts found with selectors, trying direct extraction...");
   await delay(1000);
  }

  // Scroll to load more posts
  await page.evaluate(() => {
   window.scrollTo(0, document.body.scrollHeight);
  });
  await delay(2000);

  // Extract post data with multiple fallback methods
  const posts = await page.evaluate((limit) => {
   const scrapedPosts: ScrapedPost[] = [];
   const seenUrls = new Set<string>();

   // Try multiple selectors
   const selectors = [
    'article a[href*="/p/"]',
    'a[href*="/p/"]',
    'div[role="main"] a[href*="/p/"]',
    'main a[href*="/p/"]',
   ];

   let postElements: NodeListOf<Element> | null = null;
   for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
     postElements = elements;
     break;
    }
   }

   if (!postElements || postElements.length === 0) {
    return scrapedPosts;
   }

   for (let i = 0; i < Math.min(postElements.length, limit); i++) {
    const link = postElements[i] as HTMLAnchorElement;
    const postUrl = link.href;

    if (!postUrl || !postUrl.includes("/p/") || seenUrls.has(postUrl)) {
     continue;
    }
    seenUrls.add(postUrl);

    // Try to find image - multiple methods
    let imageUrl: string | null = null;
    const img = link.querySelector("img");
    if (img) {
     imageUrl = img.src || img.getAttribute("srcset")?.split(" ")[0] || null;
    }

    // Try to find caption
    const caption =
     link.getAttribute("aria-label") ||
     link.querySelector("img")?.getAttribute("alt") ||
     null;

    // Extract hashtags from caption if available
    const hashtags: string[] = [];
    if (caption) {
     const hashtagPattern = /#[\w\u0590-\u05ff]+/g;
     const matches = caption.match(hashtagPattern);
     if (matches) {
      hashtags.push(...matches);
     }
    }

    scrapedPosts.push({
     postUrl,
     imageUrl,
     text: caption,
     caption: caption,
     hashtags,
     timestamp: null,
     locationText: null,
    });
   }

   return scrapedPosts;
  }, limit);

  return posts;
 } catch (error) {
  console.error(`Error scraping Instagram account ${accountUrl}:`, error);
  return [];
 } finally {
  await page.close();
 }
}

export async function scrapeInstagramHashtag(
 hashtag: string,
 limit: number = 10
): Promise<ScrapedPost[]> {
 const browser = await getBrowser();
 const page = await browser.newPage();

 try {
  await page.setUserAgent(
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1920, height: 1080 });

  // Try to reuse saved cookies first
  if (savedCookies.length > 0) {
   const cookiesLoaded = await loadCookies(page);
   if (cookiesLoaded) {
    const stillLoggedIn = await checkLoginStatus(page);
    if (stillLoggedIn) {
     console.log("Reusing saved login session");
     isLoggedIn = true;
    } else {
     console.log("Saved cookies expired, need to login again");
     savedCookies = [];
     isLoggedIn = false;
    }
   }
  }

  // Only login if not already logged in
  if (!isLoggedIn) {
   const loginSuccess = await loginToInstagram(page);
   if (!loginSuccess) {
    console.warn(
     "Login failed, attempting to scrape without authentication..."
    );
   }
  }

  const hashtagUrl = `https://www.instagram.com/explore/tags/${hashtag.replace(
   "#",
   ""
  )}/`;
  await page.goto(hashtagUrl, {
   waitUntil: "domcontentloaded",
   timeout: 30000,
  });

  await delay(3000);

  // Try multiple selectors
  const selectors = [
   'article a[href*="/p/"]',
   'a[href*="/p/"]',
   'div[role="main"] a[href*="/p/"]',
   'main a[href*="/p/"]',
  ];

  let postElements: any[] = [];
  for (const selector of selectors) {
   try {
    await page.waitForSelector(selector, { timeout: 5000 });
    const elements = await page.$$(selector);
    if (elements.length > 0) {
     postElements = elements;
     break;
    }
   } catch (e) {
    continue;
   }
  }

  if (postElements.length === 0) {
   await delay(2000);
  }

  await page.evaluate(() => {
   window.scrollTo(0, document.body.scrollHeight);
  });
  await delay(2000);

  const posts = await page.evaluate((limit) => {
   const scrapedPosts: ScrapedPost[] = [];
   const seenUrls = new Set<string>();

   const selectors = [
    'article a[href*="/p/"]',
    'a[href*="/p/"]',
    'div[role="main"] a[href*="/p/"]',
    'main a[href*="/p/"]',
   ];

   let postElements: NodeListOf<Element> | null = null;
   for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
     postElements = elements;
     break;
    }
   }

   if (!postElements || postElements.length === 0) {
    return scrapedPosts;
   }

   for (let i = 0; i < Math.min(postElements.length, limit); i++) {
    const link = postElements[i] as HTMLAnchorElement;
    const postUrl = link.href;

    if (!postUrl || !postUrl.includes("/p/") || seenUrls.has(postUrl)) {
     continue;
    }
    seenUrls.add(postUrl);

    let imageUrl: string | null = null;
    const img = link.querySelector("img");
    if (img) {
     imageUrl = img.src || img.getAttribute("srcset")?.split(" ")[0] || null;
    }

    const caption =
     link.getAttribute("aria-label") ||
     link.querySelector("img")?.getAttribute("alt") ||
     null;

    // Extract hashtags from caption if available
    const hashtags: string[] = [];
    if (caption) {
     const hashtagPattern = /#[\w\u0590-\u05ff]+/g;
     const matches = caption.match(hashtagPattern);
     if (matches) {
      hashtags.push(...matches);
     }
    }

    scrapedPosts.push({
     postUrl,
     imageUrl,
     text: caption,
     caption: caption,
     hashtags,
     timestamp: null,
     locationText: null,
     });
   }

   return scrapedPosts;
  }, limit);

  return posts;
 } catch (error) {
  console.error(`Error scraping Instagram hashtag ${hashtag}:`, error);
  return [];
 } finally {
  await page.close();
 }
}

export async function scrapePostDetails(
 postUrl: string,
 timeout: number = 45000 // Increased timeout to 45 seconds
): Promise<ScrapedPost | null> {
 const browser = await getBrowser();
 const page = await browser.newPage();

 // Set page timeout
 page.setDefaultTimeout(timeout);
 page.setDefaultNavigationTimeout(timeout);

 try {
  await page.setUserAgent(
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1920, height: 1080 });

  // Try to reuse saved cookies first (only check, don't navigate)
  if (savedCookies.length > 0 && isLoggedIn) {
   // Just load cookies without checking status for post details
   await loadCookies(page);
  } else if (savedCookies.length > 0) {
   const cookiesLoaded = await loadCookies(page);
   if (cookiesLoaded) {
    // Quick check without full navigation
    const stillLoggedIn = await checkLoginStatus(page);
    if (stillLoggedIn) {
     console.log("Reusing saved login session");
     isLoggedIn = true;
    } else {
     savedCookies = [];
     isLoggedIn = false;
    }
   }
  }

  // Only login if not already logged in
  if (!isLoggedIn) {
   const loginSuccess = await loginToInstagram(page);
   if (!loginSuccess) {
    console.warn(
     "Login failed, attempting to scrape without authentication..."
    );
   }
  }

  console.log(`Fetching post details: ${postUrl}`);
  await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: timeout });

  await delay(3000); // Wait longer for content to load

  // Try to click "more" button if it exists (to expand truncated captions)
  try {
   const moreButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button, span'));
    return buttons.find((btn: any) => {
     const text = btn.textContent?.toLowerCase() || '';
     return text.includes('more') && text.length < 20;
    });
   });
   if (moreButton && moreButton.asElement()) {
    await (moreButton.asElement() as any).click();
    await delay(1000);
   }
  } catch (e) {
   // No "more" button, continue
  }

  // Try multiple selectors for post content (with shorter timeout)
  const selectors = ["article", "main", 'div[role="main"]'];
  let found = false;
  for (const selector of selectors) {
   try {
    await page.waitForSelector(selector, { timeout: 3000 });
    found = true;
    break;
   } catch (e) {
    continue;
   }
  }

  if (!found) {
   console.warn(
    `Could not find post content for ${postUrl}, continuing anyway...`
   );
  }

  // Wait a bit more for dynamic content to load
  await delay(2000);

  const postData = await page.evaluate(() => {
   // Try multiple methods to extract image
   let imageUrl: string | null = null;
   const imgSelectors = ["article img", "main img", 'img[src*="instagram"]'];

   for (const selector of imgSelectors) {
    const img = document.querySelector(selector);
    if (img) {
     imageUrl =
      (img as HTMLImageElement).src ||
      img.getAttribute("srcset")?.split(" ")[0] ||
      null;
     if (imageUrl) break;
    }
   }

   // Try multiple methods to extract caption
   let text: string | null = null;
   let caption: string | null = null;
   
   // Method 0: Try to find caption by looking for username followed by text
   // Instagram structure: username link, then caption text in next sibling
   const usernameLinks = document.querySelectorAll('article a[href^="/"]');
   for (const usernameLink of Array.from(usernameLinks)) {
    const nextSibling = usernameLink.nextElementSibling;
    if (nextSibling) {
     const siblingText = nextSibling.textContent?.trim();
     if (siblingText && siblingText.length > 20 && !siblingText.startsWith('@')) {
      caption = siblingText;
      text = caption;
      break;
     }
     // Also check if the parent contains both username and caption
     const parent = usernameLink.parentElement;
     if (parent) {
      const parentText = parent.textContent?.trim();
      if (parentText && parentText.length > 20) {
       // Extract caption part (after username)
       const parts = parentText.split(/\s+/);
       const usernameIndex = parts.findIndex((p: string) => p.startsWith('@'));
       if (usernameIndex >= 0 && usernameIndex < parts.length - 1) {
        const captionPart = parts.slice(usernameIndex + 1).join(' ');
        if (captionPart.length > 20) {
         caption = captionPart;
         text = caption;
         break;
        }
       }
      }
     }
    }
   }
   
   // Method 1: Try to find caption in the post description area (if Method 0 didn't work)
   if (!caption) {
    const captionSelectors = [
     // Common Instagram caption locations - try more specific first
     'article h1 + div span',
     'article h1 + span',
     'article h1 ~ div span[dir="auto"]',
     'article h1 ~ span[dir="auto"]',
     'article div[role="button"] h1 + div span',
     'article div[role="button"] h1 + span',
     // Alternative selectors
     'article span[dir="auto"]',
     'article h1',
     'main span[dir="auto"]',
     'article div[data-testid] span',
     'article a[href*="/explore/tags/"]',
    ];

    // Collect all potential caption candidates
    const candidates: { text: string; length: number; selector: string }[] = [];
    
    for (const selector of captionSelectors) {
     try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
       const textContent = element.textContent?.trim();
       if (textContent && textContent.length > 20) { // Minimum 20 chars for caption
        // Skip if it's just a username or short text
        if (!textContent.match(/^@\w+$/) && textContent.length > 20) {
         candidates.push({
          text: textContent,
          length: textContent.length,
          selector: selector
         });
        }
       }
      }
     } catch (e) {
      // Selector might not be valid, continue
      continue;
     }
    }

    // If we found candidates, pick the longest one (likely the full caption)
    if (candidates.length > 0) {
     // Sort by length (descending) and take the longest
     candidates.sort((a, b) => b.length - a.length);
     caption = candidates[0].text;
     text = caption;
    }
   }
   
   // Method 2: Fallback if still no caption
   if (!caption) {
    // Fallback: Try to extract from article's text content more broadly
    const article = document.querySelector('article');
    if (article) {
     // Get all text nodes, but exclude navigation and UI elements
     const allText = article.innerText || article.textContent || '';
     // Try to find the main text block (usually after the image)
     const lines = allText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 20);
     if (lines.length > 0) {
      // The caption is usually one of the longer lines
      const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b);
      if (longestLine.length > 20) {
       caption = longestLine;
       text = caption;
      }
     }
    }
   }
   
   // If still no caption, try to get any meaningful text from the post
   if (!caption) {
    const article = document.querySelector('article');
    if (article) {
     // Get all spans and divs with text
     const allElements = article.querySelectorAll('span, div, p');
     for (const el of Array.from(allElements)) {
      const textContent = el.textContent?.trim();
      if (textContent && textContent.length > 30) {
       // Check if it contains hashtags or looks like a caption
       if (textContent.includes('#') || textContent.includes('@') || textContent.split(' ').length > 5) {
        caption = textContent;
        text = caption;
        break;
       }
      }
     }
    }
   }

   // Extract hashtags from the caption or from hashtag links
   const hashtags: string[] = [];
   
   // Method 1: Extract from hashtag links
   const hashtagLinks = document.querySelectorAll('a[href*="/explore/tags/"]');
   hashtagLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href) {
     const match = href.match(/\/explore\/tags\/([^\/]+)/);
     if (match && match[1]) {
      const hashtag = '#' + match[1];
      if (!hashtags.includes(hashtag)) {
       hashtags.push(hashtag);
      }
     }
    }
   });

   // Method 2: Extract hashtags from caption text (pattern: #word)
   if (caption) {
    const hashtagPattern = /#[\w\u0590-\u05ff]+/g;
    const matches = caption.match(hashtagPattern);
    if (matches) {
     matches.forEach((tag) => {
      if (!hashtags.includes(tag)) {
       hashtags.push(tag);
      }
     });
    }
   }

   // Try to extract location
   const locationSelectors = [
    'article a[href*="/explore/locations/"]',
    'main a[href*="/explore/locations/"]',
    'a[href*="/explore/locations/"]',
   ];

   let locationText: string | null = null;
   for (const selector of locationSelectors) {
    const element = document.querySelector(selector);
    if (element) {
     locationText = element.textContent?.trim() || null;
     if (locationText) break;
    }
   }

   // Try to extract timestamp
   const timeSelectors = ["article time", "main time", "time"];
   let timestamp: string | null = null;
   for (const selector of timeSelectors) {
    const element = document.querySelector(selector);
    if (element) {
     timestamp =
      element.getAttribute("datetime") || element.getAttribute("title") || null;
     if (timestamp) break;
    }
   }

   return {
    postUrl: window.location.href,
    imageUrl,
    text,
    caption,
    hashtags,
    timestamp,
    locationText,
   };
  });

  // Log what we extracted for debugging
  if (postData.caption) {
   console.log(`Extracted caption (${postData.caption.length} chars): ${postData.caption.substring(0, 100)}...`);
  } else {
   console.warn(`No caption extracted from ${postUrl}`);
  }

  return postData;
 } catch (error) {
  console.error(`Error scraping post details ${postUrl}:`, error);
  return null;
 } finally {
  await page.close();
 }
}
