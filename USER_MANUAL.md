# PageForge User Manual

Welcome to **PageForge**, a self-hosted platform for deploying static websites with speed and security. PageForge allows you to transform your code—whether hosted on Git or stored in a ZIP file—into a live website in minutes.

---

## 1. Getting Started

### 1.1 Account Registration
To begin using PageForge, you must create an account:
1.  Navigate to the **Register** page.
2.  Enter your **Name**, **Email**, and a **Password** (minimum 8 characters).
3.  **Email Verification:** PageForge will send a 6-digit verification code to your email. Enter this code on the screen to activate your account.
    -   **Auto-Advance:** The input boxes automatically move to the next digit as you type.
    -   **Paste Support:** You can copy the full 6-digit code and paste it into the first box.
    -   **Resend Logic:** The code is valid for 5 minutes. If you do not receive it, you may request a resend after a 60-second cooldown.

PageForge now supports Zxcvbn-based password strength estimation. As you type, the system provides real-time feedback on password complexity to ensure account security. Additionally, the 6-digit OTP field now includes automatic clipboard sanitization, removing non-numeric characters if you paste a code containing dashes or spaces.

### 1.2 Accessing Your Account
Log in using your registered **Email** and **Password**. PageForge uses secure session management to keep you logged in for up to 30 days on your device.

### 1.3 Password Recovery
If you forget your password:
1.  Click **"Forgot password?"** on the login screen.
2.  Provide your registered email address.
3.  Enter the 6-digit verification code sent to your inbox.
4.  Set a new, secure password (minimum 8 characters) to regain access to your dashboard.

---

## 2. Dashboard Overview

The **Projects** dashboard is your central hub for managing your static site deployments.
-   **New Project:** Click the **"New Project"** button to start a new deployment.
-   **Project Cards:** Each card displays the project name, source (Git URL or "ZIP upload"), source type, number of domains, number of environment variables, and the creation date.

---

## 3. Creating a New Project

Click the **"New Project"** button to launch the 3-step setup wizard:

### 3.1 Step 1: Project Details
-   **Project Name:** Enter a unique name for your site.

### 3.2 Step 2: Source Configuration
-   **Source Type:** Choose between **Git Repository** or **ZIP Upload**.
-   **Git Repository:**
    -   If GitHub is connected: Use the **Select Repository** picker to search and choose a repo.
    -   If not connected: Click **Connect GitHub** or enter a **Repository URL** and **Branch** manually.
    -   **Advanced:** You can optionally provide a **Access Token (PAT)** for private repository access.
        -   [Official Doc: Creating a Classic Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic)
        -   [Official Doc: Creating a Fine-grained Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic)
-   **ZIP Upload:** If selected, you will be able to upload your ZIP file after the project is created.

### 3.3 Step 3: Build Configuration & Node.js Static Site Guide

PageForge is a **Static Site Hosting** platform optimized for the Node.js ecosystem. It allows you to use modern JavaScript frameworks to build high-performance, secure, and easily scalable websites.

#### **How Static Site Generation (SSG) Works**
Unlike traditional hosting where a server (like Node.js or PHP) processes every request, PageForge uses a "Build-Time" approach:
1.  **Environment Setup:** PageForge initializes a Node.js environment (v20) in an isolated container.
2.  **Dependency Installation:** It runs your **Install Command** (e.g., `npm install`) to download all necessary libraries.
3.  **The Build Phase:** It runs your **Build Command** (e.g., `npm run build`). This script executes your framework's compiler, which transforms your source code (React, Vue, Markdown, etc.) into a collection of plain HTML, CSS, and JavaScript files.
4.  **Deployment:** PageForge takes the contents of your **Output Directory** and serves them via a global CDN-like edge proxy.

---

#### **Popular Node.js Framework Configurations**

| Framework | Install Command | Build Command | Output Directory | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js** | `npm install` | `npm run build` | `out` | Sites needing `output: 'export'` in config. |
| **Vite (React/Vue)**| `npm install` | `npm run build` | `dist` | Modern, lightning-fast web applications. |
| **Astro** | `npm install` | `npm run build` | `dist` | Content-focused sites and blogs. |
| **Docusaurus** | `npm install` | `npm run build` | `build` | Beautiful documentation and wikis. |
| **Nuxt (Static)** | `npm install` | `npm run build` | `.output/public`| Vue.js apps using `target: 'static'`. |
| **Gatsby** | `npm install` | `npm run build` | `public` | Data-heavy sites using GraphQL. |
| **SvelteKit** | `npm install` | `npm run build` | `build` | Highly optimized, reactive websites. |

---

#### **Detailed Requirements**

**1. Deployment Checklist:**
-   ✅ **Static Only:** Your project must be capable of running without a live `node` process.
-   ✅ **Routing:** Use "Hash Routing" or ensure your framework supports "Static Exporting" for clean URLs.
-   ✅ **Environment Variables:** Access them via `process.env` during the build phase; they will be baked into your JavaScript files.

**2. What CANNOT be deployed:**
-   ❌ **API Servers:** You cannot run `app.listen()` (Express/FastAPI) directly on PageForge. Use external serverless functions or a separate backend for APIs.
-   ❌ **SSR (Server-Side Rendering):** Features like `getServerSideProps` in Next.js will not work. Use `getStaticProps` or client-side fetching instead.

**3. Source Formatting & Uploading:**
-   **Root Directory:** Your `package.json` must be at the very top level of your Git repository or ZIP file.
-   **ZIP Best Practices:** When creating a ZIP, select the *files inside* your project folder and compress them. If you zip the folder itself, PageForge will attempt to "unwrap" it, but direct compression is more reliable.
-   **Source vs. Artifacts:** Upload your **source code**, not your `node_modules` or `dist` folder. PageForge builds the project for you to ensure a clean, optimized environment.

---

## 4. Project Management

Click on any project to access its management tabs:

### 4.1 Overview
-   **Deploy:** Shows the source information. Click **"Deploy Now"** to trigger a manual build.
-   **Status:** Displays the current deployment status of the project.
-   **Default Domain:** A direct link to your site's default subdomain.
-   **Source:** Displays the Git URL or the filename of the last uploaded ZIP.
-   **Build Configuration:** Displays your current **Install**, **Build**, and **Output** settings.
-   **Latest Deployment:** Shows the timestamp of the last build with a **"View Logs"** button to see the build output.

### 4.2 Deployments
-   A chronological list of all previous builds.
-   Each entry shows the **Status**, a short **Deployment ID**, the **Trigger** (e.g., manual), and the **Timestamp**.
-   Click any entry to view its **Live Build Logs**.

### 4.3 Environment
-   Manage variables that are injected during the build process.
-   **Add Variable:** Click to add a new **KEY** and **value** pair.
-   **Encryption:** Click the lock icon to encrypt a value, masking it in the UI and build logs.
-   **Save Changes:** Click to update your project's environment variables.

### 4.4 Domains
-   **Default Subdomain:** Your site's automatically generated address.
-   **Add Domain:** Enter a custom domain (e.g., `example.com`) and click **"Add Domain"**.
-   **Verify:** Follow the instructions to point your domain's CNAME record to the provided target, then click **"Verify"** to activate it.
    -   [Cloudflare: Managing DNS Records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
    -   [GoDaddy: Adding a CNAME record](https://www.godaddy.com/help/add-a-cname-record-19236)
    -   [Namecheap: Creating a CNAME record](https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/)
    -   [Squarespace/Google Domains: Adding DNS Records](https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-custom-DNS-records-to-your-Squarespace-domain)

### 4.5 Settings
-   **General:** Update your **Project Name**, **Repository URL**, and **Branch**.
-   **Build Settings:** Modify your **Install Command**, **Build Command**, or **Output Directory**.
-   **Git Credentials:** Manage project-specific access tokens. Use **Save Token** to add a new one or **Remove** to delete an existing token.
-   **Upload Source:** (For ZIP projects) Click to upload a new `.zip` archive.
-   **Danger Zone:** Click **"Delete Project"** to permanently remove the project and all associated data.

---

## 5. Account Settings

Access your global settings by clicking **"Settings"** in the sidebar:
-   **Account:** View your registered **Name** and **Email**.
-   **GitHub:** Connect or disconnect your GitHub account. Click **"Connect GitHub Account"** to link your profile or **"Disconnect GitHub"** to remove the connection.

---

## 6. Troubleshooting

| Common Issue | Likely Cause | Resolution |
| :--- | :--- | :--- |
| `Command not found` | The build environment is missing a tool. | Add the tool installation to your **Install Command** (e.g., `npm install -g pnpm`). |
| `Output dir not found` | The specified output folder does not exist. | Verify the **Output Directory** setting matches your build tool's configuration. |
| `CNAME not verified` | DNS changes have not propagated yet. | Wait a few minutes and click **"Verify"** again. Ensure the CNAME target is exactly as shown in PageForge. |

---
