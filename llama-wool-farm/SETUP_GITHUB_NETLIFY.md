# 🚀 Setting Up GitHub Repository and Netlify Deployment

Follow these steps to get your Llama Wool Farm game on GitHub and deployed to Netlify.

## 📦 Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name**: `llama-wool-farm`
   - **Description**: "A progressive web app idle clicker game about llamas producing wool"
   - **Public/Private**: Your choice (Public recommended for Netlify free tier)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## 📤 Step 2: Push Code to GitHub

After creating the empty repository, GitHub will show you commands. Since we already initialized git, run these commands in your terminal:

```bash
# Add the remote repository
git remote add origin https://github.com/gxjansen/llama-wool-farm.git

# Push to GitHub
git push -u origin main
```

If you get an authentication error, you may need to:
- Use a Personal Access Token instead of password
- Or use GitHub CLI: `gh auth login`

## 🌐 Step 3: Deploy to Netlify

### Option A: Deploy via Netlify UI (Recommended)

1. Go to [app.netlify.com](https://app.netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub
5. Select the `llama-wool-farm` repository
6. Configure build settings:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
7. Click **"Deploy site"**

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init

# Follow prompts:
# - Create & configure a new site
# - Team: Choose your team
# - Site name: llama-wool-farm (or leave blank for random)
# - Build command: npm run build
# - Directory to deploy: dist
```

## 🔐 Step 4: Add Environment Variables in Netlify

1. In Netlify dashboard, go to **Site settings** → **Environment variables**
2. Add these variables (if needed):
   ```
   NODE_VERSION=18
   NPM_VERSION=9
   ```

## 🎯 Step 5: Get Your Site Details for GitHub Actions

1. In Netlify dashboard, go to **Site settings** → **General**
2. Copy your **Site ID** (looks like: `12345678-1234-1234-1234-123456789012`)

3. Go to **User settings** → **Applications** → **Personal access tokens**
4. Create new token with name "GitHub Actions"
5. Copy the token (you won't see it again!)

6. In your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Add new repository secrets:
     - `NETLIFY_AUTH_TOKEN`: Your personal access token
     - `NETLIFY_SITE_ID`: Your site ID

## ✅ Step 6: Verify Everything Works

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push
   ```
3. Check GitHub Actions tab - you should see the CI/CD pipeline running
4. Once complete, your site will be live at: `https://llama-wool-farm.netlify.app`

## 🎉 You're Done!

Your game is now:
- ✅ Version controlled on GitHub
- ✅ Automatically tested on every push
- ✅ Automatically deployed to Netlify
- ✅ Available as a PWA at your Netlify URL

## 🔧 Troubleshooting

### Authentication Issues with GitHub
```bash
# Use GitHub CLI for easier auth
brew install gh  # macOS
gh auth login
```

### Build Fails on Netlify
- Check build logs in Netlify dashboard
- Ensure all dependencies are in `package.json` (not just devDependencies)
- Try building locally first: `npm run build`

### GitHub Actions Failing
- Check the Actions tab in GitHub for error logs
- Verify secrets are correctly set
- Ensure branch names match (main vs master)

## 📚 Additional Resources

- [GitHub: Creating a repo](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [Netlify: Deploy with Git](https://docs.netlify.com/site-deploys/create-deploys/#deploy-with-git)
- [GitHub Actions: Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)