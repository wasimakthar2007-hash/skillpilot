(function () {
    var level = 1;
    var index = 0;
    var understood = 0;
    var questions = [];
    var answered = false;
    var progressBar = document.getElementById('progress-bar');
    var levelLabel = document.getElementById('level-label');
    var sessionLabel = document.getElementById('session-label');
    var courseProgress = document.getElementById('course-progress');
    var loading = document.getElementById('loading-msg');
    var empty = document.getElementById('empty-bank');
    var container = document.getElementById('question-container');
    var scoreBoard = document.getElementById('score-board');
    var questionText = document.getElementById('question-text');
    var questionProgress = document.getElementById('question-progress');
    var feedback = document.getElementById('feedback');
    var explanation = document.getElementById('explanation-text');
    var showAnswer = document.getElementById('btn-show-answer');
    var selfCheck = document.getElementById('self-check');
    var understoodButton = document.getElementById('btn-understood');
    var reviewButton = document.getElementById('btn-review');
    var nextButton = document.getElementById('btn-next');
    var nextLevelButton = document.getElementById('btn-next-level');
    var testerContainer = document.getElementById('tester-container');
    var testerScoreBoard = document.getElementById('tester-score-board');
    var testerProgress = document.getElementById('tester-progress');
    var testerQuestion = document.getElementById('tester-question');
    var testerOptions = document.getElementById('tester-options');
    var testerFeedback = document.getElementById('tester-feedback');
    var testerResult = document.getElementById('tester-result');
    var testerExpected = document.getElementById('tester-expected');
    var submitTester = document.getElementById('btn-submit-tester');
    var nextTester = document.getElementById('btn-next-tester');
    var retryTester = document.getElementById('btn-retry-tester');
    var practiceMode = document.getElementById('btn-practice-mode');
    var testerMode = document.getElementById('btn-tester-mode');
    var testerIndex = 0;
    var testerScore = 0;
    var testerAnswered = false;
    var testerQuestionSet = [];

    function renderProgress(progress) {
        var completed = progress.completedLevels.length;
        levelLabel.textContent = level > 100 ? 'Course complete' : 'Level ' + level + ' of 100';
        sessionLabel.textContent = completed + ' level' + (completed === 1 ? '' : 's') + ' completed';
        progressBar.style.width = Math.round(completed) + '%';
        courseProgress.classList.remove('hidden');
    }

    function showQuestion() {
        var question = questions[index];
        answered = false;
        questionProgress.textContent = 'Level ' + level + ' · Question ' + (index + 1) + ' of 10 · ' + question.topic;
        questionText.textContent = question.question;
        explanation.textContent = question.answer;
        feedback.classList.add('hidden');
        selfCheck.classList.add('hidden');
        showAnswer.classList.remove('hidden');
        nextButton.classList.add('hidden');
    }

    function revealAnswer() {
        feedback.classList.remove('hidden');
        selfCheck.classList.remove('hidden');
        showAnswer.classList.add('hidden');
    }

    function markAnswer(value) {
        if (answered) return;
        answered = true;
        if (value) understood++;
        DsaStore.saveState(level, index + 1, understood);
        selfCheck.classList.add('hidden');
        nextButton.classList.remove('hidden');
    }

    function nextQuestion() {
        index++;
        if (index >= questions.length) {
            DsaStore.completeLevel(level, understood);
            document.getElementById('score').textContent = understood;
            document.getElementById('total-questions').textContent = questions.length;
            document.getElementById('dsa-completion-title').textContent =
                level < 100 ? 'Level ' + level + ' completed!' : 'Course completed!';
            container.classList.add('hidden');
            scoreBoard.classList.remove('hidden');
            nextLevelButton.textContent = level < 100
                ? 'Continue to Level ' + (level + 1)
                : 'Course completed';
            nextLevelButton.classList.toggle('hidden', level >= 100);
            renderProgress(DsaStore.getProgress());
            return;
        }

        showQuestion();
    }

    function showTesterQuestion() {
        var question = testerQuestionSet[testerIndex];
        testerAnswered = false;
        testerProgress.textContent = 'Level ' + level + ' tester · Question ' + (testerIndex + 1) + ' of 10 · ' + question.topic;
        testerQuestion.textContent = question.question;
        testerOptions.innerHTML = '';
        question.options.forEach(function (option, optionIndex) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'option-btn';
            button.textContent = option;
            button.addEventListener('click', function () {
                checkTesterAnswer(optionIndex);
            });
            testerOptions.appendChild(button);
        });
        testerFeedback.classList.add('hidden');
        submitTester.classList.add('hidden');
        nextTester.classList.add('hidden');
    }

    function startTester() {
        loading.classList.add('hidden');
        container.classList.add('hidden');
        scoreBoard.classList.add('hidden');
        testerScoreBoard.classList.add('hidden');
        testerContainer.classList.remove('hidden');
        testerIndex = 0;
        testerScore = 0;
        testerQuestionSet = questions.map(function (question) {
            var choices = question.options.map(function (text, optionIndex) {
                return { text: text, correct: optionIndex === question.answerIndex };
            });
            shuffle(choices);
            return {
                topic: question.topic,
                question: question.question,
                answer: question.answer,
                options: choices.map(function (choice) { return choice.text; }),
                answerIndex: choices.findIndex(function (choice) { return choice.correct; })
            };
        });
        shuffle(testerQuestionSet);
        showTesterQuestion();
    }

    function finishTester() {
        DsaStore.saveTesterResult(level, testerScore);
        testerContainer.classList.add('hidden');
        testerScoreBoard.classList.remove('hidden');
        document.getElementById('tester-score').textContent = testerScore;
    }

    function checkTesterAnswer(selectedIndex) {
        if (testerAnswered) return;
        testerAnswered = true;
        var question = testerQuestionSet[testerIndex];
        var buttons = Array.prototype.slice.call(testerOptions.children);
        buttons.forEach(function (button) { button.disabled = true; });
        if (selectedIndex === question.answerIndex) {
            testerScore++;
            buttons[selectedIndex].classList.add('correct');
            testerResult.textContent = 'Correct answer.';
        } else {
            buttons[selectedIndex].classList.add('wrong');
            buttons[question.answerIndex].classList.add('correct');
            testerResult.textContent = 'Incorrect answer.';
        }
        testerExpected.textContent = 'Explanation: ' + question.answer;
        testerFeedback.classList.remove('hidden');
        nextTester.classList.remove('hidden');
    }

    function nextTesterQuestion() {
        testerIndex++;
        if (testerIndex >= testerQuestionSet.length) {
            finishTester();
            return;
        }
        showTesterQuestion();
    }

    function shuffle(items) {
        for (var i = items.length - 1; i > 0; i--) {
            var randomIndex = Math.floor(Math.random() * (i + 1));
            var item = items[i];
            items[i] = items[randomIndex];
            items[randomIndex] = item;
        }
        return items;
    }

    async function start() {
        try {
            scoreBoard.classList.add('hidden');
            testerScoreBoard.classList.add('hidden');
            empty.classList.add('hidden');
            loading.classList.remove('hidden');
            var progress = DsaStore.getProgress();
            level = Math.max(1, Math.min(progress.currentLevel, 100));
            index = Math.min(progress.currentQuestionIndex, 9);
            understood = progress.currentUnderstood;
            renderProgress(progress);
            questions = await DsaStore.getLevelQuestions(level);
            if (questions.length !== 10) throw new Error('This level does not contain exactly 10 questions.');
            loading.classList.add('hidden');
            container.classList.remove('hidden');
            showQuestion();
        } catch (error) {
            loading.classList.add('hidden');
            empty.classList.remove('hidden');
            empty.textContent = 'Could not load DSA questions. ' + (error.message || error);
        }
    }

    showAnswer.addEventListener('click', revealAnswer);
    understoodButton.addEventListener('click', function () { markAnswer(true); });
    reviewButton.addEventListener('click', function () { markAnswer(false); });
    nextButton.addEventListener('click', nextQuestion);
    nextLevelButton.addEventListener('click', start);
    practiceMode.addEventListener('click', function () {
        testerContainer.classList.add('hidden');
        testerScoreBoard.classList.add('hidden');
        container.classList.remove('hidden');
        showQuestion();
    });
    testerMode.addEventListener('click', startTester);
    submitTester.addEventListener('click', checkTesterAnswer);
    nextTester.addEventListener('click', nextTesterQuestion);
    retryTester.addEventListener('click', startTester);
    start();
})();
