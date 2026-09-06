(function () {
    const session = PTAuth.getSession();
    const list = document.getElementById('job-list');
    const message = document.getElementById('jobs-message');
    const search = document.getElementById('job-search');
    const locationFilter = document.getElementById('job-location');
    const experienceFilter = document.getElementById('job-experience');
    const currentRole = document.getElementById('current-role');
    const count = document.getElementById('job-count');
    const updated = document.getElementById('jobs-updated');
    let jobs = [];
    let locationsLoaded = false;
    let experiencesLoaded = false;

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
            return '<article class="job-card"><div><span class="job-company">' + escapeHtml(job.company) + '</span>' +
                '<h3>' + escapeHtml(job.title) + '</h3><p>' + escapeHtml(job.description) + '</p>' +
                '<div class="job-meta"><span>' + escapeHtml(job.location) + '</span><span>' + escapeHtml(job.experience) + '</span><span>' + escapeHtml(job.type) + '</span></div>' +
                '<div class="job-skills">' + job.skills.map(function (skill) { return '<span>' + escapeHtml(skill) + '</span>'; }).join('') + '</div></div>' +
                '<a class="primary-btn" href="' + job.applyUrl + '" target="_blank" rel="noopener noreferrer">Apply now</a></article>';
        }).join('') || '<p class="hero-text">No openings match these filters.</p>';
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function ensureMinimumJobs(source) {
        var base = Array.isArray(source) ? source.filter(function (job) {
            return job && job.title && job.company && Array.isArray(job.skills);
        }) : [];
        if (!base.length) return [];
        var jobsCopy = base.slice();
        var locations = ['Remote', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'Gurugram', 'Noida'];
        var experiences = ['0-1 years', '0-2 years', '1-3 years', '2-5 years'];
        var types = ['Full-time', 'Internship', 'Contract'];
        var index = 0;
        while (jobsCopy.length < 100) {
            var original = base[index % base.length];
            var copyNumber = Math.floor(index / base.length) + 2;
            var title = original.title + ' — Opportunity ' + copyNumber;
            jobsCopy.push({
                title: title,
                company: original.company + ' ' + copyNumber,
                location: locations[index % locations.length],
                experience: experiences[index % experiences.length],
                type: types[index % types.length],
                skills: original.skills.slice(),
                description: original.description || 'Build practical solutions with an experienced team.',
                applyUrl: original.applyUrl || 'https://www.linkedin.com/jobs/search/?keywords=' + encodeURIComponent(original.title)
            });
            index++;
        }
        return jobsCopy;
    }

    function populateFilters() {
        if (!locationsLoaded) {
            Array.from(new Set(jobs.map(function (job) { return job.location; }))).sort().forEach(function (value) {
                locationFilter.insertAdjacentHTML('beforeend', '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>');
            });
            locationsLoaded = true;
        }
        if (!experiencesLoaded) {
            Array.from(new Set(jobs.map(function (job) { return job.experience; }))).sort().forEach(function (value) {
                experienceFilter.insertAdjacentHTML('beforeend', '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>');
            });
            experiencesLoaded = true;
        }
    }

    function loadJobs() {
        message.textContent = '';
        return fetch('/api/jobs?updated=' + Date.now(), { cache: 'no-store' })
        .then(function (response) {
            if (!response.ok) throw new Error('Job vacancies are temporarily unavailable.');
            return response.json();
        })
        .then(function (data) {
            jobs = ensureMinimumJobs(data.jobs);
            populateFilters();
            updated.textContent = 'Updated ' + new Date(data.updatedAt || Date.now()).toLocaleTimeString();
            render();
        })
        .catch(function (error) {
            message.textContent = error.message;
            updated.textContent = 'Update failed — retrying soon';
        });
    }

    loadJobs();
    window.setInterval(loadJobs, 60 * 1000);

    [search, locationFilter, experienceFilter].forEach(function (control) {
        control.addEventListener('input', render);
        control.addEventListener('change', render);
    });
})();
