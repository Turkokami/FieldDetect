/* ACE Trainer — quiz engine (vanilla JS, no dependencies) */
(function () {
  "use strict";

  const data = window.ACE_DATA;
  if (!data) return;
  const { DOMAINS, EXAMS } = data;

  const root = document.getElementById("quiz-root");
  if (!root) return;

  // ---- state ----
  let exam = null;
  let order = [];        // array of question indices (possibly shuffled)
  let current = 0;
  let answers = {};      // qid -> selection (number or array)
  let revealed = {};     // qid -> true once checked
  let timerId = null;
  let remaining = 0;     // seconds

  const LETTERS = ["A", "B", "C", "D", "E", "F"];

  function shuffle(arr) {
    // Fisher–Yates using crypto when available
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      let j;
      if (window.crypto && window.crypto.getRandomValues) {
        const u = new Uint32Array(1);
        window.crypto.getRandomValues(u);
        j = u[0] % (i + 1);
      } else {
        j = Math.floor((i + 1) * 0.5); // deterministic fallback (rarely used)
      }
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ":" + String(sec).padStart(2, "0");
  }

  // ---------- Exam selection screen ----------
  function renderSelect() {
    stopTimer();
    const total = EXAMS.reduce((n, e) => n + e.questions.length, 0);
    let html = `
      <div class="quiz-header">
        <div>
          <h1 class="section-title">Practice Exams</h1>
          <p class="section-sub">${EXAMS.length} exams · ${total} questions · instant feedback with explanations</p>
        </div>
      </div>
      <div class="grid grid-2">`;
    EXAMS.forEach((e) => {
      html += `
        <div class="card exam-card">
          <span class="tag">${e.questions.length} questions</span>
          <h3>${e.title}</h3>
          <p>${e.description}</p>
          <div class="meta">
            <span>⏱ ${e.minutes} min suggested</span>
            <span>🎯 Pass ≥ 70%</span>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:auto;">
            <button class="btn btn-primary btn-sm" data-start="${e.id}" data-mode="exam">Start timed exam</button>
            <button class="btn btn-ghost btn-sm" data-start="${e.id}" data-mode="practice">Practice (untimed)</button>
          </div>
        </div>`;
    });
    html += `</div>`;
    root.innerHTML = html;
    root.querySelectorAll("[data-start]").forEach((b) =>
      b.addEventListener("click", () => startExam(b.dataset.start, b.dataset.mode))
    );
  }

  // ---------- Start ----------
  let mode = "exam";
  function startExam(examId, m) {
    exam = EXAMS.find((e) => e.id === examId);
    if (!exam) return;
    mode = m || "exam";
    order = shuffle(exam.questions.map((_, i) => i));
    current = 0;
    answers = {};
    revealed = {};
    if (mode === "exam") {
      remaining = exam.minutes * 60;
      startTimer();
    }
    renderQuestion();
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(() => {
      remaining--;
      updateTimer();
      if (remaining <= 0) {
        stopTimer();
        finish();
      }
    }, 1000);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
  function updateTimer() {
    const el = document.getElementById("timer");
    if (!el) return;
    el.textContent = fmtTime(Math.max(0, remaining));
    el.classList.toggle("warn", remaining <= 300 && remaining > 60);
    el.classList.toggle("danger", remaining <= 60);
  }

  // ---------- Render a question ----------
  function renderQuestion() {
    const q = exam.questions[order[current]];
    const sel = answers[q.id];
    const isRevealed = !!revealed[q.id] || mode === "practice-revealed";
    const isMulti = q.type === "multi";
    const answeredCount = Object.keys(answers).length;

    let html = `
      <div class="quiz-wrap">
        <div class="quiz-header">
          <div><strong>${exam.title}</strong></div>
          <div style="display:flex; gap:16px; align-items:center;">
            ${mode === "exam" ? `<span class="timer" id="timer">${fmtTime(remaining)}</span>` : `<span class="q-hint" style="margin:0;">Practice mode</span>`}
            <button class="btn btn-ghost btn-sm" id="quit-btn">Exit</button>
          </div>
        </div>
        <div class="progress-bar"><div style="width:${((current + 1) / order.length) * 100}%"></div></div>
        <div style="display:flex; justify-content:space-between; align-items:center; color:var(--muted); font-size:13px; margin-bottom:14px;">
          <span>Question ${current + 1} of ${order.length}</span>
          <span>${answeredCount} answered</span>
        </div>

        <div class="q-domain">Domain ${q.domain} · ${DOMAINS[q.domain]}</div>
        <div class="q-text">${q.text}</div>
        ${isMulti ? `<div class="q-hint">Select all that apply (${q.answer.length} correct).</div>` : ""}
        <div id="options">`;

    q.options.forEach((opt, i) => {
      const selected = isMulti ? Array.isArray(sel) && sel.includes(i) : sel === i;
      const correct = isMulti ? q.answer.includes(i) : q.answer === i;
      let cls = "option" + (isMulti ? " multi" : "");
      let mark = LETTERS[i];
      if (isRevealed) {
        if (correct) cls += " correct";
        else if (selected && !correct) cls += " incorrect";
        if (correct) mark = "✓";
        else if (selected) mark = "✕";
      } else if (selected) {
        cls += " selected";
      }
      html += `
        <div class="${cls}" data-opt="${i}">
          <div class="marker">${mark}</div>
          <div class="otext">${opt}</div>
        </div>`;
    });

    html += `</div>`;

    if (isRevealed) {
      const ok = isCorrect(q, sel);
      html += `
        <div class="explain">
          <div class="verdict ${ok ? "ok" : "no"}">${ok ? "✓ Correct" : "✕ Not quite"}</div>
          ${q.explanation}
        </div>`;
    }

    html += `
        <div class="quiz-nav">
          <button class="btn btn-ghost" id="prev-btn" ${current === 0 ? "disabled" : ""}>← Previous</button>
          <div style="display:flex; gap:10px;">
            ${mode === "practice" && !isRevealed ? `<button class="btn btn-ghost" id="check-btn">Check answer</button>` : ""}
            ${current < order.length - 1
              ? `<button class="btn btn-primary" id="next-btn">Next →</button>`
              : `<button class="btn btn-primary" id="finish-btn">Finish & score</button>`}
          </div>
        </div>
      </div>`;

    root.innerHTML = html;
    if (mode === "exam") updateTimer();

    // option handlers
    if (!isRevealed) {
      root.querySelectorAll(".option").forEach((el) =>
        el.addEventListener("click", () => selectOption(q, parseInt(el.dataset.opt, 10)))
      );
    }
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("prev-btn", () => { if (current > 0) { current--; renderQuestion(); } });
    on("next-btn", () => { current++; renderQuestion(); });
    on("finish-btn", finish);
    on("check-btn", () => { revealed[q.id] = true; renderQuestion(); });
    on("quit-btn", () => {
      if (confirm("Exit this exam? Your progress will be lost.")) { stopTimer(); renderSelect(); }
    });
  }

  function selectOption(q, i) {
    if (q.type === "multi") {
      let arr = Array.isArray(answers[q.id]) ? answers[q.id].slice() : [];
      if (arr.includes(i)) arr = arr.filter((x) => x !== i);
      else arr.push(i);
      answers[q.id] = arr;
    } else {
      answers[q.id] = i;
    }
    renderQuestion();
  }

  function isCorrect(q, sel) {
    if (q.type === "multi") {
      if (!Array.isArray(sel)) return false;
      const a = q.answer.slice().sort();
      const b = sel.slice().sort();
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    return sel === q.answer;
  }

  // ---------- Results ----------
  function finish() {
    stopTimer();
    let correct = 0;
    const perDomain = {};
    Object.keys(DOMAINS).forEach((d) => (perDomain[d] = { correct: 0, total: 0 }));

    exam.questions.forEach((q) => {
      perDomain[q.domain].total++;
      if (isCorrect(q, answers[q.id])) {
        correct++;
        perDomain[q.domain].correct++;
      }
    });

    const total = exam.questions.length;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= 70;

    let dbHtml = "";
    Object.keys(DOMAINS).forEach((d) => {
      const p = perDomain[d];
      if (p.total === 0) return;
      const dp = Math.round((p.correct / p.total) * 100);
      dbHtml += `
        <div class="dbar">
          <div class="row"><span>Domain ${d}: ${DOMAINS[d]}</span><span>${p.correct}/${p.total}</span></div>
          <div class="track"><div style="width:${dp}%"></div></div>
        </div>`;
    });

    let reviewHtml = "";
    exam.questions.forEach((q, idx) => {
      const ok = isCorrect(q, answers[q.id]);
      const sel = answers[q.id];
      const selText = q.type === "multi"
        ? (Array.isArray(sel) && sel.length ? sel.map((i) => LETTERS[i]).join(", ") : "—")
        : (typeof sel === "number" ? LETTERS[sel] : "—");
      const corText = q.type === "multi"
        ? q.answer.map((i) => LETTERS[i]).join(", ")
        : LETTERS[q.answer];
      reviewHtml += `
        <div class="review-item">
          <div class="rq"><span class="review-badge ${ok ? "ok" : "no"}">${ok ? "CORRECT" : "MISSED"}</span>Q${idx + 1}. ${q.text}</div>
          <div style="font-size:14px; color:var(--muted); margin:4px 0;">Your answer: <strong>${selText}</strong> · Correct: <strong>${corText}</strong></div>
          <div class="explain" style="margin-top:8px;">${q.explanation}</div>
        </div>`;
    });

    root.innerHTML = `
      <div class="quiz-wrap">
        <h1 class="section-title" style="text-align:center;">${exam.title} — Results</h1>
        <div class="score-ring" style="--p:${pct};">
          <div class="inner">
            <div class="pct">${pct}%</div>
            <div class="lab">${correct}/${total} correct</div>
          </div>
        </div>
        <p style="text-align:center; font-size:18px;">
          ${passed ? `<span class="result-pass">🎉 Pass — you cleared the 70% bar</span>` : `<span class="result-fail">Keep going — aim for 70%+</span>`}
        </p>
        <div class="card">
          <h3>Score by domain</h3>
          <div class="domain-breakdown">${dbHtml}</div>
        </div>
        <div class="cta-row" style="margin:24px 0;">
          <button class="btn btn-primary" id="retry-btn">Retake this exam</button>
          <button class="btn btn-ghost" id="back-btn">All exams</button>
          <a class="btn btn-ghost" href="study-guide.html">Review study guide</a>
        </div>
        <h2 class="section-title" style="font-size:22px;">Answer review</h2>
        ${reviewHtml}
      </div>`;

    document.getElementById("retry-btn").addEventListener("click", () => startExam(exam.id, mode));
    document.getElementById("back-btn").addEventListener("click", renderSelect);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- boot ----
  // Deep-link support: practice.html?exam=exam-2&mode=practice
  const params = new URLSearchParams(window.location.search);
  const preExam = params.get("exam");
  if (preExam && EXAMS.some((e) => e.id === preExam)) {
    startExam(preExam, params.get("mode") || "exam");
  } else {
    renderSelect();
  }
})();
