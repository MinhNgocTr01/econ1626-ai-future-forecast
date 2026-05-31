// ===================================================================
// QUIZ — Three rounds
// 1. Blind comparison (guess which is human)
// 2. Revealed preference (now that you know, does your preference change?)
// 3. Willingness to pay (how much extra for the human version?)
// ===================================================================

const STORAGE_KEY = 'wpne_quiz_results_v1';

// State
let quizData = null;
let currentPairIndex = 0;
let currentRound = 1;
let selections = []; // Round 1 guesses
let preferences = []; // Round 2 preferences
let wtp = []; // Round 3 willingness to pay

// --- DOM helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setProgress(round) {
  $$('.quiz-progress .step').forEach((el, i) => {
    el.classList.toggle('active', i === round - 1);
    el.classList.toggle('done', i < round - 1);
  });
}

// --- Load data
async function loadQuiz() {
  try {
    const res = await fetch('assets/data/quiz.json');
    quizData = await res.json();
    return true;
  } catch (e) {
    console.error('Failed to load quiz data', e);
    return false;
  }
}

// --- Start
async function startQuiz() {
  const loaded = await loadQuiz();
  if (!loaded) {
    $('#quiz-stage').innerHTML = '<p style="text-align:center;padding:2rem;">Could not load quiz data. Please <a href="forecast.html">skip to the essay</a>.</p>';
    return;
  }
  currentRound = 1;
  currentPairIndex = 0;
  selections = [];
  preferences = [];
  wtp = [];
  renderRound1();
}

// --- ROUND 1: blind guess
function renderRound1() {
  const pair = quizData.pairs[currentPairIndex];
  setProgress(1);

  const stage = $('#quiz-stage');
  stage.innerHTML = `
    <div class="quiz-round">
      <div class="domain-tag">${pair.domain} — Round 1 of 3 · Pair ${currentPairIndex + 1} of ${quizData.pairs.length}</div>
      <h2 class="question">${pair.question}</h2>
      <p class="question-sub">Pick the one you think was made by a person.</p>
      <div class="pair-grid">
        ${pair.options.map((opt, i) => renderOption(pair, opt, i, false)).join('')}
      </div>
      <div class="quiz-actions">
        <button class="btn btn-ghost" id="next-btn" disabled>Confirm choice →</button>
      </div>
    </div>
  `;

  $$('.pair-option').forEach(el => {
    el.addEventListener('click', () => {
      $$('.pair-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      $('#next-btn').disabled = false;
    });
  });

  $('#next-btn').addEventListener('click', confirmRound1Choice);
}

function renderOption(pair, opt, idx, revealed) {
  let media = '';
  if (pair.type === 'image') {
    media = `<div class="option-media"><img src="${opt.src}" alt="${opt.alt}" onerror="this.parentElement.innerHTML='[Image ${opt.key}]<br><span style=&quot;display:block;margin-top:0.5em;&quot;>Add real image at<br>${opt.src}</span>'"/></div>`;
  } else if (pair.type === 'audio') {
    media = `<div class="option-media" style="aspect-ratio:auto;padding:1.5rem;">
      <audio controls preload="none" src="${opt.src}" style="width:100%;"></audio>
      <div style="margin-top:0.5em;font-size:0.75rem;opacity:0.6;">Add real audio at ${opt.src}</div>
    </div>`;
  } else if (pair.type === 'text') {
    media = `<div class="option-text">"${opt.text}"</div>`;
  }

  const verdictText = opt.isHuman ? 'Human-made' : 'AI-generated';
  const verdict = revealed ? `<div class="verdict">${verdictText}</div>` : '';
  const credit = revealed ? `<div class="option-label" style="margin-top:0.5rem;opacity:0.7;">${opt.credit}</div>` : '';

  return `
    <div class="pair-option" data-option-index="${idx}" data-is-human="${opt.isHuman}">
      ${verdict}
      <div class="option-label">Option ${opt.key}</div>
      ${media}
      ${credit}
    </div>
  `;
}

function confirmRound1Choice() {
  const selected = $('.pair-option.selected');
  if (!selected) return;
  const idx = parseInt(selected.dataset.optionIndex, 10);
  const guessedHuman = selected.dataset.isHuman === 'true';
  selections.push({
    pairId: quizData.pairs[currentPairIndex].id,
    guessedIndex: idx,
    correct: guessedHuman
  });

  // After all pairs guessed in Round 1, move to Round 2
  if (currentPairIndex < quizData.pairs.length - 1) {
    currentPairIndex++;
    renderRound1();
  } else {
    currentPairIndex = 0;
    currentRound = 2;
    renderRound2();
  }
}

// --- ROUND 2: revealed preference
function renderRound2() {
  const pair = quizData.pairs[currentPairIndex];
  setProgress(2);

  const stage = $('#quiz-stage');
  stage.innerHTML = `
    <div class="quiz-round">
      <div class="domain-tag">${pair.domain} — Round 2 of 3 · Pair ${currentPairIndex + 1} of ${quizData.pairs.length}</div>
      <h2 class="question">Now that you know which is which, has your preference changed?</h2>
      <p class="question-sub">Look at both again. Both are revealed.</p>
      <div class="pair-grid">
        ${pair.options.map((opt, i) => {
          const revealed = renderOption(pair, opt, i, true);
          return revealed.replace('pair-option ', `pair-option ${opt.isHuman ? 'revealed-human' : 'revealed-ai'} `);
        }).join('')}
      </div>
      <div class="preference-buttons" id="pref-buttons">
        <button data-pref="human">I now prefer the human one</button>
        <button data-pref="ai">I still prefer the AI one</button>
        <button data-pref="same">My preference is the same</button>
        <button data-pref="none">I have no strong preference</button>
      </div>
      <div class="quiz-actions">
        <button class="btn btn-ghost" id="next-btn" disabled>Continue →</button>
      </div>
    </div>
  `;

  $$('#pref-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#pref-buttons button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('#next-btn').disabled = false;
    });
  });

  $('#next-btn').addEventListener('click', confirmRound2Choice);
}

function confirmRound2Choice() {
  const sel = $('#pref-buttons button.selected');
  if (!sel) return;
  preferences.push({
    pairId: quizData.pairs[currentPairIndex].id,
    preference: sel.dataset.pref
  });

  if (currentPairIndex < quizData.pairs.length - 1) {
    currentPairIndex++;
    renderRound2();
  } else {
    currentPairIndex = 0;
    currentRound = 3;
    renderRound3();
  }
}

// --- ROUND 3: willingness to pay
function renderRound3() {
  const pair = quizData.pairs[currentPairIndex];
  setProgress(3);

  const stage = $('#quiz-stage');
  stage.innerHTML = `
    <div class="quiz-round">
      <div class="domain-tag">${pair.domain} — Round 3 of 3 · Pair ${currentPairIndex + 1} of ${quizData.pairs.length}</div>
      <h2 class="question">How much extra would you pay for the human-made version?</h2>
      <p class="question-sub">Slide to zero if you would not pay any premium for human origin.</p>
      <div class="wtp-control">
        <label for="wtp-slider">Premium for human-made (USD)</label>
        <input type="range" id="wtp-slider" min="0" max="100" value="0" step="1" />
        <div class="wtp-value" id="wtp-value">$0</div>
      </div>
      <div class="quiz-actions">
        <button class="btn btn-ghost" id="next-btn">Continue →</button>
      </div>
    </div>
  `;

  const slider = $('#wtp-slider');
  const display = $('#wtp-value');
  slider.addEventListener('input', (e) => {
    display.textContent = '$' + e.target.value;
  });

  $('#next-btn').addEventListener('click', confirmRound3Choice);
}

function confirmRound3Choice() {
  const val = parseInt($('#wtp-slider').value, 10);
  wtp.push({
    pairId: quizData.pairs[currentPairIndex].id,
    amount: val
  });

  if (currentPairIndex < quizData.pairs.length - 1) {
    currentPairIndex++;
    renderRound3();
  } else {
    saveResults();
    renderResults();
  }
}

// --- Save to local storage
function saveResults() {
  const result = {
    timestamp: new Date().toISOString(),
    selections,
    preferences,
    wtp
  };
  try {
    const prior = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    prior.push(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prior.slice(-50))); // keep last 50
  } catch (e) {
    // localStorage might be disabled — fail quietly
  }
}

// --- Results screen
function renderResults() {
  setProgress(3);
  const seed = quizData.seedStats;

  // User's own performance
  const correctCount = selections.filter(s => s.correct).length;
  const totalGuesses = selections.length;

  const shiftedPref = preferences.filter(p => p.preference === 'human').length;
  const meanWtp = wtp.length ? (wtp.reduce((sum, w) => sum + w.amount, 0) / wtp.length) : 0;

  const stage = $('#quiz-stage');
  stage.innerHTML = `
    <div class="quiz-results">
      <div class="domain-tag" style="text-align:center;color:var(--rust);font-family:var(--font-mono);font-size:var(--size-mono);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:1rem;">
        Your results
      </div>
      <h2>You got ${correctCount} of ${totalGuesses} right.</h2>

      <div class="result-card">
        <div class="domain">Across all visitors</div>
        <div class="stat">${Math.round(seed.visualGuessedWrong * 100)}% guess wrong on visual.<br>${Math.round(seed.musicGuessedWrong * 100)}% guess wrong on music.<br>${Math.round(seed.writingGuessedWrong * 100)}% guess wrong on writing.</div>
        <div class="stat-context">${seed.note}</div>
      </div>

      <div class="result-card">
        <div class="domain">When given the choice, you</div>
        <div class="stat">${shiftedPref > 0 ? 'preferred the human-made version in ' + shiftedPref + ' of ' + preferences.length + ' pairs.' : 'did not consistently prefer the human-made version.'}</div>
        <div class="stat-context">The gap between what people say they value and what they choose under no pressure is the economic question this essay sits inside.</div>
      </div>

      <div class="result-card">
        <div class="domain">Your willingness to pay extra for human work</div>
        <div class="stat">$${meanWtp.toFixed(0)} on average</div>
        <div class="stat-context">If consumers will not pay a premium for verified human work, a premium will not form, regardless of policy.</div>
      </div>

      <div class="results-cta">
        <p class="lead-in">What you just experienced is a small version of a much larger question. Here is what it means for the next five years of the creative economy.</p>
        <a href="forecast.html" class="btn">Read the forecast →</a>
      </div>
    </div>
  `;
}

// --- Entry point
document.addEventListener('DOMContentLoaded', () => {
  const beginBtn = $('#begin-quiz');
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      $('#quiz-intro').style.display = 'none';
      $('#quiz-stage').style.display = 'block';
      startQuiz();
    });
  }
});
