let currentCategory = '';
let currentQuestionIndex = 0;
let score = 0;
let currentQuestions = [];

const homeSection = document.getElementById('home-section');
const quizSection = document.getElementById('quiz-section');
const quizTitle = document.getElementById('quiz-title');
const questionContainer = document.getElementById('question-container');
const scoreBoard = document.getElementById('score-board');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedback = document.getElementById('feedback');
const feedbackText = document.getElementById('feedback-text');
const explanationText = document.getElementById('explanation-text');
const btnNext = document.getElementById('btn-next');
const loadingMsg = document.getElementById('loading-msg');

const navHome = document.getElementById('btn-home');
const navAptitude = document.getElementById('btn-aptitude');
const navDsa = document.getElementById('btn-dsa');

if (navHome) navHome.addEventListener('click', goHome);
if (navAptitude) navAptitude.addEventListener('click', () => startCategory('aptitude'));
if (navDsa) navDsa.addEventListener('click', () => startCategory('dsa'));

function updateNav(activeCategory) {
    if (navHome) navHome.classList.remove('active');
    if (navAptitude) navAptitude.classList.remove('active');
    if (navDsa) navDsa.classList.remove('active');

    if (activeCategory === 'home' && navHome) navHome.classList.add('active');
    if (activeCategory === 'aptitude' && navAptitude) navAptitude.classList.add('active');
    if (activeCategory === 'dsa' && navDsa) navDsa.classList.add('active');
}

function goHome() {
    if (homeSection) homeSection.classList.add('active');
    if (quizSection) quizSection.classList.remove('active');
    updateNav('home');
    // Multi-page layout: navigate to home
    if (!homeSection) {
        window.location.href = 'index.html';
    }
}

function startCategory(category) {
    currentCategory = category;
    updateNav(category);
    if (homeSection) homeSection.classList.remove('active');
    if (quizSection) quizSection.classList.add('active');
    if (scoreBoard) scoreBoard.classList.add('hidden');
    if (questionContainer) questionContainer.classList.add('hidden');
    if (loadingMsg) loadingMsg.classList.remove('hidden');

    currentQuestionIndex = 0;
    score = 0;

    if (quizTitle) {
        quizTitle.textContent = category === 'dsa'
            ? 'DSA Training & Testing'
            : 'Aptitude Training & Testing';
    }

    const source = category === 'dsa'
        ? (window.QuestionBank && window.QuestionBank.dsa)
        : (window.QuestionBank && window.QuestionBank.aptitude);
    currentQuestions = Array.isArray(source) ? source.slice() : [];

    for (let i = currentQuestions.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        const question = currentQuestions[i];
        currentQuestions[i] = currentQuestions[randomIndex];
        currentQuestions[randomIndex] = question;
    }
    currentQuestions = currentQuestions.slice(0, 20);
    if (loadingMsg) loadingMsg.classList.add('hidden');
    if (questionContainer) questionContainer.classList.remove('hidden');
    if (currentQuestions.length) {
        showQuestion();
    } else if (questionText) {
        questionText.textContent = 'No questions are available in questions.js.';
    }
}

function showQuestion() {
    if (!feedback || !btnNext || !optionsContainer || !questionText) return;

    feedback.classList.add('hidden');
    feedback.classList.remove('correct-feedback', 'wrong-feedback');
    btnNext.classList.add('hidden');
    optionsContainer.innerHTML = '';

    const q = currentQuestions[currentQuestionIndex];
    questionText.textContent = 'Q' + (currentQuestionIndex + 1) + '. ' + q.question;

    q.options.forEach(function (opt, index) {
        if (!opt) return;
        const btn = document.createElement('button');
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
    const optionBtns = optionsContainer.children;

    for (let btn of optionBtns) {
        btn.disabled = true;
    }

    if (selectedIndex === q.answer) {
        optionBtns[selectedIndex].classList.add('correct');
        score++;
        feedbackText.textContent = 'Correct!';
        feedbackText.style.color = '#155724';
        feedback.classList.add('correct-feedback');
    } else {
        optionBtns[selectedIndex].classList.add('wrong');
        if (optionBtns[q.answer]) optionBtns[q.answer].classList.add('correct');
        feedbackText.textContent = 'Incorrect.';
        feedbackText.style.color = '#721c24';
        feedback.classList.add('wrong-feedback');
    }

    explanationText.textContent = 'Explanation: ' + q.explanation;
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
    if (questionContainer) questionContainer.classList.add('hidden');
    if (scoreBoard) scoreBoard.classList.remove('hidden');
    const scoreEl = document.getElementById('score');
    const totalEl = document.getElementById('total-questions');
    if (scoreEl) scoreEl.textContent = score;
    if (totalEl) totalEl.textContent = currentQuestions.length;
}

// Only auto-go home on the legacy SPA that has a home section
if (homeSection) {
    goHome();
}
