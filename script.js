// ===== TypeFast — Typing Tutor Engine =====

// ── State ──────────────────────────────
const state = {
  wordList: [],
  currentIndex: 0,
  correctChars: 0,
  totalTyped: 0,
  errors: 0,
  timer: 60,
  timerInterval: null,
  isRunning: false,
  difficulty: 'easy',
  duration: 60,
  history: JSON.parse(localStorage.getItem('typefast_history') || '[]'),
};

// ── DOM Elements ───────────────────────
const $ = (sel) => document.querySelector(sel);

const dom = {
  wordDisplay: $('#wordDisplay'),
  typingInput: $('#typingInput'),
  startBtn: $('#startBtn'),
  timer: $('#timer'),
  liveWpm: $('#liveWpm'),
  liveAccuracy: $('#liveAccuracy'),
  difficultyGroup: $('#difficultyGroup'),
  durationGroup: $('#durationGroup'),
  resultsOverlay: $('#resultsOverlay'),
  resultWpm: $('#resultWpm'),
  resultAccuracy: $('#resultAccuracy'),
  resultTime: $('#resultTime'),
  resultErrors: $('#resultErrors'),
  personalBest: $('#personalBest'),
  retryBtn: $('#retryBtn'),
  closeResultsBtn: $('#closeResultsBtn'),
  historyChart: $('#historyChart'),
  personalBestWpm: $('#personalBestWpm'),
  totalRounds: $('#totalRounds'),
};

// ── Word Pools ─────────────────────────
const WORD_POOLS = {
  easy: [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'from',
    'they', 'this', 'that', 'with', 'will', 'each', 'than', 'them',
    'then', 'just', 'what', 'when', 'make', 'like', 'time', 'good',
    'look', 'back', 'come', 'down', 'work', 'over', 'give', 'very',
    'year', 'hand', 'part', 'life', 'word', 'need', 'long', 'high',
    'know', 'same', 'tell', 'help', 'home', 'read', 'play', 'move',
    'name', 'some', 'most', 'also', 'such', 'only', 'take', 'find',
  ],
  medium: [
    'apple', 'bread', 'chair', 'dance', 'eagle', 'flame', 'grape',
    'horse', 'ivory', 'joker', 'knife', 'lemon', 'might', 'night',
    'ocean', 'party', 'queen', 'royal', 'stone', 'truck', 'uncle',
    'voice', 'watch', 'young', 'after', 'begin', 'carry', 'dream',
    'earth', 'fight', 'green', 'heart', 'light', 'music', 'never',
    'often', 'place', 'quiet', 'right', 'since', 'think', 'under',
    'water', 'about', 'above', 'break', 'bring', 'build', 'check',
    'child', 'class', 'clear', 'color', 'cover', 'drive', 'enter',
    'first', 'group', 'house', 'large', 'learn', 'level', 'model',
    'money', 'month', 'order', 'paper', 'point', 'power', 'price',
    'quite', 'round', 'sense', 'serve', 'small', 'sound', 'space',
    'stand', 'start', 'story', 'table', 'thank', 'thing', 'today',
    'total', 'trade', 'value', 'visit', 'woman', 'world', 'write',
  ],
  hard: [
    'already', 'another', 'because', 'believe', 'between', 'brought',
    'certain', 'changed', 'company', 'country', 'created', 'current',
    'develop', 'disease', 'display', 'economy', 'english', 'example',
    'feeling', 'finally', 'foreign', 'general', 'greater', 'history',
    'imagine', 'include', 'instead', 'journal', 'kitchen', 'knowing',
    'language', 'leading', 'machine', 'meaning', 'meeting', 'million',
    'natural', 'nothing', 'opinion', 'perhaps', 'picture', 'popular',
    'present', 'private', 'problem', 'process', 'produce', 'program',
    'quality', 'quickly', 'reality', 'receive', 'recently', 'science',
    'section', 'serious', 'service', 'several', 'similar', 'society',
    'special', 'student', 'subject', 'success', 'suggest', 'support',
    'teacher', 'thought', 'through', 'tonight', 'trouble', 'village',
    'weather', 'website', 'western', 'without', 'working', 'writing',
  ],
};

// ── Helpers ────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ── Word Generation ────────────────────
function generateWords() {
  const pool = WORD_POOLS[state.difficulty];
  return shuffle(pool).slice(0, 30);
}

// ── Render Words ───────────────────────
function renderWords() {
  dom.wordDisplay.innerHTML = '';
  if (state.wordList.length === 0) {
    dom.wordDisplay.innerHTML =
      '<span class="placeholder">Words will appear here...</span>';
    return;
  }
  state.wordList.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    if (i < state.currentIndex) {
      span.classList.add('correct');
    } else if (i === state.currentIndex) {
      span.classList.add('active');
    }
    span.textContent = word;
    dom.wordDisplay.appendChild(span);
  });
}

// ── Update Live Stats ──────────────────
function updateLiveStats() {
  const timeElapsed = state.duration - state.timer;
  if (timeElapsed > 0) {
    const wpm = Math.round((state.correctChars / 5) / (timeElapsed / 60));
    dom.liveWpm.textContent = clamp(wpm, 0, 999);
  }
  if (state.totalTyped > 0) {
    const acc = Math.round(
      ((state.totalTyped - state.errors) / state.totalTyped) * 100
    );
    dom.liveAccuracy.textContent = clamp(acc, 0, 100) + '%';
  } else {
    dom.liveAccuracy.textContent = '—';
  }
}

// ── Timer ──────────────────────────────
function startTimer() {
  dom.timer.textContent = state.timer;
  state.timerInterval = setInterval(() => {
    state.timer--;
    dom.timer.textContent = state.timer;
    updateLiveStats();
    if (state.timer <= 0) {
      endRound();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

// ── Show Results ───────────────────────
function showResults() {
  const timeElapsed = state.duration - state.timer;
  const wpm = Math.round((state.correctChars / 5) / (timeElapsed / 60)) || 0;
  const accuracy = state.totalTyped > 0
    ? Math.round(((state.totalTyped - state.errors) / state.totalTyped) * 100)
    : 0;

  dom.resultWpm.textContent = wpm;
  dom.resultAccuracy.textContent = accuracy + '%';
  dom.resultTime.textContent = timeElapsed + 's';
  dom.resultErrors.textContent = state.errors;

  // Personal best
  const isNewBest = state.history.length === 0 || wpm > Math.max(...state.history.map(h => h.wpm));
  if (isNewBest && wpm > 0) {
    dom.personalBest.innerHTML = '🎉 New Personal Best!';
  } else {
    dom.personalBest.innerHTML = '';
  }

  // Save to history
  state.history.push({ wpm, accuracy, errors: state.errors, time: timeElapsed, difficulty: state.difficulty, date: Date.now() });
  if (state.history.length > 20) state.history.shift();
  localStorage.setItem('typefast_history', JSON.stringify(state.history));

  dom.resultsOverlay.classList.add('active');
  renderHistory();
}

function hideResults() {
  dom.resultsOverlay.classList.remove('active');
}

// ── History Rendering ──────────────────
function renderHistory() {
  const chart = dom.historyChart;
  const history = state.history.slice(-15);

  if (history.length === 0) {
    chart.innerHTML = '<span class="no-data">Complete a round to see your history</span>';
  } else {
    const maxWpm = Math.max(...history.map(h => h.wpm), 1);
    chart.innerHTML = history
      .map(h => {
        const height = (h.wpm / maxWpm) * 100;
        return `<div class="chart-bar" style="height:${Math.max(height, 4)}%" data-wpm="${h.wpm}"></div>`;
      })
      .join('');
  }

  const best = history.length > 0 ? Math.max(...history.map(h => h.wpm)) : '—';
  dom.personalBestWpm.textContent = best;
  dom.totalRounds.textContent = state.history.length;
}

// ── Round Lifecycle ────────────────────
function startRound() {
  state.wordList = generateWords();
  state.currentIndex = 0;
  state.correctChars = 0;
  state.totalTyped = 0;
  state.errors = 0;
  state.timer = state.duration;
  state.isRunning = true;

  dom.typingInput.value = '';
  dom.typingInput.disabled = false;
  dom.typingInput.focus();
  dom.startBtn.disabled = true;
  dom.startBtn.textContent = 'Typing...';
  dom.liveWpm.textContent = '0';
  dom.liveAccuracy.textContent = '—';

  renderWords();
  startTimer();
}

function endRound() {
  state.isRunning = false;
  stopTimer();
  dom.typingInput.disabled = true;
  dom.startBtn.disabled = false;
  dom.startBtn.textContent = '↻ Try Again';
  showResults();
}

// ── Input Handling ─────────────────────
dom.typingInput.addEventListener('input', (e) => {
  if (!state.isRunning) return;

  const raw = e.target.value;
  const currentWord = state.wordList[state.currentIndex];
  if (!currentWord) return;

  // Detect space (word complete)
  if (raw.endsWith(' ')) {
    const typedWord = raw.slice(0, -1).trim();
    if (typedWord === currentWord) {
      state.correctChars += currentWord.length;
    } else {
      state.errors++;
    }
    state.totalTyped++;
    state.currentIndex++;

    e.target.value = '';

    if (state.currentIndex >= state.wordList.length) {
      state.wordList = [...state.wordList, ...generateWords()];
    }
    renderWords();
    updateLiveStats();
  }

  // Real-time character highlight
  const activeSpan = dom.wordDisplay.querySelector('.word.active');
  if (activeSpan && currentWord) {
    const typedWord = raw.replace(/\s/g, '');
    const prefix = typedWord;
    if (currentWord.startsWith(prefix)) {
      activeSpan.style.color = '#111';
    } else if (prefix.length > 0) {
      activeSpan.style.color = 'var(--danger)';
    } else {
      activeSpan.style.color = '';
    }
    activeSpan.innerHTML =
      `<span style="color:#888">${currentWord.slice(0, prefix.length)}</span>` +
      currentWord.slice(prefix.length);
  }
});

dom.typingInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideResults();
    dom.typingInput.blur();
  }
});

// ── Button Handlers ────────────────────
dom.startBtn.addEventListener('click', () => {
  if (state.isRunning) return;
  startRound();
});

dom.retryBtn.addEventListener('click', () => {
  hideResults();
  startRound();
});

dom.closeResultsBtn.addEventListener('click', hideResults);

// ── Settings Handlers ──────────────────
dom.difficultyGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-option');
  if (!btn || state.isRunning) return;
  dom.difficultyGroup.querySelectorAll('.btn-option').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.difficulty = btn.dataset.difficulty;
});

dom.durationGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-option');
  if (!btn || state.isRunning) return;
  dom.durationGroup.querySelectorAll('.btn-option').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.duration = parseInt(btn.dataset.duration);
  state.timer = state.duration;
  dom.timer.textContent = state.timer;
});

// ── Keyboard Shortcuts ─────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !state.isRunning && document.activeElement !== dom.typingInput) {
    e.preventDefault();
    startRound();
  }
});

// ===== Subtle Particle Background =====

const canvas = document.createElement('canvas');
canvas.id = 'particlesCanvas';
document.body.prepend(canvas);

const ctx = canvas.getContext('2d');

let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 1.5 + 0.3;
    this.speedY = -(Math.random() * 0.3 + 0.1);
    this.speedX = (Math.random() - 0.5) * 0.15;
    this.opacity = Math.random() * 0.08 + 0.02;
    this.twinkleSpeed = Math.random() * 0.01 + 0.003;
    this.twinkleOffset = Math.random() * Math.PI * 2;
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + 20;
    this.speedY = -(Math.random() * 0.3 + 0.1);
    this.speedX = (Math.random() - 0.5) * 0.15;
    this.opacity = Math.random() * 0.08 + 0.02;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;

    if (this.y < -20 || this.x < -20 || this.x > canvas.width + 20) {
      this.reset();
      this.y = canvas.height + 20;
    }
  }

  draw(ctx) {
    const twinkle = Math.sin(Date.now() * this.twinkleSpeed + this.twinkleOffset) * 0.25 + 0.75;
    const alpha = this.opacity * twinkle;

    // Soft glow
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
    gradient.addColorStop(0, `rgba(180, 180, 180, ${alpha})`);
    gradient.addColorStop(0.3, `rgba(150, 150, 150, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Tiny core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 200, 200, ${alpha * 1.5})`;
    ctx.fill();
  }
}

// Only a few subtle particles
const PARTICLE_COUNT = 18;
for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle());
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.update();
    p.draw(ctx);
  });

  requestAnimationFrame(animateParticles);
}

animateParticles();

// ── Init ──────────────────────────────
renderHistory();
dom.timer.textContent = state.duration;
