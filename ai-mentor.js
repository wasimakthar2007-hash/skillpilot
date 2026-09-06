(function () {
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
            if (/^(important|note|remember|key point)\s*:/i.test(safeLine)) {
                return '<p class="answer-important"><strong>' + safeLine.replace(/^([^:]+):/i, '$1:') + '</strong></p>';
            }
            if (/^[-*]\s+/.test(safeLine)) {
                return '<p class="answer-bullet">' + safeLine.replace(/^[-*]\s+/, '') + '</p>';
            }
            safeLine = safeLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            return '<p>' + safeLine + '</p>';
        }).join('');
    }

    const form = document.getElementById('mentor-form');
    const status = document.getElementById('mentor-status');
    const answer = document.getElementById('mentor-answer');
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const question = document.getElementById('mentor-question').value.trim();
        if (question.length < 5) return;
        status.textContent = 'Thinking...';
        answer.classList.add('hidden');
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
            answer.innerHTML = '<div class="answer-heading"><span>AI Mentor</span><small>Clear explanation</small></div>' +
                '<div class="answer-content">' + formatAnswer(data.answer) + '</div>';
            answer.classList.remove('hidden');
            status.textContent = '';
        } catch (error) {
            status.textContent = 'Connect the app server to use AI Mentor. ' + error.message;
        }
    });
})();
