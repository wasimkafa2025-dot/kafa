# Daily Task Management - GitHub Deployment Guide

This project is a modern React SPA (Single Page Application) styled with Tailwind CSS, supporting local and cloud productivity tracking, real-time Firestore database sync, customizable day/night color themes, AI productivity reporting, and Telegram notifications.

---

## 🚀 របៀប Publish ទៅកាន់ GitHub ពី Google AI Studio ដោយផ្ទាល់ (Direct 1-Click Update)

លោកអ្នកមិនចាំបាច់សរសេរ Command អ្វីទាំងអស់! ដើម្បីធ្វើបច្ចុប្បន្នភាពកូដទៅកាន់ GitHub៖

1. **ចុចលើប៊ូតុង Publish / Export:**
   - នៅជ្រុងខាងលើស្តាំនៃផ្ទាំង Google AI Studio សូមចុចលើប៊ូតុង **"Publish"** ឬ **"Settings"** (រូបសញ្ញាចុចបី `...`)។
   - ជ្រើសរើសយក **"Export to GitHub"** (ឬ **"Push to GitHub"** / **"Sync with GitHub"** អាស្រ័យលើកំណែ AI Studio)។
2. **ជ្រើសរើស Repository របស់អ្នក:**
   - ជ្រើសរើស Repository ដែលលោកអ្នកចង់ Push កូដចូល។
3. **ប្រព័ន្ធ GitHub Actions នឹងដំណើរការ Hosting ដោយស្វ័យប្រវត្តិ:**
   - យើងបានកំណត់ឯកសារ `.github/workflows/deploy.yml` និង `base: './'` រួចជាស្រេច។ រាល់ពេលលោកអ្នក Push ទៅ GitHub នោះ GitHub នឹង Compile ហើយបង្ហោះ (Deploy) ឡើងលើ **GitHub Pages** ដោយស្វ័យប្រវត្តិ ១០០%!

---

## 🛠️ ការបើកដំណើរការ GitHub Pages លើ GitHub Repository (ធ្វើតែម្តងដំបូងប៉ុណ្ណោះ)

1. ចូលទៅកាន់ Repository របស់អ្នកនៅលើ GitHub
2. ចុចលើ **Settings** > ម៉ឺនុយ **Pages** (នៅខាងឆ្វេង)
3. នៅត្រង់ **Build and deployment > Source**:
   - ជ្រើសរើសយក **"GitHub Actions"** (ឬ **"Deploy from a branch: gh-pages"**)
4. រួចរាល់! គេហទំព័ររបស់អ្នកនឹងមានតំណភ្ជាប់ Live ដូចជា៖ `https://<YOUR_USERNAME>.github.io/<YOUR_REPO>/`

---

## 💻 របៀបរុញកូដតាម Terminal (បើទាញយកជា ZIP)

```bash
# Initialize git repository
git init

# Add all files to staging
git add .

# Create the initial commit
git commit -m "feat: configure GitHub Pages and offline-first client-side fallbacks"

# Rename current branch to main
git branch -M main

# Link your local repo to GitHub (replace with your repository's URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push your code to GitHub
git push -u origin main
```

---

## 🛠️ Automated Deployment via GitHub Actions

We have included a GitHub Actions workflow in `.github/workflows/deploy.yml`. When you push code to the `main` or `master` branch, GitHub will automatically build your app and deploy it!

### Step 3: Enable Workflow Permissions
To allow the GitHub Action to publish your site:
1. Go to your repository on GitHub.
2. Click on **Settings** -> **Actions** -> **General**.
3. Scroll down to **Workflow permissions** and select **Read and write permissions**.
4. Click **Save**.

### Step 4: Configure GitHub Pages Publishing
Once the automatic build completes (you can watch it in the **Actions** tab of your repository):
1. Go to **Settings** -> **Pages** in your GitHub repository.
2. Under **Build and deployment** -> **Source**, select **Deploy from a branch**.
3. Under **Branch**, select `gh-pages` and `/ (root)`, then click **Save**.
4. Within 1-2 minutes, GitHub will provide a live link (e.g., `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`) where your application is hosted!

---

## 🌐 Dual-Mode & Client-Side Resiliency

This app is built with **full-stack resiliency**:
* **Server-Side Mode (Local/Cloud Run)**: Uses the bundled Express server (`server.ts`) as a secure proxy to send Telegram alerts and invoke the Gemini AI model.
* **Static Client-Side Mode (GitHub Pages)**: Since GitHub Pages hosts static files (without a Node.js backend running), the application automatically detects this and falls back to **direct browser-to-API requests**:
  * **Telegram Alerts**: Directly dispatched to the Telegram Bot API from the browser.
  * **Gemini AI Reports (Khmer/English)**: Directly processed via the Google Generative Language REST endpoints using the custom Gemini API key configured in the **AI Settings** modal of your app.
