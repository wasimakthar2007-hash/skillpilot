(function () {
    const form = document.getElementById('resume-form');
    const status = document.getElementById('resume-status');
    const result = document.getElementById('resume-result');
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
        try {
            const response = await fetch('/api/resume/analyze', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Resume analysis failed.');
            result.textContent = data.analysis;
            result.classList.remove('hidden');
            status.textContent = '';
        } catch (error) {
            status.textContent = 'Connect the app server to use Resume Builder. ' + error.message;
        }
    });
})();
