# skillpilot
job trainer

## Resume Builder API deployment

GitHub Pages serves this project as a static site; it cannot run the Express API. Deploy the API as a Render web service using the included `render.yaml` Blueprint:

1. In Render, create a new Blueprint from this GitHub repository and provide `GOOGLE_AI_API_KEY` when prompted. Keep the key in Render's environment settings; do not add it to the repository.
2. After Render deploys the service, copy its base URL (for example, `https://skillpilot-api.onrender.com`).
3. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and add the repository variable `SKILLPILOT_API_BASE_URL` with that base URL (no trailing slash).
4. Run the **Deploy Skill Pilot to GitHub Pages** workflow again. The build writes the URL into `api-config.js` for the deployed site.

The API allows requests from the Skill Pilot GitHub Pages origin and same-origin requests. Set Render's `ALLOWED_ORIGINS` environment variable to a comma-separated list if the site uses a different origin. The free Render service may take a short time to wake up after inactivity.
