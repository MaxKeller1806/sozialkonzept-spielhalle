/**
 * Didaktische Inhalte für BAV-Unterweisungen Sicherheitskonzept.
 * Wird von scripts/seed-safety-content.mjs importiert.
 */

/** @typedef {{ question: string, answers?: string[], correct?: number, examType?: string, poolType?: string, examCorrect?: number|boolean, explanation?: string, difficulty?: string }} QuizDef */

function quizToBlock(q) {
  const isBoolean =
    q.examType === "boolean" ||
    q.poolType === "boolean" ||
    (!q.answers?.length && q.examCorrect !== undefined);
  if (isBoolean) {
    const statementTrue = q.examCorrect === true;
    return {
      type: "quiz",
      question: q.question,
      answers: ["Richtig", "Falsch"],
      correct: statementTrue ? 0 : 1,
      explanation: q.explanation,
    };
  }
  return {
    type: "quiz",
    question: q.question,
    answers: q.answers,
    correct: q.correct ?? 0,
    explanation: q.explanation,
  };
}

/** Konvertiert Prüfungsfragen-Definitionen für question_pool (DB). */
export function examPoolQuestionToDbFields(q) {
  const poolType =
    q.poolType ??
    q.examType ??
    (q.answers?.length ? "single" : "boolean");

  const answers = q.answers ?? [];
  let correctAnswer;
  if (poolType === "boolean") {
    correctAnswer = String(q.examCorrect === true);
  } else if (poolType === "multiple") {
    correctAnswer = JSON.stringify(q.examCorrect ?? q.correct ?? []);
  } else {
    correctAnswer = JSON.stringify(q.examCorrect ?? q.correct ?? 0);
  }

  return {
    question: q.question,
    question_type: poolType === "situation" ? "situation" : poolType,
    answer_a: answers[0] ?? (poolType === "boolean" ? "Richtig" : null),
    answer_b: answers[1] ?? (poolType === "boolean" ? "Falsch" : null),
    answer_c: answers[2] ?? null,
    answer_d: answers[3] ?? null,
    correct_answer: correctAnswer,
    explanation: q.explanation ?? null,
    difficulty: q.difficulty ?? null,
  };
}

/**
 * @param {{
 *   masterId: string;
 *   code: string;
 *   fullTitle: string;
 *   validityMonths: number;
 *   version?: string;
 *   intro: string;
 *   goals: string;
 *   basics: string[];
 *   practice: string[];
 *   mistakes: string;
 *   example: { title: string; body: string; solution: string };
 *   merksatz: string;
 *   quizzes?: QuizDef[];
 *   understandingQuizzes?: QuizDef[];
 *   examPool?: QuizDef[];
 *   examQuestionsPerTest?: number;
 *   customBlocks?: Array<Record<string, unknown>>;
 *   durationMinutes?: number;
 *   recommendedMinutes?: string;
 * }} def
 */
export function buildSafetyInstructionCourse(def) {
  const understanding = def.understandingQuizzes ?? def.quizzes ?? [];
  const quizBlocks = understanding.map(quizToBlock);

  const defaultBlocks = [
    { type: "text", body: def.intro },
    { type: "info", title: "Lernziele", body: def.goals },
    { type: "summary", title: "Wichtige Grundlagen", items: def.basics },
    { type: "summary", title: "Richtiges Verhalten in der Praxis", items: def.practice },
    { type: "fehler", title: "Typische Fehler", body: def.mistakes },
    {
      type: "praxis",
      title: def.example.title,
      body: def.example.body,
      solution: def.example.solution,
    },
    { type: "merksatz", body: def.merksatz },
  ];

  const lessonBlocks = [
    { type: "heading", title: def.fullTitle },
    ...(def.customBlocks ?? defaultBlocks),
    { type: "heading", title: "Verständnisfragen" },
    ...quizBlocks,
  ];

  const perTest = def.examQuestionsPerTest ?? (def.examPool ? 5 : understanding.length);
  const minCorrect = Math.max(1, Math.ceil(perTest * 0.8));

  const legacyExam =
    def.examPool != null
      ? []
      : understanding.map((q, index) => {
          const examType = q.examType ?? (q.answers ? "single" : "boolean");
          const base = {
            id: index + 1,
            moduleId: 1,
            question: q.question,
            type: examType,
          };
          if (examType === "boolean") {
            return { ...base, correct: q.examCorrect === true };
          }
          return {
            ...base,
            answers: q.answers,
            correct: q.examCorrect ?? q.correct ?? 0,
          };
        });

  const duration = def.durationMinutes ?? 8;
  const recommended =
    def.recommendedMinutes ??
    (duration <= 7 ? "ca. 5–7 Min." : duration > 10 ? "ca. 12–15 Min." : "ca. 8–10 Min.");

  return {
    courseId: def.masterId,
    courseName: def.fullTitle,
    version: def.version ?? "1.0",
    durationMinutes: duration,
    maxDurationMinutes: 30,
    recommendedMinutes: recommended,
    passingScore: 80,
    minCorrectAnswers: minCorrect,
    totalQuestions: perTest,
    certificateValidityMonths: def.validityMonths,
    certificateTitle: `Nachweis ${def.fullTitle}`,
    examQuestionsPerTest: perTest,
    examPoolSize: def.examPool?.length ?? legacyExam.length,
    modules: [
      {
        id: 1,
        title: def.fullTitle,
        duration,
        lessons: [
          {
            id: 1,
            title: def.fullTitle,
            content: def.intro.slice(0, 500),
            blocks: lessonBlocks,
          },
        ],
      },
    ],
    exam: legacyExam,
  };
}

export const SAFETY_INSTRUCTION_CONTENT = [
  {
    masterId: "master-bav-n7",
    code: "N7",
    fullTitle: "N7 Verhalten bei einem Überfall",
    version: "2.0",
    validityMonths: 6,
    durationMinutes: 6,
    recommendedMinutes: "ca. 5–7 Min.",
    examQuestionsPerTest: 5,
    intro:
      "Ein Überfall ist selten – aber extrem gefährlich. Diese Unterweisung zeigt kompakt, wie Sie Menschen schützen und typische Fehler vermeiden.",
    goals: "",
    basics: [],
    practice: [],
    mistakes: "",
    example: { title: "", body: "", solution: "" },
    merksatz: "",
    understandingQuizzes: [
      {
        question: "Was hat bei einem Überfall absolute Priorität?",
        answers: [
          "Bargeld und Automaten schützen",
          "Eigenschutz und Schutz der Menschen",
          "Den Täter sofort beschreiben",
          "Videoaufnahmen starten",
        ],
        correct: 1,
        explanation:
          "Menschenleben und Gesundheit gehen vor Bargeld, Automaten und Sachwerten.",
      },
      {
        question: "Was sollte bei einem bewaffneten Überfall unbedingt vermieden werden?",
        answers: [
          "Gegenwehr leisten",
          "Ruhig bleiben und Anweisungen befolgen",
          "Nach Abzug des Täters die Polizei rufen",
          "Gäste beruhigen",
        ],
        correct: 0,
        explanation:
          "Gegenwehr, Verfolgung oder das Wegnehmen von Waffen können die Situation eskalieren lassen.",
      },
      {
        question: "Nach einem Überfall sollten Beobachtungen zeitnah festgehalten werden.",
        examType: "boolean",
        examCorrect: true,
        explanation:
          "Je schneller Sie Erinnerungen dokumentieren, desto genauer sind sie – z. B. mit dem Fahndungsblatt.",
      },
      {
        question:
          "Hilfe nach einem belastenden Überfall anzunehmen, ist ein Zeichen von Schwäche.",
        examType: "boolean",
        examCorrect: false,
        explanation:
          "Psychische Belastung ist normal. Unterstützung anzunehmen ist kein Zeichen von Schwäche.",
      },
    ],
    examPool: [
      {
        question: "Menschenleben und Gesundheit haben Vorrang vor …",
        answers: ["Bargeld, Automaten und Sachwerten", "Hausordnung und Öffnungszeiten", "Videoüberwachung", "Kassenprotokollen"],
        correct: 0,
        explanation: "Eigenschutz und Menschenschutz stehen über materiellen Werten.",
      },
      {
        question: "Täter in Überfallsituationen reagieren häufig berechenbar und gelassen.",
        poolType: "boolean",
        examCorrect: false,
        explanation: "Täter stehen oft unter Druck und können unberechenbar reagieren.",
      },
      {
        question: "Eine gezeigte Waffe kann auch unecht sein.",
        poolType: "boolean",
        examCorrect: true,
        explanation: "Ob echt oder unecht – immer von einer echten Bedrohung ausgehen.",
      },
      {
        question: "Was bedeutet „Ruhe bewahren“ während eines Überfalls?",
        answers: [
          "Laut Anweisungen geben und hektische Bewegungen vermeiden",
          "Schnell handeln und den Täter überraschen",
          "Gäste zur Hilfe auffordern",
          "Sofort Alarm auslösen, auch wenn der Täter noch da ist",
        ],
        correct: 0,
        explanation: "Langsam und ruhig handeln – hektische Bewegungen können provozieren.",
      },
      {
        question: "Bei einem Überfall ist es sinnvoll, den flüchtenden Täter festzuhalten.",
        poolType: "boolean",
        examCorrect: false,
        explanation: "Täter nicht verfolgen oder festhalten – Eskalationsgefahr.",
      },
      {
        question: "Ein maskierter Täter fordert Bargeld und wirkt nervös. Wie reagieren Sie?",
        poolType: "situation",
        answers: [
          "Laut diskutieren, dass wenig Wechselgeld da ist",
          "Ruhig bleiben, Anweisungen ohne Provokation befolgen",
          "Hinter die Theke gehen und Alarm auslösen",
          "Gäste bitten, einzugreifen",
        ],
        correct: 1,
        explanation: "Deeskalation: ruhig bleiben, Forderungen erfüllen, nicht provozieren.",
      },
      {
        question: "Was ist beim Schutz der Gäste richtig?",
        answers: [
          "Gäste beruhigen, ohne die eigene Sicherheit zu gefährden",
          "Gäste zwischen Täter und Kasse stellen",
          "Gäste auffordern, den Täter zu stoppen",
          "Gäste zuerst evakuieren, auch wenn der Täter das verbietet",
        ],
        correct: 0,
        explanation: "Gäste schützen – aber niemals die eigene Sicherheit aufs Spiel setzen.",
      },
      {
        question: "Während eines Überfalls soll man den Täter möglichst genau anstarren.",
        poolType: "boolean",
        examCorrect: false,
        explanation: "Nicht starren, nicht provozieren, nicht auffällig beobachten.",
      },
      {
        question: "Welche Beobachtung kann nach einem Überfall hilfreich sein?",
        answers: ["Fluchtrichtung oder Fahrzeug", "Lieblingsfarbe des Täters", "Schuhgröße des Täters", "Name des Täters"],
        correct: 0,
        explanation: "Fluchtrichtung, Fahrzeug, Kleidung und Merkmale – wenn gefahrlos möglich.",
      },
      {
        question: "Was ist nach Abzug des Täters der erste wichtige Schritt?",
        answers: [
          "Polizei verständigen und Bereich sichern",
          "Tatort sofort reinigen",
          "Kasse wieder öffnen",
          "Social Media informieren",
        ],
        correct: 0,
        explanation: "Polizei rufen, Bereich sichern, Tatort nicht verändern.",
      },
      {
        question: "Den Tatort dürfen Mitarbeiter nach einem Überfall sofort reinigen.",
        poolType: "boolean",
        examCorrect: false,
        explanation: "Tatort nicht verändern – Spuren und Gegenstände nicht anfassen.",
      },
      {
        question: "Wozu dient das Fahndungsblatt?",
        answers: [
          "Beobachtungen zeitnah zu dokumentieren",
          "Den Täter selbst zu identifizieren",
          "Die Versicherung zu informieren",
          "Gäste zu befragen",
        ],
        correct: 0,
        explanation: "Erinnerungen strukturiert und zeitnah festhalten.",
      },
      {
        question: "Psychische Belastung nach einem Überfall ist normal – Unterstützung anzunehmen ist kein Zeichen von Schwäche.",
        poolType: "boolean",
        examCorrect: true,
        explanation: "Gesprächsangebote nutzen – Hilfe annehmen ist normal und richtig.",
      },
      {
        question: "Der Täter hat das Gelände verlassen. Was tun Sie?",
        poolType: "situation",
        answers: [
          "Dem Täter nachlaufen",
          "Polizei rufen, Bereich sichern, Zeugen notieren, Vorgesetzte informieren",
          "Gegenstände am Tatort säubern",
          "Kasse sofort wieder öffnen",
        ],
        correct: 1,
        explanation: "Nach dem Überfall: Polizei, Sicherung, Zeugen, Meldung, Dokumentation.",
      },
      {
        question: "Welcher Fehler gefährdet besonders die eigene Sicherheit?",
        answers: ["Diskussionen mit dem Täter", "Ruhe bewahren", "Anweisungen befolgen", "Nach dem Vorfall die Polizei informieren"],
        correct: 0,
        explanation: "Diskussionen, Widerstand und Provokation können eskalieren.",
      },
      {
        question: "Von Mitarbeitenden wird bei einem Überfall keine Heldenrolle erwartet.",
        poolType: "boolean",
        examCorrect: true,
        explanation: "Sie sind keine Sicherheitskräfte – Eigenschutz hat Vorrang.",
      },
    ],
    customBlocks: [
      {
        type: "text",
        body:
          "Ein Überfall gehört zu den gefährlichsten Situationen in einer Spielhalle. Auch wenn solche Ereignisse selten sind, müssen alle wissen, wie sie sich richtig verhalten.\n\nZiel ist nicht, Geld oder Automaten zu schützen. Der Schutz von Menschen – Sie selbst, Gäste und Kollegen – hat oberste Priorität.",
      },
      {
        type: "info",
        title: "Lernziele",
        body:
          "Nach dieser Unterweisung können Sie:\n\n• die Grundregel im Überfall anwenden\n• ruhig und ohne Gegenwehr handeln\n• typische Fehler vermeiden\n• wichtige Beobachtungen wahrnehmen\n• die Schritte nach einem Überfall kennen",
      },
      {
        type: "hinweis",
        title: "Grundregel",
        body:
          "Menschenleben und Gesundheit haben Vorrang vor Bargeld, Automaten und Sachwerten. Kein Mitarbeiter soll sich selbst in Gefahr bringen, um Werte zu schützen.",
      },
      {
        type: "heading",
        title: "Warum Überfälle besonders gefährlich sind",
      },
      {
        type: "summary",
        title: "Gefahren verstehen",
        items: [
          "Täter stehen häufig unter Druck",
          "Täter können unberechenbar reagieren",
          "Waffen können echt oder unecht sein",
          "Bereits kleine Fehler können eskalieren",
        ],
      },
      {
        type: "heading",
        title: "Verhalten während eines Überfalls",
      },
      {
        type: "heading",
        title: "Ruhe bewahren",
      },
      {
        type: "text",
        body: "Ruhig bleiben, langsam handeln, keine hektischen Bewegungen – das reduziert das Eskalationsrisiko.",
      },
      {
        type: "heading",
        title: "Keine Gegenwehr leisten",
      },
      {
        type: "summary",
        title: "Nicht versuchen",
        items: [
          "den Täter festzuhalten",
          "den Täter zu verfolgen",
          "eine Waffe wegzunehmen",
          "körperlich einzugreifen",
        ],
      },
      {
        type: "heading",
        title: "Forderungen befolgen",
      },
      {
        type: "text",
        body: "Anweisungen möglichst befolgen, Diskussionen und Provokationen vermeiden.",
      },
      {
        type: "heading",
        title: "Keine Heldenrolle übernehmen",
      },
      {
        type: "text",
        body: "Sie sind keine Sicherheitskräfte. Niemand erwartet heldenhaftes Verhalten.",
      },
      {
        type: "heading",
        title: "Gäste schützen",
      },
      {
        type: "text",
        body: "Gäste beruhigen – aber niemals die eigene Sicherheit gefährden.",
      },
      {
        type: "heading",
        title: "Täterbeobachtung",
      },
      {
        type: "text",
        body: "Falls gefahrlos möglich, können Beobachtungen später helfen:",
      },
      {
        type: "summary",
        title: "Merkmale notieren",
        items: [
          "Geschlecht, Alter, Größe",
          "Kleidung und besondere Merkmale",
          "Sprache oder Dialekt",
          "Fluchtrichtung und Fahrzeug",
        ],
      },
      {
        type: "hinweis",
        title: "Wichtig",
        body: "Nicht auffällig beobachten. Nicht starren. Nicht provozieren.",
      },
      {
        type: "heading",
        title: "Verhalten nach dem Überfall",
      },
      {
        type: "summary",
        title: "Schritte nach dem Überfall",
        items: [
          "Polizei verständigen",
          "Bereich sichern",
          "Tatort nicht verändern – Gegenstände nicht anfassen",
          "Zeugen festhalten und Namen notieren",
          "Vorgesetzte informieren",
          "Fahndungsblatt nutzen – Beobachtungen zeitnah dokumentieren",
        ],
      },
      {
        type: "heading",
        title: "Psychische Belastung",
      },
      {
        type: "text",
        body:
          "Überfälle können psychisch belasten. Gesprächsangebote annehmen, Unterstützung nutzen – Hilfe anzunehmen ist kein Zeichen von Schwäche.",
      },
      {
        type: "fehler",
        title: "Typische Fehler",
        body:
          "Diskussionen mit dem Täter · Widerstand leisten · Provokationen · Verfolgung des Täters · überstürzte Handlungen · eigenmächtige Ermittlungen",
      },
      {
        type: "praxis",
        title: "Praxisbeispiel",
        body:
          "Ein maskierter Täter betritt die Spielhalle, fordert Bargeld und wirkt nervös.",
        solution:
          "Der Mitarbeiter bleibt ruhig, befolgt die Anweisungen ohne Provokation und leistet keine Gegenwehr. Nach Abzug des Täters: Polizei verständigen, Bereich sichern, Beobachtungen dokumentieren.",
      },
      {
        type: "merksatz",
        body:
          "Menschenleben gehen immer vor Sachwerten. Ruhe bewahren. Keine Gegenwehr leisten. Polizei verständigen.",
      },
      {
        type: "summary",
        title: "Zusammenfassung",
        items: [
          "Menschenleben vor Sachwerten",
          "Ruhe bewahren – keine Gegenwehr",
          "Anweisungen befolgen, nicht provozieren",
          "Gäste schützen, ohne sich zu gefährden",
          "Nach dem Überfall: Polizei, sichern, dokumentieren",
        ],
      },
    ],
  },
  {
    masterId: "master-bav-n9",
    code: "N9",
    fullTitle: "N9 Umgang mit Bargeldbeständen",
    validityMonths: 6,
    intro:
      "Bargeld in der Spielhalle ist ein Sicherheitsrisiko, wenn Bestände zu hoch sind oder unsachgemäß gehandhabt werden. Ziel ist, Geldmengen gering zu halten und interne Regeln konsequent einzuhalten.",
    goals:
      "Sie kennen die Grundsätze für sicheren Umgang mit Bargeldbeständen und wissen, wann Sie Auffälligkeiten melden müssen.",
    basics: [
      "Hohe Kassenbestände erhöhen Diebstahl- und Überfallrisiko.",
      "Geld gehört nicht sichtbar auf Theke oder in Gastbereiche.",
      "Regelmäßige Kontrolle und Dokumentation sind betriebsüblich.",
      "Interne Vorgaben zum Wechselgeld und zur Entsorgung von Münzen gelten verbindlich.",
      "Informationen über Geldbestände sind vertraulich.",
    ],
    practice: [
      "Kassenbestände regelmäßig prüfen und gemäß Vorgabe abführen.",
      "Geld nicht offen liegen lassen – sicher verwahren oder transportieren.",
      "Nur autorisierte Personen handhaben größere Bargeldmengen.",
      "Keine unnötigen Details über Bestände oder Transporte weitergeben.",
      "Auffälligkeiten (fehlende Beträge, manipulierte Kassen) sofort melden.",
    ],
    mistakes:
      "„Die Kasse ist eh fast leer – ich lasse das Wechselgeld offen liegen.“ Oder: Kollegen im Gastraum über anstehende Geldabholungen informieren. Beides erleichtert kriminelle Beobachtung von außen.",
    example: {
      title: "Praxisfall: Hoher Münzbestand nach Stoßzeit",
      body: "Nach einem vollen Abend ist die Münzkasse sehr voll. Der nächste Transport ist erst morgen geplant.",
      solution:
        "Interne Grenzwerte prüfen. Wenn überschritten: Vorgesetzten informieren und kurzfristige Abfuhrt oder Zwischenlagerung nach Betriebsvorgabe veranlassen. Kasse nicht offen liegen lassen. Keine Transportdetails laut besprechen.",
    },
    merksatz: "Wenig Bargeld sichtbar – wenig Angriffsfläche.",
    quizzes: [
      {
        question: "Warum sollen Bargeldbestände gering gehalten werden?",
        answers: [
          "Weil Geld unhygienisch ist",
          "Um Diebstahl- und Überfallrisiko zu reduzieren",
          "Weil Kartenzahlung Pflicht ist",
          "Nur aus steuerlichen Gründen",
        ],
        correct: 1,
        explanation: "Geringe Bestände verringern Anreiz und Schaden bei Überfällen.",
      },
      {
        question: "Geld darf kurzzeitig offen auf der Theke liegen, wenn man schnell zurückkommt.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Geld nicht offen liegen lassen – auch nicht „nur kurz“.",
      },
      {
        question: "Was tun Sie bei fehlendem Bargeld in der Kasse?",
        answers: [
          "Selbst aus eigener Tasche auffüllen",
          "Auffälligkeit melden und dokumentieren",
          "Ignorieren",
          "Gäste fragen",
        ],
        correct: 1,
        explanation: "Abweichungen immer melden – nicht vertuschen.",
      },
      {
        question: "Über geplante Geldtransporte sollten Sie …",
        answers: [
          "nur im Pausenraum besprechen",
          "keine unnötigen Informationen nach außen geben",
          "Gäste informieren",
          "in sozialen Medien posten",
        ],
        correct: 1,
        explanation: "Transportinformationen vertraulich behandeln.",
      },
    ],
  },
  {
    masterId: "master-bav-n10",
    code: "N10",
    fullTitle: "N10 Geldtransporte",
    validityMonths: 12,
    intro:
      "Geldtransporte sind in Spielhallen ein sensibler Vorgang: Bargeld wird zwischen Kasse, Tresor und externem Transportdienst bewegt. Kriminelle beobachten Routinen und Zeiten. Unauffälliges, regelkonformes Handeln und Eigenschutz sind entscheidend.",
    goals:
      "Sie kennen die betrieblichen Vorgaben für Geldtransporte, vermeiden vorhersehbare Routinen und schützen sich und Kollegen während des Transports.",
    basics: [
      "Geldtransporte folgen festen internen Abläufen – nur autorisierte Personen.",
      "Wiederkehrende Zeiten und Wege erleichtern kriminelle Planung.",
      "Transportmittel und -taschen sind betriebsvorgeschrieben und gekennzeichnet.",
      "Begleitung oder Dienstleister sind je nach Vorgabe vorgesehen.",
      "Eigenschutz hat Vorrang – bei Bedrohung keine Konfrontation.",
    ],
    practice: [
      "Nur nach Freigabe und gemäß Transportplan handeln.",
      "Keine festen Routinen nach außen erkennbar machen – Zeiten variieren, wenn betrieblich möglich.",
      "Geld in geeigneten Transportbehältnissen, nicht sichtbar tragen.",
      "Keine Transportdetails in Gäste- oder Publikumsbereichen besprechen.",
      "Bei Unsicherheit oder Bedrohung: abbrechen, sichern, Polizei und Vorgesetzte informieren.",
      "Übergabe an Dienstleister nur nach Identitätsprüfung gemäß Vorgabe.",
    ],
    mistakes:
      "„Jeden Dienstag um 10 Uhr hole ich das Geld ab – das wissen alle.“ Feste Zeiten und laute Ankündigungen im Betrieb sind Einladungen für Beobachtung. Auch allein zu transportieren, obwohl Begleitung vorgesehen ist, oder Geld in normalen Einkaufstaschen zu tragen, erhöht das Risiko.",
    example: {
      title: "Praxisfall: Abholung durch Werttransportdienst",
      body: "Der externe Dienst meldet sich kurzfristig früher als geplant. Sie sind allein an der Kasse, der Tresorinhalt ist vorbereitet.",
      solution:
        "Interne Vorgabe prüfen: Ist Vorab-Abholung zulässig? Identität und Auftrag des Dienstes verifizieren (Ausweis, Auftragsnummer). Keinen Transport unter Druck starten. Bei Abweichung Vorgesetzten kontaktieren. Geld erst nach Freigabe übergeben – unauffällig, nicht im Gastbereich.",
    },
    merksatz: "Unauffällig, unvorhersehbar, nach Vorgabe – nie allein improvisieren.",
    quizzes: [
      {
        question: "Warum sollen Geldtransporte keine festen, öffentlich bekannten Routinen haben?",
        answers: [
          "Weil Transporte illegal sind",
          "Um kriminelle Beobachtung und Planung zu erschweren",
          "Weil Gäste es stört",
          "Nur aus Versicherungsgründen",
        ],
        correct: 1,
        explanation: "Vorhersehbare Abläufe erleichtern Überfälle und Diebstähle.",
      },
      {
        question: "Geld darf während eines Transports kurz offen auf der Theke liegen.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Geld während des gesamten Transports gesichert und unauffällig handhaben.",
      },
      {
        question: "Was ist bei der Übergabe an einen Werttransportdienst wichtig?",
        answers: [
          "Schnell übergeben, Identität spielt keine Rolle",
          "Identität und Auftrag gemäß Betriebsvorgabe prüfen",
          "Gäste als Zeugen hinzuziehen",
          "Betrag laut vorlesen",
        ],
        correct: 1,
        explanation: "Nur autorisierte und verifizierte Abholer – interne Prüfschritte einhalten.",
      },
      {
        question: "Situation: Jemand drängt Sie beim Transport zur Eile und wird laut. Was tun?",
        answers: [
          "Schnell übergeben, um Ruhe zu haben",
          "Abbrechen, Bereich sichern, Vorgesetzte und ggf. Polizei informieren",
          "Gäste um Hilfe bitten",
          "Transport im Gastraum fortsetzen",
        ],
        correct: 1,
        explanation: "Eigenschutz und Vorgaben – bei Bedrohung nicht unter Druck handeln.",
      },
      {
        question: "Über Zeitpunkt und Umfang von Geldtransporten sollten Sie …",
        answers: [
          "Kollegen im Gastbereich informieren",
          "vertraulich handeln und nur berechtigte Personen einbeziehen",
          "eine Notiz an der Eingangstür anbringen",
          "Gäste vorwarnen",
        ],
        correct: 1,
        explanation: "Transportinformationen nicht unnötig verbreiten.",
      },
    ],
  },
  {
    masterId: "master-bav-n19",
    code: "N19",
    fullTitle: "N19 Verhalten im Brandfall und Notfall",
    validityMonths: 12,
    intro:
      "Brände und Notfälle in Spielhallen können schnell eskalieren – viele Personen, Technik, eingeschränkte Fluchtwege. Ruhe, klare Schritte und Kenntnis der Fluchtwege retten Leben. Diese Unterweisung vermittelt das richtige Verhalten vor und während eines Notfalls.",
    goals:
      "Sie wissen, wie Sie im Brand- und Notfall warnen, den Notruf absetzen, Fluchtwege nutzen und sich am Sammelplatz melden.",
    basics: [
      "Im Brandfall gilt: Menschen retten, warnen, melden, löschen – in dieser Reihenfolge, soweit möglich.",
      "Notruf 112: Wo? Was? Wie viele Verletzte? Was ist passiert? Warten auf Rückfragen.",
      "Fluchtwege und Notausgänge müssen frei und bekannt sein.",
      "Sammelplatz ist im Betrieb festgelegt – dorthin versammeln und nicht wieder eintreten.",
      "Rauch steigt auf – in Kniehoehe oder gebückt fliehen, Türen schließen.",
    ],
    practice: [
      "Ruhe bewahren – Panik überträgt sich und blockiert Fluchtwege.",
      "Brand unverzüglich melden: interne Alarmierung und 112.",
      "Gäste und Kollegen laut und deutlich warnen („Brand! Raus!“).",
      "Fluchtwege und Notausgänge nutzen, Aufzüge meiden.",
      "Am Sammelplatz einfinden, Feuerwehr informieren, wer noch fehlt.",
      "Nicht zurück in Gebäude – auch nicht für persönliche Gegenstände.",
    ],
    mistakes:
      "„Ich schaue erst, ob es wirklich brennt.“ Zögern kostet Zeit. Oder: Gäste im Spielbetrieb lassen, weil „es harmlos aussieht“. Auch Rauch durch offene Türen zu verbreiten oder den Sammelplatz zu ignorieren, gefährdet alle.",
    example: {
      title: "Situation: Rauchgeruch im Technikbereich",
      body: "Gegen Feierabend riechen Sie verbrannten Kunststoff nahe der Geräte. Gäste sind noch im Raum, ein Kollege prüft die Klimaanlage.",
      solution:
        "Sofort internen Alarm auslösen bzw. Vorgesetzten informieren. Gäste und Kollegen zur Evakuierung auffordern. 112 mit genauer Ortsangabe rufen. Fluchtwege freihalten, Bereich nicht allein erkunden. Am Sammelplatz melden, Fehlende nennen. Erst nach Freigabe der Feuerwehr wieder eintreten.",
    },
    merksatz: "Warnen, 112, raus – Sammelplatz, nicht zurück.",
    quizzes: [
      {
        question: "Welche Nummer wählen Sie bei einem Brandnotfall?",
        answers: ["110", "112", "116 117", "0800"],
        correct: 1,
        explanation: "112 ist der europäische Notruf für Feuerwehr und Rettungsdienst.",
      },
      {
        question: "Im Brandfall sollten Sie zuerst Ihre persönlichen Gegenstände holen.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Nicht zurückgehen – Leben und Evakuierung haben Vorrang.",
      },
      {
        question: "Was gehört zu einer vollständigen Notrufmeldung?",
        answers: [
          "Nur die Adresse",
          "Ort, Art des Notfalls, Verletzte, eigene Rückrufnummer",
          "Nur „Es brennt“",
          "Name des Geschäftsführers",
        ],
        correct: 1,
        explanation: "W-Fragen: Wo? Was? Wie viele Verletzte? Was ist passiert? Warten auf Rückfragen.",
      },
      {
        question: "Situation: Alarm ertönt, Gäste reagieren verunsichert. Was ist richtig?",
        answers: [
          "Beruhigen und weiterspielen lassen, bis sicher ist",
          "Deutlich zur Evakuierung auffordern und Fluchtwege zeigen",
          "Türen schließen und warten",
          "Nur Kollegen informieren",
        ],
        correct: 1,
        explanation: "Klare Ansage und Führung zur Flucht – keine falsche Beruhigung.",
      },
      {
        question: "Am Sammelplatz sollten Sie …",
        answers: [
          "sofort wieder reingehen, wenn es ruhig wirkt",
          "bleiben, Fehlende melden und auf Anweisung warten",
          "nach Hause gehen",
          "Fotos machen",
        ],
        correct: 1,
        explanation: "Sammelplatz einhalten – Feuerwehr braucht Übersicht über Anwesende.",
      },
    ],
  },
  {
    masterId: "master-bav-n21",
    code: "N21",
    fullTitle: "N21 Brandbekämpfung",
    validityMonths: 12,
    intro:
      "Brandbekämpfung durch Mitarbeitende ist nur in engen Grenzen sinnvoll. In Spielhallen mit Gästen und Technik gilt: Menschenrettung und Evakuierung zuerst. Ein Entstehungsbrand darf nur bekämpft werden, wenn Sie sich und andere nicht gefährden.",
    goals:
      "Sie unterscheiden Entstehungsbrand und Vollbrand, wissen wann Löschen sinnvoll ist und wann Sie sofort evakuieren müssen.",
    basics: [
      "Menschenrettung und Warnung haben immer Vorrang vor Löschen.",
      "Entstehungsbrand: klein, lokal begrenzt, noch keine starke Rauchentwicklung.",
      "Vollbrand oder starke Rauchentwicklung: nicht bekämpfen – evakuieren.",
      "Nur geschulte Personen mit geeignetem Löschmittel und Fluchtweg im Rücken.",
      "Nach erfolglosen Löschversuchen sofort zurückziehen.",
    ],
    practice: [
      "Zuerst prüfen: Sind Menschen in Gefahr? Dann retten und warnen.",
      "Entstehungsbrand nur bekämpfen, wenn Fluchtweg frei und keine Eigengefährdung.",
      "Passenden Feuerlöscher wählen (Typ beachten).",
      "Immer Fluchtweg im Blick – nicht in Rauch oder Hitze gehen.",
      "Bei wachsendem Brand oder Rauch: Löschversuch abbrechen, evakuieren, 112.",
      "Nach Brandereignis Vorgesetzte informieren und Dokumentation.",
    ],
    mistakes:
      "„Ich lösche erst mal alles selbst.“ Löschen ohne Rückzugsweg oder bei starkem Rauch ist lebensgefährlich. Auch Wasser auf brennende Elektrik oder Fettbrand ist falsch. Heldenmut gefährdet Gäste und Sie.",
    example: {
      title: "Praxisfall: Kleines Feuer im Mülleimer",
      body: "Im Pausenraum qualmt es aus einem Mülleimer – sichtbare Flammen, kein starker Rauch, Raum ist leer.",
      solution:
        "Kurz prüfen: Fluchtweg frei? Dann Feuerlöscher holen, von sicherem Abstand löschen, Brandstelle beobachten. Wenn nicht erloschen oder Rauch zunimmt: Raum verlassen, Tür schließen, 112, Evakuierung einleiten. Vorgesetzten informieren.",
    },
    merksatz: "Erst Menschen, dann Brand – nur löschen, wenn gefahrlos.",
    quizzes: [
      {
        question: "Was hat bei einem Brand oberste Priorität?",
        answers: ["Inventar retten", "Menschenrettung und Warnung", "Geräte abschalten", "Video sichern"],
        correct: 1,
        explanation: "Leben schützen – Sachwerte sind nachrangig.",
      },
      {
        question: "Ein Vollbrand mit starker Rauchentwicklung soll von Mitarbeitenden aktiv bekämpft werden.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Bei Vollbrand evakuieren – nicht löschen.",
      },
      {
        question: "Wann ist die Bekämpfung eines Entstehungsbrandes vertretbar?",
        answers: [
          "Immer, wenn ein Feuerlöscher vorhanden ist",
          "Nur wenn gefahrlos möglich und Fluchtweg frei ist",
          "Nur die Feuerwehr darf löschen",
          "Wenn Gäste zusehen",
        ],
        correct: 1,
        explanation: "Klein und lokal – nur ohne Eigengefährdung und mit Rückzugsweg.",
      },
      {
        question: "Situation: Flammen an einer Steckdose, leichter Rauch. Was ist richtig?",
        answers: [
          "Wasser drauf gießen",
          "Nicht mit Wasser löschen – Stromgefahr; ggf. CO₂-Löscher, sonst evakuieren",
          "Stecker ziehen und weiterarbeiten",
          "Brand ignorieren",
        ],
        correct: 1,
        explanation: "Elektrobrand nicht mit Wasser – geeigneten Löscher oder sofort evakuieren.",
      },
      {
        question: "Der Löschversuch schlägt fehl und der Rauch nimmt zu. Was tun?",
        answers: [
          "Weiterlöschen bis es klappt",
          "Sofort zurückziehen, evakuieren, 112 rufen",
          "Fenster öffnen und warten",
          "Gäste bitten zu helfen",
        ],
        correct: 1,
        explanation: "Bei wachsendem Brand abbrechen – Eigenschutz und Evakuierung.",
      },
    ],
  },
  {
    masterId: "master-bav-n22",
    code: "N22",
    fullTitle: "N22 Feuerlöscher",
    validityMonths: 12,
    intro:
      "Feuerlöscher können einen Entstehungsbrand stoppen – wenn Standort, Bedienung und Einsatzgrenzen bekannt sind. In der Spielhalle müssen Sie wissen, wo Löscher hängen, wie sie funktionieren und wann Sie sie nicht einsetzen sollten.",
    goals:
      "Sie kennen Standorte der Feuerlöscher, die Bedienung (PASS), den richtigen Abstand und wissen, wann Sie melden statt löschen.",
    basics: [
      "Feuerlöscher sind nach Löschmitteltyp gekennzeichnet (z. B. ABC, CO₂, Fettbrand).",
      "Standorte sind im Betrieb markiert und müssen frei zugänglich sein.",
      "Prüfplakette und Betriebsbereitschaft regelmäßig kontrollieren.",
      "PASS: Pull (Stift), Aim (Ziel), Squeeze (Hebel), Sweep (sprühen).",
      "Abstand typisch 2–4 Meter – nicht zu nah, nicht zu weit.",
    ],
    practice: [
      "Standorte der Feuerlöscher vor Arbeitsbeginn mental einprägen.",
      "Bei Brand: Fluchtweg im Rücken, passenden Löscher wählen.",
      "Stift ziehen, auf Brandherd richten, Hebel betätigen, von unten nach oben sprühen.",
      "Nach Einsatz oder Defekt sofort Vorgesetzten melden – Löscher muss getauscht werden.",
      "Nicht blockierte Zugänge zu Löschern und Notausgängen sicherstellen.",
      "Nur bei Entstehungsbrand einsetzen – sonst evakuieren.",
    ],
    mistakes:
      "„Den Löscher kenne ich nicht – ich probiere es.“ Falsches Löschmittel oder falsche Bedienung verschlimmert den Brand. Auch Löscher als Türstopper zu nutzen oder abgelaufene Geräte zu ignorieren, ist verboten und gefährlich.",
    example: {
      title: "Praxisfall: Qualm aus Papierkorb",
      body: "Im Flur brennt Papier in einem offenen Kübel – kleine Flammen, wenig Rauch. Ein ABC-Löscher hängt drei Meter entfernt.",
      solution:
        "Fluchtweg prüfen. Löscher holen, Stift ziehen, aus ca. 3 m Entfernung auf Brandherd sprühen, von unten nach oben. Brand erloschen? Warten und beobachten. Löscher als verbraucht melden und ersetzen lassen. Bei Zunahme: abbrechen, 112, evakuieren.",
    },
    merksatz: "PASS im Rücken zum Fluchtweg – danach melden und tauschen.",
    quizzes: [
      {
        question: "Wofür steht das „P“ in PASS?",
        answers: ["Push", "Pull (Sicherungsstift ziehen)", "Pump", "Point"],
        correct: 1,
        explanation: "Zuerst den Sicherungsstift (Pull) entfernen.",
      },
      {
        question: "Ein Feuerlöscher darf den Notausgang blockieren, wenn er gut sichtbar ist.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Löscher und Fluchtwege müssen frei zugänglich sein.",
      },
      {
        question: "In welchem Abstand sollten Sie typischerweise löschen?",
        answers: ["Direkt über dem Brand", "Ca. 2–4 Meter, je nach Löscher", "Aus 10 Metern", "Aus dem Nebenraum"],
        correct: 1,
        explanation: "Zu nah gefährdet Sie – zu weit wirkt das Löschmittel nicht.",
      },
      {
        question: "Situation: Nach Löscheinsatz ist der Löscher leer. Was tun?",
        answers: [
          "Wieder aufhängen – sieht noch gut aus",
          "Melden und Austausch veranlassen",
          "Selbst nachfüllen",
          "In den Pausenraum stellen",
        ],
        correct: 1,
        explanation: "Verbrauchte oder defekte Löscher müssen sofort gemeldet und ersetzt werden.",
      },
      {
        question: "Welcher Löscher ist für einen brennenden PC-Monitor geeignet?",
        answers: [
          "Wasserlöscher",
          "CO₂- oder ABC-Löscher gemäß Kennzeichnung",
          "Keiner – immer Wasser",
          "Schaumlöscher auf Fett",
        ],
        correct: 1,
        explanation: "Elektrobrand nicht mit Wasser – CO₂ oder ABC je nach Ausstattung.",
      },
    ],
  },
  {
    masterId: "master-bav-n24",
    code: "N24",
    fullTitle: "N24 Erste Hilfe",
    validityMonths: 12,
    intro:
      "In Spielhallen können Unfälle passieren – Stürze, Kreislaufprobleme, Schnittverletzungen. Erste Hilfe kann entscheidend sein. Sie lernen, wann Sie helfen, wann Sie den Notruf wählen und wie Sie sich selbst nicht gefährden.",
    goals:
      "Sie wissen, wie Sie den Notruf absetzen, Erste-Hilfe-Material nutzen, Verletzte stabilisieren und Eigengefährdung vermeiden.",
    basics: [
      "Notruf 112 bei lebensbedrohlichen Situationen – W-Fragen beantworten.",
      "Erste-Hilfe-Kasten und AED-Standort sind im Betrieb bekannt.",
      "Eigenschutz zuerst: Gefahrenquelle beseitigen oder Bereich sichern.",
      "Lebensrettende Sofortmaßnahmen: stabile Seitenlage, Druckverband, Reanimation bei Bewusstlosigkeit ohne Atmung.",
      "Keine medizinischen Diagnosen stellen – bis zum Rettungsdienst begleiten.",
    ],
    practice: [
      "Unfallstelle absichern (Strom, Glas, Verkehr im Eingangsbereich).",
      "Bewusstsein und Atmung prüfen – bei Bedarf 112 und Reanimation starten.",
      "Erste-Hilfe-Material holen oder Kollegen damit beauftragen.",
      "Verletzte beruhigen, nicht unnötig bewegen bei Verdacht auf Wirbelsäulenverletzung.",
      "Blutungen mit sterilem Druckverband stoppen, Wunde nicht „erkunden“.",
      "Ereignis dokumentieren und Vorgesetzten informieren.",
    ],
    mistakes:
      "„Der Gast ist nur betrunken – braucht keinen Notarzt.“ Bei Bewusstlosigkeit oder Atemproblemen immer 112. Auch ohne Handschuhe in offene Wunden zu greifen oder Medikamente zu geben, ist falsch. Nicht helfen aus Angst ist verständlich – aber Notruf geht immer.",
    example: {
      title: "Situation: Gast kollabiert am Automaten",
      body: "Ein Gast wird blass, taumelt und fällt zu Boden. Er reagiert schwach, atmet aber.",
      solution:
        "Hilfe rufen, Bereich freihalten. Bewusstsein ansprechen. Atmung prüfen. Stabile Seitenlage, wenn keine Wirbelsäulenverletzung vermutet wird. 112 bei anhaltender Bewusstlosigkeit oder Verschlechterung. Erste-Hilfe-Kasten bereithalten. Gäste anweisen, Abstand zu halten. Bis Rettungsdienst da ist, betreuen und Vorgesetzten informieren.",
    },
    merksatz: "Sichern, prüfen, 112 – helfen ohne sich zu gefährden.",
    quizzes: [
      {
        question: "Was ist der erste Schritt bei einem Unfall?",
        answers: [
          "Sofort Wunde verbinden",
          "Eigenschutz und Unfallstelle absichern",
          "Gast trinken geben",
          "Video aufnehmen",
        ],
        correct: 1,
        explanation: "Ohne Eigenschutz kann ein Helfer selbst zum Opfer werden.",
      },
      {
        question: "Bei Bewusstlosigkeit mit normaler Atmung kann eine stabile Seitenlage sinnvoll sein.",
        examType: "boolean",
        examCorrect: true,
        explanation: "Seitenlage schützt die Atemwege – wenn keine Wirbelsäulentrauma-Verdacht.",
      },
      {
        question: "Wann ist der Notruf 112 zwingend?",
        answers: [
          "Nur bei sichtbarem Blut",
          "Bei Bewusstlosigkeit, Atemstillstand oder lebensbedrohlichen Verletzungen",
          "Nur wenn der Gast es verlangt",
          "Nie in der Spielhalle",
        ],
        correct: 1,
        explanation: "Im Zweifel 112 – Rettungsdienst entscheidet über Dringlichkeit.",
      },
      {
        question: "Situation: Starker Schnitt an der Hand, Blutung. Was ist richtig?",
        answers: [
          "Wunde ausspülen und tiefer untersuchen",
          "Sterilen Druckverband anlegen, Hochlagern, 112 bei starker Blutung",
          "Nur Pflaster kleben und weiterspielen lassen",
          "Alkohol zum Desinfizieren in die Wunde",
        ],
        correct: 1,
        explanation: "Druckverband und bei Bedarf Notruf – Wunde nicht unnötig manipulieren.",
      },
      {
        question: "Wo finden Sie typischerweise Verbandsmaterial im Betrieb?",
        answers: [
          "In der Kasse",
          "Im Erste-Hilfe-Kasten am festgelegten Standort",
          "Beim Reinigungswagen",
          "Nur in der Apotheke ums Eck",
        ],
        correct: 1,
        explanation: "Erste-Hilfe-Kasten-Standort vorher kennen.",
      },
    ],
  },
  {
    masterId: "master-bav-n29",
    code: "N29",
    fullTitle: "N29 Stehleitern",
    validityMonths: 12,
    intro:
      "Stehleitern werden in Spielhallen genutzt – z. B. für Beleuchtung, Werbung oder Technik. Stürze von Leitern gehören zu den häufigen Arbeitsunfällen. Richtige Prüfung, Stand und Nutzung verhindern schwere Verletzungen.",
    goals:
      "Sie prüfen Stehleitern vor Gebrauch, stellen sie sicher auf, nutzen die passende Höhe und vermeiden typische Fehlhaltungen.",
    basics: [
      "Nur feste, intakte Stehleitern mit rutschfesten Füßen und sauberen Sprossen.",
      "Leiter muss für die Arbeitshöhe reichen – oberste Sprossen nicht als Tritt nutzen.",
      "Stand: eben, tragfähig, ggf. ausgeklappte Spreizsicherung.",
      "Nicht seitlich lehnen oder überreichen – Körpermitte zwischen Leitenseiten.",
      "Dreipunktkontakt: zwei Hände und ein Fuß oder umgekehrt am Steigen.",
    ],
    practice: [
      "Vor Benutzung: Beschädigungen, wackelige Sprossen, saubere Füße prüfen.",
      "Leiter auf ebenem, festem Untergrund aufstellen – keine nassen oder glatten Böden.",
      "Spreizsicherung vollständig öffnen und einrasten.",
      "Nur eine Person auf der Leiter; kein seitliches Überlehnen.",
      "Werkzeug in Tasche oder von Boden reichen lassen – nicht in der Hand balancieren.",
      "Nach Gebrauch sicher verstauen, Mängel melden.",
    ],
    mistakes:
      "„Die kurze Leiter reicht schon – ich stelle mich auf die oberste Stufe.“ Übersteigen und Überreichen führt zu Stürzen. Auch Leiter an Türen ohne Sicherung, auf Rollcontainern oder mit kaputten Füßen zu nutzen, ist verboten.",
    example: {
      title: "Praxisfall: Lampe im Gastraum wechseln",
      body: "Eine Deckenlampe flackert. Sie holen die Stehleiter aus dem Lager – eine Sprosse ist leicht verschmutzt, der Boden ist trocken.",
      solution:
        "Leiter prüfen: keine Risse, Füße sauber, Sprossen fest. Passende Höhe wählen – oberste Sprosse nicht betreten. Spreizsicherung öffnen, Leiter gerade vor der Lampe aufstellen. Mit Dreipunktkontakt steigen, Lampe wechseln ohne seitliches Überreichen. Leiter danach wegräumen und Mängel melden.",
    },
    merksatz: "Prüfen, standfest, mittig – nie über die oberste Sprosse.",
    quizzes: [
      {
        question: "Was prüfen Sie vor der Benutzung einer Stehleiter?",
        answers: [
          "Nur die Farbe",
          "Beschädigungen, feste Sprossen, saubere rutschfeste Füße",
          "Ob Kollegen zuschauen",
          "Nur die Höhe des Raums",
        ],
        correct: 1,
        explanation: "Intakte Leiter auf sicherem Untergrund – sonst nicht benutzen.",
      },
      {
        question: "Man darf sich seitlich weit über die Leiter hinaus lehnen, um schneller fertig zu werden.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Seitliches Überlehnen führt häufig zu Stürzen.",
      },
      {
        question: "Was bedeutet Dreipunktkontakt?",
        answers: [
          "Drei Personen auf einer Leiter",
          "Immer zwei Hände und ein Fuß oder zwei Füße und eine Hand am Steigen",
          "Leiter an drei Wänden lehnen",
          "Drei Leitern übereinander",
        ],
        correct: 1,
        explanation: "Stabiler Halt beim Auf- und Abstieg.",
      },
      {
        question: "Situation: Die Arbeitshöhe ist knapp über Reichweite. Was ist richtig?",
        answers: [
          "Auf oberster Sprosse auf Zehenspitzen stehen",
          "Passendere Leiter holen oder Arbeit anderweitig sicher ausführen lassen",
          "Stuhl auf unterste Sprosse stellen",
          "Kollegen an den Füßen halten",
        ],
        correct: 1,
        explanation: "Passende Leiterhöhe – oberste Sprossen sind keine Trittfläche.",
      },
      {
        question: "Wo soll eine Stehleiter stehen?",
        answers: [
          "Auf Rollcontainer für mehr Höhe",
          "Auf ebenem, tragfähigem, rutschfestem Untergrund",
          "Auf der Theke",
          "Schief an der Wand ohne Spreizsicherung",
        ],
        correct: 1,
        explanation: "Eben und fest – keine improvisierten Unterbauten.",
      },
    ],
  },
  {
    masterId: "master-bav-n30",
    code: "N30",
    fullTitle: "N30 Drogenproblematik",
    validityMonths: 12,
    intro:
      "In Spielhallen können Situationen mit Drogenkonsum oder -handel auftreten. Mitarbeitende sind keine Polizei. Ziel ist, Auffälligkeiten zu erkennen, deeskalierend zu handeln und Verantwortliche sowie Behörden einzubeziehen – ohne eigene Ermittlungen.",
    goals:
      "Sie erkennen typische Auffälligkeiten, handeln ohne Durchsuchungen, informieren Vorgesetzte und bei Bedarf die Polizei.",
    basics: [
      "Drogenbesitz und -handel sind strafbar – Meldung an Vorgesetzte und Polizei.",
      "Mitarbeitende führen keine Durchsuchungen oder Beschlagnahmen durch.",
      "Auffälligkeiten: starke Pupillen, Unruhe, Paranoia, Gerüche, Utensilien.",
      "Deeskalation und Hausrecht – keine physische Konfrontation ohne Gefahr.",
      "Dokumentation sachlich für interne und behördliche Abläufe.",
    ],
    practice: [
      "Verdachtsmomente beobachten, nicht vorschnell öffentlich anprangern.",
      "Keine Taschen, Kleidung oder Fahrzeuge von Gästen durchsuchen.",
      "Vorgesetzten informieren und Verhalten sachlich schildern.",
      "Bei akuter Gefahr oder offenem Handel: Polizei 110, Bereich sichern.",
      "Gäste und Kollegen nicht unnötig gefährden – Distanz und Ruhe wahren.",
      "Interne Abläufe (Hausverbot, Protokoll) einhalten.",
    ],
    mistakes:
      "„Ich durchsuche die Jacke – da riecht es nach Gras.“ Das kann straf- und zivilrechtliche Folgen haben. Auch öffentliche Beschuldigungen oder eigenmächtige Festnahmen sind falsch. Nichts tun bei offensichtlichem Handel ist ebenfalls fehlerhaft – melden ist Pflicht.",
    example: {
      title: "Situation: Verdacht auf Drogenhandel im Gastraum",
      body: "Sie beobachten wiederholte kurze Übergaben zwischen zwei Gästen an einem Automaten. Einer wirkt nervös und schaut sich um.",
      solution:
        "Aus sicherer Distanz beobachten, nicht eingreifen oder durchsuchen. Vorgesetzten diskret informieren. Sachliche Notizen (Zeit, Personenbeschreibung, Ort). Bei konkretem Handel oder Bedrohung Polizei 110. Hausrecht gemäß Anweisung ausüben. Keine öffentlichen Anschuldigungen.",
    },
    merksatz: "Erkennen, melden, nicht durchsuchen – Vorgesetzte und Polizei.",
    quizzes: [
      {
        question: "Dürfen Mitarbeitende Gäste auf Drogen durchsuchen?",
        answers: [
          "Ja, bei Verdacht immer",
          "Nein – Durchsuchung nur durch Polizei mit Rechtsgrundlage",
          "Ja, wenn der Gast einverstanden ist",
          "Nur bei Minderjährigen",
        ],
        correct: 1,
        explanation: "Keine eigenmächtigen Durchsuchungen – das ist Sache der Behörden.",
      },
      {
        question: "Bei Verdacht auf Drogenhandel sollten Sie sofort öffentlich laut anprangern.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Deeskalation und diskrete Meldung – keine Eskalation.",
      },
      {
        question: "Was ist eine typische Auffälligkeit bei Drogenkonsum?",
        answers: [
          "Normales Spielverhalten",
          "Starke Pupillen, Unruhe oder Paranoia",
          "Langes Lesen der Spielregeln",
          "Kartenzahlung",
        ],
        correct: 1,
        explanation: "Verhaltens- und körperliche Auffälligkeiten können Hinweise sein.",
      },
      {
        question: "Situation: Gast hat verdächtige Substanz auf dem Tisch. Was tun?",
        answers: [
          "Substanz einstecken und analysieren",
          "Vorgesetzten informieren, Bereich beobachten, ggf. Polizei rufen",
          "Gast sofort festhalten",
          "Ignorieren",
        ],
        correct: 1,
        explanation: "Melden und dokumentieren – nicht selbst „ermitteln“.",
      },
      {
        question: "Wen informieren Sie zuerst bei begründetem Verdacht?",
        answers: [
          "Andere Gäste",
          "Vorgesetzte bzw. zuständige Führungskraft",
          "Social Media",
          "Niemanden",
        ],
        correct: 1,
        explanation: "Interne Meldekette einhalten – dann ggf. Polizei.",
      },
    ],
  },
  {
    masterId: "master-bav-n37",
    code: "N37",
    fullTitle: "N37 Allergeninformation",
    validityMonths: 12,
    intro:
      "Werden in der Spielhalle Snacks oder Getränke angeboten, können Allergene lebensbedrohlich sein. Gäste und Mitarbeitende fragen nach Inhaltsstoffen. Unsichere Aussagen sind gefährlich – nur gesicherte Informationen weitergeben.",
    goals:
      "Sie nehmen Allergien ernst, kennen Informationsquellen im Betrieb und geben keine unsicheren Zusagen zu Inhaltsstoffen.",
    basics: [
      "Die 14 Hauptallergene müssen für angebotene Lebensmittel ausweisbar sein.",
      "Allergien können schwer bis lebensbedrohlich verlaufen (anaphylaktischer Schock).",
      "Produktverpackung und Herstellerangaben sind maßgeblich.",
      "„Enthält vermutlich keine Nüsse“ ist keine sichere Auskunft.",
      "Notfall: 112 bei Atemnot, Schwellung, Kreislaufkollaps nach Verzehr.",
    ],
    practice: [
      "Allergenfragen ernst nehmen – nie herunterspielen.",
      "Originalverpackung oder Allergenliste/Karte im Betrieb nutzen.",
      "Wenn unklar: nicht raten – Kollegen oder Vorgesetzte hinzuziehen.",
      "Keine Produkte ohne Kennzeichnung ausgeben.",
      "Bei allergischer Reaktion: 112, Person beruhigen, Notfallmedikation nur wenn Gast es selbst anwendet.",
      "Arbeitsplatz sauber halten – Kreuzkontamination vermeiden.",
    ],
    mistakes:
      "„Die Torte ist bestimmt ohne Ei – steht nirgends, aber meistens ist das so.“ Mutmaßungen können tödlich sein. Auch abgepackte Ware ohne Etikett auszugeben oder Spuren-Hinweise zu ignorieren, verstößt gegen Informationspflichten.",
    example: {
      title: "Praxisfall: Gast mit Nussallergie",
      body: "Ein Gast bestellt einen Snack und fragt, ob er Spuren von Erdnüssen enthält. Die Verpackung liegt im Lager, nicht an der Theke.",
      solution:
        "Gast warten lassen, Verpackung holen und Allergenhinweise lesen. Nur dokumentierte Angaben weitergeben. Bei Spuren-Hinweis klar kommunizieren. Wenn unklar: nicht ausgeben, Alternative anbieten. Bei Unsicherheit Vorgesetzten einbeziehen – nie raten.",
    },
    merksatz: "Nur was auf der Packung steht – im Zweifel nicht ausgeben.",
    quizzes: [
      {
        question: "Wie sollten Sie auf Allergenfragen reagieren?",
        answers: [
          "Schätzen, wenn die Packung nicht da ist",
          "Nur gesicherte Informationen aus Kennzeichnung oder Allergenliste geben",
          "Sagen „ist sicher ohne“",
          "Thema ablenken",
        ],
        correct: 1,
        explanation: "Keine Mutmaßungen – nur verlässliche Quellen.",
      },
      {
        question: "„Enthält wahrscheinlich keine Milch“ ist eine sichere Auskunft.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Wahrscheinlichkeiten sind bei Allergien inakzeptabel.",
      },
      {
        question: "Was tun bei anaphylaktischer Reaktion nach Verzehr?",
        answers: [
          "Warten ob es vorbeigeht",
          "112 rufen, Gast beruhigen, auf Notfallmedikation des Gastes achten",
          "Mehr vom Produkt geben",
          "Nur Wasser anbieten",
        ],
        correct: 1,
        explanation: "Allergischer Notfall ist lebensbedrohlich – sofort 112.",
      },
      {
        question: "Situation: Etikett ist abgerissen, Inhalt unbekannt. Gast fragt nach Gluten.",
        answers: [
          "Trotzdem ausgeben – sieht glutenfrei aus",
          "Nicht ausgeben; gekennzeichnete Alternative anbieten",
          "Kollegen raten lassen",
          "Gast unterschreiben lassen",
        ],
        correct: 1,
        explanation: "Ohne Kennzeichnung keine sichere Allergenauskunft möglich.",
      },
      {
        question: "Woher beziehen Sie verlässliche Allergeninformationen?",
        answers: [
          "Aus Gerüchten",
          "Aus Verpackung, Herstellerangaben oder betrieblicher Allergenliste",
          "Vom Gast",
          "Aus dem Internet ohne Bezug zum Produkt",
        ],
        correct: 1,
        explanation: "Offizielle Kennzeichnung und Betriebsunterlagen sind maßgeblich.",
      },
    ],
  },
  {
    masterId: "master-bav-n38",
    code: "N38",
    fullTitle: "N38 Hautschutz, Hautreinigung und Hautpflege",
    validityMonths: 12,
    intro:
      "Tägliche Arbeit in der Spielhalle belastet die Haut – Reinigung, Desinfektion, Münzen, trockene Luft. Hautschutz, richtige Reinigung und Pflege verhindern Ekzeme und Allergien. Beschädigte Haut ist ein Eintrittstor für Keime.",
    goals:
      "Sie nutzen Handschuhe und Hautschutzplan, reinigen und pflegen die Haut richtig und melden Hautprobleme frühzeitig.",
    basics: [
      "Hautschutzplan im Betrieb: wann Schutzcreme, Handschuhe, Pflege.",
      "Einweghandschuhe bei nassen Arbeiten, Reinigung oder Kontakt mit Fremdstoffen.",
      "Hände nicht übermäßig mit aggressiven Mitteln waschen.",
      "Nach Arbeit: milde Reinigung, Hautpflegecreme auftragen.",
      "Risse, Rötungen oder Juckreiz früh melden – arbeitsmedizinische Beratung.",
    ],
    practice: [
      "Vor belastender Arbeit Hautschutzcreme gemäß Plan auftragen.",
      "Handschuhe in passender Größe, ohne Löcher, bei Bedarf wechseln.",
      "Nach Handschuheinsatz Hände waschen und pflegen.",
      "Keine Lösungsmittel zum „schnellen Reinigen“ der Hände nutzen.",
      "Schmuck an Händen bei Reinigung ablegen – bessere Hygiene und Trocknung.",
      "Hautveränderungen Vorgesetzten und ggf. Betriebsarzt melden.",
    ],
    mistakes:
      "„Ich trage Handschuhe den ganzen Tag ohne Pause – Haut ist eh egal.“ Dauerfeuchte Haut erkrankt leichter. Auch ohne Handschuhe in Spülmittel zu greifen oder defekte Handschuhe weiterzutragen, schadet der Haut langfristig.",
    example: {
      title: "Praxisfall: Intensive Reinigung nach Schicht",
      body: "Sie reinigen Theke und Automaten mit desinfizierendem Mittel. Die Haut an den Händen ist bereits trocken und rissig.",
      solution:
        "Geeignete Einweghandschuhe tragen. Kontaktzeit der Mittel einhalten. Danach Hände mit mildem Waschmittel reinigen, gründlich abtrocknen, Hautpflegecreme auftragen. Bestehende Risse melden und Hautschutzplan mit Vorgesetztem besprechen – nicht mit Lösungsmitteln „nachwaschen“.",
    },
    merksatz: "Schützen vor der Arbeit, pflegen danach – Haut ist kein Einwegartikel.",
    quizzes: [
      {
        question: "Wann sollten Einweghandschuhe getragen werden?",
        answers: [
          "Nie, das sieht unprofessionell aus",
          "Bei nassen Arbeiten, Reinigung und Kontakt mit Reizstoffen",
          "Nur im Winter",
          "Nur bei Gästen",
        ],
        correct: 1,
        explanation: "Handschuhe schützen vor Feuchtigkeit, Chemikalien und Keimen.",
      },
      {
        question: "Hautschutzcreme sollte vor belastender Arbeit aufgetragen werden.",
        examType: "boolean",
        examCorrect: true,
        explanation: "Präventiver Hautschutz gemäß Hautschutzplan.",
      },
      {
        question: "Was tun bei anhaltenden Hautrissen durch Arbeit?",
        answers: [
          "Ignorieren",
          "Melden und Hautschutzmaßnahmen anpassen lassen",
          "Mehr Desinfektionsmittel nutzen",
          "Handschuhe dauerhaft weglassen",
        ],
        correct: 1,
        explanation: "Früh melden – Hautschäden können chronisch werden.",
      },
      {
        question: "Situation: Handschuh ist gerissen, Reinigungsmittel ist aktiv. Was tun?",
        answers: [
          "Weitermachen bis die Schicht endet",
          "Handschuh wechseln, Hände bei Bedarf nachwaschen und pflegen",
          "Nur abtrocknen",
          "Umgekehrt anziehen",
        ],
        correct: 1,
        explanation: "Defekte Handschuhe bieten keinen Schutz – sofort wechseln.",
      },
      {
        question: "Nach dem Handschuheinsatz ist wichtig …",
        answers: [
          "Nichts – Handschuhe reichen",
          "Milde Reinigung, Trocknen und Hautpflege",
          "Hände mit Lösungsmittel desinfizieren",
          "Handschuhe für morgen aufheben",
        ],
        correct: 1,
        explanation: "Reinigung und Pflege stellen die Hautbarriere wieder her.",
      },
    ],
  },
  {
    masterId: "master-bav-n39",
    code: "N39",
    fullTitle: "N39 Ätzende und reizende Reinigungsmittel",
    validityMonths: 12,
    intro:
      "Reinigungs- und Desinfektionsmittel in Spielhallen können ätzen oder reizen – für Haut, Augen und Atemwege. Kennzeichnung lesen, Schutz tragen, niemals mischen und gut lüften sind Pflicht, nicht Kür.",
    goals:
      "Sie erkennen Gefahrenkennzeichnung, nutzen Schutzausrüstung, mischen keine Mittel und lüften bei der Anwendung.",
    basics: [
      "GHS-Piktogramme: Ätzend, Reizend, Gesundheitsgefahr, Umweltgefahr.",
      "Sicherheitsdatenblatt und Betriebsanweisung liegen im Betrieb vor.",
      "Nie verschiedene Mittel mischen – z. B. Chlor und Säure erzeugen giftiges Gas.",
      "Handschuhe, ggf. Schutzbrille; bei Sprühnebel Atemschutz je nach Vorgabe.",
      "Ausreichend lüften während und nach der Anwendung.",
    ],
    practice: [
      "Kennzeichnung und Dosierung vor Gebrauch lesen.",
      "Originalbehälter nutzen – nicht umfüllen in Getränkeflaschen.",
      "Handschuhe und ggf. Brille tragen; Kontaktzeit einhalten.",
      "Nicht mischen – ein Mittel, ein Zweck.",
      "Raum während Reinigung lüften; Gäste nicht unnötig exponieren.",
      "Bei Kontakt mit Haut oder Augen: Spülprotokoll, Arzt, Vorgesetzten informieren.",
      "Leere Behälter als Sondermüll entsorgen gemäß Vorgabe.",
    ],
    mistakes:
      "„Ein Schuss mehr macht sauberer.“ Überdosierung reizt stärker und schadet Oberflächen. „Chlor und Essig zusammen – geht schneller.“ Giftige Gase! Auch unbeschriftete Sprühflaschen im Gastraum zu lagern, ist verboten und verwirrt jeden.",
    example: {
      title: "Praxisfall: Desinfektion der Theke",
      body: "Nach der Schicht soll die Theke desinfiziert werden. Zwei verschiedene Mittel stehen bereit – eines mit Ätzwarnung.",
      solution:
        "Betriebsanweisung und Dosierung lesen. Nur das vorgesehene Mittel nutzen – nicht mischen. Handschuhe tragen, Oberfläche wischen, Einwirkzeit abwarten. Raum lüften. Mittel sicher wegräumen, keine offenen Behälter liegen lassen. Bei Augenkontakt sofort spülen und Arzt aufsuchen.",
    },
    merksatz: "Lesen, schützen, nicht mischen – lüften und wegräumen.",
    quizzes: [
      {
        question: "Warum dürfen Reinigungsmittel nicht willkürlich gemischt werden?",
        answers: [
          "Weil es teurer wird",
          "Weil gefährliche Reaktionen und Gase entstehen können",
          "Weil es uneffektiv riecht",
          "Weil Gäste es mögen",
        ],
        correct: 1,
        explanation: "Mischungen können ätzend oder giftig werden – z. B. Chlor + Säure.",
      },
      {
        question: "Die Kennzeichnung auf dem Reinigungsmittel kann ignoriert werden, wenn man das Produkt kennt.",
        examType: "boolean",
        examCorrect: false,
        explanation: "Kennzeichnung und Betriebsanweisung sind verbindlich.",
      },
      {
        question: "Was gehört zur persönlichen Schutzausrüstung bei ätzenden Mitteln?",
        answers: [
          "Nur Schürze",
          "Handschuhe, ggf. Schutzbrille und Lüften",
          "Keine – schnell wisch reicht",
          "Nur Mundschutz für Gäste",
        ],
        correct: 1,
        explanation: "Haut- und Augenschutz plus ausreichende Belüftung.",
      },
      {
        question: "Situation: Spritzer ins Auge beim Dosieren. Erste Maßnahme?",
        answers: [
          "Weiterarbeiten",
          "Sofort mit Wasser spülen, Arzt aufsuchen, Vorfall melden",
          "Mit anderem Mittel neutralisieren",
          "Augen reiben",
        ],
        correct: 1,
        explanation: "Augenspülung sofort – dann medizinische Hilfe.",
      },
      {
        question: "Während der Reinigung mit reizenden Mitteln sollten Sie …",
        answers: [
          "Fenster und Türen schließen",
          "Ausreichend lüften",
          "Gäste zum Mitwischen einladen",
          "Mittel warm machen",
        ],
        correct: 1,
        explanation: "Dämpfe reduzieren – Lüftung schützt Atemwege.",
      },
    ],
  },
];
