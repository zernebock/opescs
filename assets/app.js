/* app.js - unminified, readable version of the optimized application logic
   - Loads data/questions.json with fallback to inlineQuestions
   - Caches DOM lookups
   - Central state object and efficient rendering
   - Debounced percentage sync
   - Accessibility: in-page axe run and summary banner
*/

(function () {
  'use strict';

  // Simple DOM helper
  const $id = (id) => document.getElementById(id);

  // clamp helper, pad for time formatting
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pad = (n) => String(n).padStart(2, '0');

  // format seconds to MM:SS
  const formatTime = (secs) => `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;

  // Cache DOM elements
  const els = {
    startScreen: $id('startScreen'),
    examContainer: $id('examContainer'),
    resultsContainer: $id('resultsContainer'),
    startButton: $id('startButton'),
    resetHistoryButton: $id('resetHistoryButton'),
    timer: $id('timer'),
    timerConfig: $id('timerConfig'),
    enableTimer: $id('enableTimer'),
    timerMinutes: $id('timerMinutes'),
    questionCount: $id('questionCount'),
    progressBar: $id('progressBar'),
    progressText: $id('progressText'),
    questionNumber: $id('questionNumber'),
    questionText: $id('questionText'),
    optionsContainer: $id('optionsContainer'),
    prevButton: $id('prevButton'),
    nextButton: $id('nextButton'),
    finishButton: $id('finishButton'),
    correctCount: $id('correctCount'),
    incorrectCount: $id('incorrectCount'),
    unansweredCount: $id('unansweredCount'),
    score: $id('score'),
    resultMessage: $id('resultMessage'),
    reviewContainer: $id('reviewContainer'),
    restartButton: $id('restartButton'),
    progressStats: $id('progressStats'),

    // percentage controls
    newPercentage: $id('newPercentage'),
    newValue: $id('newValue'),
    newInput: $id('newInput'),
    incorrectPercentage: $id('incorrectPercentage'),
    incorrectValue: $id('incorrectValue'),
    incorrectInput: $id('incorrectInput'),
    correctPercentage: $id('correctPercentage'),
    correctValue: $id('correctValue'),
    correctInput: $id('correctInput'),
    percentageTotal: $id('percentageTotal'),
    resetPercentages: $id('resetPercentages'),
    pieChart: $id('pieChart'),
    pieLegend: $id('pieLegend')
  };

  // Application state
  const state = {
    settings: {
      questionCount: parseInt(els.questionCount.value, 10) || 20,
      enableTimer: els.enableTimer.checked,
      timerMinutes: parseInt(els.timerMinutes.value, 10) || 27,
      percentages: { new: 80, incorrect: 15, correct: 5 }
    },
    exam: {
      order: [], // selected question indices
      currentIndex: 0,
      answers: {}, // qid -> { selected: 'A'|'B'.. }
      startedAt: null,
      remainingSeconds: 0,
      timerInterval: null
    },
    stats: { pastExams: [] },
    questions: [] // loaded from data/questions.json or fallback
  };

  // Debounce helper
  function debounce(fn, wait = 120) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------- Percentage controls ----------
  function updatePercentageUI() {
    const p = state.settings.percentages;
    els.newValue.textContent = p.new + '%';
    els.incorrectValue.textContent = p.incorrect + '%';
    els.correctValue.textContent = p.correct + '%';

    els.newPercentage.value = p.new;
    els.incorrectPercentage.value = p.incorrect;
    els.correctPercentage.value = p.correct;

    els.newInput.value = p.new;
    els.incorrectInput.value = p.incorrect;
    els.correctInput.value = p.correct;

    const total = p.new + p.incorrect + p.correct;
    els.percentageTotal.textContent = `Total: ${total}%`;
    els.pieChart.style.setProperty('--a', p.new);
    els.pieChart.style.setProperty('--b', p.incorrect);
    els.pieChart.style.setProperty('--c', p.correct);

    if (total !== 100) els.percentageTotal.classList.add('error');
    else els.percentageTotal.classList.remove('error');

    els.pieLegend.innerHTML = `
      <div class="legend-item">
        <span class="legend-color" style="background:var(--primary)"></span>
        <span class="legend-text">Nuevas ${p.new}%</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background:var(--warning)"></span>
        <span class="legend-text">Falladas ${p.incorrect}%</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background:var(--success)"></span>
        <span class="legend-text">Acertadas ${p.correct}%</span>
      </div>
    `;
  }

  const onPercentageChange = debounce(() => {
    const newP = clamp(parseInt(els.newInput.value, 10) || 0, 0, 100);
    const incP = clamp(parseInt(els.incorrectInput.value, 10) || 0, 0, 100);
    const corP = clamp(parseInt(els.correctInput.value, 10) || 0, 0, 100);
    state.settings.percentages = { new: newP, incorrect: incP, correct: corP };
    updatePercentageUI();
  }, 60);

  function bindPercentageControls() {
    const pairs = [
      { range: els.newPercentage, input: els.newInput },
      { range: els.incorrectPercentage, input: els.incorrectInput },
      { range: els.correctPercentage, input: els.correctInput }
    ];

    pairs.forEach(({ range, input }) => {
      range.addEventListener('input', (e) => {
        input.value = e.target.value;
        state.settings.percentages = {
          new: parseInt(els.newInput.value, 10),
          incorrect: parseInt(els.incorrectInput.value, 10),
          correct: parseInt(els.correctInput.value, 10)
        };
        updatePercentageUI();
      });

      input.addEventListener('input', onPercentageChange);
    });

    els.resetPercentages.addEventListener('click', () => {
      state.settings.percentages = { new: 80, incorrect: 15, correct: 5 };
      updatePercentageUI();
    });

    updatePercentageUI();
  }

  // ---------- Questions loader ----------
  async function loadQuestions() {
    try {
      const resp = await fetch('data/questions.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error('no json');
      const q = await resp.json();
      if (Array.isArray(q) && q.length) {
        state.questions = q;
        return;
      }
      throw new Error('empty');
    } catch (e) {
      // Fallback: inline JSON block
      const el = document.getElementById('inlineQuestions');
      if (el) {
        try {
          const parsed = JSON.parse(el.textContent);
          if (Array.isArray(parsed) && parsed.length) {
            state.questions = parsed;
            return;
          }
        } catch (err) {
          // fallthrough to minimal sample
        }
      }

      // Minimal fallback sample
      state.questions = [
        { id: 1, question: 'Pregunta de ejemplo: no hay datos cargados', options: ['A) Opc1', 'B) Opc2', 'C) Opc3', 'D) Opc4'], correctAnswer: 'A' }
      ];
    }
  }

  // ---------- Helpers ----------
  function pickQuestions(count) {
    const idxs = [...Array(state.questions.length).keys()];
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs.slice(0, Math.min(count, idxs.length));
  }

  // ---------- Rendering ----------
  function renderQuestion() {
    const qIndex = state.exam.currentIndex;
    const order = state.exam.order;
    const qIdx = order[qIndex];
    const q = state.questions[qIdx];
    if (!q) return;

    // Update progress
    els.questionNumber.textContent = `Pregunta ${qIndex + 1}`;
    els.questionText.textContent = q.question;
    els.progressText.textContent = `Pregunta ${qIndex + 1} de ${order.length}`;

    // compute percent and update progress bar width
    const percent = Math.round(((qIndex) / order.length) * 100);
    els.progressBar.style.width = `${percent}%`;

    // Build options
    const frag = document.createDocumentFragment();
    q.options.forEach((opt, i) => {
      const letter = String.fromCharCode(65 + i); // A, B, C...
      const id = `q${q.id}_opt_${letter}`;

      const wrapper = document.createElement('div');
      wrapper.className = 'option';
      wrapper.dataset.letter = letter;
      wrapper.dataset.qid = q.id;
      wrapper.tabIndex = 0;

      const ans = state.exam.answers[q.id];
      if (ans && ans.selected === letter) wrapper.classList.add('selected');

      wrapper.innerHTML = `
        <input type="radio" name="q${q.id}" id="${id}" value="${letter}" ${ans && ans.selected === letter ? 'checked' : ''} aria-label="Opción ${letter}">
        <label for="${id}" style="cursor:pointer;flex:1">${opt}</label>
      `;

      frag.appendChild(wrapper);
    });

    els.optionsContainer.innerHTML = '';
    els.optionsContainer.appendChild(frag);

    // Enable/disable nav
    els.prevButton.disabled = qIndex === 0;

    // Next vs Finish
    if (qIndex === order.length - 1) {
      els.nextButton.classList.add('hidden');
      els.finishButton.classList.remove('hidden');
    } else {
      els.nextButton.classList.remove('hidden');
      els.finishButton.classList.add('hidden');
    }
  }

  // ---------- Answer handling ----------
  function selectAnswer(qid, letter) {
    state.exam.answers[qid] = { selected: letter };

    // update UI quickly
    const opts = els.optionsContainer.querySelectorAll('.option');
    opts.forEach(o => {
      if (parseInt(o.dataset.qid, 10) === qid) {
        o.classList.toggle('selected', o.dataset.letter === letter);
        const inp = o.querySelector('input[type="radio"]');
        if (inp) inp.checked = (o.dataset.letter === letter);
      }
    });
  }

  // Delegated handlers
  els.optionsContainer.addEventListener('click', (e) => {
    const opt = e.target.closest('.option');
    if (!opt) return;
    selectAnswer(parseInt(opt.dataset.qid, 10), opt.dataset.letter);
  });

  els.optionsContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const opt = e.target.closest('.option');
      if (!opt) return;
      e.preventDefault();
      selectAnswer(parseInt(opt.dataset.qid, 10), opt.dataset.letter);
    }
  });

  // ---------- Navigation ----------
  els.prevButton.addEventListener('click', () => {
    if (state.exam.currentIndex > 0) {
      state.exam.currentIndex--;
      renderQuestion();
    }
  });

  els.nextButton.addEventListener('click', () => {
    if (state.exam.currentIndex < state.exam.order.length - 1) {
      state.exam.currentIndex++;
      renderQuestion();
    }
  });

  els.finishButton.addEventListener('click', finishExam);

  document.addEventListener('keydown', (e) => {
    if (els.examContainer.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') els.prevButton.click();
    if (e.key === 'ArrowRight') els.nextButton.click();
  });

  // ---------- Timer ----------
  function startTimer(minutes) {
    stopTimer();
    state.exam.remainingSeconds = minutes * 60;
    els.timer.textContent = `Tiempo: ${formatTime(state.exam.remainingSeconds)}`;
    state.exam.timerInterval = setInterval(() => {
      state.exam.remainingSeconds--;
      if (state.exam.remainingSeconds <= 0) {
        stopTimer();
        finishExam();
      } else {
        els.timer.textContent = `Tiempo: ${formatTime(state.exam.remainingSeconds)}`;
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.exam.timerInterval) {
      clearInterval(state.exam.timerInterval);
      state.exam.timerInterval = null;
    }
  }

  // ---------- Exam lifecycle ----------
  function startExam() {
    state.settings.questionCount = clamp(parseInt(els.questionCount.value, 10) || 20, 1, 90);
    state.settings.enableTimer = els.enableTimer.checked;
    state.settings.timerMinutes = clamp(parseInt(els.timerMinutes.value, 10) || 27, 1, 999);

    // ensure percentages sum to 100
    const { new: n, incorrect: inc, correct: cor } = state.settings.percentages;
    if (n + inc + cor !== 100) {
      alert('La suma de porcentajes debe ser 100%. Ajusta la distribución antes de comenzar.');
      return;
    }

    // setup exam
    state.exam.order = pickQuestions(state.settings.questionCount);
    state.exam.currentIndex = 0;
    state.exam.answers = {};
    state.exam.startedAt = Date.now();

    // UI swap
    els.startScreen.classList.add('hidden');
    els.resultsContainer.classList.add('hidden');
    els.examContainer.classList.remove('hidden');

    // timer
    if (state.settings.enableTimer) {
      els.timerConfig.style.display = '';
      startTimer(state.settings.timerMinutes);
    } else {
      els.timerConfig.style.display = 'none';
      els.timer.textContent = 'Tiempo: --:--';
    }

    renderQuestion();
    els.progressBar.style.width = '0%';
    els.progressText.textContent = `Pregunta 1 de ${state.exam.order.length}`;
  }

  function finishExam() {
    stopTimer();

    const total = state.exam.order.length;
    let correct = 0, incorrect = 0, unanswered = 0;
    const review = [];

    state.exam.order.forEach(idx => {
      const q = state.questions[idx];
      const ans = state.exam.answers[q.id];
      if (!ans || !ans.selected) {
        unanswered++;
        review.push({ q, selected: null, correct: q.correctAnswer });
      } else if (ans.selected === q.correctAnswer) {
        correct++;
        review.push({ q, selected: ans.selected, correct: q.correctAnswer, ok: true });
      } else {
        incorrect++;
        review.push({ q, selected: ans.selected, correct: q.correctAnswer, ok: false });
      }
    });

    // show results
    els.correctCount.textContent = correct;
    els.incorrectCount.textContent = incorrect;
    els.unansweredCount.textContent = unanswered;
    els.score.textContent = `Puntuación: ${correct}/${total}`;

    let message = '';
    const pct = Math.round((correct / total) * 100);
    if (pct >= 75) message = 'Excelente resultado';
    else if (pct >= 50) message = 'Buen resultado, repasa puntos débiles';
    else message = 'Necesitas más práctica';
    els.resultMessage.textContent = message;

    // review
    els.reviewContainer.innerHTML = '';
    const frag = document.createDocumentFragment();
    review.forEach(item => {
      const div = document.createElement('div');
      div.className = 'review-item';
      const qdiv = document.createElement('div');
      qdiv.className = 'review-question';
      qdiv.textContent = item.q.question;
      div.appendChild(qdiv);

      const ansDiv = document.createElement('div');
      ansDiv.className = item.selected ? (item.ok ? 'correct-answer' : 'user-answer') : 'user-answer';
      ansDiv.textContent = item.selected ? `Tu respuesta: ${item.selected}` : 'Sin responder';
      div.appendChild(ansDiv);

      const corr = document.createElement('div');
      corr.className = 'correct-answer';
      corr.textContent = `Respuesta correcta: ${item.correct}`;
      div.appendChild(corr);

      frag.appendChild(div);
    });
    els.reviewContainer.appendChild(frag);

    els.examContainer.classList.add('hidden');
    els.resultsContainer.classList.remove('hidden');

    // Save minimal stats to localStorage
    try {
      const all = JSON.parse(localStorage.getItem('opescs_stats') || '[]');
      all.push({ date: new Date().toISOString(), total, correct, incorrect, unanswered, pct });
      localStorage.setItem('opescs_stats', JSON.stringify(all.slice(-50)));
      updateProgressStats();
    } catch (e) { /* ignore storage errors */ }
  }

  // ---------- UI bindings ----------
  els.startButton.addEventListener('click', startExam);
  els.restartButton.addEventListener('click', () => {
    els.resultsContainer.classList.add('hidden');
    els.startScreen.classList.remove('hidden');
    // reset timer display
    els.timer.textContent = 'Tiempo: --:--';
  });

  els.resetHistoryButton.addEventListener('click', () => {
    if (confirm('¿Deseas reiniciar el historial?')) {
      localStorage.removeItem('opescs_stats');
      updateProgressStats();
    }
  });

  // Toggle timer config
  els.enableTimer.addEventListener('change', () => {
    els.timerConfig.style.display = els.enableTimer.checked ? '' : 'none';
  });

  // bind small UI controls used elsewhere
  els.newInput.addEventListener('change', onPercentageChange);
  els.incorrectInput.addEventListener('change', onPercentageChange);
  els.correctInput.addEventListener('change', onPercentageChange);

  // ensure numeric inputs are validated
  els.questionCount.addEventListener('change', () => {
    els.questionCount.value = clamp(parseInt(els.questionCount.value, 10) || 20, 1, 90);
  });

  // ensure timer minutes sanity
  els.timerMinutes.addEventListener('change', () => {
    els.timerMinutes.value = clamp(parseInt(els.timerMinutes.value, 10) || 27, 1, 999);
  });

  // ---------- Progress Stats ----------
  function updateProgressStats() {
    try {
      const data = JSON.parse(localStorage.getItem('opescs_stats') || '[]');
      if (!data.length) {
        els.progressStats.textContent = 'Aún no has realizado exámenes.';
        els.pieLegend.innerHTML = '';
        return;
      }
      const avg = Math.round(data.reduce((s, x) => s + x.pct, 0) / data.length);
      const last = data.slice(-5).reverse();
      els.progressStats.innerHTML = `Exámenes guardados: <strong>${data.length}</strong>. Media aciertos: <strong>${Math.round(avg)}%</strong>. Últimos ${last.length}: ${last.map(x => x.pct + '%').join(', ')}`;
    } catch (e) {
      els.progressStats.textContent = 'Estadísticas no disponibles.';
    }
  }

  // ---------- Accessibility: run axe-core and render a small banner summary ----------
  function runA11yScan() {
    if (typeof axe === 'undefined') return;
    try {
      axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] } }, (err, results) => {
        if (err) { console.error('axe error', err); return; }
        const violations = results.violations || [];
        console.group('A11y report (axe-core)');
        console.log('Violations:', violations);
        console.groupEnd();
        if (violations.length) {
          let banner = document.getElementById('a11yBanner');
          if (!banner) {
            banner = document.createElement('div');
            banner.id = 'a11yBanner';
            // high contrast text for banner
            banner.style.cssText = 'position:fixed;left:12px;bottom:12px;background:#fff3cd;border-left:6px solid var(--warning);padding:10px;border-radius:6px;z-index:9999;font-size:14px;color:#222;max-width:320px;box-shadow:0 6px 24px rgba(0,0,0,.12)';
            document.body.appendChild(banner);
          }
          banner.innerHTML = `A11y: ${violations.length} problema(s) detectadas. Revisa la consola para detalles.`;
        }
      });
    } catch (e) {
      // ignore
    }
  }

  // ---------- Init ----------
  (async function init() {
    bindPercentageControls();
    updateProgressStats();

    // load questions
    await loadQuestions();

    // ensure percentages reflect inputs
    state.settings.percentages = {
      new: parseInt(els.newInput.value, 10) || 80,
      incorrect: parseInt(els.incorrectInput.value, 10) || 15,
      correct: parseInt(els.correctInput.value, 10) || 5
    };
    updatePercentageUI();

    // run accessibility check after small delay so page is ready
    setTimeout(runA11yScan, 800);
  })();

})();