import { PERSONS, TENSES } from "./conjugation.js";
import { buildFayuAssistantUrl } from "./verbData.js";

const PERSON_PATTERNS = {
  je: /^(J['’]|Je\s+)/i,
  tu: /^Tu\s+/i,
  il: /^Il\s+/i,
  nous: /^Nous\s+/i,
  vous: /^Vous\s+/i,
  ils: /^Ils\s+/i
};

export function stripHtmlToText(html) {
  return decodeHtmlEntities(String(html ?? ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|table|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function parseFayuAssistantText(text, fallbackInfinitive) {
  const lines = String(text ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const infinitive = extractInfinitive(lines, fallbackInfinitive);
  const presentStart = findFirstPersonTableStart(lines);
  const firstTableRows = collectRows(lines, presentStart);
  const secondTableRows = collectRows(lines, presentStart + firstTableRows.length + 1);

  const first = parseFourColumnRows(firstTableRows);
  const second = parseFourColumnRows(secondTableRows);

  if (!first || !second) {
    return null;
  }

  const tenses = {
    present: first[0],
    passeCompose: first[1],
    imparfait: first[2],
    futur: second[2]
  };

  if (!hasCompleteSupportedTenses(tenses)) {
    return null;
  }

  return {
    id: "",
    infinitive,
    translation: "",
    lookupStatus: "fayu-assistant",
    source: {
      label: "法语助手自动读取",
      url: buildFayuAssistantUrl(infinitive)
    },
    confirmedAt: "",
    tenses
  };
}

export function parseFayuAssistantHtml(html, fallbackInfinitive) {
  return parseFayuAssistantText(stripHtmlToText(html), fallbackInfinitive);
}

function collectRows(lines, startIndex) {
  if (startIndex < 0) {
    return [];
  }

  const rows = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (rows.length === 6) {
      break;
    }
    if (lineStartsWithPerson(line)) {
      rows.push(line);
    } else if (rows.length > 0 && /^(直陈式|虚拟|条件式|命令式|现在分词|过去分词)/.test(line)) {
      break;
    }
  }
  return rows.length === 6 ? rows : [];
}

function findFirstPersonTableStart(lines) {
  return lines.findIndex((line) => lineStartsWithPerson(line));
}

function parseFourColumnRows(rows) {
  if (rows.length !== 6) {
    return null;
  }

  const columns = [emptyForms(), emptyForms(), emptyForms(), emptyForms()];
  for (const person of PERSONS) {
    const row = rows.find((line) => PERSON_PATTERNS[person.key].test(line));
    if (!row) {
      return null;
    }
    const forms = splitFayuRow(row, person.key);
    if (forms.length < 4) {
      return null;
    }
    for (let index = 0; index < 4; index += 1) {
      columns[index][person.key] = forms[index];
    }
  }
  return columns;
}

function splitFayuRow(row, person) {
  const nextStarters = getNextStarters(person);
  if (!nextStarters.length) {
    return [row.trim()];
  }

  const pattern = new RegExp(`\\s+(?=${nextStarters.join("|")})`, "giu");
  return row
    .split(pattern)
    .map((item) => cleanFayuForm(item.trim()))
    .filter(Boolean);
}

function cleanFayuForm(value) {
  return String(value ?? "")
    .replace(/(\p{L})\s+([çÇ])\s+(\p{L})/gu, "$1$2$3")
    .replace(/(\p{Ll}{2,})\s+(u|s|t|e|es|is|ent|ons|ez|ais|ait|ions|iez|aient|ai|as|a|âmes|âtes|èrent|rai|ras|ra|rons|rez|ront|ont|é)(?=\b)/gu, "$1$2");
}

function getNextStarters(person) {
  return {
    je: ["J['’]", "Je\\s+"],
    tu: ["Tu\\s+"],
    il: ["Il\\s+"],
    nous: ["Nous\\s+"],
    vous: ["Vous\\s+"],
    ils: ["Ils\\s+"]
  }[person] ?? [];
}

function lineStartsWithPerson(line) {
  return Object.values(PERSON_PATTERNS).some((pattern) => pattern.test(line));
}

function emptyForms() {
  return Object.fromEntries(PERSONS.map((person) => [person.key, ""]));
}

function hasCompleteSupportedTenses(tenses) {
  return TENSES.every((tense) => PERSONS.every((person) => Boolean(tenses[tense.key]?.[person.key])));
}

function extractInfinitive(lines, fallbackInfinitive) {
  const fromOriginal = lines
    .find((line) => line.includes("动词原形"))
    ?.replace(/^.*动词原形：?\s*/u, "")
    .split(/\s+/)[0];
  return (fromOriginal || fallbackInfinitive || "").trim().toLocaleLowerCase("fr");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
