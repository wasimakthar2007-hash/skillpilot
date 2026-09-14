(function () {
    const form = document.getElementById('resume-form');
    const status = document.getElementById('resume-status');
    const result = document.getElementById('resume-result');
    const submitButton = form.querySelector('button[type="submit"]');
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
            const response = await fetch('/api/resume/analyze', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Resume analysis failed.');
            result.innerHTML = '<div class="answer-heading"><span>Resume analysis</span><small>Clear, actionable review</small></div><div class="answer-content">' + formatAnalysis(data.analysis) + '</div>';
            result.classList.remove('hidden');
            status.textContent = '';
        } catch (error) {
            status.textContent = 'Connect the app server to use Resume Builder. ' + error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Analyze resume';
        }
    });
})();
