(function () {
    const session = PTAuth.getSession();
    const list = document.getElementById('job-list');
    const message = document.getElementById('jobs-message');
    const search = document.getElementById('job-search');
    const locationFilter = document.getElementById('job-location');
    const experienceFilter = document.getElementById('job-experience');
    const currentRole = document.getElementById('current-role');
    const count = document.getElementById('job-count');
    let jobs = [];

    currentRole.textContent = 'Current role: ' + (session.currentRole || session.role || 'Learner');

    function render() {
        const query = search.value.trim().toLowerCase();
        const location = locationFilter.value;
        const experience = experienceFilter.value;
        const filtered = jobs.filter(function (job) {
            const haystack = [job.title, job.company, job.description, job.skills.join(' ')].join(' ').toLowerCase();
            return (!query || haystack.indexOf(query) !== -1) &&
                (!location || job.location === location) &&
                (!experience || job.experience === experience);
        });
        count.textContent = filtered.length + ' opening' + (filtered.length === 1 ? '' : 's');
        list.innerHTML = filtered.map(function (job) {
            return '<article class="job-card"><div><span class="job-company">' + job.company + '</span>' +
                '<h3>' + job.title + '</h3><p>' + job.description + '</p>' +
                '<div class="job-meta"><span>' + job.location + '</span><span>' + job.experience + '</span><span>' + job.type + '</span></div>' +
                '<div class="job-skills">' + job.skills.map(function (skill) { return '<span>' + skill + '</span>'; }).join('') + '</div></div>' +
                '<a class="primary-btn" href="' + job.applyUrl + '" target="_blank" rel="noopener noreferrer">Apply now</a></article>';
        }).join('') || '<p class="hero-text">No openings match these filters.</p>';
    }

    fetch('/api/jobs')
        .then(function (response) {
            if (!response.ok) throw new Error('Job vacancies are temporarily unavailable.');
            return response.json();
        })
        .then(function (data) {
            jobs = data.jobs || [];
            Array.from(new Set(jobs.map(function (job) { return job.location; }))).sort().forEach(function (value) {
                locationFilter.insertAdjacentHTML('beforeend', '<option value="' + value + '">' + value + '</option>');
            });
            Array.from(new Set(jobs.map(function (job) { return job.experience; }))).sort().forEach(function (value) {
                experienceFilter.insertAdjacentHTML('beforeend', '<option value="' + value + '">' + value + '</option>');
            });
            render();
        })
        .catch(function (error) { message.textContent = error.message; });

    [search, locationFilter, experienceFilter].forEach(function (control) {
        control.addEventListener('input', render);
        control.addEventListener('change', render);
    });
})();
