(function () {
    const form = document.getElementById('mentor-form');
    const status = document.getElementById('mentor-status');
    const answer = document.getElementById('mentor-answer');
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const question = document.getElementById('mentor-question').value.trim();
        const context = document.getElementById('mentor-context').value.trim();
        if (question.length < 5) return;
        status.textContent = 'Thinking...';
        answer.classList.add('hidden');
        try {
            const response = await fetch('/api/mentor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question, context: context })
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
            answer.textContent = data.answer;
            answer.classList.remove('hidden');
            status.textContent = '';
        } catch (error) {
            status.textContent = 'Connect the app server to use AI Mentor. ' + error.message;
        }
    });
})();
