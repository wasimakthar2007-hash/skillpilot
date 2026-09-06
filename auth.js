(function () {
    const SESSION_KEY = 'pt_auth_session';
    const USERS_KEY = 'pt_users';
    const REMEMBER_KEY = 'pt_remember_me';

    function readUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    async function hashPassword(password, salt) {
        const value = salt + ':' + password;
        if (window.crypto && window.crypto.subtle) {
            const bytes = new TextEncoder().encode(value);
            const digest = await crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(digest)).map(function (byte) {
                return byte.toString(16).padStart(2, '0');
            }).join('');
        }
        return btoa(unescape(encodeURIComponent(value)));
    }

    async function register(username, email, password) {
        const users = readUsers();
        const normalized = username.trim().toLowerCase();
        if (users.some(function (user) { return user.username === normalized; })) {
            throw new Error('That username is already registered.');
        }
        const salt = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
        const user = {
            id: 'user-' + Date.now(),
            username: normalized,
            email: email.trim().toLowerCase(),
            role: 'user',
            salt: salt,
            hashed_password: await hashPassword(password, salt),
            created_at: new Date().toISOString()
        };
        users.push(user);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return createSession(user, false);
    }

    async function login(username, password, remember) {
        await ensureDemoAdmin();
        const normalized = username.trim().toLowerCase();
        const user = readUsers().find(function (entry) {
            return entry.username === normalized;
        });
        if (!user || (await hashPassword(password, user.salt)) !== user.hashed_password) {
            throw new Error('Invalid username or password.');
        }
        return createSession(user, remember);
    }

    async function ensureDemoAdmin() {
        const users = readUsers();
        if (users.some(function (user) { return user.username === 'admin'; })) {
            return;
        }
        users.push({
            id: 'admin-1',
            username: 'admin',
            email: 'admin@placement.local',
            role: 'admin',
            salt: 'placement-admin',
            hashed_password: await hashPassword('Admin@123', 'placement-admin'),
            created_at: new Date().toISOString()
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function createSession(user, remember) {
        const session = {
            token: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '.' + btoa(user.username),
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            expiresAt: Date.now() + (remember ? 30 : 2) * 24 * 60 * 60 * 1000
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
        return session;
    }

    function getSession() {
        const stored = [
            sessionStorage.getItem(SESSION_KEY),
            localStorage.getItem(SESSION_KEY)
        ];
        for (let i = 0; i < stored.length; i++) {
            if (!stored[i]) continue;
            try {
                const session = JSON.parse(stored[i]);
                if (session && session.userId && session.username && !session.expiresAt) {
                    session.expiresAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
                }
                if (session && session.userId && session.username &&
                    Number(session.expiresAt) >= Date.now()) {
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
                    return session;
                }
            } catch (error) {
                continue;
            }
        }
        logout();
        return null;
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(REMEMBER_KEY);
    }

    function guard() {
        if (!getSession()) {
            window.location.replace('login.html');
            return false;
        }
        return true;
    }

    function isAdmin() {
        const session = getSession();
        return !!session && session.role === 'admin';
    }

    window.PTAuth = {
        login: login,
        register: register,
        getSession: getSession,
        logout: logout,
        guard: guard,
        isAdmin: isAdmin,
        hashPassword: hashPassword,
        ensureDemoAdmin: ensureDemoAdmin
    };
})();
