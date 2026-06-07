export const PERSONS = [
  { key: "je", label: "je / j'" },
  { key: "tu", label: "tu" },
  { key: "il", label: "il / elle / on" },
  { key: "nous", label: "nous" },
  { key: "vous", label: "vous" },
  { key: "ils", label: "ils / elles" }
];

export const TENSES = [
  { key: "present", label: "Présent" },
  { key: "passeCompose", label: "Passé composé" },
  { key: "imparfait", label: "Imparfait" },
  { key: "futur", label: "Futur simple" }
];

export function normalizeForComparison(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/[^a-zA-Z]/g, "");
}

export function gradeAnswer(userAnswer, standardAnswer, options = {}) {
  const normalizedUser = normalizeForComparison(userAnswer);
  const normalizedStandard = normalizeForComparison(standardAnswer);
  const acceptedAnswers = expandAcceptedAnswers([standardAnswer, stripLeadingSubject(standardAnswer), ...(options.acceptedAnswers ?? [])]);
  const normalizedAccepted = acceptedAnswers.map((answer) => normalizeForComparison(answer));
  const correct = normalizedUser.length > 0 && normalizedAccepted.includes(normalizedUser);

  return {
    correct,
    standard: standardAnswer,
    normalizedUser,
    normalizedStandard,
    message: correct ? "字母正确；请记住完整符号。" : "字母或词尾不匹配，请对照标准答案。"
  };
}

function expandAcceptedAnswers(answers) {
  const variants = new Set();

  for (const answer of answers) {
    if (!answer) continue;
    variants.add(answer);
    variants.add(removeOptionalAgreementE(answer));
  }

  return [...variants];
}

function stripLeadingSubject(answer) {
  return String(answer ?? "")
    .replace(/^(je\s+|j['’]\s*|tu\s+|il\s+|elle\s+|on\s+|il\/elle\/on\s+|nous\s+|vous\s+|ils\s+|elles\s+|ils\/elles\s+)/i, "")
    .trim();
}

function removeOptionalAgreementE(answer) {
  return String(answer ?? "").replace(/\(e\)/gi, "");
}

export function createPracticeState(forms, options = {}) {
  const rows = {};

  for (const [person, standard] of Object.entries(forms)) {
    rows[person] = {
      person,
      standard,
      acceptedAnswers: options.acceptedAnswers?.[person] ?? [],
      userAnswer: "",
      correct: null,
      revealed: false,
      message: ""
    };
  }

  return {
    forms: { ...forms },
    rows,
    showAllStandards: false,
    currentAnswer: "",
    currentPerson: ""
  };
}

export function gradePracticeRow(state, person, userAnswer) {
  const row = state.rows[person];
  if (!row) {
    return state;
  }

  const result = gradeAnswer(userAnswer, row.standard, {
    acceptedAnswers: row.acceptedAnswers ?? []
  });

  return {
    ...state,
    currentAnswer: row.standard,
    currentPerson: person,
    rows: {
      ...state.rows,
      [person]: {
        ...row,
        userAnswer,
        correct: result.correct,
        revealed: true,
        message: result.message
      }
    }
  };
}

export function resetPracticeState(state) {
  const acceptedAnswers = Object.fromEntries(
    Object.entries(state.rows).map(([person, row]) => [person, row.acceptedAnswers ?? []])
  );
  return createPracticeState(state.forms, { acceptedAnswers });
}

export function summarizePractice(state) {
  const rows = Object.values(state.rows);
  const checkedRows = rows.filter((row) => row.correct !== null);
  const correctRows = checkedRows.filter((row) => row.correct);

  return {
    checked: checkedRows.length,
    correct: correctRows.length,
    total: rows.length,
    percentage: checkedRows.length === 0 ? 0 : Math.round((correctRows.length / checkedRows.length) * 100)
  };
}

export function toggleStandardVisibility(state) {
  return {
    ...state,
    showAllStandards: !state.showAllStandards
  };
}
