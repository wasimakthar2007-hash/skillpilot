(function () {
    const OVERRIDE_KEY = 'pt_api_base_url_override';

    function parseBaseUrl(value) {
        let parsed;
        try {
            parsed = new URL(String(value || '').trim());
        } catch (error) {
            throw new Error('Enter the HTTPS base URL of the deployed Skill Pilot API.');
        }
        if (parsed.protocol !== 'https:' &&
            !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
            throw new Error('Use an HTTPS API URL. HTTP is allowed only for localhost testing.');
        }
        if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
            throw new Error('Enter only the API base URL, without a path such as /api/health.');
        }
        return parsed.origin;
    }

    async function readJson(response) {
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch (error) {
            throw new Error('The configured server returned a non-JSON response; it is not the Skill Pilot API.');
        }
    }

    async function verifyBaseUrl(value) {
        const baseUrl = parseBaseUrl(value);
        let healthResponse;
        try {
            healthResponse = await fetch(baseUrl + '/api/health');
        } catch (error) {
            throw new Error('Could not reach this API URL. Check its URL, availability, and CORS settings.');
        }
        const health = await readJson(healthResponse);
        if (!healthResponse.ok || health.ok !== true) {
            throw new Error('This URL is not the Skill Pilot API. Its GET /api/health check failed.');
        }
        if (health.aiConfigured === false) {
            throw new Error('The Skill Pilot API is deployed, but GOOGLE_AI_API_KEY is not configured on that server.');
        }

        let routeResponse;
        try {
            routeResponse = await fetch(baseUrl + '/api/resume/analyze', {
                method: 'POST',
                body: new FormData()
            });
        } catch (error) {
            throw new Error('Could not verify the Resume Builder route. Check the API URL and CORS settings.');
        }
        const routeResult = await readJson(routeResponse);
        if (routeResponse.status !== 400 ||
            typeof routeResult.error !== 'string' ||
            !/upload a resume file/i.test(routeResult.error)) {
            throw new Error('This server does not provide the Skill Pilot Resume Builder route. Deploy this repository’s server.js and check the API service URL.');
        }

        let mentorResponse;
        try {
            mentorResponse = await fetch(baseUrl + '/api/mentor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: 'x' })
            });
        } catch (error) {
            throw new Error('Could not verify the AI Mentor route. Check the API URL and CORS settings.');
        }
        const mentorResult = await readJson(mentorResponse);
        if (mentorResponse.status !== 400 ||
            typeof mentorResult.error !== 'string' ||
            !/between 5 and 4000 characters/i.test(mentorResult.error)) {
            throw new Error('This server does not provide the Skill Pilot AI Mentor route. Deploy this repository’s server.js and check the API service URL.');
        }
        return baseUrl;
    }

    window.SkillPilotApiUrl = {
        get: function () {
            const override = (localStorage.getItem(OVERRIDE_KEY) || '').trim().replace(/\/+$/, '');
            return override || String(window.SKILLPILOT_API_BASE_URL || '').replace(/\/+$/, '');
        },
        parse: parseBaseUrl,
        verify: verifyBaseUrl,
        save: function (baseUrl) {
            localStorage.setItem(OVERRIDE_KEY, baseUrl);
        },
        clear: function () {
            localStorage.removeItem(OVERRIDE_KEY);
        }
    };
})();
