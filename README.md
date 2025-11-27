# Disaster Monitoring Application

Real-time disaster monitoring application for Aceh, North Sumatra, and West Sumatra, Indonesia. Automatically collects data from Instagram public accounts and analyzes disaster severity using AI.

## Features

- **Automated Data Collection**: Scrapes Instagram posts from public accounts and hashtags
- **AI-Powered Analysis**: Uses Google Gemini to analyze sentiment and classify disaster severity
- **Interactive Map**: Google Maps visualization with color-coded markers
- **Filtering**: Filter by severity, disaster type, and area
- **Admin Panel**: Manage Instagram accounts and trigger scraping manually

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS with Inter font
- **AI**: Google Gemini API
- **Maps**: Google Maps JavaScript API
- **Scraping**: Puppeteer
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage (or Cloudflare R2)
- **Deployment**: Cloudflare Pages or Firebase Hosting

## Setup

### Prerequisites

- Node.js 18+ and npm
- Google Maps API key
- Firebase project with Firestore enabled
- Instagram account credentials (for scraping)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Instagram Login Credentials (required for scraping)
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# Firebase Configuration
# Option 1: Service Account JSON (recommended)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}

# Option 2: Project ID (for Firebase Hosting/Cloud Functions)
FIREBASE_PROJECT_ID=your-project-id

# Option 3: Use GOOGLE_APPLICATION_CREDENTIALS pointing to service account JSON file
```

**Important**:

- Instagram credentials are required for scraping
- Firebase service account is required for database operations
- Get your Firebase service account from Firebase Console > Project Settings > Service Accounts

3. Set up Firebase Firestore:

- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project or use an existing one
- Enable Firestore Database
- Get your service account key from Project Settings > Service Accounts
- Add the service account JSON to your `.env.local` as `FIREBASE_SERVICE_ACCOUNT`

The Firestore collections will be created automatically when you first save data:

- `instagram_accounts` - Instagram accounts to scrape
- `posts` - Scraped Instagram posts
- `ai_analysis` - AI analysis results
- `locations` - Geocoded locations cache

4. Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment

### Option 1: Firebase Hosting (Recommended)

1. **Install Firebase CLI**:

```bash
npm install -g firebase-tools
firebase login
```

2. **Initialize Firebase**:

```bash
firebase init hosting
```

3. **Deploy**:

```bash
npm run build
firebase deploy --only hosting
```

4. **Configure Environment Variables**:

In Firebase Console > Functions (if using Cloud Functions) or set in your hosting environment:

- `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_PROJECT_ID`
- `INSTAGRAM_USERNAME`
- `INSTAGRAM_PASSWORD`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Option 2: Cloudflare Pages

1. **Build and Deploy**:

```bash
npm run build
npx wrangler pages deploy .next
```

2. **Configure Environment Variables** in Cloudflare Pages dashboard

3. **Set up Cron Triggers** for scheduled scraping (if needed)

## Project Structure

```
disaster/
├── app/
│   ├── page.tsx              # Main map page
│   ├── admin/
│   │   └── page.tsx          # Admin panel
│   ├── api/                  # API routes
│   └── layout.tsx
├── components/
│   ├── DisasterMap.tsx      # Google Maps component
│   ├── FilterPanel.tsx      # Filter sidebar
│   └── DetailPanel.tsx      # Post detail panel
├── lib/
│   ├── db.ts                 # Database helpers
│   ├── genkit-flow.ts        # Gemini AI integration
│   ├── instagram-scraper.ts  # Instagram scraping
│   ├── geocoding.ts          # Location geocoding
│   └── r2.ts                 # R2 storage helpers
├── types/
│   └── index.ts              # TypeScript types
└── migrations/
    └── schema.sql            # Database schema
```

## Usage

1. **Add Instagram Accounts**: Go to Admin Panel and add public Instagram account URLs
2. **Trigger Scraping**: Click "Trigger Scraping" to collect posts from all accounts
3. **View on Map**: Posts are automatically analyzed and displayed on the map
4. **Filter Results**: Use filters to find specific disasters or areas
5. **View Details**: Click on map markers to see post details and AI analysis

## Notes

- Instagram scraping may be rate-limited. Use responsibly.
- Puppeteer requires a headless browser, which may not work in all serverless environments.
- For production, consider using a dedicated scraping service or Instagram's official API (if available).
- The application uses mock data in development mode when D1 database is not available.

## License

MIT
