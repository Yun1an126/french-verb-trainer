import { PERSONS, TENSES, normalizeForComparison } from "./conjugation.js";

const EMPTY_TENSES = Object.fromEntries(
  TENSES.map((tense) => [
    tense.key,
    Object.fromEntries(PERSONS.map((person) => [person.key, ""]))
  ])
);

export const SEED_VERBS = [
  {
    infinitive: "être",
    translation: "是，在",
    source: {
      label: "Local starter data",
      url: buildFayuAssistantUrl("être")
    },
    tenses: {
      present: {
        je: "je suis",
        tu: "tu es",
        il: "il/elle/on est",
        nous: "nous sommes",
        vous: "vous êtes",
        ils: "ils/elles sont"
      },
      passeCompose: {
        je: "j'ai été",
        tu: "tu as été",
        il: "il/elle/on a été",
        nous: "nous avons été",
        vous: "vous avez été",
        ils: "ils/elles ont été"
      },
      imparfait: {
        je: "j'étais",
        tu: "tu étais",
        il: "il/elle/on était",
        nous: "nous étions",
        vous: "vous étiez",
        ils: "ils/elles étaient"
      },
      futur: {
        je: "je serai",
        tu: "tu seras",
        il: "il/elle/on sera",
        nous: "nous serons",
        vous: "vous serez",
        ils: "ils/elles seront"
      }
    }
  },
  {
    infinitive: "avoir",
    translation: "有",
    source: {
      label: "Local starter data",
      url: buildFayuAssistantUrl("avoir")
    },
    tenses: {
      present: {
        je: "j'ai",
        tu: "tu as",
        il: "il/elle/on a",
        nous: "nous avons",
        vous: "vous avez",
        ils: "ils/elles ont"
      },
      passeCompose: {
        je: "j'ai eu",
        tu: "tu as eu",
        il: "il/elle/on a eu",
        nous: "nous avons eu",
        vous: "vous avez eu",
        ils: "ils/elles ont eu"
      },
      imparfait: {
        je: "j'avais",
        tu: "tu avais",
        il: "il/elle/on avait",
        nous: "nous avions",
        vous: "vous aviez",
        ils: "ils/elles avaient"
      },
      futur: {
        je: "j'aurai",
        tu: "tu auras",
        il: "il/elle/on aura",
        nous: "nous aurons",
        vous: "vous aurez",
        ils: "ils/elles auront"
      }
    }
  },
  {
    infinitive: "aller",
    translation: "去",
    source: {
      label: "Local starter data",
      url: buildFayuAssistantUrl("aller")
    },
    tenses: {
      present: {
        je: "je vais",
        tu: "tu vas",
        il: "il/elle/on va",
        nous: "nous allons",
        vous: "vous allez",
        ils: "ils/elles vont"
      },
      passeCompose: {
        je: "je suis allé(e)",
        tu: "tu es allé(e)",
        il: "il/elle/on est allé(e)",
        nous: "nous sommes allé(e)s",
        vous: "vous êtes allé(e)(s)",
        ils: "ils/elles sont allé(e)s"
      },
      imparfait: {
        je: "j'allais",
        tu: "tu allais",
        il: "il/elle/on allait",
        nous: "nous allions",
        vous: "vous alliez",
        ils: "ils/elles allaient"
      },
      futur: {
        je: "j'irai",
        tu: "tu iras",
        il: "il/elle/on ira",
        nous: "nous irons",
        vous: "vous irez",
        ils: "ils/elles iront"
      }
    }
  },
  {
    infinitive: "faire",
    translation: "做",
    source: {
      label: "Local starter data",
      url: buildFayuAssistantUrl("faire")
    },
    tenses: {
      present: {
        je: "je fais",
        tu: "tu fais",
        il: "il/elle/on fait",
        nous: "nous faisons",
        vous: "vous faites",
        ils: "ils/elles font"
      },
      passeCompose: {
        je: "j'ai fait",
        tu: "tu as fait",
        il: "il/elle/on a fait",
        nous: "nous avons fait",
        vous: "vous avez fait",
        ils: "ils/elles ont fait"
      },
      imparfait: {
        je: "je faisais",
        tu: "tu faisais",
        il: "il/elle/on faisait",
        nous: "nous faisions",
        vous: "vous faisiez",
        ils: "ils/elles faisaient"
      },
      futur: {
        je: "je ferai",
        tu: "tu feras",
        il: "il/elle/on fera",
        nous: "nous ferons",
        vous: "vous ferez",
        ils: "ils/elles feront"
      }
    }
  },
  {
    infinitive: "répondre",
    translation: "回答",
    source: {
      label: "Local starter data",
      url: buildFayuAssistantUrl("répondre")
    },
    tenses: {
      present: {
        je: "je réponds",
        tu: "tu réponds",
        il: "il/elle/on répond",
        nous: "nous répondons",
        vous: "vous répondez",
        ils: "ils/elles répondent"
      },
      passeCompose: {
        je: "j'ai répondu",
        tu: "tu as répondu",
        il: "il/elle/on a répondu",
        nous: "nous avons répondu",
        vous: "vous avez répondu",
        ils: "ils/elles ont répondu"
      },
      imparfait: {
        je: "je répondais",
        tu: "tu répondais",
        il: "il/elle/on répondait",
        nous: "nous répondions",
        vous: "vous répondiez",
        ils: "ils/elles répondaient"
      },
      futur: {
        je: "je répondrai",
        tu: "tu répondras",
        il: "il/elle/on répondra",
        nous: "nous répondrons",
        vous: "vous répondrez",
        ils: "ils/elles répondront"
      }
    }
  },
  {
    infinitive: "commencer",
    translation: "开始",
    source: {
      label: "Local starter data",
      url: buildFayuAssistantUrl("commencer")
    },
    tenses: {
      present: {
        je: "je commence",
        tu: "tu commences",
        il: "il/elle/on commence",
        nous: "nous commençons",
        vous: "vous commencez",
        ils: "ils/elles commencent"
      },
      passeCompose: {
        je: "j'ai commencé",
        tu: "tu as commencé",
        il: "il/elle/on a commencé",
        nous: "nous avons commencé",
        vous: "vous avez commencé",
        ils: "ils/elles ont commencé"
      },
      imparfait: {
        je: "je commençais",
        tu: "tu commençais",
        il: "il/elle/on commençait",
        nous: "nous commencions",
        vous: "vous commenciez",
        ils: "ils/elles commençaient"
      },
      futur: {
        je: "je commencerai",
        tu: "tu commenceras",
        il: "il/elle/on commencera",
        nous: "nous commencerons",
        vous: "vous commencerez",
        ils: "ils/elles commenceront"
      }
    }
  }
];

export function cloneVerb(verb) {
  return structuredClone(verb);
}

export function normalizeVerbAlias(value) {
  return normalizeForComparison(value);
}

export function buildFayuAssistantUrl(input) {
  const word = String(input ?? "").trim().toLocaleLowerCase("fr");
  return `https://www.frdic.com/dicts/cg/${encodeURIComponent(word)}?forcecg=true`;
}

export function findSeedVerb(input) {
  const alias = normalizeVerbAlias(input);
  const verb = SEED_VERBS.find((candidate) => normalizeVerbAlias(candidate.infinitive) === alias);
  return verb ? cloneVerb(verb) : null;
}

export function resolveFayuAssistantInput(input) {
  const normalized = String(input ?? "").trim().toLocaleLowerCase("fr");
  return findSeedVerb(normalized)?.infinitive ?? normalized;
}

export function buildBlankVerb(input) {
  const infinitive = String(input ?? "").trim().toLocaleLowerCase("fr");
  return {
    id: cryptoSafeId(infinitive),
    infinitive,
    translation: "",
    lookupStatus: "manual",
    source: {
      label: "法语助手核对",
      url: buildFayuAssistantUrl(infinitive)
    },
    confirmedAt: "",
    tenses: structuredClone(EMPTY_TENSES)
  };
}

export function ensureVerbId(verb, usedIds = new Set()) {
  const base = String(verb?.infinitive ?? "verb").trim() || "verb";
  let id = String(verb?.id ?? "").trim();
  if (!id || usedIds.has(id)) {
    id = cryptoSafeId(base);
    while (usedIds.has(id)) {
      id = cryptoSafeId(base);
    }
  }
  usedIds.add(id);
  return {
    ...verb,
    id
  };
}

export function ensureUniqueVerbIds(verbs) {
  const usedIds = new Set();
  return verbs.map((verb) => ensureVerbId(verb, usedIds));
}

export function deleteVerbById(verbs, id, currentVerbId) {
  if (!Array.isArray(verbs) || verbs.length <= 1) {
    return {
      verbs: Array.isArray(verbs) ? verbs : [],
      currentVerbId
    };
  }

  const deleteIndex = verbs.findIndex((verb) => verb.id === id);
  if (deleteIndex < 0) {
    return { verbs, currentVerbId };
  }

  const nextVerbs = verbs.filter((verb) => verb.id !== id);
  const nextCurrentVerbId = currentVerbId === id
    ? nextVerbs[Math.min(deleteIndex, nextVerbs.length - 1)]?.id
    : currentVerbId;

  return {
    verbs: nextVerbs,
    currentVerbId: nextCurrentVerbId ?? nextVerbs[0]?.id ?? ""
  };
}

function cryptoSafeId(seed) {
  const base = normalizeVerbAlias(seed) || "verb";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
