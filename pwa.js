(function () {
    var manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = 'manifest.webmanifest';
    document.head.appendChild(manifest);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
    }

    var deferredPrompt = null;
    var button = document.getElementById('install-auth-btn');
    if (!button) return;
    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        deferredPrompt = event;
        button.classList.remove('hidden');
    });
    button.addEventListener('click', async function () {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        button.classList.add('hidden');
    });
    window.addEventListener('appinstalled', function () {
        button.classList.add('hidden');
    });
})();
