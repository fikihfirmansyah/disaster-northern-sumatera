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

**Semua environment variables menggunakan Cloud Secret Manager** untuk keamanan yang lebih baik.

### Langkah-langkah Setup Secrets:

1. **Buka Google Cloud Console Secret Manager**:

   ```
   https://console.cloud.google.com/security/secret-manager?project=agatha-projects
   ```

2. **Enable Secret Manager API** (jika belum):

   - Klik "Enable API" jika muncul prompt

3. **Buat Secrets** - Klik **CREATE SECRET** untuk setiap secret berikut:

   #### a. Google Maps API Key

   - **Secret ID**: `google-maps-api-key`
   - **Secret value**: `AIzaSyASAzgFuvt6CX_7Sceff2pS96NPK4D9dkU` (atau API key Anda)
   - **Replication**: Regional (pilih region terdekat, e.g., `asia-southeast1`)

   #### b. Gemini API Key

   - **Secret ID**: `gemini-api-key`
   - **Secret value**: Masukkan API key Gemini Anda
   - **Replication**: Regional

   #### c. Instagram Username

   - **Secret ID**: `instagram-username`
   - **Secret value**: Masukkan username Instagram Anda
   - **Replication**: Regional

   #### d. Instagram Password

   - **Secret ID**: `instagram-password`
   - **Secret value**: Masukkan password Instagram Anda
   - **Replication**: Regional

   #### e. Firebase Project ID

   - **Secret ID**: `firebase-project-id`
   - **Secret value**: `agatha-projects` (atau project ID Anda)
   - **Replication**: Regional

   #### f. Firebase Service Account

   - **Secret ID**: `firebase-service-account`
   - **Secret value**: Masukkan JSON service account (sebagai string, bukan file)
     ```json
     {"type":"service_account","project_id":"agatha-projects",...}
     ```
   - **Replication**: Regional

4. **Grant Access ke App Hosting Service Account**:

   Untuk setiap secret yang dibuat:

   a. Klik pada secret yang sudah dibuat
   b. Buka tab **PERMISSIONS**
   c. Klik **ADD PRINCIPAL**
   d. Masukkan service account App Hosting:

   ```
   firebase-app-hosting@agatha-projects.iam.gserviceaccount.com
   ```

   e. Pilih role: **Secret Manager Secret Accessor**
   f. Klik **SAVE**

   **Atau via gcloud CLI** (lebih cepat untuk multiple secrets):

   ```bash
   # Set project
   gcloud config set project agatha-projects

   # Grant access untuk semua secrets sekaligus
   for secret in google-maps-api-key gemini-api-key instagram-username instagram-password firebase-project-id firebase-service-account; do
     gcloud secrets add-iam-policy-binding $secret \
       --member="serviceAccount:firebase-app-hosting@agatha-projects.iam.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
   done
   ```

## 🌍 Daftar Secrets yang Diperlukan

Semua environment variables menggunakan Secret Manager:

| Secret ID                  | Variable Name                     | Keterangan                    |
| -------------------------- | --------------------------------- | ----------------------------- |
| `google-maps-api-key`      | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (public)  |
| `google-maps-api-key`      | `GOOGLE_MAPS_API_KEY`             | Google Maps API key (server)  |
| `gemini-api-key`           | `GEMINI_API_KEY`                  | Gemini AI API key             |
| `instagram-username`       | `INSTAGRAM_USERNAME`              | Instagram username            |
| `instagram-password`       | `INSTAGRAM_PASSWORD`              | Instagram password            |
| `firebase-project-id`      | `FIREBASE_PROJECT_ID`             | Firebase project ID           |
| `firebase-service-account` | `FIREBASE_SERVICE_ACCOUNT`        | Firebase service account JSON |

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

## 📝 Catatan Penting

- **Environment name** di Firebase Console harus match dengan nama file: `apphosting.ENVIRONMENT_NAME.yaml`
- **Secrets harus dibuat** di Cloud Secret Manager sebelum deploy
- **Service account App Hosting** harus memiliki akses ke semua secrets
- **Secret replication**: Pilih regional replication untuk performa yang lebih baik
- **Service account name**: `firebase-app-hosting@PROJECT_ID.iam.gserviceaccount.com`
- **Semua variables menggunakan secrets** - tidak perlu set di Firebase Console

## 🔍 Verifikasi Setup

Setelah semua secrets dibuat, verifikasi dengan:

1. **Check secrets di Console**: Pastikan semua 6 secrets sudah dibuat
2. **Check permissions**: Pastikan service account memiliki akses ke semua secrets
3. **Test deploy**: Push code dan monitor build logs untuk memastikan secrets bisa diakses

## 🚨 Troubleshooting

### Error: "Secret not found"

- Pastikan secret ID di YAML match dengan secret ID di Secret Manager
- Pastikan secret sudah dibuat di project yang benar (`agatha-projects`)

### Error: "Permission denied"

- Pastikan service account App Hosting memiliki role `Secret Manager Secret Accessor`
- Check IAM permissions di Secret Manager
- Service account: `firebase-app-hosting@agatha-projects.iam.gserviceaccount.com`

### Error: "Secret value is empty"

- Pastikan secret value sudah di-set saat membuat secret
- Pastikan tidak ada whitespace atau karakter khusus yang tidak valid
- Untuk Firebase Service Account, pastikan JSON string valid

### Error: "Invalid apphosting.yaml"

- Pastikan format YAML valid (indentation dengan spaces, bukan tabs)
- Pastikan setiap env variable memiliki `secret:` field (bukan `value:`)
- Pastikan `availability` array berisi `BUILD` dan/atau `RUNTIME`
