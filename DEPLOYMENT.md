# Deployment Guide - Firebase App Hosting

## Setup Firebase App Hosting

Firebase App Hosting adalah layanan hosting terkelola yang mendukung Next.js dengan API routes. Setup dilakukan melalui Firebase Console. x

### Langkah-langkah Deployment:

1. **Buka Firebase Console**

   - Kunjungi https://console.firebase.google.com/
   - Pilih project: **gdg-medan**

2. **Setup App Hosting**

   - Di sidebar, pilih "App Hosting" (atau "Hosting" > "App Hosting")
   - Klik "Get Started" atau "Create new app"
   - Pilih "Connect GitHub repository"
   - Pilih repository: `fikihfirmansyah/disaster-northern-sumatera`
   - Pilih branch: `main`
   - Set build command: `npm run build`
   - Set output directory: `.next`
   - Set Node.js version: `20`

3. **Environment Variables**
   Tambahkan environment variables berikut di Firebase Console:

   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `GOOGLE_MAPS_API_KEY`
   - `GEMINI_API_KEY`
   - `INSTAGRAM_USERNAME`
   - `INSTAGRAM_PASSWORD`
   - `FIREBASE_SERVICE_ACCOUNT` (atau `FIREBASE_PROJECT_ID`)

4. **Deploy**
   - Firebase akan otomatis build dan deploy setiap kali ada push ke branch `main`
   - Atau klik "Deploy" manual di Firebase Console

### Alternative: Deploy via CLI (Traditional Hosting)

Jika ingin menggunakan Firebase Hosting tradisional:

```bash
# Build aplikasi
npm run build

# Deploy
firebase deploy --only hosting
```

**Catatan**: Traditional hosting tidak mendukung API routes. Untuk API routes, gunakan Firebase App Hosting atau Firebase Functions.

### URL Deployment

Setelah deploy, aplikasi akan tersedia di:

- Firebase App Hosting: `https://gdg-medan.web.app` atau custom domain
- Check di Firebase Console > App Hosting untuk URL lengkap
