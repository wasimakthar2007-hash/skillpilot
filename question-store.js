/**
 * IndexedDB helper for aptitude questions + localStorage settings/scores.
 */
const QuestionStore = (function () {
    const DB_NAME = 'placement_trainer_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'questions';
    const META_KEY = 'pt_question_bank_meta';
    const SETTINGS_KEY = 'pt_quiz_settings';
    const SCORES_KEY = 'pt_aptitude_scores';

    function openDb() {
        return new Promise(function (resolve, reject) {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = function () {
                resolve(request.result);
            };

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    async function clearQuestions() {
        const db = await openDb();
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = function () {
                localStorage.removeItem(META_KEY);
                resolve();
            };
            tx.onerror = function () {
                reject(tx.error);
            };
        });
    }

    /**
     * Batch-write questions. Each item: { question, options, answer, explanation }
     */
    async function saveQuestions(questions, meta) {
        const db = await openDb();
        const BATCH = 500;

        for (let i = 0; i < questions.length; i += BATCH) {
            const slice = questions.slice(i, i + BATCH);
            await new Promise(function (resolve, reject) {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                slice.forEach(function (q) {
                    store.add(q);
                });
                tx.oncomplete = resolve;
                tx.onerror = function () {
                    reject(tx.error);
                };
            });
        }

        const info = Object.assign(
            {
                total: questions.length,
                lastParsed: new Date().toISOString(),
                source: 'jsdsa_100000_questions_answers_compact.pdf'
            },
            meta || {}
        );
        localStorage.setItem(META_KEY, JSON.stringify(info));
        return info;
    }

    async function getCount() {
        const db = await openDb();
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).count();
            req.onsuccess = function () {
                const bundled = getBundledQuestions();
                resolve(req.result || bundled.length);
            };
            req.onerror = function () {
                reject(req.error);
            };
        });
    }

    function getBundledQuestions() {
        if (!window.QuestionBank || !Array.isArray(window.QuestionBank.aptitude)) {
            return [];
        }
        return window.QuestionBank.aptitude;
    }

    function getMeta() {
        try {
            return JSON.parse(localStorage.getItem(META_KEY) || 'null');
        } catch (e) {
            return null;
        }
    }

    /**
     * Fetch up to `limit` random questions without loading the entire bank into memory.
     * Uses reservoir sampling over a cursor when the bank is large.
     */
    async function getRandomQuestions(limit, shuffle) {
        const db = await openDb();
        const count = await getCount();
        const bundled = getBundledQuestions();
        const shouldShuffle = shuffle !== false;
        if (count === 0 && bundled.length === 0) return [];

        if (bundled.length > 0) {
            const source = bundled.map(function (question) {
                return {
                    question: question.question,
                    options: Array.isArray(question.options) ? question.options.slice() : [],
                    answer: question.answer,
                    explanation: question.explanation
                };
            });
            if (shouldShuffle) {
                for (let i = source.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    const tmp = source[i];
                    source[i] = source[j];
                    source[j] = tmp;
                }
            }
            return source.slice(0, Math.min(limit, source.length));
        }

        const take = Math.min(limit, count);
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const reservoir = [];
            let seen = 0;
            const cursorReq = store.openCursor();

            cursorReq.onsuccess = function (event) {
                const cursor = event.target.result;
                if (!cursor) {
                    if (shouldShuffle) {
                        for (let i = reservoir.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            const tmp = reservoir[i];
                            reservoir[i] = reservoir[j];
                            reservoir[j] = tmp;
                        }
                    }
                    resolve(reservoir.map(function (question) {
                        return {
                            question: question.question,
                            options: Array.isArray(question.options) ? question.options.slice() : [],
                            answer: question.answer,
                            explanation: question.explanation
                        };
                    }));
                    return;
                }

                seen++;
                if (reservoir.length < take) {
                    reservoir.push(cursor.value);
                } else {
                    const r = Math.floor(Math.random() * seen);
                    if (r < take) {
                        reservoir[r] = cursor.value;
                    }
                }
                cursor.continue();
            };

            cursorReq.onerror = function () {
                reject(cursorReq.error);
            };
        });
    }

    function getSettings() {
        const defaults = { questionsPerSession: 20, shuffle: true };
        try {
            return Object.assign(defaults, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
        } catch (e) {
            return defaults;
        }
    }

    function saveSettings(settings) {
        const current = getSettings();
        const next = Object.assign(current, settings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        return next;
    }

    function getScores() {
        try {
            return JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveScore(entry) {
        const scores = getScores();
        scores.unshift({
            score: entry.score,
            total: entry.total,
            date: new Date().toISOString()
        });
        localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 20)));
        return scores;
    }

    return {
        clearQuestions: clearQuestions,
        saveQuestions: saveQuestions,
        getCount: getCount,
        getMeta: getMeta,
        getRandomQuestions: getRandomQuestions,
        getSettings: getSettings,
        saveSettings: saveSettings,
        getScores: getScores,
        saveScore: saveScore,
        getBundledCount: function () {
            return getBundledQuestions().length;
        }
    };
})();
