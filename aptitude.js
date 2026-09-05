(function () {
    let currentQuestionIndex = 0;
    let score = 0;
    let currentQuestions = [];

    const emptyBank = document.getElementById('empty-bank');
    const loadingMsg = document.getElementById('loading-msg');
    const scoreBoard = document.getElementById('score-board');
    const questionContainer = document.getElementById('question-container');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    const explanationText = document.getElementById('explanation-text');
    const btnNext = document.getElementById('btn-next');
    const btnRetry = document.getElementById('btn-retry');

    function showQuestion() {
        feedback.classList.add('hidden');
        feedback.classList.remove('correct-feedback', 'wrong-feedback');
        btnNext.classList.add('hidden');
        optionsContainer.innerHTML = '';

        const q = currentQuestions[currentQuestionIndex];
        questionText.textContent = 'Q' + (currentQuestionIndex + 1) + '. ' + q.question;

        q.options.forEach(function (opt, index) {
            if (!opt) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.classList.add('option-btn');
            btn.textContent = opt;
            btn.onclick = function () {
                selectOption(index);
            };
            optionsContainer.appendChild(btn);
        });
    }

    function selectOption(selectedIndex) {
        const q = currentQuestions[currentQuestionIndex];
        const optionBtns = Array.prototype.slice.call(optionsContainer.children);

        optionBtns.forEach(function (btn) {
            btn.disabled = true;
        });

        const indexByBtn = [];
        q.options.forEach(function (opt, idx) {
            if (opt) indexByBtn.push(idx);
        });

        const selectedBtnPos = indexByBtn.indexOf(selectedIndex);
        const answerBtnPos = indexByBtn.indexOf(q.answer);

        if (selectedIndex === q.answer) {
            if (selectedBtnPos !== -1) optionBtns[selectedBtnPos].classList.add('correct');
            score++;
            feedbackText.textContent = 'Correct!';
            feedbackText.style.color = '#155724';
            feedback.classList.add('correct-feedback');
        } else {
            if (selectedBtnPos !== -1) optionBtns[selectedBtnPos].classList.add('wrong');
            if (answerBtnPos !== -1) optionBtns[answerBtnPos].classList.add('correct');
            feedbackText.textContent = 'Incorrect.';
            feedbackText.style.color = '#721c24';
            feedback.classList.add('wrong-feedback');
        }

        explanationText.textContent =
            'Explanation: ' + (q.explanation || 'No explanation provided.');
        feedback.classList.remove('hidden');
        btnNext.classList.remove('hidden');
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
        QuestionStore.saveScore({ score: score, total: currentQuestions.length });
        sessionStorage.removeItem('pt_active_test');
    }

    async function startQuiz() {
        emptyBank.classList.add('hidden');
        scoreBoard.classList.add('hidden');
        questionContainer.classList.add('hidden');
        loadingMsg.classList.remove('hidden');

        currentQuestionIndex = 0;
        score = 0;
        currentQuestions = [];

        try {
            const count = await QuestionStore.getCount();
            if (count === 0) {
                loadingMsg.classList.add('hidden');
                emptyBank.classList.remove('hidden');
                return;
            }

            const settings = QuestionStore.getSettings();
            currentQuestions = await QuestionStore.getRandomQuestions(
                settings.questionsPerSession,
                settings.shuffle
            );
            sessionStorage.setItem('pt_active_test', JSON.stringify({
                token: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                category: 'Aptitude',
                questionCount: currentQuestions.length,
                startedAt: new Date().toISOString()
            }));

            loadingMsg.classList.add('hidden');

            if (!currentQuestions.length) {
                emptyBank.classList.remove('hidden');
                return;
            }

            questionContainer.classList.remove('hidden');
            showQuestion();
        } catch (err) {
            loadingMsg.classList.add('hidden');
            emptyBank.classList.remove('hidden');
            emptyBank.innerHTML =
                '<p>Could not load questions.</p><p>' +
                (err && err.message ? err.message : String(err)) +
                '</p><p><a href="index.html">Return home</a></p>';
        }
    }

    btnNext.addEventListener('click', nextQuestion);
    btnRetry.addEventListener('click', startQuiz);

    startQuiz();
})();
