const STORAGE_KEY = 'wpne_quiz_results_v1';

let quizData = null;
let currentPairIndex = 0;
let currentRound = 1;
let selections = [];
let preferences = [];
let wtp = [];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setProgress(round) {
  $$('.quiz-progress .step').forEach((el, i) => {
    el.classList.toggle('active', i === round - 1);
    el.classList.toggle('done', i < round - 1);
  });
}

// Quiz data inlined — avoids CORS errors when opening from disk (file:// URLs
// block fetch() even for local files, so we embed the data directly here).
const QUIZ_DATA = {
  pairs: [
    {
      id: 'visual',
      domain: 'Visual Art',
      type: 'image',
      question: 'Which one was painted by a human?',
      subQuestion: 'Both are oil-painting style portraits. Look closely.',
      options: [
        { key: 'A', src: 'asset/images/visual-a.jpg', alt: 'Portrait painting A', isHuman: true,  credit: 'Human-painted oil portrait' },
        { key: 'B', src: 'asset/images/visual-b.png', alt: 'Portrait painting B', isHuman: false, credit: 'AI-generated (similar oil-painting style)' }
      ]
    },
    {
      id: 'music',
      domain: 'Music',
      type: 'youtube',
      question: 'Which song was performed by humans?',
      subQuestion: "Both are titled 'Dust on/in the Wind' — both are soft rock with acoustic guitar.",
      options: [
        { key: 'A', videoId: 'eQJ9IWoclhk', alt: 'Music clip A', isHuman: false, credit: "The Velvet Sundown — 'Dust on the Wind' (2025, AI-generated band)" },
        { key: 'B', videoId: '9fNrJMkTWEE', alt: 'Music clip B', isHuman: true,  credit: "Kansas — 'Dust in the Wind' (1977, written by Kerry Livgren)" }
      ]
    },
    {
      id: 'writing',
      domain: 'Writing',
      type: 'text',
      question: 'Which paragraph was written by a human?',
      subQuestion: 'Both passages describe a morning. Read both carefully.',
      options: [
        {
          key: 'A',
          text: 'The morning unfolded with a delicate clarity, as if the season itself were caught between two states. Autumn whispered through the air, though the leaves remained stubbornly green. There is a certain quality to early September light that feels like a transition, a quiet acknowledgment that summer is ending and something else is beginning to take its place.',
          isHuman: false,
          credit: 'AI-generated (Claude Opus 4.6)'
        },
        {
          key: 'B',
          text: "Mrs. Dalloway said she would buy the flowers herself. For Lucy had her work cut out for her. The doors would be taken off their hinges; Rumpelmayer's men were coming. And then, thought Clarissa Dalloway, what a morning — fresh as if issued to children on a beach.",
          isHuman: true,
          credit: "Virginia Woolf — opening of 'Mrs Dalloway' (1925)"
        }
      ]
    }
  ],
  seedStats: {
    note: 'Aggregates are illustrative, drawn from cited research (NPR/Luminate 2026, Authors Guild 2025). Your answers stay on your device.',
    visualGuessedWrong: 0.42,
    musicGuessedWrong:  0.51,
    writingGuessedWrong: 0.58,
    preferenceShifted: 0.61,
    medianWtpHuman: 12
  }
};

function startQuiz() {
  quizData = QUIZ_DATA;
  currentRound = 1;
  currentPairIndex = 0;
  selections = [];
  preferences = [];
  wtp = [];
  renderRound1();
}

// ===================================================================
// Render option content based on type
// ===================================================================
function renderOptionMedia(pair, opt) {
  if (pair.type === 'image') {
    return `<div class="option-image"><img src="${opt.src}" alt="${opt.alt}" loading="lazy" /></div>`;
  }
  if (pair.type === 'youtube') {
    return `<div class="option-youtube">
      <iframe
        src="https://www.youtube-nocookie.com/embed/${opt.videoId}?modestbranding=1&rel=0&controls=1&showinfo=0"
        title="${opt.alt}"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
    </div>`;
  }
  if (pair.type === 'text') {
    return `<div class="option-text">"${opt.text}"</div>`;
  }
  return '';
}

function renderOption(pair, opt, idx, revealed) {
  const media = renderOptionMedia(pair, opt);
  const verdictText = opt.isHuman ? 'Human-made' : 'AI-generated';
  const verdict = revealed ? `<div class="verdict">${verdictText}</div>` : '';
  const credit = revealed ? `<div class="credit-line">${opt.credit}</div>` : '';
  const classes = revealed
    ? `pair-option ${opt.isHuman ? 'revealed-human' : 'revealed-ai'}`
    : 'pair-option';

  return `
    <div class="${classes}" data-option-index="${idx}" data-is-human="${opt.isHuman}">
      ${verdict}
      <div class="option-label">Option ${opt.key}</div>
      ${media}
      ${credit}
    </div>
  `;
}

// ===================================================================
// ROUND 1: Blind guess
// ===================================================================
function renderRound1() {
  const pair = quizData.pairs[currentPairIndex];
  setProgress(1);

  const stage = $('#quiz-stage');
  stage.innerHTML = `
    <div class="quiz-round">
      <div class="domain-tag">${pair.domain} — Round 1 of 3 · Pair ${currentPairIndex + 1} of ${quizData.pairs.length}</div>
      <h2 class="question">${pair.question}</h2>
      <p class="question-sub">${pair.subQuestion || ''}</p>
      <div class="pair-grid">
        ${pair.options.map((opt, i) => renderOption(pair, opt, i, false)).join('')}
      </div>
      <div class="quiz-actions">
        <button class="btn btn-ghost" id="next-btn" disabled>Confirm choice →</button>
      </div>
    </div>
  `;

  $$('.pair-option').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.tagName === 'IFRAME') return;
      $$('.pair-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      $('#next-btn').disabled = false;
    });
  });

  $('#next-btn').addEventListener('click', confirmRound1Choice);
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

  if (currentPairIndex < quizData.pairs.length - 1) {
    currentPairIndex++;
    renderRound1();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    currentPairIndex = 0;
    currentRound = 2;
    renderRound2();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ===================================================================
// ROUND 2: Revealed preference
// ===================================================================
function renderRound2() {
  const pair = quizData.pairs[currentPairIndex];
  setProgress(2);

  const stage = $('#quiz-stage');
  stage.innerHTML = `
    <div class="quiz-round">
      <div class="domain-tag">${pair.domain} — Round 2 of 3 · Pair ${currentPairIndex + 1} of ${quizData.pairs.length}</div>
      <h2 class="question">Now that you know, has your preference changed?</h2>
      <p class="question-sub">Look at both again. The labels are revealed.</p>
      <div class="pair-grid">
        ${pair.options.map((opt, i) => renderOption(pair, opt, i, true)).join('')}
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    currentPairIndex = 0;
    currentRound = 3;
    renderRound3();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ===================================================================
// ROUND 3: Willingness to pay
// ===================================================================
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    saveResults();
    renderResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ===================================================================
// Save and Display Results
// ===================================================================
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prior.slice(-50)));
  } catch (e) {
    // localStorage might be disabled
  }
}

function renderResults() {
  setProgress(3);
  const seed = quizData.seedStats;

  const correctCount = selections.filter(s => s.correct).length;
  const totalGuesses = selections.length;

  const shiftedToHuman = preferences.filter(p => p.preference === 'human').length;
  const meanWtp = wtp.length ? (wtp.reduce((sum, w) => sum + w.amount, 0) / wtp.length) : 0;
  const totalWtp = wtp.reduce((sum, w) => sum + w.amount, 0);

  let openingLine;
  if (correctCount === 3) {
    openingLine = 'You got all three right.';
  } else if (correctCount === 0) {
    openingLine = 'You got none of them right.';
  } else {
    openingLine = `You got ${correctCount} of ${totalGuesses} right.`;
  }

  const stage = $('#quiz-stage');
  stage.innerHTML = `
    <div class="quiz-results">
      <div style="text-align:center;color:var(--rust);font-family:var(--font-mono);font-size:var(--size-mono);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:1rem;">
        Your results
      </div>
      <h2>${openingLine}</h2>

      <div class="result-card">
        <div class="domain">Across all visitors (illustrative)</div>
        <div class="stat">
          ${Math.round(seed.visualGuessedWrong * 100)}% miss the visual.<br>
          ${Math.round(seed.musicGuessedWrong * 100)}% miss the music.<br>
          ${Math.round(seed.writingGuessedWrong * 100)}% miss the writing.
        </div>
        <div class="stat-context">${seed.note}</div>
      </div>

      <div class="result-card">
        <div class="domain">When given the choice, you</div>
        <div class="stat">${shiftedToHuman > 0 ? `preferred the human-made version in ${shiftedToHuman} of ${preferences.length} pairs` : 'did not consistently prefer the human-made version'}</div>
        <div class="stat-context">The gap between what people say they value and what they choose without pressure is the central question this essay sits inside.</div>
      </div>

      <div class="result-card">
        <div class="domain">Your willingness to pay extra for human work</div>
        <div class="stat">$${meanWtp.toFixed(0)} on average · $${totalWtp} total</div>
        <div class="stat-context">If consumers will not pay a premium for verified human work, no premium will form. Policy cannot create one. This is the leading indicator the forecast is built around.</div>
      </div>

      <div class="results-cta">
        <p class="lead-in">What you just experienced is a small version of a much larger question. Here is what it means for the next five years of the creative economy.</p>
        <a href="forecast.html" class="btn">Read the forecast →</a>
      </div>
    </div>
  `;
}

// ===================================================================
// Entry point
// ===================================================================
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
