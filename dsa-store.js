(function (global) {
    var BANK_URL = 'data/dsa-questions.json';
    var PROGRESS_KEY = 'pt_dsa_progress:';
    var SCORE_KEY = 'pt_dsa_scores';
    var TESTER_SCORE_KEY = 'pt_dsa_tester_scores';
    var bankPromise;

    function userId() {
        var session = global.PTAuth && global.PTAuth.getSession ? global.PTAuth.getSession() : null;
        return session && session.userId ? session.userId : 'guest';
    }

    function read(key, fallback) {
        try {
            var value = JSON.parse(localStorage.getItem(key) || 'null');
            return value === null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function loadBank() {
        if (!bankPromise) {
            bankPromise = fetch(BANK_URL, { cache: 'no-store' }).then(function (response) {
                if (!response.ok) throw new Error('Could not load ' + BANK_URL + '.');
                return response.json();
            }).then(function (bank) {
                if (!bank || !Array.isArray(bank.questions) || bank.questions.length < 1000) {
                    throw new Error('The DSA question bank is incomplete.');
                }
                return bank;
            });
        }
        return bankPromise;
    }

    function getProgress() {
        var progress = read(PROGRESS_KEY + userId(), {});
        return {
            currentLevel: Number.isInteger(progress.currentLevel) ? progress.currentLevel : 1,
            currentQuestionIndex: Number.isInteger(progress.currentQuestionIndex) ? progress.currentQuestionIndex : 0,
            completedLevels: Array.isArray(progress.completedLevels) ? progress.completedLevels : [],
            completedSessions: Number.isInteger(progress.completedSessions) ? progress.completedSessions : 0,
            currentUnderstood: Number.isInteger(progress.currentUnderstood) ? progress.currentUnderstood : 0
        };
    }

    function saveState(level, questionIndex, understood) {
        var progress = getProgress();
        progress.currentLevel = level;
        progress.currentQuestionIndex = questionIndex;
        progress.currentUnderstood = understood;
        write(PROGRESS_KEY + userId(), progress);
        return progress;
    }

    function completeLevel(level, understood) {
        var progress = getProgress();
        if (progress.completedLevels.indexOf(level) === -1) progress.completedLevels.push(level);
        progress.completedLevels.sort(function (a, b) { return a - b; });
        progress.completedSessions = progress.completedLevels.length;
        progress.currentLevel = Math.min(level + 1, 101);
        progress.currentQuestionIndex = 0;
        progress.currentUnderstood = 0;
        write(PROGRESS_KEY + userId(), progress);
        var scores = read(SCORE_KEY, []);
        if (!Array.isArray(scores)) scores = [];
        scores.unshift({ userId: userId(), level: level, understood: understood, total: 10, date: new Date().toISOString() });
        write(SCORE_KEY, scores.slice(0, 500));
        return progress;
    }

    global.DsaStore = {
        loadBank: loadBank,
        getLevelQuestions: function (level) {
            return loadBank().then(function (bank) {
                return bank.questions.filter(function (question) {
                    return question.level === Math.max(1, Math.min(Number(level) || 1, 100));
                });
            });
        },
        getProgress: getProgress,
        saveState: saveState,
        completeLevel: completeLevel,
        saveTesterResult: function (level, score) {
            var scores = read(TESTER_SCORE_KEY, []);
            if (!Array.isArray(scores)) scores = [];
            scores.unshift({ userId: userId(), level: level, score: score, total: 10, date: new Date().toISOString() });
            write(TESTER_SCORE_KEY, scores.slice(0, 500));
        },
        getScores: function () {
            return read(SCORE_KEY, []).filter(function (item) { return item.userId === userId(); });
        }
    };
})(window);
