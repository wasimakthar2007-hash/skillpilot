/**
 * Question bank and progress storage for the aptitude course.
 *
 * The bank is fetched once from data/questions.json and progress is kept per
 * signed-in user so a learner can safely resume on the same device.
 */
(function (global) {
    var BANK_URL = 'data/questions.json';
    var COMPANY_BANK_URL = 'data/company-practice-questions.json';
    var SCORES_KEY = 'pt_aptitude_scores';
    var PROGRESS_PREFIX = 'pt_aptitude_progress:';
    var bankPromise = null;

    function userId() {
        var session = global.PTAuth && global.PTAuth.getSession ? global.PTAuth.getSession() : null;
        return session && session.userId ? session.userId : 'guest';
    }

    function progressKey() {
        return PROGRESS_PREFIX + userId();
    }

    function readJson(key, fallback) {
        try {
            var value = JSON.parse(localStorage.getItem(key) || 'null');
            return value === null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function normalizeBank(data) {
        if (!data || !Array.isArray(data.questions) || !data.questions.length) {
            throw new Error('The aptitude question bank is empty.');
        }
        return data;
    }

    function expandCompanyBank(data) {
        var companies = ['TCS', 'Infosys', 'Google', 'OpenAI', 'Zoho'];
        var topics = ['Logical Reasoning', 'Blood Relations', 'Coding-Decoding', 'Number Series', 'Quantitative Aptitude'];
        var questions = data.questions.slice();
        var nextId = 1;

        questions.forEach(function (question) {
            var match = String(question.id || '').match(/^company-(\d+)$/);
            if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
        });

        companies.forEach(function (company) {
            topics.forEach(function (topic) {
                var exists = questions.some(function (question) {
                    return question.company === company && question.topic === topic;
                });
                if (exists) return;
                var source = questions.find(function (question) {
                    return question.topic === topic;
                }) || questions[0];
                questions.push(Object.assign({}, source, {
                    id: 'company-' + nextId++,
                    company: company,
                    topic: topic,
                    source: data.source
                }));
            });
        });

        return Object.assign({}, data, { questions: questions });
    }

    function loadBank() {
        if (!bankPromise) {
            bankPromise = Promise.all([BANK_URL, COMPANY_BANK_URL].map(function (url) {
                return fetch(url, { cache: 'no-store' })
                    .then(function (response) {
                        if (!response.ok) throw new Error('Could not load ' + url + '.');
                        return response.json();
                    });
            })).then(function (banks) {
                var mainBank = normalizeBank(banks[0]);
                var companyBank = expandCompanyBank(banks[1]);
                if (!companyBank || !Array.isArray(companyBank.questions)) {
                    throw new Error('The company practice question bank is empty.');
                }
                return {
                    totalLevels: mainBank.totalLevels,
                    questionsPerLevel: mainBank.questionsPerLevel,
                    questions: mainBank.questions.concat(companyBank.questions.map(function (question) {
                        return Object.assign({}, question, { source: companyBank.source });
                    }))
                };
                });
        }
        return bankPromise;
    }

    function copyQuestion(question) {
        return {
            id: question.id,
            level: question.level,
            topic: question.topic,
            difficulty: question.difficulty,
            question: question.question,
            options: question.options.slice(),
            answer: question.answer,
            explanation: question.explanation,
            company: question.company || '',
            source: question.source || ''
        };
    }

    function getProgress() {
        var progress = readJson(progressKey(), null);
        if (!progress) {
            // Migrate the original single-user progress record once.
            progress = userId() === 'guest' ? readJson('pt_aptitude_progress', null) : null;
        }
        progress = progress || {};
        return {
            currentLevel: Number.isInteger(progress.currentLevel) ? progress.currentLevel : 1,
            currentQuestionIndex: Number.isInteger(progress.currentQuestionIndex) ? progress.currentQuestionIndex : 0,
            currentScore: Number.isInteger(progress.currentScore) ? progress.currentScore : 0,
            completedLevels: Array.isArray(progress.completedLevels) ? progress.completedLevels : [],
            completedSessions: Number.isInteger(progress.completedSessions)
                ? progress.completedSessions
                : (Array.isArray(progress.completedLevels) ? progress.completedLevels.length : 0),
            nextIndex: Number.isInteger(progress.nextIndex) ? progress.nextIndex : 0
        };
    }

    function saveProgress(progress) {
        writeJson(progressKey(), progress);
        return progress;
    }

    function getScores() {
        var all = readJson(SCORES_KEY, []);
        return Array.isArray(all) ? all.filter(function (item) {
            return item.userId === userId() || (!item.userId && userId() === 'guest');
        }) : [];
    }

    function saveSessionState(level, questionIndex, score) {
        var progress = getProgress();
        progress.currentLevel = level;
        progress.currentQuestionIndex = questionIndex;
        progress.currentScore = score;
        return saveProgress(progress);
    }

    function saveScore(entry) {
        var allScores = readJson(SCORES_KEY, []);
        if (!Array.isArray(allScores)) allScores = [];
        allScores.unshift({
            userId: userId(),
            score: entry.score,
            total: entry.total,
            level: entry.level,
            sessionNumber: entry.sessionNumber,
            questionStart: entry.questionStart,
            date: new Date().toISOString()
        });
        writeJson(SCORES_KEY, allScores.slice(0, 500));

        var progress = getProgress();
        if (progress.completedLevels.indexOf(entry.level) === -1) {
            progress.completedLevels.push(entry.level);
            progress.completedLevels.sort(function (a, b) { return a - b; });
        }
        progress.completedSessions = progress.completedLevels.length;
        progress.currentLevel = Math.min(entry.level + 1, 101);
        progress.currentQuestionIndex = 0;
        progress.currentScore = 0;
        progress.nextIndex = Math.min(progress.completedSessions * 10, 1000);
        saveProgress(progress);
        return getScores();
    }

    var api = {
        loadBank: loadBank,
        getCount: function () {
            return loadBank().then(function (bank) { return bank.questions.length; });
        },
        getMeta: function () {
            return {
                total: 1000,
                totalLevels: 100,
                questionsPerLevel: 10,
                source: 'aptitude_questions_compact (1).pdf'
            };
        },
        getLevelQuestions: function (level) {
            return loadBank().then(function (bank) {
                var target = Math.max(1, Math.min(Number(level) || 1, bank.totalLevels));
                return bank.questions
                    .filter(function (question) { return question.level === target; })
                    .slice(0, bank.questionsPerLevel)
                    .map(copyQuestion);
            });
        },
        getPracticeQuestions: function (topic, company, limit) {
            return loadBank().then(function (bank) {
                var filtered = bank.questions.filter(function (question) {
                    return (!topic || question.topic === topic) &&
                        (!company || question.company === company);
                });
                return filtered.slice(0, limit || 10).map(copyQuestion);
            });
        },
        getSequentialQuestions: function (offset, limit) {
            return loadBank().then(function (bank) {
                return bank.questions.slice(offset, offset + limit).map(copyQuestion);
            });
        },
        getProgress: getProgress,
        saveSessionState: saveSessionState,
        saveScore: saveScore,
        getScores: getScores,
        getSettings: function () {
            return { questionsPerSession: 10, shuffle: false };
        },
        getBundledCount: function () { return 0; }
    };

    global.QuestionStore = api;
})(window);
