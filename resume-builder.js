(function () {
    const form = document.getElementById('resume-form');
    const status = document.getElementById('resume-status');
    const result = document.getElementById('resume-result');
    const submitButton = form.querySelector('button[type="submit"]');

    const apiUrlInput = document.getElementById('resume-api-url');
    const saveApiBtn = document.getElementById('resume-save-api-url');
    const clearApiBtn = document.getElementById('resume-clear-api-url');
    function getApiBaseUrl() {
        return window.SkillPilotApiUrl.get();
    }

    function updateApiInputFromStorage() {
        if (!apiUrlInput) return;
        apiUrlInput.value = window.SkillPilotApiUrl.get();
    }

    function getApiError(data, response, invalidJson) {
        const apiError = data && data.error;
        const message = typeof apiError === 'string'
            ? apiError
            : apiError && typeof apiError.message === 'string'
                ? apiError.message
                : data && typeof data.message === 'string'
                    ? data.message
                    : '';
        if (response.status === 404 || response.status === 405) {
            return "The configured API URL points to a server without POST /api/resume/analyze. Deploy this repository's server.js, then verify and save the Skill Pilot API base URL above.";
        }
        if (message) return message;
        if (invalidJson) {
            return 'The app server returned an invalid response (HTTP ' + response.status + '). Check that the API URL points to the Skill Pilot server.';
        }
        return 'The app server returned HTTP ' + response.status + (response.statusText ? ' ' + response.statusText : '') + ' without an error message.';
    }

    if (apiUrlInput) {
        updateApiInputFromStorage();
        saveApiBtn.addEventListener('click', async function () {
            const val = (apiUrlInput.value || '').trim();
            saveApiBtn.disabled = true;
            status.textContent = 'Checking Skill Pilot API and Resume Builder route...';
            try {
                const verifiedUrl = await window.SkillPilotApiUrl.verify(val);
                window.SkillPilotApiUrl.save(verifiedUrl);
                apiUrlInput.value = verifiedUrl;
                status.textContent = 'Verified and saved the Skill Pilot API URL for Resume Builder and AI Mentor.';
            } catch (error) {
                status.textContent = error.message;
            } finally {
                saveApiBtn.disabled = false;
            }
        });
        clearApiBtn.addEventListener('click', function () {
            window.SkillPilotApiUrl.clear();
            updateApiInputFromStorage();
            status.textContent = 'Cleared API base URL override.';
        });
    }
    function formatAnalysis(value) {
        const lines = String(value || '').replace(/\r/g, '').split('\n');
        const html = [];
        let paragraph = [];
        function escapeHtml(text) {
            return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        function inline(text) {
            return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        }
        function flush() {
            if (paragraph.length) {
                html.push('<p>' + inline(paragraph.join(' ')) + '</p>');
                paragraph = [];
            }
        }
        lines.forEach(function (rawLine) {
            const line = rawLine.trim();
            if (!line) { flush(); return; }
            const heading = line.match(/^#{1,3}\s+(.+)$/) || line.match(/^([A-Z][A-Za-z0-9 &'/-]{3,55}):$/);
            if (heading) { flush(); html.push('<h3>' + inline(heading[1]) + '</h3>'); return; }
            const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
            if (bullet) { flush(); html.push('<p class="answer-bullet">' + inline(bullet[1]) + '</p>'); return; }
            if (/\b(important|priority|critical|required|must|next action|action plan)\b/i.test(line)) {
                flush(); html.push('<p class="answer-important">' + inline(line) + '</p>'); return;
            }
            paragraph.push(line);
        });
        flush();
        return html.join('') || '<p>No analysis was returned.</p>';
    }
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const file = document.getElementById('resume-file').files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            status.textContent = 'Please choose a file smaller than 5 MB.';
            return;
        }
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('targetRole', document.getElementById('resume-role').value.trim());
        status.textContent = 'Analyzing your resume...';
        result.classList.add('hidden');
        submitButton.disabled = true;
        submitButton.textContent = 'Analyzing...';
        try {
            const apiBaseUrl = getApiBaseUrl();
            if (!apiBaseUrl && window.location.hostname.endsWith('github.io')) {
                throw new Error('The Resume Builder server URL is not configured. Set the SKILLPILOT_API_BASE_URL GitHub Actions variable and redeploy the site, or enter your API URL in the field above.');
            }
            const url = apiBaseUrl ? apiBaseUrl + '/api/resume/analyze' : '/api/resume/analyze';
            const response = await fetch(url, { method: 'POST', body: formData });
            const body = await response.text();
            let data = {};
            let invalidJson = false;
            if (body.trim()) {
                try {
                    data = JSON.parse(body);
                } catch (parseError) {
                    invalidJson = true;
                }
            }
            if (!response.ok) throw new Error(getApiError(data, response, invalidJson));
            if (invalidJson) {
                throw new Error('The app server returned an invalid response. Check that the API URL points to the Skill Pilot server.');
            }
            if (typeof data.analysis !== 'string' || !data.analysis.trim()) {
                throw new Error('The app server returned an empty resume analysis.');
            }
            result.innerHTML = '<div class="answer-heading"><span>Resume analysis</span><small>Clear, actionable review</small></div><div class="answer-content">' + formatAnalysis(data.analysis) + '</div>';
            result.classList.remove('hidden');
            status.textContent = '';
        } catch (error) {
            const message = error instanceof TypeError
                ? 'Could not reach the app server. Check its URL, availability, and CORS settings.'
                : error.message;
            status.textContent = 'Connect the app server to use Resume Builder. ' + message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Analyze resume';
        }
    });
})();
