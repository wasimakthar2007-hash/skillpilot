(function () {
    var currentQuestionIndex = 0;
    var score = 0;
    var currentQuestions = [];
    var currentLevel = 1;
    var sessionNumber = 1;

    var emptyBank = document.getElementById('empty-bank');
    var loadingMsg = document.getElementById('loading-msg');
    var scoreBoard = document.getElementById('score-board');
    var questionContainer = document.getElementById('question-container');
    var questionText = document.getElementById('question-text');
    var questionProgress = document.getElementById('question-progress');
    var optionsContainer = document.getElementById('options-container');
    var feedback = document.getElementById('feedback');
    var feedbackText = document.getElementById('feedback-text');
    var explanationText = document.getElementById('explanation-text');
    var btnNext = document.getElementById('btn-next');
    var btnRetry = document.getElementById('btn-retry');
    var btnNextLevel = document.getElementById('btn-next-level');
    var courseProgress = document.getElementById('course-progress');
    var levelLabel = document.getElementById('level-label');
    var sessionLabel = document.getElementById('session-label');
    var progressBar = document.getElementById('progress-bar');

    function renderProgress(progress) {
        var completed = progress.completedLevels.length;
        levelLabel.textContent = currentLevel > 100 ? 'Course complete' : 'Level ' + currentLevel + ' of 100';
        sessionLabel.textContent = completed + ' level' + (completed === 1 ? '' : 's') + ' completed';
        progressBar.style.width = Math.round((completed / 100) * 100) + '%';
        courseProgress.classList.remove('hidden');
    }

    function showQuestion() {
        var q = currentQuestions[currentQuestionIndex];
        if (!q) return;
        feedback.classList.add('hidden');
        feedback.classList.remove('correct-feedback', 'wrong-feedback');
        btnNext.classList.add('hidden');
        optionsContainer.innerHTML = '';
        questionProgress.textContent = 'Level ' + currentLevel + ' · Question ' + (currentQuestionIndex + 1) + ' of ' + currentQuestions.length + ' · ' + q.topic;
        questionText.textContent = q.question;

        q.options.forEach(function (option, index) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'option-btn';
            button.textContent = option;
            button.addEventListener('click', function () { selectOption(index); });
            optionsContainer.appendChild(button);
        });
    }

    function selectOption(selectedIndex) {
        var q = currentQuestions[currentQuestionIndex];
        var buttons = Array.prototype.slice.call(optionsContainer.children);
        buttons.forEach(function (button) { button.disabled = true; });
        if (selectedIndex === q.answer) {
            buttons[selectedIndex].classList.add('correct');
            score++;
            feedbackText.textContent = 'Correct!';
            feedback.classList.add('correct-feedback');
        } else {
            buttons[selectedIndex].classList.add('wrong');
            buttons[q.answer].classList.add('correct');
            feedbackText.textContent = 'Incorrect.';
            feedback.classList.add('wrong-feedback');
        }
        explanationText.textContent = 'Explanation: ' + (q.explanation || 'No explanation provided.');
        feedback.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        QuestionStore.saveSessionState(currentLevel, currentQuestionIndex + 1, score);
    }

    function nextQuestion() {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            showQuestion();
        } else {
            showScore();
        }
    }

    function showScore() {
        questionContainer.classList.add('hidden');
        scoreBoard.classList.remove('hidden');
        document.getElementById('score').textContent = score;
        document.getElementById('total-questions').textContent = currentQuestions.length;
        QuestionStore.saveScore({
            score: score,
            total: currentQuestions.length,
            level: currentLevel,
            sessionNumber: sessionNumber,
            questionStart: (currentLevel - 1) * 10
        });
        renderProgress(QuestionStore.getProgress());
        document.getElementById('quiz-title').textContent =
            currentLevel < 100 ? 'Level ' + currentLevel + ' complete!' : 'Course complete!';
        if (currentLevel < 100) {
            btnNextLevel.textContent = 'Continue to Level ' + (currentLevel + 1);
            btnNextLevel.classList.remove('hidden');
        } else {
            btnNextLevel.classList.add('hidden');
        }
    }

    async function startQuiz() {
        emptyBank.classList.add('hidden');
        scoreBoard.classList.add('hidden');
        btnNextLevel.classList.add('hidden');
        questionContainer.classList.add('hidden');
        loadingMsg.classList.remove('hidden');
        try {
            var progress = QuestionStore.getProgress();
            currentLevel = Math.max(1, Math.min(progress.currentLevel, 100));
            sessionNumber = progress.completedSessions + 1;
            currentQuestionIndex = currentLevel === progress.currentLevel ? progress.currentQuestionIndex : 0;
            score = currentLevel === progress.currentLevel ? progress.currentScore : 0;
            renderProgress(progress);
            currentQuestions = await QuestionStore.getLevelQuestions(currentLevel);
            if (!currentQuestions.length) throw new Error('No questions are available for this level.');
            currentQuestionIndex = Math.min(currentQuestionIndex, currentQuestions.length - 1);
            loadingMsg.classList.add('hidden');
            questionContainer.classList.remove('hidden');
            showQuestion();
        } catch (error) {
            loadingMsg.classList.add('hidden');
            emptyBank.classList.remove('hidden');
            emptyBank.innerHTML = '<p>Could not load questions.</p><p>' +
                (error && error.message ? error.message : String(error)) +
                '</p><p>Make sure the page is opened through the local server.</p>';
        }
    }

    btnNext.addEventListener('click', nextQuestion);
    btnRetry.addEventListener('click', startQuiz);
    btnNextLevel.addEventListener('click', startQuiz);
    startQuiz();
})();
