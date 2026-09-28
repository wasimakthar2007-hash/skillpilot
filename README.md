# skillpilot
job trainer

## Run locally

1. Set `GOOGLE_AI_API_KEY` in the repository-root `.env` file (the same folder as `server.js` and `package.json`) to a valid Gemini API key created in [Google AI Studio](https://aistudio.google.com/app/apikey). Do not use an OAuth client ID, access token, or service-account credential.
2. Start the app with `npm start` from the repository root.
3. Open `http://localhost:3000/resume-builder.html` (or the port printed by the server).

If Google reports invalid credentials or denies the project, the key's Google Cloud project is not authorized for Gemini API access. Create/use a permitted project and key in Google AI Studio, replace the root `.env` value, and restart the server. Do not paste API keys into chat or commit them.

## Resume Builder API deployment

GitHub Pages serves this project as a static site; it cannot run the Express API. Deploy the API as a Render web service using the included `render.yaml` Blueprint:

1. In Render, create a new Blueprint from this GitHub repository and provide a newly created `GOOGLE_AI_API_KEY` when prompted. If a key was pasted into a chat, committed, or shared publicly, revoke it first. Keep the replacement key only in Render's environment settings; do not add it to the repository.
2. After Render deploys the service, copy the base URL shown for that service. Do not use an example or another application’s Render URL.
3. For automatic configuration, in the GitHub repository open **Settings → Secrets and variables → Actions → Variables** and add repository variable `SKILLPILOT_API_BASE_URL` with that base URL (no trailing slash). Alternatively, enter the HTTPS base URL in AI Mentor or Resume Builder and choose **Save**; the page verifies the health and resume endpoints before saving it for both features.
4. Run the **Deploy Skill Pilot to GitHub Pages** workflow again if you configured the Actions variable. The workflow also deploys when the variable is unset, so you can set and verify the server URL on the site.

The API allows requests from the Skill Pilot GitHub Pages origin and same-origin requests. Set Render's `ALLOWED_ORIGINS` environment variable to a comma-separated list if the site uses a different origin. Before configuring Pages, verify that the service's `/api/health` returns `{"ok":true}` and that a `POST /api/resume/analyze` without a file returns the Skill Pilot JSON error asking for a resume file (HTTP 400). A 404 or 405 means the URL points to a different service or the deployed service does not contain this repository's `server.js`. The free Render service may take a short time to wake up after inactivity.

GitHub Pages cannot handle API POST requests itself. The Pages workflow embeds `SKILLPILOT_API_BASE_URL` when provided; otherwise, configure the deployed API URL in either feature page. Both AI Mentor and Resume Builder share that verified URL.
