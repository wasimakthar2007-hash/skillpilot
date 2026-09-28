(function () {
    const historyKey = 'pt_ai_mentor_chat';
    let chatHistory = readHistory();

    function readHistory() {
        try {
            const value = JSON.parse(localStorage.getItem(historyKey) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            return [];
        }
    }

    function saveHistory() {
        localStorage.setItem(historyKey, JSON.stringify(chatHistory.slice(0, 40)));
    }

    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function formatAnswer(value) {
        return value.split(/\r?\n/).map(function (line) {
            var safeLine = escapeHtml(line.trim());
            if (!safeLine) return '<div class="answer-spacer"></div>';
            if (/^#{1,3}\s+/.test(safeLine)) {
                return '<h3>' + safeLine.replace(/^#{1,3}\s+/, '') + '</h3>';
            }
            if (/^(important|note|remember|key point|takeaway|common mistakes?)\s*:/i.test(safeLine)) {
                return '<p class="answer-important"><strong>' + safeLine.replace(/^([^:]+):/i, '$1:') + '</strong></p>';
            }
            if (/^(?:[-*•]|\d+[.)])\s+/.test(safeLine)) {
                return '<p class="answer-bullet">' + safeLine.replace(/^(?:[-*•]|\d+[.)])\s+/, '') + '</p>';
            }
            safeLine = safeLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            return '<p>' + safeLine + '</p>';
        }).join('');
    }

    const form = document.getElementById('mentor-form');
    const status = document.getElementById('mentor-status');
    const answer = document.getElementById('mentor-answer');
    const questionInput = document.getElementById('mentor-question');
    const historySearch = document.getElementById('mentor-history-search');
    const historyList = document.getElementById('mentor-history-list');
    const submitButton = form.querySelector('button[type="submit"]');

    const apiUrlInput = document.getElementById('mentor-api-url');
    const saveApiBtn = document.getElementById('save-api-url');
    const clearApiBtn = document.getElementById('clear-api-url');
    function getApiBaseUrl() {
        return window.SkillPilotApiUrl.get();
    }

    function updateApiInputFromStorage() {
        if (!apiUrlInput) return;
        apiUrlInput.value = window.SkillPilotApiUrl.get();
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
                status.textContent = 'Verified and saved the Skill Pilot API URL for AI Mentor and Resume Builder.';
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

    function renderHistory() {
        const query = (historySearch.value || '').trim().toLowerCase();
        const visible = chatHistory.filter(function (item) {
            return !query || item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query);
        });
        historyList.innerHTML = '';
        if (!visible.length) {
            historyList.innerHTML = '<p class="history-empty">' + (query ? 'No saved answers match your search.' : 'Your answered questions will appear here.') + '</p>';
            return;
        }
        visible.forEach(function (item) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'history-item';
            const date = new Date(item.createdAt);
            button.innerHTML = '<span class="history-item-question">' + escapeHtml(item.question) + '</span><span class="history-item-date">' + escapeHtml(date.toLocaleDateString()) + '</span>';
            button.addEventListener('click', function () {
                questionInput.value = item.question;
                showAnswer(item.answer);
                status.textContent = 'Loaded from saved chat.';
            });
            historyList.appendChild(button);
        });
    }

    function showAnswer(value) {
        answer.innerHTML = '<div class="answer-heading"><span>AI Mentor</span><small>Clear explanation</small></div>' +
            '<div class="answer-content">' + formatAnswer(value) + '</div>';
        answer.classList.remove('hidden');
    }

    function addToHistory(question, response) {
        chatHistory = chatHistory.filter(function (item) { return item.question !== question; });
        chatHistory.unshift({ question: question, answer: response, createdAt: new Date().toISOString() });
        saveHistory();
        renderHistory();
    }

    function getApiError(data, response) {
        const apiError = data && data.error;
        const message = typeof apiError === 'string'
            ? apiError
            : apiError && typeof apiError.message === 'string'
                ? apiError.message
                : '';
        if (response.status === 405) {
            return 'The configured API URL points to a server without the AI Mentor endpoint. Verify and save the deployed Skill Pilot API URL above.';
        }
        if (response.status === 404) {
            return 'The configured API URL points to a server without the AI Mentor endpoint. Deploy this repository’s server.js, then verify and save its base URL above.';
        }
        if (message) return message;
        return 'The AI server returned HTTP ' + response.status + ' without an error message.';
    }

    historySearch.addEventListener('input', renderHistory);
    document.getElementById('clear-mentor-history').addEventListener('click', function () {
        if (!chatHistory.length) return;
        chatHistory = [];
        saveHistory();
        renderHistory();
        status.textContent = 'Saved chat cleared.';
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const question = questionInput.value.trim();
        if (question.length < 5) return;
        status.textContent = 'Preparing professional guidance...';
        answer.classList.add('hidden');
        submitButton.disabled = true;
        submitButton.textContent = 'Preparing...';
        try {
            let apiBaseUrl = getApiBaseUrl();
            if (!apiBaseUrl) {
                if (window.location.hostname.endsWith('github.io')) {
                    throw new Error('The AI server URL is not configured. Set the SKILLPILOT_API_BASE_URL GitHub Actions variable and redeploy the site, or enter your API URL in the field above.');
                }
            }
            const url = apiBaseUrl ? apiBaseUrl + '/api/mentor' : '/api/mentor';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question })
            });
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
            if (!response.ok) throw new Error(getApiError(data, response));
            if (invalidJson) {
                throw new Error('The app server returned an invalid response. Please restart the server and try again.');
            }
            if (typeof data.answer !== 'string' || !data.answer.trim()) {
                throw new Error('The app server returned an empty mentor response.');
            }
            showAnswer(data.answer);
            addToHistory(question, data.answer);
            status.textContent = '';
        } catch (error) {
            const message = error instanceof TypeError
                ? 'Could not reach the AI server. Check its URL, availability, and CORS settings.'
                : error.message;
            status.textContent = 'AI Mentor is unavailable right now. ' + message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Get professional guidance';
        }
    });

    renderHistory();
})();
