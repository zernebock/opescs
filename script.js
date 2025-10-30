// Estado centralizado de la aplicación
const AppState = {
    currentQuestionIndex: 0,
    userAnswers: {},
    timerInterval: null,
    timeLeft: 0,
    questionHistory: {},
    selectedQuestions: [],
    currentSessionOrder: {},
    examConfig: {
        questionCount: 20,
        enableTimer: false,
        timerMinutes: 27,
        percentages: {
            new: 80,
            incorrect: 15,
            correct: 5
        }
    },
    examAttempts: 0,
    questions: [] // Se cargará desde el JSON o fallback
};

// Preguntas de ejemplo (fallback)
const fallbackQuestions = [
    {
        id: 1,
        question: "La metodología enfermera es un proceso tan común como el que empleamos para tomar cualquier de las múltiples decisiones que adoptamos cotidianamente los seres humanos. Según R. Alfaro, que nos habla sobre el método de solución de problemas, éste incluye:",
        options: [
            "A) Tres fases",
            "B) Cuatro fases",
            "C) Cinco fases",
            "D) Seis fases"
        ],
        correctAnswer: "C"
    },
    {
        id: 2,
        question: "Según Marjory Gordon la respuesta humana \"son comportamientos observados o afirmaciones verbales. Incluyen la forma en que una persona, familia o comunidad reacciona ante una situación o el significado personal que da a los acontecimientos\". Las respuestas humanas pueden ser:",
        options: [
            "A) Fisiológicas",
            "B) Psicológicas",
            "C) Sociales o espirituales",
            "D) Biológicas"
        ],
        correctAnswer: "D"
    },
    {
        id: 3,
        question: "Se habla del juicio clínico enfermero para designar los dictámenes que el profesional de enfermería debe emitir para resolver un problema con precisión y que implica a dos partes:",
        options: [
            "A) Juicio diagnóstico y juicio terapéutico",
            "B) Juicio diagnóstico y juicio ejecutivo",
            "C) Juicio primario y juicio secundario",
            "D) Ninguna respuesta es correcta"
        ],
        correctAnswer: "A"
    },
    {
        id: 4,
        question: "En relación a la Escala de coma de Glasgow, es CORRECTO que:",
        options: [
            "A) Valora la fuerza muscular, reflejos y movilización",
            "B) Valora la apertura de ojos, la respuesta motora y la respuesta verbal",
            "C) Su puntuación oscila de 0-10 puntos",
            "D) Es muy útil en la valoración del trauma medular"
        ],
        correctAnswer: "B"
    },
    {
        id: 5,
        question: "Según Virginia Henderson, el Metaparadigma comprende los siguientes elementos:",
        options: [
            "A) Salud",
            "B) Entorno",
            "C) Creencias",
            "D) Persona"
        ],
        correctAnswer: "C"
    }
];

// Mensajes de retroalimentación (actualizados para enfatizar la no penalización)
const failureMessages = [
    "No te preocupes, los errores no penalizan. Sigue practicando para mejorar tu puntuación.",
    "Esta pregunta requiere un poco más de estudio. Recuerda que las respuestas incorrectas no restan puntos.",
    "¡Vas por buen camino! Los fallos son parte del aprendizaje y no afectan negativamente tu puntuación.",
    "Cada error es una oportunidad para aprender. Las respuestas incorrectas no penalizan en el examen oficial.",
    "No te desanimes, con perseverancia mejorarás. Recuerda que solo las respuestas correctas suman puntos."
];

const unansweredMessages = [
    "Esta pregunta no fue respondida. Recuerda que las preguntas sin contestar no penalizan, pero contestar correctamente suma puntos.",
    "No dejar preguntas sin responder aumenta tus posibilidades de éxito. ¡Arriésgate si tienes alguna duda!",
    "En el examen real, las preguntas no contestadas no restan. Intenta responder todas las que puedas.",
    "Las preguntas sin responder son oportunidades perdidas para sumar puntos. ¡No penalizan, así que intenta contestarlas!",
    "Recuerda: las preguntas sin contestar no restan puntos. ¡Contesta todas las que puedas en el próximo intento!"
];

// Cache de elementos DOM
const DOM = {
    startScreen: document.getElementById('startScreen'),
    examContainer: document.getElementById('examContainer'),
    resultsContainer: document.getElementById('resultsContainer'),
    questionNumber: document.getElementById('questionNumber'),
    questionText: document.getElementById('questionText'),
    optionsContainer: document.getElementById('optionsContainer'),
    prevButton: document.getElementById('prevButton'),
    nextButton: document.getElementById('nextButton'),
    finishButton: document.getElementById('finishButton'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    scoreElement: document.getElementById('score'),
    resultMessage: document.getElementById('resultMessage'),
    reviewContainer: document.getElementById('reviewContainer'),
    restartButton: document.getElementById('restartButton'),
    startButton: document.getElementById('startButton'),
    timerElement: document.getElementById('timer'),
    resetHistoryButton: document.getElementById('resetHistoryButton'),
    progressStats: document.getElementById('progressStats'),
    questionCountInput: document.getElementById('questionCount'),
    enableTimerCheckbox: document.getElementById('enableTimer'),
    timerConfig: document.getElementById('timerConfig'),
    timerMinutesInput: document.getElementById('timerMinutes'),
    pieChart: document.getElementById('pieChart'),
    pieLegend: document.getElementById('pieLegend'),
    correctCountElement: document.getElementById('correctCount'),
    incorrectCountElement: document.getElementById('incorrectCount'),
    unansweredCountElement: document.getElementById('unansweredCount'),
    percentageTotal: document.getElementById('percentageTotal'),
    resetPercentagesButton: document.getElementById('resetPercentages'),
    newPercentageSlider: document.getElementById('newPercentage'),
    incorrectPercentageSlider: document.getElementById('incorrectPercentage'),
    correctPercentageSlider: document.getElementById('correctPercentage'),
    newPercentageInput: document.getElementById('newInput'),
    incorrectPercentageInput: document.getElementById('incorrectInput'),
    correctPercentageInput: document.getElementById('correctInput'),
    newValueDisplay: document.getElementById('newValue'),
    incorrectValueDisplay: document.getElementById('incorrectValue'),
    correctValueDisplay: document.getElementById('correctValue'),
    attemptsCount: document.getElementById('attemptsCount'),
    totalCorrect: document.getElementById('totalCorrect'),
    totalIncorrect: document.getElementById('totalIncorrect'),
    totalAttempts: document.getElementById('totalAttempts'),
    cssWarning: document.getElementById('cssWarning'),
    jsWarning: document.getElementById('jsWarning'),
    jsonWarning: document.getElementById('jsonWarning'),
    loadingMessage: document.getElementById('loadingMessage')
};

// Utilidades
const Utils = {
    // Formatear tiempo en MM:SS
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Mezclar array (Fisher-Yates)
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },
    
    // Debounce para evitar múltiples llamadas
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Mostrar advertencia
    showWarning: (element, message) => {
        if (element) {
            element.textContent = message;
            element.style.display = 'flex';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    },
    
    // Calcular puntuación según fórmula oficial
    calculateOfficialScore: (correctAnswers, totalQuestions) => {
        return (60 * (correctAnswers / totalQuestions)).toFixed(2);
    }
};

// Verificar carga de recursos
function checkResources() {
    // Verificar CSS
    const stylesheets = document.styleSheets;
    let cssLoaded = false;
    for (let i = 0; i < stylesheets.length; i++) {
        if (stylesheets[i].href && stylesheets[i].href.includes('styles.css')) {
            cssLoaded = true;
            break;
        }
    }
    
    if (!cssLoaded) {
        Utils.showWarning(DOM.cssWarning, 'No se pudo cargar el archivo de estilos. El simulador puede no verse correctamente.');
    }
}

// Cargar preguntas desde JSON
async function loadQuestions() {
    try {
        console.log('Intentando cargar questions.json...');
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const questions = await response.json();
        
        // Validar estructura de preguntas
        if (!Array.isArray(questions)) {
            throw new Error('El archivo JSON no contiene un array de preguntas');
        }
        
        // Validar que cada pregunta tenga la estructura correcta
        const validQuestions = questions.filter(q => 
            q.id && 
            q.question && 
            Array.isArray(q.options) && 
            q.options.length === 4 && 
            q.correctAnswer
        );
        
        if (validQuestions.length === 0) {
            throw new Error('No se encontraron preguntas válidas en el archivo JSON');
        }
        
        AppState.questions = validQuestions;
        console.log(`Preguntas cargadas desde JSON: ${AppState.questions.length}`);
        return true;
    } catch (error) {
        console.warn('Error cargando questions.json, usando preguntas de ejemplo:', error);
        Utils.showWarning(DOM.jsonWarning, 'No se pudo cargar el archivo de preguntas. Se usarán preguntas de ejemplo.');
        AppState.questions = fallbackQuestions;
        return false;
    }
}

// Inicialización
async function initializeApp() {
    console.log('Inicializando aplicación...');
    checkResources();
    
    // Mostrar mensaje de carga
    if (DOM.loadingMessage) {
        DOM.loadingMessage.style.display = 'flex';
    }
    
    // Cargar preguntas antes de inicializar la aplicación
    const questionsLoaded = await loadQuestions();
    console.log('Preguntas cargadas:', questionsLoaded);
    
    // Ocultar mensaje de carga
    if (DOM.loadingMessage) {
        DOM.loadingMessage.style.display = 'none';
    }
    
    // Inicializar el resto de la aplicación
    initApp();
}

function initApp() {
    console.log('Inicializando componentes de la aplicación...');
    loadHistory();
    setupEventListeners();
    updateTimerConfig();
    calculateDefaultTime();
    updatePercentageControls();
    updateAttemptsCount();
    updateProgressStats();
    
    console.log('Aplicación inicializada correctamente');
    console.log(`Total de preguntas disponibles: ${AppState.questions.length}`);
}

function setupEventListeners() {
    // Configuración del examen
    DOM.enableTimerCheckbox.addEventListener('change', updateTimerConfig);
    DOM.questionCountInput.addEventListener('change', calculateDefaultTime);
    
    // Navegación
    DOM.startButton.addEventListener('click', initExam);
    DOM.prevButton.addEventListener('click', prevQuestion);
    DOM.nextButton.addEventListener('click', nextQuestion);
    DOM.finishButton.addEventListener('click', finishExam);
    DOM.restartButton.addEventListener('click', restartExam);
    DOM.resetHistoryButton.addEventListener('click', resetHistory);
    DOM.resetPercentagesButton.addEventListener('click', resetPercentages);

    // Controles de porcentajes con debounce
    const debouncedUpdatePercentage = Utils.debounce(updatePercentage, 300);
    
    DOM.newPercentageSlider.addEventListener('input', () => debouncedUpdatePercentage('new', DOM.newPercentageSlider.value));
    DOM.incorrectPercentageSlider.addEventListener('input', () => debouncedUpdatePercentage('incorrect', DOM.incorrectPercentageSlider.value));
    DOM.correctPercentageSlider.addEventListener('input', () => debouncedUpdatePercentage('correct', DOM.correctPercentageSlider.value));
    
    DOM.newPercentageInput.addEventListener('change', () => debouncedUpdatePercentage('new', DOM.newPercentageInput.value));
    DOM.incorrectPercentageInput.addEventListener('change', () => debouncedUpdatePercentage('incorrect', DOM.incorrectPercentageInput.value));
    DOM.correctPercentageInput.addEventListener('change', () => debouncedUpdatePercentage('correct', DOM.correctPercentageInput.value));

    // Delegación de eventos para opciones
    DOM.optionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.option');
        if (option && !option.classList.contains('correct') && !option.classList.contains('incorrect')) {
            const optionIndex = Array.from(DOM.optionsContainer.children).indexOf(option);
            selectOption(optionIndex);
        }
    });

    // Navegación por teclado
    document.addEventListener('keydown', (e) => {
        if (!DOM.examContainer.classList.contains('active')) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                if (!DOM.prevButton.disabled) prevQuestion();
                break;
            case 'ArrowRight':
                if (!DOM.nextButton.disabled) nextQuestion();
                break;
            case '1': case '2': case '3': case '4':
                const optionIndex = parseInt(e.key) - 1;
                if (optionIndex >= 0 && optionIndex < 4) {
                    selectOption(optionIndex);
                }
                break;
        }
    });
}

function updateTimerConfig() {
    DOM.timerConfig.style.display = DOM.enableTimerCheckbox.checked ? 'block' : 'none';
}

function calculateDefaultTime() {
    const questionCount = parseInt(DOM.questionCountInput.value) || 20;
    const proportionalTime = Math.round((questionCount / 90) * 120);
    DOM.timerMinutesInput.value = proportionalTime;
}

// Gestión del historial
function loadHistory() {
    const savedHistory = localStorage.getItem('questionHistory');
    const savedAttempts = localStorage.getItem('examAttempts');
    
    if (savedHistory) {
        AppState.questionHistory = JSON.parse(savedHistory);
    } else {
        // Inicializar historial vacío
        initializeQuestionHistory();
    }
    
    if (savedAttempts) {
        AppState.examAttempts = parseInt(savedAttempts);
    }
}

function initializeQuestionHistory() {
    AppState.questionHistory = {};
    AppState.questions.forEach(q => {
        AppState.questionHistory[q.id] = {
            answered: false,
            correct: false,
            attempts: 0,
            correctCount: 0
        };
    });
    saveHistory();
}

function saveHistory() {
    localStorage.setItem('questionHistory', JSON.stringify(AppState.questionHistory));
    localStorage.setItem('examAttempts', AppState.examAttempts.toString());
}

function updateAttemptsCount() {
    if (DOM.attemptsCount) DOM.attemptsCount.textContent = AppState.examAttempts;
    if (DOM.totalAttempts) DOM.totalAttempts.textContent = AppState.examAttempts;
}

// Controles de porcentajes
function updatePercentageControls() {
    DOM.newPercentageSlider.value = AppState.examConfig.percentages.new;
    DOM.incorrectPercentageSlider.value = AppState.examConfig.percentages.incorrect;
    DOM.correctPercentageSlider.value = AppState.examConfig.percentages.correct;
    
    DOM.newPercentageInput.value = AppState.examConfig.percentages.new;
    DOM.incorrectPercentageInput.value = AppState.examConfig.percentages.incorrect;
    DOM.correctPercentageInput.value = AppState.examConfig.percentages.correct;
    
    DOM.newValueDisplay.textContent = `${AppState.examConfig.percentages.new}%`;
    DOM.incorrectValueDisplay.textContent = `${AppState.examConfig.percentages.incorrect}%`;
    DOM.correctValueDisplay.textContent = `${AppState.examConfig.percentages.correct}%`;
    
    updatePercentageTotal();
}

function updatePercentage(type, value) {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    AppState.examConfig.percentages[type] = numValue;
    updatePercentageControls();
    adjustPercentages();
}

function adjustPercentages() {
    const total = AppState.examConfig.percentages.new + AppState.examConfig.percentages.incorrect + AppState.examConfig.percentages.correct;
    
    if (total !== 100) {
        const diff = total - 100;
        const largestType = getLargestPercentageType();
        AppState.examConfig.percentages[largestType] = Math.max(0, AppState.examConfig.percentages[largestType] - diff);
    }
    
    updatePercentageControls();
}

function getLargestPercentageType() {
    let maxType = 'new';
    let maxValue = AppState.examConfig.percentages.new;
    
    if (AppState.examConfig.percentages.incorrect > maxValue) {
        maxType = 'incorrect';
        maxValue = AppState.examConfig.percentages.incorrect;
    }
    
    if (AppState.examConfig.percentages.correct > maxValue) {
        maxType = 'correct';
    }
    
    return maxType;
}

function updatePercentageTotal() {
    const total = AppState.examConfig.percentages.new + AppState.examConfig.percentages.incorrect + AppState.examConfig.percentages.correct;
    DOM.percentageTotal.textContent = `Total: ${total}%`;
    DOM.percentageTotal.classList.toggle('error', total !== 100);
}

function resetPercentages() {
    AppState.examConfig.percentages = { new: 80, incorrect: 15, correct: 5 };
    updatePercentageControls();
}

// Estadísticas y gráficos
function updateProgressStats() {
    if (!DOM.progressStats) return;
    
    let unanswered = 0, incorrect = 0, correct = 0;
    let totalCorrect = 0, totalIncorrect = 0;
    
    Object.values(AppState.questionHistory).forEach(record => {
        if (!record.answered) unanswered++;
        else if (!record.correct) {
            incorrect++;
            totalIncorrect += record.attempts - record.correctCount;
        }
        else {
            correct++;
            totalCorrect += record.correctCount;
        }
    });
    
    DOM.progressStats.innerHTML = `
        <p><span class="priority-badge priority-high">Sin contestar: ${unanswered}</span></p>
        <p><span class="priority-badge priority-medium">Falladas: ${incorrect}</span></p>
        <p><span class="priority-badge priority-low">Acertadas: ${correct}</span></p>
        <p>Total: ${AppState.questions.length} preguntas</p>
    `;
    
    if (DOM.totalCorrect) DOM.totalCorrect.textContent = totalCorrect;
    if (DOM.totalIncorrect) DOM.totalIncorrect.textContent = totalIncorrect;
    
    updatePieChart(unanswered, incorrect, correct);
}

function updatePieChart(unanswered, incorrect, correct) {
    if (!DOM.pieChart || !DOM.pieLegend) return;
    
    const total = unanswered + incorrect + correct;
    let svgContent = '<svg width="160" height="160" viewBox="0 0 160 160">';
    
    if (total === 0) {
        svgContent += `<circle cx="80" cy="80" r="70" fill="#F44336" />`;
        
        DOM.pieLegend.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background-color: #F44336;"></div>
                <div class="legend-text">Nuevas: ${AppState.questions.length} (100%)</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #FFC107;"></div>
                <div class="legend-text">Falladas: 0 (0%)</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #4CAF50;"></div>
                <div class="legend-text">Acertadas: 0 (0%)</div>
            </div>
        `;
    } else {
        let currentAngle = 0;
        const centerX = 80, centerY = 80, radius = 70;
        
        const getCoordinates = (angle) => {
            const rad = (angle - 90) * Math.PI / 180;
            return {
                x: centerX + radius * Math.cos(rad),
                y: centerY + radius * Math.sin(rad)
            };
        };
        
        // Calcular porcentajes
        const unansweredPercent = (unanswered / total) * 100;
        const incorrectPercent = (incorrect / total) * 100;
        const correctPercent = (correct / total) * 100;
        
        // Dibujar segmentos
        if (unanswered > 0) {
            const angle = (unansweredPercent / 100) * 360;
            const start = getCoordinates(currentAngle);
            const end = getCoordinates(currentAngle + angle);
            const largeArcFlag = angle > 180 ? 1 : 0;
            svgContent += `<path d="M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z" fill="#F44336" />`;
            currentAngle += angle;
        }
        
        if (incorrect > 0) {
            const angle = (incorrectPercent / 100) * 360;
            const start = getCoordinates(currentAngle);
            const end = getCoordinates(currentAngle + angle);
            const largeArcFlag = angle > 180 ? 1 : 0;
            svgContent += `<path d="M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z" fill="#FFC107" />`;
            currentAngle += angle;
        }
        
        if (correct > 0) {
            const angle = (correctPercent / 100) * 360;
            const start = getCoordinates(currentAngle);
            const end = getCoordinates(currentAngle + angle);
            const largeArcFlag = angle > 180 ? 1 : 0;
            svgContent += `<path d="M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z" fill="#4CAF50" />`;
        }
        
        // Actualizar leyenda
        DOM.pieLegend.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background-color: #F44336;"></div>
                <div class="legend-text">Nuevas: ${unanswered} (${unansweredPercent.toFixed(1)}%)</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #FFC107;"></div>
                <div class="legend-text">Falladas: ${incorrect} (${incorrectPercent.toFixed(1)}%)</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #4CAF50;"></div>
                <div class="legend-text">Acertadas: ${correct} (${correctPercent.toFixed(1)}%)</div>
            </div>
        `;
    }
    
    svgContent += '</svg>';
    DOM.pieChart.innerHTML = svgContent;
}

// Selección de preguntas
function selectQuestions() {
    const questionCount = parseInt(DOM.questionCountInput.value) || 20;
    
    // Separar preguntas por categoría
    const unanswered = [], incorrect = [], correct = [];
    
    AppState.questions.forEach(q => {
        const history = AppState.questionHistory[q.id];
        if (!history.answered) unanswered.push(q);
        else if (!history.correct) incorrect.push(q);
        else correct.push(q);
    });
    
    // Calcular distribución según los porcentajes configurados
    const targetUnanswered = Math.min(Math.ceil(questionCount * (AppState.examConfig.percentages.new / 100)), unanswered.length);
    const targetIncorrect = Math.min(Math.ceil(questionCount * (AppState.examConfig.percentages.incorrect / 100)), incorrect.length);
    const targetCorrect = Math.min(Math.ceil(questionCount * (AppState.examConfig.percentages.correct / 100)), correct.length);
    
    // Seleccionar preguntas de cada categoría
    AppState.selectedQuestions = [
        ...Utils.shuffleArray(unanswered).slice(0, targetUnanswered),
        ...Utils.shuffleArray(incorrect).slice(0, targetIncorrect),
        ...Utils.shuffleArray(correct).slice(0, targetCorrect)
    ];
    
    // Completar si no tenemos suficientes
    if (AppState.selectedQuestions.length < questionCount) {
        const allQuestions = Utils.shuffleArray([...AppState.questions]);
        for (let i = 0; AppState.selectedQuestions.length < questionCount && i < allQuestions.length; i++) {
            if (!AppState.selectedQuestions.includes(allQuestions[i])) {
                AppState.selectedQuestions.push(allQuestions[i]);
            }
        }
    }
    
    // Mezclar el orden final
    AppState.selectedQuestions = Utils.shuffleArray(AppState.selectedQuestions);
}

// Mezclar opciones de una pregunta
function shuffleOptions(question) {
    if (AppState.currentSessionOrder[question.id]) {
        return AppState.currentSessionOrder[question.id];
    }
    
    const optionsWithIndices = question.options.map((option, index) => ({
        text: option,
        originalIndex: index,
        letter: String.fromCharCode(65 + index)
    }));
    
    Utils.shuffleArray(optionsWithIndices);
    
    optionsWithIndices.forEach((option, index) => {
        option.displayLetter = String.fromCharCode(65 + index);
    });
    
    AppState.currentSessionOrder[question.id] = optionsWithIndices;
    return optionsWithIndices;
}

// Obtener la letra correcta después del mezclado
function getCorrectLetterAfterShuffling(question, shuffledOptions) {
    const originalCorrectIndex = question.correctAnswer.charCodeAt(0) - 65;
    const correctOption = shuffledOptions.find(option => option.originalIndex === originalCorrectIndex);
    return correctOption ? correctOption.displayLetter : null;
}

// Gestión del examen
function initExam() {
    // Verificar que hay preguntas disponibles
    if (AppState.questions.length === 0) {
        alert('No hay preguntas disponibles para el examen. Por favor, recarga la página.');
        return;
    }
    
    const total = AppState.examConfig.percentages.new + AppState.examConfig.percentages.incorrect + AppState.examConfig.percentages.correct;
    if (total !== 100) {
        alert('La suma de los porcentajes debe ser exactamente 100%. Actualmente es ' + total + '%.');
        return;
    }
    
    AppState.currentSessionOrder = {};
    AppState.examConfig.questionCount = parseInt(DOM.questionCountInput.value) || 20;
    AppState.examConfig.enableTimer = DOM.enableTimerCheckbox.checked;
    AppState.examConfig.timerMinutes = parseInt(DOM.timerMinutesInput.value) || 27;
    
    AppState.userAnswers = {};
    selectQuestions();
    
    if (AppState.examConfig.enableTimer) {
        AppState.timeLeft = AppState.examConfig.timerMinutes * 60;
        startTimer();
    } else {
        AppState.timeLeft = 0;
        DOM.timerElement.textContent = "Sin límite de tiempo";
    }
    
    showScreen('examContainer');
    AppState.currentQuestionIndex = 0;
    renderQuestion(AppState.currentQuestionIndex);
    updateProgress();
    
    // Incrementar contador de intentos
    AppState.examAttempts++;
    saveHistory();
    updateAttemptsCount();
}

function renderQuestion(index) {
    if (index >= AppState.selectedQuestions.length) return;
    
    const question = AppState.selectedQuestions[index];
    const originalId = question.id;
    
    // Actualizar número de pregunta
    DOM.questionNumber.textContent = `Pregunta ${index + 1} de ${AppState.selectedQuestions.length}`;
    DOM.questionText.textContent = question.question;
    
    // Añadir indicador de categoría
    const history = AppState.questionHistory[originalId];
    let categoryBadge = '';
    if (!history.answered) {
        categoryBadge = '<span class="priority-badge priority-high">Nueva</span>';
    } else if (!history.correct) {
        categoryBadge = '<span class="priority-badge priority-medium">Por reforzar</span>';
    } else {
        categoryBadge = '<span class="priority-badge priority-low">Repaso</span>';
    }
    DOM.questionNumber.innerHTML = `Pregunta ${index + 1} de ${AppState.selectedQuestions.length} ${categoryBadge}`;
    
    // Limpiar y crear opciones
    DOM.optionsContainer.innerHTML = '';
    const shuffledOptions = shuffleOptions(question);
    
    shuffledOptions.forEach((option, i) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.setAttribute('role', 'radio');
        optionElement.setAttribute('aria-checked', 'false');
        optionElement.setAttribute('tabindex', '0');
        
        const userAnswer = AppState.userAnswers[originalId];
        const isSelected = userAnswer === option.displayLetter;
        const isCorrect = option.displayLetter === getCorrectLetterAfterShuffling(question, shuffledOptions);
        
        if (userAnswer) {
            if (isCorrect) {
                optionElement.classList.add('correct');
            } else if (isSelected && !isCorrect) {
                optionElement.classList.add('incorrect');
            }
            
            if (isSelected) {
                optionElement.classList.add('selected');
                optionElement.setAttribute('aria-checked', 'true');
            }
        } else if (isSelected) {
            optionElement.classList.add('selected');
            optionElement.setAttribute('aria-checked', 'true');
        }
        
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'option';
        input.value = option.displayLetter;
        input.id = `option${i}`;
        input.checked = isSelected;
        input.disabled = !!userAnswer;
        
        const label = document.createElement('label');
        label.htmlFor = `option${i}`;
        label.textContent = `${option.displayLetter}) ${option.text.substring(3)}`;
        
        optionElement.appendChild(input);
        optionElement.appendChild(label);
        DOM.optionsContainer.appendChild(optionElement);
    });
    
    // Actualizar estado de los botones
    DOM.prevButton.disabled = index === 0;
    
    if (index === AppState.selectedQuestions.length - 1) {
        DOM.nextButton.style.display = 'none';
        DOM.finishButton.style.display = 'block';
    } else {
        DOM.nextButton.style.display = 'block';
        DOM.finishButton.style.display = 'none';
    }
}

function selectOption(optionIndex) {
    const question = AppState.selectedQuestions[AppState.currentQuestionIndex];
    const originalId = question.id;
    const shuffledOptions = AppState.currentSessionOrder[originalId];
    const selectedOption = shuffledOptions[optionIndex];
    
    AppState.userAnswers[originalId] = selectedOption.displayLetter;
    
    const isCorrect = selectedOption.displayLetter === getCorrectLetterAfterShuffling(question, shuffledOptions);
    
    AppState.questionHistory[originalId] = {
        answered: true,
        correct: isCorrect,
        attempts: (AppState.questionHistory[originalId]?.attempts || 0) + 1,
        correctCount: (AppState.questionHistory[originalId]?.correctCount || 0) + (isCorrect ? 1 : 0)
    };
    
    saveHistory();
    renderQuestion(AppState.currentQuestionIndex);
}

function prevQuestion() {
    if (AppState.currentQuestionIndex > 0) {
        AppState.currentQuestionIndex--;
        renderQuestion(AppState.currentQuestionIndex);
        updateProgress();
    }
}

function nextQuestion() {
    if (AppState.currentQuestionIndex < AppState.selectedQuestions.length - 1) {
        AppState.currentQuestionIndex++;
        renderQuestion(AppState.currentQuestionIndex);
        updateProgress();
    }
}

function updateProgress() {
    const progress = ((AppState.currentQuestionIndex + 1) / AppState.selectedQuestions.length) * 100;
    DOM.progressBar.style.width = `${progress}%`;
    DOM.progressText.textContent = `Pregunta ${AppState.currentQuestionIndex + 1} de ${AppState.selectedQuestions.length}`;
}

function finishExam() {
    if (AppState.examConfig.enableTimer) {
        clearInterval(AppState.timerInterval);
    }
    
    showScreen('resultsContainer');
    
    let score = 0, correctCount = 0, incorrectCount = 0;
    
    Object.keys(AppState.userAnswers).forEach(questionId => {
        const question = AppState.questions.find(q => q.id === parseInt(questionId));
        const shuffledOptions = AppState.currentSessionOrder[questionId];
        if (question && AppState.userAnswers[questionId] === getCorrectLetterAfterShuffling(question, shuffledOptions)) {
            score++;
            correctCount++;
        } else {
            incorrectCount++;
        }
    });
    
    const unansweredCount = AppState.selectedQuestions.length - Object.keys(AppState.userAnswers).length;
    
    DOM.correctCountElement.textContent = correctCount;
    DOM.incorrectCountElement.textContent = incorrectCount;
    DOM.unansweredCountElement.textContent = unansweredCount;
    
    // Calcular puntuación según fórmula oficial
    const officialScore = Utils.calculateOfficialScore(correctCount, AppState.selectedQuestions.length);
    DOM.scoreElement.textContent = officialScore;
    
    showReview();
}

function showReview() {
    DOM.reviewContainer.innerHTML = '';
    
    AppState.selectedQuestions.forEach((question, index) => {
        const originalId = question.id;
        const userAnswer = AppState.userAnswers[originalId];
        const shuffledOptions = AppState.currentSessionOrder[originalId];
        const correctAnswer = getCorrectLetterAfterShuffling(question, shuffledOptions);
        
        let userAnswerText = 'No respondida';
        if (userAnswer) {
            const userOption = shuffledOptions.find(option => option.displayLetter === userAnswer);
            userAnswerText = userOption ? userOption.text : 'Opción no encontrada';
        }
        
        let correctAnswerText = 'Opción no encontrada';
        const correctOption = shuffledOptions.find(option => option.displayLetter === correctAnswer);
        if (correctOption) {
            correctAnswerText = correctOption.text;
        }
        
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        // Enunciado de la pregunta
        const reviewQuestion = document.createElement('div');
        reviewQuestion.className = 'review-question';
        reviewQuestion.innerHTML = `<span class="question-label">Pregunta ${index + 1}:</span> ${question.question}`;
        reviewItem.appendChild(reviewQuestion);
        
        // Respuesta del usuario
        if (userAnswer) {
            if (userAnswer !== correctAnswer) {
                // Respuesta incorrecta
                const userAnswerElement = document.createElement('div');
                userAnswerElement.className = 'review-answer user-answer';
                userAnswerElement.innerHTML = `<span class="answer-label">Tu respuesta:</span> ${userAnswerText}`;
                reviewItem.appendChild(userAnswerElement);
            }
        } else {
            // Pregunta no respondida
            const unansweredElement = document.createElement('div');
            unansweredElement.className = 'review-answer unanswered';
            unansweredElement.innerHTML = `<span class="answer-label">No respondida:</span> Esta pregunta no fue contestada`;
            reviewItem.appendChild(unansweredElement);
        }
        
        // Respuesta correcta
        const correctAnswerElement = document.createElement('div');
        correctAnswerElement.className = 'review-answer correct-answer';
        correctAnswerElement.innerHTML = `<span class="answer-label">Respuesta correcta:</span> ${correctAnswerText}`;
        reviewItem.appendChild(correctAnswerElement);
        
        // Mensaje de refuerzo
        if (userAnswer && userAnswer !== correctAnswer) {
            // Mensaje para respuestas incorrectas
            const randomMessage = failureMessages[Math.floor(Math.random() * failureMessages.length)];
            const explanationElement = document.createElement('div');
            explanationElement.className = 'review-explanation incorrect-explanation';
            explanationElement.textContent = randomMessage;
            reviewItem.appendChild(explanationElement);
        } else if (!userAnswer) {
            // Mensaje para preguntas no respondidas
            const randomMessage = unansweredMessages[Math.floor(Math.random() * unansweredMessages.length)];
            const explanationElement = document.createElement('div');
            explanationElement.className = 'review-explanation unanswered-explanation';
            explanationElement.textContent = randomMessage;
            reviewItem.appendChild(explanationElement);
        }
        
        DOM.reviewContainer.appendChild(reviewItem);
    });
}

function restartExam() {
    AppState.currentQuestionIndex = 0;
    AppState.userAnswers = {};
    showScreen('startScreen');
    updateTimerDisplay();
    updateProgressStats();
}

function resetHistory() {
    if (confirm("¿Estás seguro de que quieres reiniciar todo tu historial? Se perderán todos tus progresos y el contador de intentos.")) {
        AppState.questionHistory = {};
        AppState.examAttempts = 0;
        initializeQuestionHistory();
        updateProgressStats();
        updateAttemptsCount();
        alert("Historial reiniciado correctamente.");
    }
}

// Gestión de pantallas
function showScreen(screenId) {
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar la pantalla solicitada
    document.getElementById(screenId).classList.add('active');
}

// Temporizador
function startTimer() {
    updateTimerDisplay();
    
    AppState.timerInterval = setInterval(() => {
        AppState.timeLeft--;
        updateTimerDisplay();
        
        if (AppState.timeLeft <= 0) {
            clearInterval(AppState.timerInterval);
            finishExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (!AppState.examConfig.enableTimer) return;
    
    DOM.timerElement.textContent = `Tiempo: ${Utils.formatTime(AppState.timeLeft)}`;
    
    if (AppState.timeLeft < 300) {
        DOM.timerElement.style.backgroundColor = '#F44336';
    } else if (AppState.timeLeft < 600) {
        DOM.timerElement.style.backgroundColor = '#FF9800';
    } else {
        DOM.timerElement.style.backgroundColor = '#212121';
    }
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, iniciando aplicación...');
    initializeApp();
});

// Verificación de carga de JavaScript
if (typeof AppState === 'undefined') {
    Utils.showWarning(DOM.jsWarning, 'No se pudo cargar el archivo JavaScript. El simulador no funcionará correctamente.');
}