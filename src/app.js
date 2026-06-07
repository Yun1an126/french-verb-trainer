import {
  PERSONS,
  TENSES,
  createPracticeState,
  gradePracticeRow,
  resetPracticeState,
  summarizePractice,
  toggleStandardVisibility
} from "./conjugation.js";
import {
  SEED_VERBS,
  buildBlankVerb,
  buildFayuAssistantUrl,
  cloneVerb,
  ensureUniqueVerbIds,
  ensureVerbId,
  resolveFayuAssistantInput
} from "./verbData.js";

const STORAGE_KEY = "french-verb-trainer-state-v1";
const app = document.querySelector("#app");

let state = loadState();

function loadState() {
  const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY));
  const rawVerbs = stored?.verbs?.length ? stored.verbs : SEED_VERBS.map((verb) => ensureVerbId(cloneVerb(verb)));
  const verbs = ensureUniqueVerbIds(rawVerbs);
  const rawCurrentIndex = stored && Object.prototype.hasOwnProperty.call(stored, "currentVerbId")
    ? rawVerbs.findLastIndex((verb) => verb.id === stored.currentVerbId)
    : -1;
  const currentVerbId = rawCurrentIndex >= 0
    ? verbs[rawCurrentIndex]?.id
    : verbs[0]?.id;
  const currentTense = stored?.currentTense ?? "present";

  return {
    verbs,
    currentVerbId,
    currentTense,
    mode: stored?.mode ?? "practice",
    stats: stored?.stats ?? {},
    practice: null,
    addDialogOpen: false,
    lookupInput: "",
    lookupStatus: "",
    draftVerb: null,
    exam: null
  };
}

function saveState() {
  const snapshot = {
    verbs: state.verbs,
    currentVerbId: state.currentVerbId,
    currentTense: state.currentTense,
    mode: state.mode,
    stats: state.stats
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function render() {
  ensurePractice();
  app.innerHTML = `
    <main class="app-shell">
      ${renderTopbar()}
      <div class="workbook">
        ${state.mode === "practice" ? renderPracticePanel() : renderExamPanel()}
        <aside class="side-column">
          ${renderVerbLibrary()}
          ${renderProgress()}
          ${renderCredits()}
        </aside>
      </div>
      ${state.addDialogOpen ? renderAddDialog() : ""}
    </main>
  `;
  bindEvents();
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">FR</div>
        <h1>法语动词默写</h1>
      </div>
      <nav class="toolbar" aria-label="主要操作">
        <button class="button primary" data-action="open-add">${iconPlus()}添加动词</button>
        <button class="button ${state.mode === "exam" ? "primary" : ""}" data-action="toggle-mode">${iconCards()}${state.mode === "exam" ? "常规练习" : "考试模式"}</button>
        <button class="button danger" data-action="reset-page">${iconReset()}重做当前页</button>
      </nav>
    </header>
  `;
}

function renderPracticePanel() {
  const verb = getCurrentVerb();
  const tense = TENSES.find((item) => item.key === state.currentTense);
  const summary = summarizePractice(state.practice);

  return `
    <section class="panel practice-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">常规练习</p>
          <div class="title-row">
            <h2>${escapeHtml(verb.infinitive)} · ${escapeHtml(tense.label)}</h2>
          </div>
        </div>
        <div class="status-pills">
          <span class="pill teal">字母严格</span>
          <span class="pill gold">符号宽容</span>
        </div>
      </div>
      <div class="practice-controls">
        <select class="select" data-action="select-verb" aria-label="选择动词">
          ${state.verbs.map((item) => `<option value="${item.id}" ${item.id === state.currentVerbId ? "selected" : ""}>${escapeHtml(item.infinitive)}</option>`).join("")}
        </select>
        <select class="select" data-action="select-tense" aria-label="选择时态">
          ${TENSES.map((item) => `<option value="${item.key}" ${item.key === state.currentTense ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
        </select>
        <span class="pill teal">${summary.checked}/${summary.total} 已判</span>
      </div>
      ${renderPracticeTable()}
      <div class="current-answer" aria-live="polite">
        <div class="label">当前格标准答案</div>
        <div class="value">${state.practice.currentAnswer ? escapeHtml(state.practice.currentAnswer) : "提交一格后显示完整标准答案"}</div>
      </div>
    </section>
  `;
}

function renderPracticeTable() {
  return `
    <div class="practice-table">
      <div></div>
      <div class="table-heading">你的答案</div>
      <div></div>
      <div class="table-heading standard-heading">
        <span>标准答案</span>
        <button class="button icon-only" data-action="toggle-standards" title="${state.practice.showAllStandards ? "隐藏标准答案" : "显示标准答案"}" aria-label="${state.practice.showAllStandards ? "隐藏标准答案" : "显示标准答案"}">
          ${state.practice.showAllStandards ? iconEyeOpen() : iconEyeClosed()}
        </button>
      </div>
      ${PERSONS.map((person) => renderPracticeRow(person)).join("")}
    </div>
  `;
}

function renderPracticeRow(person) {
  const row = state.practice.rows[person.key];
  const revealed = state.practice.showAllStandards || row.revealed;
  const resultClass = row.correct === true ? "correct" : row.correct === false ? "wrong" : "";
  const standardLabel = revealed ? row.standard : "隐藏";

  return `
    <div class="person-label">${escapeHtml(person.label)}</div>
    <input class="answer-input ${resultClass}" data-person="${person.key}" value="${escapeAttr(row.userAnswer)}" placeholder="填写变位，可省略主语">
    <button class="check-button ${resultClass}" data-action="check-row" data-person="${person.key}" title="判定这一格" aria-label="判定 ${escapeAttr(person.label)}">
      ${iconCheck()}
    </button>
    <div class="standard-cell ${revealed ? `revealed ${resultClass || "correct"}` : ""}">
      <span class="standard-text">${escapeHtml(standardLabel)}</span>
    </div>
    ${row.message ? `<div class="message">${escapeHtml(row.message)}</div>` : `<div class="message"></div>`}
  `;
}

function renderVerbLibrary() {
  return `
    <section class="panel side-panel">
      <div class="side-header">
        <div class="side-title">我的动词库</div>
        <button class="button icon-only primary" data-action="open-add" title="添加动词" aria-label="添加动词">${iconPlus()}</button>
      </div>
      <div class="verb-list">
        ${state.verbs.map((verb) => `
          <button class="verb-item ${verb.id === state.currentVerbId ? "active" : ""}" data-action="pick-verb" data-id="${verb.id}">
            <span>${escapeHtml(verb.infinitive)}</span>
            <span class="verb-source">${escapeHtml(sourceShortLabel(verb))}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderProgress() {
  const summary = summarizePractice(state.practice);
  const lifetime = summarizeStats();
  const percentage = summary.checked ? summary.percentage : lifetime.percentage;

  return `
    <section class="panel side-panel">
      <div class="side-title">进度</div>
      <div class="meter" aria-label="正确率"><span style="width:${percentage}%"></span></div>
      <div class="big-stat">${percentage}%</div>
      <div class="eyebrow">${summary.checked ? "当前页面正确率" : "长期正确率"}</div>
      <div class="note">${escapeHtml(lifetime.weakHint)}</div>
    </section>
  `;
}

function renderCredits() {
  return `
    <section class="panel side-panel">
      <div class="side-title">数据来源</div>
      <p class="eyebrow">添加动词只读取法语助手；失败时可以打开核对页或手动填写。</p>
      <a class="button" href="https://www.frdic.com/dicts/cg/aider?forcecg=true" target="_blank" rel="noreferrer">法语助手核对</a>
    </section>
  `;
}

function renderExamPanel() {
  ensureExam();
  const prompt = state.exam;
  const resultClass = prompt.result?.correct === true ? "correct" : prompt.result?.correct === false ? "wrong" : "";

  return `
    <section class="panel practice-panel exam-card">
      <div class="panel-header">
        <div>
          <p class="eyebrow">考试模式</p>
          <div class="title-row"><h2>随机抽问</h2></div>
        </div>
        <div class="status-pills">
          <span class="pill teal">单格抽取</span>
          <span class="pill gold">提交后显示标准答案</span>
        </div>
      </div>
      <div class="exam-prompt">
        <p class="eyebrow">${escapeHtml(prompt.verb.infinitive)} · ${escapeHtml(prompt.tense.label)}</p>
        <div class="exam-main">${escapeHtml(prompt.person.label)}</div>
        <input class="answer-input ${resultClass}" data-role="exam-input" value="${escapeAttr(prompt.userAnswer)}" placeholder="填写这一格变位，可省略主语">
      </div>
      <div class="exam-actions">
        <button class="button primary" data-action="check-exam">${iconCheck()}提交</button>
        <button class="button" data-action="next-exam">${iconCards()}下一题</button>
      </div>
      <div class="current-answer" aria-live="polite">
        <div class="label">标准答案</div>
        <div class="value">${prompt.result ? escapeHtml(prompt.standard) : "提交后显示完整标准答案"}</div>
      </div>
    </section>
  `;
}

function renderAddDialog() {
  return `
    <div class="dialog-backdrop" data-action="close-add">
      <section class="dialog" role="dialog" aria-modal="true" aria-label="添加动词" data-dialog>
        <header class="dialog-header">
          <h2 class="dialog-title">添加动词</h2>
          <button class="button icon-only" data-action="close-add" aria-label="关闭">${iconClose()}</button>
        </header>
        <div class="dialog-body">
          <div class="lookup-row">
            <input class="lookup-input" data-role="lookup-input" value="${escapeAttr(state.lookupInput)}" placeholder="输入不定式：etre, repondre, commencer">
            <button class="button primary" data-action="lookup-verb">${iconSearch()}查找标准答案</button>
            <button class="button" data-action="open-fayu-assistant">法语助手核对</button>
          </div>
          <p class="eyebrow">${escapeHtml(state.lookupStatus || "可以输入没有 accent 的形式；查到后请校对再保存。")}</p>
          ${state.draftVerb ? renderDraftEditor() : ""}
        </div>
        <footer class="dialog-footer">
          <button class="button" data-action="manual-blank">手动填写</button>
          <button class="button primary" data-action="save-draft" ${state.draftVerb ? "" : "disabled"}>${iconCheck()}保存到本地</button>
        </footer>
      </section>
    </div>
  `;
}

function renderDraftEditor() {
  const verb = state.draftVerb;
  const assistantUrl = verb.source?.url || buildFayuAssistantUrl(verb.infinitive);
  return `
    <div class="note">
      识别为：<strong>${escapeHtml(verb.infinitive)}</strong>。来源：${escapeHtml(verb.source?.label ?? "Manual")}。保存前可以直接修改任何标准答案。
      <a href="${escapeAttr(assistantUrl)}" target="_blank" rel="noreferrer">打开法语助手核对</a>
    </div>
    <div class="confirm-grid">
      ${TENSES.map((tense) => `
        <section class="tense-editor">
          <h3>${escapeHtml(tense.label)}</h3>
          ${PERSONS.map((person) => `
            <label class="editor-row">
              <span>${escapeHtml(person.label)}</span>
              <input data-role="draft-form" data-tense="${tense.key}" data-person="${person.key}" value="${escapeAttr(verb.tenses[tense.key]?.[person.key] ?? "")}">
            </label>
          `).join("")}
        </section>
      `).join("")}
    </div>
  `;
}

function bindEvents() {
  app.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", handleAction);
  });
  app.querySelectorAll("input[data-person]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const person = event.currentTarget.dataset.person;
      state.practice.rows[person].userAnswer = event.currentTarget.value;
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        checkRow(event.currentTarget.dataset.person);
      }
    });
  });
  app.querySelector("[data-action='select-verb']")?.addEventListener("change", (event) => {
    state.currentVerbId = event.currentTarget.value;
    state.practice = null;
    saveState();
    render();
  });
  app.querySelector("[data-action='select-tense']")?.addEventListener("change", (event) => {
    state.currentTense = event.currentTarget.value;
    state.practice = null;
    saveState();
    render();
  });
  app.querySelector("[data-role='lookup-input']")?.addEventListener("input", (event) => {
    state.lookupInput = event.currentTarget.value;
  });
  app.querySelectorAll("[data-role='draft-form']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const { tense, person } = event.currentTarget.dataset;
      state.draftVerb.tenses[tense][person] = event.currentTarget.value;
    });
  });
  app.querySelector("[data-role='exam-input']")?.addEventListener("input", (event) => {
    state.exam.userAnswer = event.currentTarget.value;
  });
  app.querySelector("[data-role='exam-input']")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      checkExam();
    }
  });
  app.querySelector("[data-dialog]")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "open-add") openAddDialog();
  if (action === "close-add") closeAddDialog();
  if (action === "lookup-verb") runLookup();
  if (action === "open-fayu-assistant") openFayuAssistant();
  if (action === "manual-blank") createManualDraft();
  if (action === "save-draft") saveDraftVerb();
  if (action === "pick-verb") pickVerb(event.currentTarget.dataset.id);
  if (action === "check-row") checkRow(event.currentTarget.dataset.person);
  if (action === "toggle-standards") toggleStandards();
  if (action === "reset-page") resetCurrentPage();
  if (action === "toggle-mode") toggleMode();
  if (action === "check-exam") checkExam();
  if (action === "next-exam") nextExam();
}

function ensurePractice() {
  if (state.practice) return;
  const verb = getCurrentVerb();
  const forms = verb.tenses[state.currentTense];
  state.practice = createPracticeState(forms, {
    acceptedAnswers: buildAcceptedAnswers(forms)
  });
}

function buildAcceptedAnswers(forms) {
  return Object.fromEntries(
    Object.entries(forms).map(([person, answer]) => [person, [stripVisibleSubject(answer, person)]])
  );
}

function stripVisibleSubject(answer, person) {
  const patterns = {
    je: /^(je\s+|j['’]\s*)/i,
    tu: /^tu\s+/i,
    il: /^il\/elle\/on\s+/i,
    nous: /^nous\s+/i,
    vous: /^vous\s+/i,
    ils: /^ils\/elles\s+/i
  };
  return String(answer ?? "").replace(patterns[person] ?? /^/, "").trim();
}

function getCurrentVerb() {
  return state.verbs.find((verb) => verb.id === state.currentVerbId) ?? state.verbs[0];
}

function checkRow(person) {
  const input = app.querySelector(`input[data-person="${person}"]`);
  state.practice = gradePracticeRow(state.practice, person, input?.value ?? state.practice.rows[person].userAnswer);
  updateStats(person, state.currentTense, state.practice.rows[person].correct);
  saveState();
  render();
}

function toggleStandards() {
  state.practice = toggleStandardVisibility(state.practice);
  render();
}

function resetCurrentPage() {
  if (state.mode === "exam") {
    state.exam = null;
  } else {
    state.practice = resetPracticeState(state.practice);
  }
  render();
}

function pickVerb(id) {
  state.currentVerbId = id;
  state.practice = null;
  saveState();
  render();
}

function toggleMode() {
  state.mode = state.mode === "practice" ? "exam" : "practice";
  if (state.mode === "exam") {
    state.exam = null;
  }
  saveState();
  render();
}

function ensureExam() {
  if (state.exam) return;
  const verb = randomItem(state.verbs);
  const tense = randomItem(TENSES);
  const person = randomItem(PERSONS);
  const standard = verb.tenses[tense.key][person.key];
  state.exam = {
    verb,
    tense,
    person,
    standard,
    acceptedAnswers: [stripVisibleSubject(standard, person.key)],
    userAnswer: "",
    result: null
  };
}

function checkExam() {
  ensureExam();
  const input = app.querySelector("[data-role='exam-input']");
  const value = input?.value ?? state.exam.userAnswer;
  state.exam.userAnswer = value;
  state.exam.result = gradePracticeRow(createPracticeState({ [state.exam.person.key]: state.exam.standard }, {
    acceptedAnswers: { [state.exam.person.key]: state.exam.acceptedAnswers }
  }), state.exam.person.key, value).rows[state.exam.person.key];
  updateStats(state.exam.person.key, state.exam.tense.key, state.exam.result.correct);
  saveState();
  render();
}

function nextExam() {
  state.exam = null;
  render();
}

function updateStats(person, tense, correct) {
  if (correct === null) return;
  const key = `${tense}:${person}`;
  const existing = state.stats[key] ?? { checked: 0, correct: 0 };
  state.stats[key] = {
    checked: existing.checked + 1,
    correct: existing.correct + (correct ? 1 : 0)
  };
}

function summarizeStats() {
  const entries = Object.entries(state.stats);
  const checked = entries.reduce((sum, [, stat]) => sum + stat.checked, 0);
  const correct = entries.reduce((sum, [, stat]) => sum + stat.correct, 0);
  let weakHint = "开始判分后，这里会显示容易错的时态和人称。";

  if (entries.length) {
    const weakest = entries
      .filter(([, stat]) => stat.checked > 0)
      .sort(([, a], [, b]) => (a.correct / a.checked) - (b.correct / b.checked))[0];
    if (weakest) {
      const [key, stat] = weakest;
      const [tenseKey, personKey] = key.split(":");
      const tense = TENSES.find((item) => item.key === tenseKey)?.label ?? tenseKey;
      const person = PERSONS.find((item) => item.key === personKey)?.label ?? personKey;
      weakHint = `易错：${tense} / ${person}，正确 ${stat.correct}/${stat.checked}`;
    }
  }

  return {
    checked,
    correct,
    percentage: checked ? Math.round((correct / checked) * 100) : 0,
    weakHint
  };
}

function openAddDialog() {
  state.addDialogOpen = true;
  state.lookupInput = "";
  state.lookupStatus = "";
  state.draftVerb = null;
  render();
}

function closeAddDialog() {
  state.addDialogOpen = false;
  render();
}

async function runLookup() {
  state.lookupStatus = "正在从法语助手读取标准变位...";
  render();
  const input = state.lookupInput.trim();
  if (!input) {
    state.lookupStatus = "请输入一个动词不定式。";
    render();
    return;
  }

  const assistantResult = await lookupFayuAssistant(input);
  if (assistantResult.verb) {
    state.draftVerb = withId(assistantResult.verb);
    state.lookupStatus = `已从法语助手读取 ${assistantResult.verb.infinitive}，请校对后保存。`;
    render();
    return;
  }

  state.draftVerb = null;
  state.lookupStatus = `法语助手读取失败：${assistantResult.error}。请打开法语助手核对，或手动填写后保存。`;
  render();
}

async function lookupFayuAssistant(input) {
  try {
    const response = await fetch(`/api/fayu-assistant?verb=${encodeURIComponent(input)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        verb: null,
        error: data.error ?? `请求失败 ${response.status}`
      };
    }
    return {
      verb: data.verb ?? null,
      error: data.verb ? "" : "没有返回标准答案"
    };
  } catch (error) {
    return {
      verb: null,
      error: `本地读取服务没有响应：${error.message}`
    };
  }
}

function openFayuAssistant() {
  const input = app.querySelector("[data-role='lookup-input']")?.value || state.lookupInput || getCurrentVerb()?.infinitive || "aider";
  window.open(buildFayuAssistantUrl(resolveFayuAssistantInput(input)), "_blank", "noopener,noreferrer");
}

function createManualDraft() {
  state.draftVerb = withId(buildBlankVerb(state.lookupInput || "nouveau-verbe"));
  state.lookupStatus = "已创建手动填写表格。";
  render();
}

function saveDraftVerb() {
  if (!state.draftVerb) return;
  const verb = {
    ...state.draftVerb,
    confirmedAt: new Date().toISOString()
  };
  const existingIndex = state.verbs.findIndex((item) => item.infinitive === verb.infinitive);
  if (existingIndex >= 0) {
    state.verbs[existingIndex] = verb;
  } else {
    state.verbs.push(verb);
  }
  state.currentVerbId = verb.id;
  state.practice = null;
  state.addDialogOpen = false;
  saveState();
  render();
}

function withId(verb) {
  return ensureVerbId(verb, new Set(state.verbs.map((item) => item.id)));
}

function sourceShortLabel(verb) {
  if (verb.lookupStatus === "manual" || verb.lookupStatus === "remote-manual") return "手动";
  if (verb.lookupStatus === "seed" || verb.source?.label?.includes("Local")) return "本地";
  return "已查";
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function iconCheck() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function iconPlus() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
}

function iconReset() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7v6h6M20 17a8 8 0 0 1-13.7-5.7L4 13M20 11a8 8 0 0 0-13.1-6.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function iconCards() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
}

function iconEyeOpen() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>';
}

function iconEyeClosed() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 3 18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M8.5 5.6A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.2 6.8A17.4 17.4 0 0 0 2.5 12s3.5 7 9.5 7a10.5 10.5 0 0 0 4.1-.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function iconClose() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
}

function iconSearch() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-3.4-3.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
}

render();
