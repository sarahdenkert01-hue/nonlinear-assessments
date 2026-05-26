# Clerk CLI setup (run in your terminal)

The Clerk CLI needs an interactive terminal for login. Run these from the project root:

```bash
# 1. Install or update CLI
npm install -g clerk
clerk update --yes

# 2. Sign in (opens browser)
clerk auth login

# 3. Link this repo to your Clerk app
clerk init --app app_3E8XRPoB2Ov1sRCGBmiAucWaKBM

# 4. Pull API keys into .env.local (do not commit)
clerk env pull

# 5. Verify
clerk doctor
npm run dev
```

Then open http://localhost:3000, use **Sign up** to create your first test user, and confirm the profile icon appears.

If you see **Configure your application**, click it to finish claiming the app in the dashboard.
