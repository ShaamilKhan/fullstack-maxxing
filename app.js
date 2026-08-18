/* ============================================================
   DevQuiz — app.js  (v2)
   Exam mode + Practice mode with topic-% sliders
   14 granular topics, weak-spots summary
   ============================================================ */

const App = (() => {

  // ── Config ────────────────────────────────────────────────
  const TOPICS = [
    { key: 'core-java',    label: 'Core Java & OOP',       match: /core java|java oop/i,       color: '#3b82f6', bg: 'rgba(59,130,246,.15)', border: 'rgba(59,130,246,.4)'   },
    { key: 'spring-core',  label: 'Spring Core',           match: /spring core/i,              color: '#22c55e', bg: 'rgba(34,197,94,.15)',  border: 'rgba(34,197,94,.4)'    },
    { key: 'spring-boot',  label: 'Spring Boot',           match: /spring boot/i,              color: '#4ade80', bg: 'rgba(74,222,128,.12)', border: 'rgba(74,222,128,.35)'  },
    { key: 'javascript',   label: 'JavaScript',            match: /javascript/i,               color: '#facc15', bg: 'rgba(250,204,21,.12)', border: 'rgba(250,204,21,.35)'  },
    { key: 'typescript',   label: 'TypeScript',            match: /typescript/i,               color: '#60a5fa', bg: 'rgba(96,165,250,.12)', border: 'rgba(96,165,250,.35)'  },
    { key: 'react',        label: 'React',                 match: /react/i,                    color: '#38bdf8', bg: 'rgba(56,189,248,.12)', border: 'rgba(56,189,248,.35)'  },
    { key: 'angular',      label: 'Angular',               match: /angular/i,                  color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.35)' },
    { key: 'nodejs',       label: 'Node.js & Express',     match: /node\.?js|express/i,        color: '#86efac', bg: 'rgba(134,239,172,.12)', border: 'rgba(134,239,172,.35)' },
    { key: 'html-css',     label: 'HTML & CSS',            match: /html|css/i,                 color: '#fb923c', bg: 'rgba(251,146,60,.12)', border: 'rgba(251,146,60,.35)'  },
    { key: 'mongodb',      label: 'MongoDB',               match: /mongodb/i,                  color: '#4ade80', bg: 'rgba(74,222,128,.12)', border: 'rgba(74,222,128,.35)'  },
    { key: 'sql',          label: 'SQL & JDBC',            match: /sql|jdbc/i,                 color: '#a78bfa', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.35)' },
    { key: 'devops',       label: 'DevOps & CI/CD',        match: /devops|ci\/cd|jenkins|docker|kubernetes|git/i, color: '#f472b6', bg: 'rgba(244,114,182,.12)', border: 'rgba(244,114,182,.35)' },
    { key: 'concurrency',  label: 'Java Concurrency',      match: /concurrency/i,              color: '#c084fc', bg: 'rgba(192,132,252,.12)', border: 'rgba(192,132,252,.35)' },
    { key: 'git',          label: 'Git & Version Control', match: /git/i,                      color: '#f97316', bg: 'rgba(249,115,22,.12)', border: 'rgba(249,115,22,.35)'  },
  ];

  function topicMeta(topicStr) {
    if (!topicStr) return TOPICS[0];
    return TOPICS.find(t => t.match.test(topicStr)) || TOPICS[0];
  }

  // ── State ─────────────────────────────────────────────────
  let manifest       = [];
  let allQuestions   = [];
  let currentSet     = [];
  let currentIdx     = 0;
  let score          = 0;
  let answered       = 0;
  let mode           = 'exam';
  let sessionSetInfo = null;
  let topicStats     = {};  // key -> {correct, total}
  let sliderLock     = false;
  let sliderState    = {};  // key -> percent

  // ── Persistence ───────────────────────────────────────────
  const LS_KEY = 'devquiz_stats_v2';

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || {};
    } catch { return {}; }
  }

  function saveStats(stats) {
    localStorage.setItem(LS_KEY, JSON.stringify(stats));
  }

  function mergeSessionStats(sessionTopicStats) {
    const global = loadStats();
    TOPICS.forEach(t => {
      const s = sessionTopicStats[t.key];
      if (!s || s.total === 0) return;
      if (!global[t.key]) global[t.key] = { correct: 0, total: 0 };
      global[t.key].correct += s.correct;
      global[t.key].total   += s.total;
    });
    saveStats(global);
  }

  function renderWeakBanner() {
    const global = loadStats();
    const hasSessions = Object.values(global).some(s => s && s.total > 0);
    if (!hasSessions) {
      document.getElementById('weak-banner').style.display   = 'none';
      document.getElementById('lifetime-bar').style.display  = 'none';
      return;
    }

    // Lifetime accuracy
    let totalC = 0, totalT = 0;
    TOPICS.forEach(t => {
      if (global[t.key]) { totalC += global[t.key].correct; totalT += global[t.key].total; }
    });
    const lifePct = totalT > 0 ? Math.round((totalC / totalT) * 100) : 0;
    document.getElementById('lifetime-label').textContent = `${totalC} / ${totalT} correct (${lifePct}%)`;
    document.getElementById('lifetime-fill').style.width  = lifePct + '%';
    document.getElementById('lifetime-bar').style.display = 'block';

    // Per-topic pills
    const topicRow = document.getElementById('lifetime-topic-row');
    topicRow.innerHTML = TOPICS.filter(t => global[t.key]?.total > 0).map(t => {
      const s    = global[t.key];
      const pct  = Math.round((s.correct / s.total) * 100);
      const col  = pct >= 80 ? '#34d399' : pct >= 55 ? '#fbbf24' : '#f87171';
      return `<span style="background:rgba(0,0,0,.25);border:1px solid ${col}33;color:${col};
                          padding:3px 10px;border-radius:20px;font-size:.7rem;font-weight:600">
                ${t.label} ${pct}%
              </span>`;
    }).join('');

    // Weak topics (< 60% AND ≥ 3 attempts)
    const weak = TOPICS.filter(t => {
      const s = global[t.key];
      return s && s.total >= 3 && (s.correct / s.total) < 0.6;
    });

    if (weak.length === 0) {
      document.getElementById('weak-banner').style.display = 'none';
      return;
    }
    document.getElementById('weak-banner').style.display = 'block';
    const items = document.getElementById('weak-banner-items');
    items.innerHTML = weak.map(t => {
      const s   = global[t.key];
      const pct = Math.round((s.correct / s.total) * 100);
      return `
        <div style="display:inline-flex;align-items:center;gap:6px;
                    background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);
                    border-radius:20px;padding:4px 12px">
          <span style="width:7px;height:7px;border-radius:50%;background:#f43f5e;flex-shrink:0"></span>
          <span style="font-size:.78rem;font-weight:600;color:#fca5a5">${t.label}</span>
          <span style="font-size:.72rem;color:#f87171">${pct}%</span>
        </div>`;
    }).join('');
  }

  function drillWeakSpots() {
    const global = loadStats();
    const weak   = TOPICS.filter(t => {
      const s = global[t.key];
      return s && s.total >= 3 && (s.correct / s.total) < 0.6;
    });
    if (weak.length === 0) return;

    // Switch to practice mode and pre-set sliders
    showMode('practice');

    // Distribute 100% evenly across weak topics
    const share = Math.floor(100 / weak.length);
    let   rem   = 100 - share * weak.length;
    TOPICS.forEach((t, i) => {
      const isWeak = weak.some(w => w.key === t.key);
      sliderState[t.key] = 0;
      if (isWeak) {
        sliderState[t.key] = share + (rem-- > 0 ? 1 : 0);
      }
    });
    // sync UI
    TOPICS.forEach(t => {
      const el = document.getElementById('sl-' + t.key);
      const lb = document.getElementById('lbl-' + t.key);
      if (el) el.value = sliderState[t.key];
      if (lb) lb.textContent = sliderState[t.key] + '%';
    });
    // update badge
    const badge = document.getElementById('prac-sum-badge');
    badge.style.cssText = 'background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#34d399;padding:3px 12px;border-radius:20px;font-size:.75rem;font-weight:700';
    badge.textContent = 'Total: 100%';

    // scroll to practice panel
    document.getElementById('panel-practice').scrollIntoView({ behavior: 'smooth' });
  }

  function resetStats() {
    if (!confirm('Reset all your tracked weak-spot data? This cannot be undone.')) return;
    localStorage.removeItem(LS_KEY);
    renderWeakBanner();
  }

  // ── Boot ──────────────────────────────────────────────────
  async function init() {
    try {
      const r = await fetch('manifest.json');
      manifest = await r.json();
    } catch(e) {
      document.body.innerHTML = `<div style="padding:40px;text-align:center;color:#f43f5e;font-family:Inter,sans-serif">
        <p style="font-size:1.2rem;font-weight:700">Could not load manifest.json</p>
        <p style="color:#6b6b8a;margin-top:8px">Run: <code>python -m http.server 8080</code> inside the quiz_app folder</p>
      </div>`;
      return;
    }

    const totalQ = manifest.reduce((s, x) => s + x.count, 0);
    document.getElementById('stat-total').textContent = totalQ.toLocaleString();
    document.getElementById('stat-sets').textContent  = manifest.length;

    buildSetGrid();
    buildPracticeSource();
    buildSliders();
    loadAllForStats();
    renderWeakBanner();
  }

  async function loadAllForStats() {
    const sets = await Promise.all(manifest.map(m => fetch(m.file).then(r => r.json())));
    allQuestions = sets.flat();
    const corrected = allQuestions.filter(q => q.corrected).length;
    document.getElementById('stat-corrected').textContent = corrected;
  }

  // ── Set Grid ──────────────────────────────────────────────
  function buildSetGrid() {
    const grid = document.getElementById('set-grid');
    grid.innerHTML = manifest.map((m, i) => {
      const start = i * 120 + 1;
      const end   = i * 120 + m.count;
      return `
      <div class="card card-hover" style="padding:20px;cursor:pointer;position:relative;overflow:hidden"
           onclick="App.startExamSet(${i})">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#7c3aed,#a78bfa)"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <span style="font-size:1.25rem;font-weight:800;color:#fff">${m.name}</span>
          <span style="background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);color:#a78bfa;
                       padding:3px 10px;border-radius:20px;font-size:.72rem;font-weight:700">
            ${m.count} Qs
          </span>
        </div>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:14px">Q${start}–Q${end}</p>
        <div style="font-size:.82rem;color:#a78bfa;font-weight:600;display:flex;align-items:center;gap:5px">
          Start <span>→</span>
        </div>
      </div>`;
    }).join('');
  }

  // ── Mode tabs ─────────────────────────────────────────────
  function showMode(m) {
    mode = m;
    document.getElementById('panel-exam').style.display     = m === 'exam'     ? 'block' : 'none';
    document.getElementById('panel-practice').style.display = m === 'practice' ? 'block' : 'none';

    const examTab  = document.getElementById('tab-exam');
    const pracTab  = document.getElementById('tab-practice');
    examTab.className  = 'tab-btn ' + (m === 'exam'     ? 'active' : 'inactive');
    pracTab.className  = 'tab-btn ' + (m === 'practice' ? 'active' : 'inactive');
  }

  // ── Practice Setup ────────────────────────────────────────
  function buildPracticeSource() {
    const sel = document.getElementById('prac-source');
    manifest.forEach((m, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `${m.name}  (${m.count} questions)`;
      sel.appendChild(o);
    });
  }

  function buildSliders() {
    // Compute initial equal-ish distribution (integers summing to 100)
    const total = TOPICS.length;
    const base  = Math.floor(100 / total);
    let   rem   = 100 - base * total;
    TOPICS.forEach((t, i) => {
      sliderState[t.key] = base + (i === 0 ? rem : 0);
    });

    const container = document.getElementById('sliders-container');
    container.innerHTML = TOPICS.map(t => `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span class="badge" style="background:${t.bg};border:1px solid ${t.border};color:${t.color};font-size:.72rem">
            ${t.label}
          </span>
          <span style="font-size:.88rem;font-weight:700;color:${t.color}" id="lbl-${t.key}">
            ${sliderState[t.key]}%
          </span>
        </div>
        <input type="range" id="sl-${t.key}" min="0" max="100" value="${sliderState[t.key]}"
               style="--thumb-color:${t.color}"
               oninput="App.syncSliders('${t.key}', this.value)"/>
      </div>
    `).join('');
  }

  function updatePracticeTotal(v) {
    document.getElementById('prac-total-val').textContent = v;
  }

  function syncSliders(changed, rawVal) {
    if (sliderLock) return;
    sliderLock = true;

    const val = Math.max(0, Math.min(100, parseInt(rawVal) || 0));
    sliderState[changed] = val;

    const others   = TOPICS.map(t => t.key).filter(k => k !== changed);
    const remaining = Math.max(0, 100 - val);
    const otherSum  = others.reduce((s, k) => s + sliderState[k], 0);

    if (otherSum === 0) {
      const share    = Math.floor(remaining / others.length);
      let   leftover = remaining - share * others.length;
      others.forEach((k, i) => {
        sliderState[k] = share + (i === 0 ? leftover : 0);
      });
    } else {
      let distributed = 0;
      others.forEach((k, i) => {
        if (i < others.length - 1) {
          sliderState[k] = Math.round((sliderState[k] / otherSum) * remaining);
          distributed   += sliderState[k];
        } else {
          sliderState[k] = remaining - distributed;
        }
        sliderState[k] = Math.max(0, Math.min(100, sliderState[k]));
      });
    }

    // Re-render all slider + label values
    TOPICS.forEach(t => {
      const el = document.getElementById('sl-' + t.key);
      const lb = document.getElementById('lbl-' + t.key);
      if (el) el.value = sliderState[t.key];
      if (lb) lb.textContent = sliderState[t.key] + '%';
    });

    const sum   = Object.values(sliderState).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('prac-sum-badge');
    if (sum === 100) {
      badge.style.cssText = 'background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#34d399;padding:3px 12px;border-radius:20px;font-size:.75rem;font-weight:700';
    } else {
      badge.style.cssText = 'background:rgba(244,63,94,.15);border:1px solid rgba(244,63,94,.4);color:#f43f5e;padding:3px 12px;border-radius:20px;font-size:.75rem;font-weight:700';
    }
    badge.textContent = `Total: ${sum}%`;

    sliderLock = false;
  }

  // ── Start Exam ────────────────────────────────────────────
  async function startExamSet(idx) {
    const m = manifest[idx];
    sessionSetInfo = { ...m, mode: 'exam' };
    let qs;
    try {
      const r = await fetch(m.file);
      qs = await r.json();
    } catch(e) {
      alert(`Could not load ${m.file}`);
      return;
    }
    beginQuiz(shuffle(qs), 'exam', m.name);
  }

  // ── Start Practice ────────────────────────────────────────
  async function startPractice() {
    if (allQuestions.length === 0) {
      alert('Question bank still loading — please wait a moment.');
      return;
    }

    const sum = Object.values(sliderState).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      document.getElementById('prac-warn').textContent = `Percentages must total 100% (currently ${sum}%)`;
      return;
    }
    document.getElementById('prac-warn').textContent = '';

    const totalQ  = parseInt(document.getElementById('prac-total').value) || 40;
    const srcVal  = document.getElementById('prac-source').value;

    let pool;
    if (srcVal === 'all') {
      pool = allQuestions;
    } else {
      try {
        const r = await fetch(manifest[parseInt(srcVal)].file);
        pool = await r.json();
      } catch(e) {
        alert('Could not load source set.');
        return;
      }
    }

    // Bucket by topic key
    const buckets = {};
    TOPICS.forEach(t => { buckets[t.key] = []; });
    pool.forEach(q => {
      const tk = topicMeta(q.topic).key;
      buckets[tk].push(q);
    });

    const selected = [];
    TOPICS.forEach(t => {
      const needed    = Math.round((sliderState[t.key] / 100) * totalQ);
      if (needed === 0) return;
      const available = shuffle(buckets[t.key]);
      selected.push(...available.slice(0, needed));
    });

    if (selected.length === 0) {
      alert('No questions matched. Adjust percentages or choose a different source.');
      return;
    }

    sessionSetInfo = { name: 'Practice Session', file: null, mode: 'practice', sliderState: {...sliderState}, totalQ, srcVal };
    beginQuiz(shuffle(selected), 'practice', 'Practice Session');
  }

  // ── Core Quiz ─────────────────────────────────────────────
  function beginQuiz(questions, quizMode, label) {
    currentSet = questions;
    currentIdx = 0;
    score      = 0;
    answered   = 0;
    mode       = quizMode;
    topicStats = {};
    TOPICS.forEach(t => { topicStats[t.key] = { correct: 0, total: 0 }; });

    const badge = document.getElementById('quiz-mode-badge');
    if (quizMode === 'practice') {
      badge.textContent   = '🎯 Practice';
      badge.style.cssText = 'background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.4);color:#c084fc;padding:3px 10px;border-radius:20px;font-size:.78rem;font-weight:700';
    } else {
      badge.textContent   = '📝 Exam';
      badge.style.cssText = 'background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.4);color:#a78bfa;padding:3px 10px;border-radius:20px;font-size:.78rem;font-weight:700';
    }

    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q     = currentSet[currentIdx];
    const total = currentSet.length;
    const tm    = topicMeta(q.topic);

    // Progress
    const pct = Math.round((currentIdx / total) * 100);
    document.getElementById('progress-bar').style.width    = pct + '%';
    document.getElementById('progress-label').textContent  = `${currentIdx + 1} / ${total}`;
    document.getElementById('q-number').textContent        = `Q ${currentIdx + 1}`;
    document.getElementById('quiz-score').textContent      = score;
    document.getElementById('quiz-answered').textContent   = answered;

    // Topic badge
    const tb = document.getElementById('q-topic-badge');
    tb.textContent  = q.topic || 'General';
    tb.style.cssText = `background:${tm.bg};border:1px solid ${tm.border};color:${tm.color};padding:3px 10px;border-radius:20px;font-size:.72rem;font-weight:700`;

    // Question text
    document.getElementById('question-text').textContent = q.question;

    // Options — parse letter prefix
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className  = 'opt-btn';
      btn.dataset.idx = i;

      // Split "A. text" → letter chip + text
      const match = opt.match(/^([A-Fa-f])\.\s*(.*)/s);
      const letter = match ? match[1].toUpperCase() : String.fromCharCode(65 + i);
      const text   = match ? match[2] : opt;

      btn.innerHTML = `
        <span class="opt-letter">${letter}</span>
        <span style="flex:1">${text}</span>
      `;
      btn.addEventListener('click', () => selectAnswer(i));
      container.appendChild(btn);
    });

    // Reset feedback
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('btn-next').style.display        = 'none';

    // Re-animate card
    const card = document.getElementById('question-card');
    card.classList.remove('anim-up');
    void card.offsetWidth;
    card.classList.add('anim-up');
  }

  function selectAnswer(chosen) {
    const q       = currentSet[currentIdx];
    const correct = q.answer_index;
    const tk      = topicMeta(q.topic).key;

    answered++;
    topicStats[tk].total++;

    const buttons = document.querySelectorAll('.opt-btn');
    buttons.forEach(b => b.classList.add('disabled'));

    const isCorrect = chosen === correct;
    if (isCorrect) {
      score++;
      topicStats[tk].correct++;
      buttons[chosen].classList.add('correct');
    } else {
      buttons[chosen].classList.add('wrong');
      buttons[correct].classList.add('reveal');
    }

    document.getElementById('quiz-score').textContent    = score;
    document.getElementById('quiz-answered').textContent = answered;

    // Explanation
    const expBox     = document.getElementById('explanation-box');
    const expVerdict = document.getElementById('exp-verdict');
    const expIcon    = document.getElementById('exp-icon');
    const expText    = document.getElementById('exp-text');

    if (isCorrect) {
      expIcon.textContent     = '✅';
      expVerdict.textContent  = 'Correct!';
      expVerdict.style.color  = '#34d399';
      expBox.style.borderColor = 'rgba(52,211,153,.25)';
    } else {
      const correctOpt = q.options[correct];
      const match      = correctOpt.match(/^[A-Fa-f]\.\s*(.*)/s);
      const correctText = match ? match[2] : correctOpt;
      expIcon.textContent    = '❌';
      expVerdict.textContent = `Wrong — correct: ${correctText}`;
      expVerdict.style.color = '#f87171';
      expBox.style.borderColor = 'rgba(248,113,113,.25)';
    }
    expText.textContent = q.explanation || 'No explanation available.';
    expBox.style.display = 'block';

    void expBox.offsetWidth;
    expBox.classList.remove('anim-pop');
    expBox.classList.add('anim-pop');

    // Next button
    const btnNext = document.getElementById('btn-next');
    const isLast  = currentIdx === currentSet.length - 1;
    btnNext.textContent = isLast ? 'Finish & See Results 🏁' : 'Next Question →';
    btnNext.style.display = 'flex';

    void btnNext.offsetWidth;
    btnNext.classList.remove('anim-up');
    btnNext.classList.add('anim-up');
  }

  function nextQuestion() {
    currentIdx++;
    if (currentIdx >= currentSet.length) {
      showSummary();
    } else {
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Summary ───────────────────────────────────────────────
  function showSummary() {
    const total = currentSet.length;
    const pct   = total > 0 ? Math.round((score / total) * 100) : 0;

    document.getElementById('summary-score-pct').textContent  = pct + '%';
    document.getElementById('summary-score-frac').textContent = `${score} / ${total} correct`;
    document.getElementById('sum-correct').textContent = score;
    document.getElementById('sum-wrong').textContent   = total - score;
    document.getElementById('sum-total').textContent   = total;

    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : pct >= 40 ? '💪' : '📚';
    const title = pct >= 80 ? 'Excellent Work!' : pct >= 60 ? 'Good Effort!' : pct >= 40 ? 'Keep Going!' : 'More Practice Needed';
    document.getElementById('summary-emoji').textContent      = emoji;
    document.getElementById('summary-title').textContent      = title;
    document.getElementById('summary-subtitle').textContent   =
      `${mode === 'practice' ? 'Practice' : 'Exam'} session — ${pct}% score`;

    // Topic breakdown
    const bd = document.getElementById('topic-breakdown');
    bd.innerHTML = '';
    const active = TOPICS.filter(t => topicStats[t.key] && topicStats[t.key].total > 0);
    active.sort((a, b) => {
      const pa = topicStats[a.key].correct / topicStats[a.key].total;
      const pb = topicStats[b.key].correct / topicStats[b.key].total;
      return pb - pa;
    });
    active.forEach(t => {
      const s    = topicStats[t.key];
      const tpct = Math.round((s.correct / s.total) * 100);
      const barColor = tpct >= 80 ? '#10b981' : tpct >= 50 ? '#f59e0b' : '#f43f5e';
      bd.innerHTML += `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            <span class="badge" style="background:${t.bg};border:1px solid ${t.border};color:${t.color};font-size:.7rem">
              ${t.label}
            </span>
            <span style="font-size:.82rem;color:${barColor};font-weight:700">${s.correct}/${s.total} &nbsp;(${tpct}%)</span>
          </div>
          <div style="height:5px;background:var(--border);border-radius:9px;overflow:hidden">
            <div style="height:100%;width:${tpct}%;background:${barColor};border-radius:9px;transition:width .6s cubic-bezier(.4,0,.2,1)"></div>
          </div>
        </div>`;
    });

    // Persist to localStorage
    mergeSessionStats(topicStats);

    // Weak spots (< 60%)
    const weak = active.filter(t => {
      const s = topicStats[t.key];
      return s.total >= 2 && (s.correct / s.total) < 0.6;
    });
    const weakBox = document.getElementById('weak-box');
    const weakEl  = document.getElementById('weak-spots');
    if (weak.length === 0) {
      weakBox.style.display = 'none';
    } else {
      weakBox.style.display = 'block';
      weakEl.innerHTML = weak.map(t => {
        const s    = topicStats[t.key];
        const tpct = Math.round((s.correct / s.total) * 100);
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:10px 14px;border-radius:10px;background:rgba(244,63,94,.07);
                      border:1px solid rgba(244,63,94,.2);margin-bottom:8px">
            <span class="badge" style="background:${t.bg};border:1px solid ${t.border};color:${t.color};font-size:.7rem">
              ${t.label}
            </span>
            <span style="font-size:.82rem;color:#f87171;font-weight:700">${tpct}% — needs work</span>
          </div>`;
      }).join('');
    }

    showScreen('summary');
  }

  // ── Retry ─────────────────────────────────────────────────
  async function retrySet() {
    if (!sessionSetInfo) { goHome(); return; }
    if (sessionSetInfo.mode === 'practice') {
      // Restore slider state and re-run
      if (sessionSetInfo.sliderState) {
        Object.assign(sliderState, sessionSetInfo.sliderState);
        TOPICS.forEach(t => {
          const el = document.getElementById('sl-' + t.key);
          const lb = document.getElementById('lbl-' + t.key);
          if (el) el.value = sliderState[t.key];
          if (lb) lb.textContent = sliderState[t.key] + '%';
        });
      }
      await startPractice();
    } else {
      try {
        const r  = await fetch(sessionSetInfo.file);
        const qs = await r.json();
        beginQuiz(shuffle(qs), 'exam', sessionSetInfo.name);
      } catch(e) {
        alert('Could not reload set.');
        goHome();
      }
    }
  }

  // ── Navigation & Modal ────────────────────────────────────
  function confirmExit() { document.getElementById('exit-modal').style.display = 'flex'; }
  function cancelExit()  { document.getElementById('exit-modal').style.display = 'none'; }
  function forceExit()   { document.getElementById('exit-modal').style.display = 'none'; goHome(); }
  function goHome()      { showScreen('landing'); showMode('exam'); renderWeakBanner(); }

  function showScreen(name) {
    ['landing','quiz','summary'].forEach(s =>
      document.getElementById('screen-' + s).classList.toggle('active', s === name)
    );
    window.scrollTo(0, 0);
  }

  // ── Utils ─────────────────────────────────────────────────
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Init ──────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', init);

  return {
    showMode, startExamSet, startPractice,
    updatePracticeTotal, syncSliders,
    nextQuestion, retrySet, goHome,
    confirmExit, cancelExit, forceExit,
    drillWeakSpots, resetStats,
  };
})();
