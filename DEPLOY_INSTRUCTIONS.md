# Instruksi Deployment ke Firebase App Hosting

## ✅ Status
- ✅ Code sudah di-commit ke GitHub: `git@github.com:fikihfirmansyah/disaster-northern-sumatera.git`
- ✅ Build berhasil
- ✅ Konfigurasi Firebase sudah siap

## 🚀 Langkah Deployment ke Firebase App Hosting

### Opsi 1: Setup via Firebase Console (Recommended untuk Next.js dengan API Routes)

1. **Buka Firebase Console**
   ```
   https://console.firebase.google.com/project/gdg-medan
   ```

2. **Setup App Hosting**
   - Di sidebar kiri, klik "App Hosting" (atau "Hosting" > "App Hosting")
   - Jika belum ada, klik "Get Started" atau "Create new app"
   - Pilih "Connect GitHub repository"
   - Authorize Firebase untuk akses GitHub jika diperlukan
   - Pilih repository: `fikihfirmansyah/disaster-northern-sumatera`
   - Pilih branch: `main`

3. **Konfigurasi Build**
   - **Build command**: `npm run build`
   - **Output directory**: `.next`
   - **Node.js version**: `20`
   - **Region**: `asia-southeast1` (atau pilih yang terdekat)

4. **Environment Variables**
   Tambahkan semua environment variables berikut:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
   GOOGLE_MAPS_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   INSTAGRAM_USERNAME=your_username
   INSTAGRAM_PASSWORD=your_password
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```
   
   Atau jika menggunakan Project ID:
   ```
   FIREBASE_PROJECT_ID=gdg-medan
   ```

5. **Deploy**
   - Klik "Deploy" atau Firebase akan otomatis deploy setiap push ke `main`
   - Tunggu proses build dan deploy selesai
   - URL aplikasi akan muncul setelah deploy selesai

### Opsi 2: Deploy via CLI (Jika App Hosting sudah di-setup)

```bash
# Pastikan sudah login
firebase login

# Deploy
npm run deploy
```

## 📝 Catatan Penting

1. **API Routes**: Firebase App Hosting mendukung Next.js API routes secara native
2. **Environment Variables**: Pastikan semua API keys sudah di-set di Firebase Console
3. **Database**: Pastikan Firestore sudah diaktifkan di Firebase Console
4. **Billing**: Pastikan billing sudah diaktifkan untuk Google Maps API dan Gemini API

## 🔗 URL Setelah Deploy

Setelah deploy berhasil, aplikasi akan tersedia di:
- `https://gdg-medan.web.app`
- Atau custom domain jika sudah dikonfigurasi

## 🐛 Troubleshooting

Jika ada masalah:
1. Check logs di Firebase Console > App Hosting > Build logs
2. Pastikan semua environment variables sudah di-set
3. Pastikan API keys valid dan billing enabled
4. Check GitHub Actions logs jika menggunakan CI/CD

