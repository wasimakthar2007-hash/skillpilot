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
            const response = await fetch('/api/mentor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question })
            });
            const body = await response.text();
            let data = {};
            if (body.trim()) {
                try {
                    data = JSON.parse(body);
                } catch (parseError) {
                    throw new Error('The app server returned an invalid response. Please restart the server and try again.');
                }
            }
            if (!response.ok) throw new Error(data.error || 'The mentor could not answer right now.');
            if (typeof data.answer !== 'string' || !data.answer.trim()) {
                throw new Error('The app server returned an empty mentor response.');
            }
            showAnswer(data.answer);
            addToHistory(question, data.answer);
            status.textContent = '';
        } catch (error) {
            status.textContent = 'AI Mentor is unavailable right now. ' + error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Get professional guidance';
        }
    });

    renderHistory();
})();
