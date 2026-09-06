/**
 * Injects a consistent header/nav on every page.
 * Set data-page on <body>: home | aptitude | career | admin | dsa | mentor | resume | jobs
 */
(function () {
    if (window.PTAuth && !PTAuth.guard()) return;
    if (!document.querySelector('link[rel="manifest"]')) {
        const manifest = document.createElement('link');
        manifest.rel = 'manifest';
        manifest.href = 'manifest.webmanifest';
        document.head.appendChild(manifest);
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
    }
    const page = document.body.getAttribute('data-page') || 'home';

    const session = window.PTAuth ? PTAuth.getSession() : null;
    const links = page === 'home' ? [] : [
        { id: 'home', href: 'index.html', label: 'Home' },
        { id: 'aptitude', href: 'aptitude.html', label: 'Aptitude' },
        { id: 'career', href: 'career-resources.html', label: 'Career Resources' },
        { id: 'mentor', href: 'ai-mentor.html', label: 'AI Mentor' },
        { id: 'resume', href: 'resume-builder.html', label: 'Resume Builder' },
        { id: 'jobs', href: 'jobs.html', label: 'Jobs' }
    ];
    if (session && session.role === 'admin') {
        links.push({ id: 'admin', href: 'admin.html', label: 'Admin' });
    }

    const navHtml = links
        .map(function (link) {
            const active = link.id === page ? ' active' : '';
            return '<a href="' + link.href + '" class="nav-link' + active + '">' + link.label + '</a>';
        })
        .join('');

    const header = document.createElement('header');
    header.innerHTML =
        '<div class="header-start"><button type="button" class="back-btn" id="back-btn" aria-label="Go back">←</button>' +
        '<h1><a href="index.html" class="brand-link"><img src="assets/skill-pilot-logo.png" alt="" class="brand-logo"> <span>Skill Pilot</span></a></h1></div>' +
        '<nav>' + navHtml +
        '<a href="profile.html" class="nav-link">Profile</a>' +
        '<button type="button" class="nav-link install-app-btn hidden" id="install-app-btn">Install app</button></nav>';

    document.body.insertBefore(header, document.body.firstChild);
    let deferredInstallPrompt = null;
    const installButton = document.getElementById('install-app-btn');
    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        deferredInstallPrompt = event;
        installButton.classList.remove('hidden');
    });
    installButton.addEventListener('click', async function () {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        installButton.classList.add('hidden');
    });
    window.addEventListener('appinstalled', function () {
        installButton.classList.add('hidden');
    });
    document.getElementById('back-btn').addEventListener('click', function () {
        if (window.history.length > 1) window.history.back();
        else window.location.href = 'index.html';
    });
    if (!document.querySelector('.site-footer')) {
        const footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.innerHTML = '<span>Skill Pilot</span><span>Prepared by BSc AI Student, New College</span>';
        document.body.appendChild(footer);
    }

    let savedResources = [];
    try {
        savedResources = JSON.parse(localStorage.getItem('pt_admin_links') || '[]');
    } catch (error) {
        savedResources = [];
    }
    const pageResources = savedResources
        .filter(function (resource) {
            return resource.page === page || resource.page === page + '.html' ||
                (page === 'career' && resource.page === 'career-resources.html');
        });
    if (pageResources.length) {
        const resourcePanel = document.createElement('aside');
        resourcePanel.className = 'global-resources admin-resource-highlight';
        const heading = document.createElement('strong');
        heading.textContent = 'Administrator resources';
        resourcePanel.appendChild(heading);
        pageResources.slice(0, 6).forEach(function (resource) {
            const link = document.createElement('a');
            link.href = resource.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = (resource.topic || 'Resource') + ' · ' + resource.title +
                ' (' + (resource.type || 'Link') + ')';
            resourcePanel.appendChild(link);
        });
        const main = document.querySelector('main');
        if (main) {
            main.appendChild(resourcePanel);
        } else {
            document.body.appendChild(resourcePanel);
        }
    }
})();
