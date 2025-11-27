# Firebase App Hosting - Multi-Environment Setup

## 📁 File Konfigurasi

Aplikasi ini menggunakan konfigurasi multi-environment untuk Firebase App Hosting:

- `apphosting.yaml` - Konfigurasi default (fallback)
- `apphosting.production.yaml` - Override untuk production
- `apphosting.staging.yaml` - Override untuk staging

## 🔧 Setup Environment di Firebase Console

### Untuk Production Environment:

1. Buka Firebase Console: https://console.firebase.google.com/project/agatha-projects
2. Pilih **App Hosting** dari sidebar
3. Klik **View dashboard** pada backend production
4. Buka tab **Settings** → **Environment**
5. Set **Environment name**: `production`
6. Klik **Save**

### Untuk Staging Environment:

1. Buat atau pilih Firebase project untuk staging (atau gunakan project terpisah)
2. Setup App Hosting backend baru
3. Set **Environment name**: `staging`
4. Klik **Save**

## 🔐 Setup Secrets di Cloud Secret Manager

Environment variables yang menggunakan `secret:` perlu dibuat di Cloud Secret Manager:

### Langkah-langkah:

1. Buka **Google Cloud Console**: https://console.cloud.google.com/
2. Pilih project: `agatha-projects`
3. Buka **Secret Manager** dari menu
4. Klik **CREATE SECRET** untuk setiap secret berikut:

   - **Secret ID**: `gemini-api-key`
     - **Secret value**: Masukkan API key Gemini Anda
   
   - **Secret ID**: `instagram-username`
     - **Secret value**: Masukkan username Instagram
   
   - **Secret ID**: `instagram-password`
     - **Secret value**: Masukkan password Instagram
   
   - **Secret ID**: `firebase-service-account`
     - **Secret value**: Masukkan JSON service account (sebagai string)

5. **Grant Access** ke service account App Hosting:
   - Setiap secret perlu memberikan akses ke service account App Hosting
   - Service account biasanya: `firebase-app-hosting@PROJECT_ID.iam.gserviceaccount.com`

## 🌍 Environment Variables yang Perlu Di-set

### Di Firebase Console > App Hosting > Configuration:

Untuk setiap backend (production/staging), set environment variables berikut:

**Public Variables (dapat di-set langsung):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyASAzgFuvt6CX_7Sceff2pS96NPK4D9dkU
GOOGLE_MAPS_API_KEY=AIzaSyASAzgFuvt6CX_7Sceff2pS96NPK4D9dkU
FIREBASE_PROJECT_ID=agatha-projects
```

**Secrets (harus dibuat di Secret Manager):**
- `gemini-api-key`
- `instagram-username`
- `instagram-password`
- `firebase-service-account`

## 📊 Resource Configuration

### Production:
- CPU: 4 cores
- Memory: 4GB
- Min Instances: 1 (always ready)
- Max Instances: 20
- Concurrency: 100

### Staging:
- CPU: 1 core
- Memory: 1GB
- Min Instances: 0
- Max Instances: 5
- Concurrency: 40

## 🚀 Deploy

Setelah setup selesai:

1. Push code ke GitHub:
   ```bash
   git add apphosting*.yaml
   git commit -m "Add App Hosting multi-environment configuration"
   git push
   ```

2. Firebase akan otomatis:
   - Detect environment name dari backend
   - Merge `apphosting.yaml` dengan `apphosting.ENVIRONMENT_NAME.yaml`
   - Build dan deploy dengan konfigurasi yang sesuai

## 📝 Catatan

- Environment name di Firebase Console harus match dengan nama file: `apphosting.ENVIRONMENT_NAME.yaml`
- Secrets harus dibuat di Cloud Secret Manager sebelum deploy
- Service account App Hosting harus memiliki akses ke secrets
- Environment variables di Console akan override values di YAML files

