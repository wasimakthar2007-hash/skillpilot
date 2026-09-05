(function () {
    if (!window.PTAuth || !PTAuth.isAdmin()) {
        window.location.replace('index.html');
        return;
    }

    const scoresBody = document.getElementById('scores-body');
    const shareForm = document.getElementById('share-form');
    const shareList = document.getElementById('share-list');
    const LINKS_KEY = 'pt_admin_links';

    function formatDate(iso) {
        if (!iso) return 'No activity';
        return new Date(iso).toLocaleString();
    }

    function getLinks() {
        try {
            return JSON.parse(localStorage.getItem(LINKS_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function renderLinks() {
        const links = getLinks();
        if (!links.length) {
            shareList.innerHTML = '<p class="progress-msg">No links generated yet.</p>';
            return;
        }
        shareList.innerHTML = links.map(function (link) {
            return '<div class="share-item"><div><strong>' + link.title +
                '</strong><small>' + link.pageLabel + ' · ' + link.topic + ' · ' +
                link.type + ' · ' + (link.clicks || 0) +
                ' clicks</small></div><button class="copy-btn" data-url="' +
                link.url + '" type="button">Copy</button><button class="delete-btn" data-id="' +
                link.id + '" type="button" aria-label="Delete ' + link.title + '">Delete</button></div>';
        }).join('');
        shareList.querySelectorAll('.copy-btn').forEach(function (button) {
            button.addEventListener('click', async function () {
                await navigator.clipboard.writeText(button.dataset.url);
                button.textContent = 'Copied';
                setTimeout(function () { button.textContent = 'Copy'; }, 1200);
            });
        });
        shareList.querySelectorAll('.delete-btn').forEach(function (button) {
            button.addEventListener('click', function () {
                if (!window.confirm('Delete this resource from all pages?')) return;
                const remaining = getLinks().filter(function (link) {
                    return link.id !== button.dataset.id;
                });
                localStorage.setItem(LINKS_KEY, JSON.stringify(remaining));
                renderLinks();
            });
        });
    }

    function renderScores() {
        const scores = QuestionStore.getScores();
        if (!scores.length) return;
        scoresBody.innerHTML = scores.map(function (row) {
            const percentage = row.total ? Math.round((row.score / row.total) * 100) : 0;
            return '<tr><td>' + formatDate(row.date) + '</td><td>' +
                row.score + '</td><td>' + row.total + '</td><td>' +
                percentage + '%</td></tr>';
        }).join('');
    }

    shareForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const title = document.getElementById('share-title').value.trim();
        const page = document.getElementById('share-page').value;
        const topic = document.getElementById('share-topic').value.trim();
        const type = document.getElementById('share-type').value;
        const url = document.getElementById('share-url').value.trim();
        if (!title || !topic || !url) return;
        const pageLabels = { aptitude: 'Aptitude', dsa: 'DSA', career: 'Career Resources', mentor: 'AI Mentor', resume: 'Resume Builder' };
        const links = getLinks();
        links.unshift({
            id: 'link-' + Date.now(),
            title: title,
            url: url,
            page: page,
            pageLabel: pageLabels[page],
            topic: topic,
            type: type,
            clicks: 0,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(LINKS_KEY, JSON.stringify(links.slice(0, 20)));
        shareForm.reset();
        renderLinks();
    });

    renderScores();
    renderLinks();
})();
