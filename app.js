const STORAGE_KEYS = {
  starred: "french-vocab-starred",
  focus: "french-vocab-focus",
  leaderboard: "french-vocab-leaderboard",
};

const PART_OF_SPEECH_LABELS = {
  n: "Noun",
  v: "Verb",
  adj: "Adjective",
  adv: "Adverb",
  prep: "Preposition",
  det: "Determiner",
  pron: "Pronoun",
  conj: "Conjunction",
  intj: "Interjection",
  num: "Number",
  mwp: "Multi-word phrase",
};

const state = {
  dataset: window.FRENCH_VOCAB_DATA || { foundation: [], higher: [] },
  filters: {
    tier: "higher",
    studyMode: "written",
    direction: "fr-en",
    sessionType: "practice",
    wordLimit: 25,
    shuffle: true,
    hardMode: false,
    extremeMode: false,
    requireAccents: false,
    htOnly: false,
    starredOnly: false,
    startFrom: "",
    startTo: "",
    subjects: new Set(),
    partsOfSpeech: new Set(),
  },
  starred: new Set(loadJson(STORAGE_KEYS.starred, [])),
  focusMap: new Map(loadJson(STORAGE_KEYS.focus, []).map((item) => [item.id, item])),
  leaderboard: loadJson(STORAGE_KEYS.leaderboard, []),
  currentPool: [],
  session: null,
  deferredInstallPrompt: null,
};

const elements = {
  tierSelect: document.getElementById("tierSelect"),
  studyModeSelect: document.getElementById("studyModeSelect"),
  directionSelect: document.getElementById("directionSelect"),
  sessionTypeSelect: document.getElementById("sessionTypeSelect"),
  wordLimitInput: document.getElementById("wordLimitInput"),
  startLettersFrom: document.getElementById("startLettersFrom"),
  startLettersTo: document.getElementById("startLettersTo"),
  shuffleToggle: document.getElementById("shuffleToggle"),
  hardModeToggle: document.getElementById("hardModeToggle"),
  extremeModeToggle: document.getElementById("extremeModeToggle"),
  accentToggle: document.getElementById("accentToggle"),
  htOnlyToggle: document.getElementById("htOnlyToggle"),
  starredOnlyToggle: document.getElementById("starredOnlyToggle"),
  subjectFilters: document.getElementById("subjectFilters"),
  posFilters: document.getElementById("posFilters"),
  selectedCount: document.getElementById("selectedCount"),
  starredCount: document.getElementById("starredCount"),
  focusCount: document.getElementById("focusCount"),
  beginSessionButton: document.getElementById("beginSessionButton"),
  flashcardButton: document.getElementById("flashcardButton"),
  viewWordsButton: document.getElementById("viewWordsButton"),
  tryIncorrectButton: document.getElementById("tryIncorrectButton"),
  sessionEmptyState: document.getElementById("sessionEmptyState"),
  sessionView: document.getElementById("sessionView"),
  sessionBadge: document.getElementById("sessionBadge"),
  sessionTitle: document.getElementById("sessionTitle"),
  progressLabel: document.getElementById("progressLabel"),
  scoreLabel: document.getElementById("scoreLabel"),
  timerLabel: document.getElementById("timerLabel"),
  questionSubject: document.getElementById("questionSubject"),
  questionPartOfSpeech: document.getElementById("questionPartOfSpeech"),
  questionTier: document.getElementById("questionTier"),
  directionLabel: document.getElementById("directionLabel"),
  promptText: document.getElementById("promptText"),
  hintText: document.getElementById("hintText"),
  writtenAnswerPanel: document.getElementById("writtenAnswerPanel"),
  answerInput: document.getElementById("answerInput"),
  checkAnswerButton: document.getElementById("checkAnswerButton"),
  revealAnswerButton: document.getElementById("revealAnswerButton"),
  starWordButton: document.getElementById("starWordButton"),
  multipleChoicePanel: document.getElementById("multipleChoicePanel"),
  multipleChoiceOptions: document.getElementById("multipleChoiceOptions"),
  starWordButtonChoice: document.getElementById("starWordButtonChoice"),
  flashcardPanel: document.getElementById("flashcardPanel"),
  flashcardBack: document.getElementById("flashcardBack"),
  flipFlashcardButton: document.getElementById("flipFlashcardButton"),
  previousFlashcardButton: document.getElementById("previousFlashcardButton"),
  nextFlashcardButton: document.getElementById("nextFlashcardButton"),
  starWordButtonFlashcard: document.getElementById("starWordButtonFlashcard"),
  feedbackBox: document.getElementById("feedbackBox"),
  switchTableButton: document.getElementById("switchTableButton"),
  resetSessionButton: document.getElementById("resetSessionButton"),
  tableView: document.getElementById("tableView"),
  wordsTableBody: document.getElementById("wordsTableBody"),
  returnToSessionButton: document.getElementById("returnToSessionButton"),
  exportIncorrectButton: document.getElementById("exportIncorrectButton"),
  importFocusInput: document.getElementById("importFocusInput"),
  focusList: document.getElementById("focusList"),
  exportSidebarButton: document.getElementById("exportSidebarButton"),
  clearFocusButton: document.getElementById("clearFocusButton"),
  clearStarredButton: document.getElementById("clearStarredButton"),
  leaderboardView: document.getElementById("leaderboardView"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardForm: document.getElementById("leaderboardForm"),
  leaderboardNameInput: document.getElementById("leaderboardNameInput"),
  installButton: document.getElementById("installButton"),
  resetAppButton: document.getElementById("resetAppButton"),
  selectAllSubjectsButton: document.getElementById("selectAllSubjectsButton"),
  clearSubjectsButton: document.getElementById("clearSubjectsButton"),
  selectAllPosButton: document.getElementById("selectAllPosButton"),
  clearPosButton: document.getElementById("clearPosButton"),
};

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function normalizeText(value, requireAccents) {
  const base = String(value || "").trim().toLowerCase();
  const withoutPunctuation = base.replace(/[()'’.!?;:]/g, "").replace(/\s+/g, " ");
  return requireAccents
    ? withoutPunctuation
    : withoutPunctuation.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitAnswers(value) {
  return dedupe(
    String(value)
      .split(/[;/]/)
      .flatMap((chunk) => chunk.split(","))
      .map((chunk) => chunk.trim())
  );
}

function simplifyEnglishAnswer(value) {
  return normalizeText(value, false)
    .replace(/^\bto\s+/, "")
    .replace(/^\b(the|a|an|some)\s+/, "")
    .trim();
}

function stripParentheticalText(value) {
  return String(value).replace(/\([^)]*\)/g, " ");
}

function addPluralLenientVariants(accepted, value) {
  if (!value) {
    return;
  }

  accepted.add(value);

  const parts = value.split(" ");
  const lastWord = parts[parts.length - 1];
  if (!lastWord) {
    return;
  }

  const stems = new Set([lastWord]);
  if (lastWord.endsWith("ies") && lastWord.length > 3) {
    stems.add(`${lastWord.slice(0, -3)}y`);
  }
  if (lastWord.endsWith("es") && lastWord.length > 2) {
    stems.add(lastWord.slice(0, -2));
  }
  if (lastWord.endsWith("s") && lastWord.length > 1) {
    stems.add(lastWord.slice(0, -1));
  }
  if (!lastWord.endsWith("s")) {
    stems.add(`${lastWord}s`);
  }
  if (lastWord.endsWith("y")) {
    stems.add(`${lastWord.slice(0, -1)}ies`);
  }

  stems.forEach((stem) => {
    const rebuilt = [...parts.slice(0, -1), stem].join(" ").trim();
    if (rebuilt) {
      accepted.add(rebuilt);
    }
  });
}

function buildAcceptedAnswers(answer, direction, requireAccents) {
  const rawAnswers = splitAnswers(answer);
  const accepted = new Set();

  rawAnswers.forEach((option) => {
    const normalized = normalizeText(option, requireAccents);
    if (normalized) {
      accepted.add(normalized);
    }

    if (direction === "fr-en") {
      addPluralLenientVariants(accepted, simplifyEnglishAnswer(option));
      addPluralLenientVariants(accepted, simplifyEnglishAnswer(stripParentheticalText(option)));
      addPluralLenientVariants(accepted, normalizeText(stripParentheticalText(option), false));
    }
  });

  return accepted;
}

function getAllForTier(tier) {
  return state.dataset[tier] || [];
}

function getSubjectList() {
  return dedupe(getAllForTier(state.filters.tier).map((item) => item.subject)).sort((a, b) =>
    a.localeCompare(b),
  );
}

function getPosList() {
  return dedupe(getAllForTier(state.filters.tier).map((item) => item.partOfSpeech)).sort((a, b) =>
    a.localeCompare(b),
  );
}

function isPracticeVerb(item) {
  if (item.partOfSpeech !== "v") {
    return true;
  }

  // The Pearson sheet includes many conjugated helper forms; keep normal practice to infinitives.
  return item.english.toLowerCase().startsWith("to ");
}

function ensureFilterDefaults() {
  if (state.filters.subjects.size === 0) {
    getSubjectList().forEach((item) => state.filters.subjects.add(item));
  }
  if (state.filters.partsOfSpeech.size === 0) {
    getPosList().forEach((item) => state.filters.partsOfSpeech.add(item));
  }
}

function buildChip(container, text, checked, onToggle) {
  const label = document.createElement("label");
  label.className = "chip";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onToggle(input.checked));

  const span = document.createElement("span");
  span.textContent = text;

  label.append(input, span);
  container.append(label);
}

function renderFilters() {
  elements.subjectFilters.innerHTML = "";
  getSubjectList().forEach((subject) => {
    buildChip(elements.subjectFilters, subject, state.filters.subjects.has(subject), (checked) => {
      checked ? state.filters.subjects.add(subject) : state.filters.subjects.delete(subject);
      updateSelectionSummary();
    });
  });

  elements.posFilters.innerHTML = "";
  getPosList().forEach((pos) => {
    buildChip(
      elements.posFilters,
      PART_OF_SPEECH_LABELS[pos] || pos,
      state.filters.partsOfSpeech.has(pos),
      (checked) => {
        checked ? state.filters.partsOfSpeech.add(pos) : state.filters.partsOfSpeech.delete(pos);
        updateSelectionSummary();
      },
    );
  });
}

function getFilteredWords() {
  const words = getAllForTier(state.filters.tier).filter((item) => {
    if (!isPracticeVerb(item)) {
      return false;
    }
    if (!state.filters.subjects.has(item.subject)) {
      return false;
    }
    if (!state.filters.partsOfSpeech.has(item.partOfSpeech)) {
      return false;
    }
    if (state.filters.htOnly && !item.isHtOnly) {
      return false;
    }
    if (state.filters.starredOnly && !state.starred.has(item.id)) {
      return false;
    }

    const startLetter = item.french.charAt(0).toLowerCase();
    const from = state.filters.startFrom.trim().toLowerCase();
    const to = state.filters.startTo.trim().toLowerCase();
    if (from && startLetter < from) {
      return false;
    }
    if (to && startLetter > to) {
      return false;
    }

    return true;
  });

  const pool = state.filters.shuffle ? shuffle(words) : [...words];
  if (!state.filters.wordLimit || state.filters.wordLimit >= pool.length) {
    return pool;
  }
  return pool.slice(0, state.filters.wordLimit);
}

function updateSelectionSummary() {
  const selected = getFilteredWords();
  state.currentPool = selected;
  elements.selectedCount.textContent = String(selected.length);
  elements.starredCount.textContent = String(state.starred.size);
  elements.focusCount.textContent = String(state.focusMap.size);
  renderTable(selected);
  renderFocusList();
}

function renderTable(words) {
  elements.wordsTableBody.innerHTML = "";
  if (words.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan=\"6\">No words match your current filters.</td>";
    elements.wordsTableBody.append(row);
    return;
  }

  words.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.french)}</td>
      <td>${escapeHtml(item.english)}</td>
      <td>${escapeHtml(item.subject)}</td>
      <td>${escapeHtml(PART_OF_SPEECH_LABELS[item.partOfSpeech] || item.partOfSpeech)}</td>
      <td>${item.tier === "higher" ? "Higher" : "Foundation"}${item.isHtOnly ? " (HT only)" : ""}</td>
      <td>${state.starred.has(item.id) ? "Yes" : ""}</td>
    `;
    elements.wordsTableBody.append(row);
  });
}

function renderFocusList() {
  elements.focusList.innerHTML = "";
  const items = [...state.focusMap.values()];
  if (items.length === 0) {
    const entry = document.createElement("li");
    entry.className = "focus-item";
    entry.innerHTML = "<strong>None so far</strong><small>Your focus list is empty.</small>";
    elements.focusList.append(entry);
    return;
  }

  items.forEach((item) => {
    const entry = document.createElement("li");
    entry.className = "focus-item";
    entry.innerHTML = `
      <strong>${escapeHtml(item.french)}</strong>
      <small>${escapeHtml(item.english)}</small>
      <small>${escapeHtml(item.reason)}</small>
    `;
    elements.focusList.append(entry);
  });
}

function startSession(overrides = {}) {
  const studyMode = overrides.studyMode || state.filters.studyMode;
  const words = overrides.words || getFilteredWords();

  if (words.length === 0) {
    showFeedback("warning", "No words match these settings. Adjust the filters and try again.");
    return;
  }

  hidePanelsForFreshSession();
  state.session = {
    words,
    index: 0,
    score: 0,
    mistakes: 0,
    answers: [],
    completed: false,
    studyMode,
    sessionType: state.filters.sessionType,
    direction: state.filters.direction,
    timerEndsAt:
      state.filters.sessionType === "challenge" ? Date.now() + 2 * 60 * 1000 : null,
    timerId: null,
    flashcardFlipped: false,
    pendingScore: null,
  };

  elements.sessionEmptyState.classList.add("hidden");
  elements.sessionView.classList.remove("hidden");
  elements.tableView.classList.add("hidden");
  elements.leaderboardView.classList.add("hidden");

  if (state.session.timerEndsAt) {
    state.session.timerId = window.setInterval(tickTimer, 250);
  } else {
    elements.timerLabel.textContent = "--";
  }

  renderQuestion();
}

function tickTimer() {
  if (!state.session?.timerEndsAt) {
    return;
  }
  const remainingMs = state.session.timerEndsAt - Date.now();
  if (remainingMs <= 0) {
    finishSession("Time up.");
    return;
  }
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  elements.timerLabel.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function finishSession(message) {
  if (!state.session || state.session.completed) {
    return;
  }

  state.session.completed = true;
  window.clearInterval(state.session.timerId);

  const score = state.session.score;
  const total = state.session.words.length;
  const summary = `${message} Final score: ${score}/${total}.`;
  showFeedback("success", summary);

  if (state.session.sessionType === "challenge") {
    state.session.pendingScore = {
      score,
      total,
      date: new Date().toISOString(),
      tier: state.filters.tier,
    };
    renderLeaderboard();
  }
}

function nextQuestion() {
  if (!state.session) {
    return;
  }

  state.session.index += 1;
  state.session.flashcardFlipped = false;

  if (state.session.index >= state.session.words.length) {
    finishSession("Session complete.");
    return;
  }

  renderQuestion();
}

function getCurrentWord() {
  return state.session?.words[state.session.index] || null;
}

function getCurrentDirection() {
  if (!state.session) {
    return "fr-en";
  }
  if (state.session.direction !== "mixed") {
    return state.session.direction;
  }
  return state.session.index % 2 === 0 ? "fr-en" : "en-fr";
}

function getPromptAndAnswer(word) {
  const direction = getCurrentDirection();
  if (direction === "en-fr") {
    return {
      prompt: word.english,
      answer: word.french,
      label: "Translate into French",
    };
  }
  return {
    prompt: word.french,
    answer: word.english,
    label: "Translate into English",
  };
}

function renderQuestion() {
  if (!state.session) {
    return;
  }

  const word = getCurrentWord();
  if (!word) {
    return;
  }

  const qa = getPromptAndAnswer(word);
  const isFlashcard = state.session.studyMode === "flashcards";
  const isMultipleChoice =
    state.session.studyMode === "multiple-choice" ||
    (state.session.studyMode === "mixed" && state.session.index % 2 === 1);

  elements.sessionBadge.textContent =
    state.session.sessionType === "challenge" ? "Challenge mode" : "Practice mode";
  elements.sessionTitle.textContent = isFlashcard ? "Flashcard" : "Current question";
  elements.progressLabel.textContent = `${state.session.index + 1}/${state.session.words.length}`;
  elements.scoreLabel.textContent = String(state.session.score);
  elements.questionSubject.textContent = word.subject;
  elements.questionPartOfSpeech.textContent =
    PART_OF_SPEECH_LABELS[word.partOfSpeech] || word.partOfSpeech;
  elements.questionTier.textContent =
    word.tier === "higher" ? (word.isHtOnly ? "Higher only" : "Higher") : "Foundation";
  elements.directionLabel.textContent = qa.label;
  elements.promptText.textContent = qa.prompt;
  elements.hintText.textContent = buildHint(word, qa);

  elements.writtenAnswerPanel.classList.toggle("hidden", isFlashcard || isMultipleChoice);
  elements.multipleChoicePanel.classList.toggle("hidden", !isMultipleChoice);
  elements.flashcardPanel.classList.toggle("hidden", !isFlashcard);
  hideFeedback();

  if (!isFlashcard && !isMultipleChoice) {
    elements.answerInput.value = "";
    elements.answerInput.focus();
  }

  if (isMultipleChoice) {
    renderMultipleChoice(word, qa.answer);
  }

  if (isFlashcard) {
    elements.flashcardBack.textContent = "Tap or press Enter to reveal the answer.";
    elements.flashcardBack.dataset.answer = qa.answer;
  }

  updateStarButtons();
  tickTimer();
}

function buildHint(word, qa) {
  const notes = [];
  if (word.gender) {
    notes.push(`Gender: ${word.gender}`);
  }
  if (state.filters.hardMode) {
    notes.push(`Frequency rank: ${word.frequency}`);
  }
  if (state.filters.extremeMode) {
    notes.push(`Subject hidden in challenge of answer review only.`);
  } else {
    notes.push(word.subject);
  }
  return notes.join(" • ");
}

function renderMultipleChoice(word, answer) {
  const direction = getCurrentDirection();
  const pool = getAllForTier(state.filters.tier).filter((item) => item.id !== word.id);
  const distractorSource = pool.filter((item) =>
    state.filters.hardMode ? item.partOfSpeech === word.partOfSpeech : true,
  );
  const distractors = shuffle(distractorSource)
    .slice(0, 3)
    .map((item) => (direction === "en-fr" ? item.french : item.english));
  const options = shuffle([answer, ...distractors]);

  elements.multipleChoiceOptions.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-button";
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => handleMultipleChoice(option, answer, button));
    elements.multipleChoiceOptions.append(button);
  });
}

function handleMultipleChoice(selected, answer, button) {
  if (!state.session || state.session.completed) {
    return;
  }

  const isCorrect = normalizeText(selected, true) === normalizeText(answer, true);
  lockMultipleChoice(answer);
  button.classList.add(isCorrect ? "correct" : "incorrect");

  if (isCorrect) {
    state.session.score += 1;
    showFeedback("success", `Correct. Answer: ${answer}`);
    window.setTimeout(nextQuestion, 700);
  } else {
    recordFocus(getCurrentWord(), "Incorrect answer");
    showFeedback("error", `Not quite. Correct answer: ${answer}`);
    if (state.session.sessionType === "challenge") {
      finishSession("Wrong answer.");
      return;
    }
    window.setTimeout(nextQuestion, 1200);
  }
  elements.scoreLabel.textContent = String(state.session.score);
}

function lockMultipleChoice(answer) {
  [...elements.multipleChoiceOptions.children].forEach((node) => {
    node.disabled = true;
    if (normalizeText(node.textContent, true) === normalizeText(answer, true)) {
      node.classList.add("correct");
    }
  });
}

function checkWrittenAnswer() {
  if (!state.session || state.session.completed) {
    return;
  }

  const word = getCurrentWord();
  const qa = getPromptAndAnswer(word);
  const direction = getCurrentDirection();
  const rawAnswer = elements.answerInput.value.trim();

  if (!rawAnswer) {
    showFeedback("warning", "Type an answer first.");
    return;
  }

  const acceptedAnswers = buildAcceptedAnswers(
    qa.answer,
    direction,
    state.filters.requireAccents,
  );
  const normalizedGuess = normalizeText(rawAnswer, state.filters.requireAccents);
  const simplifiedGuess = direction === "fr-en" ? simplifyEnglishAnswer(rawAnswer) : normalizedGuess;
  const isCorrect =
    acceptedAnswers.has(normalizedGuess) ||
    (simplifiedGuess && acceptedAnswers.has(simplifiedGuess));

  if (isCorrect) {
    state.session.score += 1;
    elements.scoreLabel.textContent = String(state.session.score);
    showFeedback("success", `Correct. Answer: ${qa.answer}`);
    window.setTimeout(nextQuestion, 700);
    return;
  }

  recordFocus(word, "Incorrect written answer");
  showFeedback("warning", "Not quite. Try again, or press Reveal if you want to see the answer.");
}

function revealAnswer() {
  if (!state.session) {
    return;
  }
  const word = getCurrentWord();
  const qa = getPromptAndAnswer(word);
  elements.answerInput.blur();
  recordFocus(word, "Answer revealed");
  showFeedback("warning", `Answer revealed: ${qa.answer}`);
}

function flipFlashcard() {
  if (!state.session) {
    return;
  }
  const word = getCurrentWord();
  const qa = getPromptAndAnswer(word);
  state.session.flashcardFlipped = !state.session.flashcardFlipped;
  elements.flashcardBack.textContent = state.session.flashcardFlipped
    ? qa.answer
    : "Tap or press Enter to reveal the answer.";
  if (state.session.flashcardFlipped) {
    recordFocus(word, "Viewed in flashcard mode");
  }
}

function toggleStar(word = getCurrentWord()) {
  if (!word) {
    return;
  }
  if (state.starred.has(word.id)) {
    state.starred.delete(word.id);
  } else {
    state.starred.add(word.id);
    recordFocus(word, "Starred");
  }
  saveJson(STORAGE_KEYS.starred, [...state.starred]);
  updateStarButtons();
  updateSelectionSummary();
}

function updateStarButtons() {
  const current = getCurrentWord();
  const label = current && state.starred.has(current.id) ? "Unstar" : "Star";
  elements.starWordButton.textContent = label;
  elements.starWordButtonChoice.textContent = label;
  elements.starWordButtonFlashcard.textContent = label;
}

function recordFocus(word, reason) {
  if (!word) {
    return;
  }
  state.focusMap.set(word.id, {
    id: word.id,
    french: word.french,
    english: word.english,
    reason,
    tier: word.tier,
  });
  saveJson(STORAGE_KEYS.focus, [...state.focusMap.values()]);
  updateSelectionSummary();
}

function showFeedback(type, message) {
  elements.feedbackBox.className = `feedback-box ${type}`;
  elements.feedbackBox.textContent = message;
  elements.feedbackBox.classList.remove("hidden");
  window.requestAnimationFrame(() => {
    elements.feedbackBox.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function hideFeedback() {
  elements.feedbackBox.className = "feedback-box hidden";
  elements.feedbackBox.textContent = "";
}

function showTable() {
  elements.tableView.classList.remove("hidden");
  elements.sessionView.classList.add("hidden");
  elements.sessionEmptyState.classList.add("hidden");
}

function showSession() {
  if (!state.session) {
    elements.sessionEmptyState.classList.remove("hidden");
    elements.sessionView.classList.add("hidden");
  } else {
    elements.sessionView.classList.remove("hidden");
    elements.sessionEmptyState.classList.add("hidden");
  }
  elements.tableView.classList.add("hidden");
}

function hidePanelsForFreshSession() {
  elements.tableView.classList.add("hidden");
  elements.leaderboardView.classList.add("hidden");
}

function resetSession() {
  if (state.session?.timerId) {
    window.clearInterval(state.session.timerId);
  }
  state.session = null;
  elements.sessionView.classList.add("hidden");
  elements.leaderboardView.classList.add("hidden");
  elements.sessionEmptyState.classList.remove("hidden");
  hideFeedback();
}

function renderLeaderboard() {
  elements.leaderboardList.innerHTML = "";
  state.leaderboard
    .slice()
    .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = `${entry.name}: ${entry.score}/${entry.total} (${entry.tier})`;
      elements.leaderboardList.append(item);
    });
}

function saveLeaderboardEntry(event) {
  event.preventDefault();
  if (!state.session?.pendingScore) {
    return;
  }
  const name = elements.leaderboardNameInput.value.trim();
  if (!name) {
    return;
  }
  state.leaderboard.push({ name, ...state.session.pendingScore });
  saveJson(STORAGE_KEYS.leaderboard, state.leaderboard);
  elements.leaderboardNameInput.value = "";
  renderLeaderboard();
}

function exportFocusList() {
  const items = [...state.focusMap.values()];
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "french-focus-list.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importFocusList(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }
  file.text().then((text) => {
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const rows = text
          .split(/\r?\n/)
          .map((line) => line.split(","))
          .filter((line) => line.length >= 3);
        rows.forEach((row, index) => {
          const id = `imported-${index}-${row[0]}`;
          state.focusMap.set(id, {
            id,
            french: row[0] || "",
            english: row[1] || "",
            reason: row[2] || "Imported",
          });
        });
      } else {
        const items = JSON.parse(text);
        items.forEach((item) => state.focusMap.set(item.id, item));
      }
      saveJson(STORAGE_KEYS.focus, [...state.focusMap.values()]);
      updateSelectionSummary();
    } catch {
      showFeedback("error", "That file could not be imported.");
    }
  });
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEYS.starred);
  localStorage.removeItem(STORAGE_KEYS.focus);
  localStorage.removeItem(STORAGE_KEYS.leaderboard);
  state.starred = new Set();
  state.focusMap = new Map();
  state.leaderboard = [];
  updateSelectionSummary();
  renderLeaderboard();
  resetSession();
}

function syncFiltersFromUi() {
  const requestedLimit = Number(elements.wordLimitInput.value);
  const tierSize = getAllForTier(elements.tierSelect.value).length;

  state.filters.tier = elements.tierSelect.value;
  state.filters.studyMode = elements.studyModeSelect.value;
  state.filters.direction = elements.directionSelect.value;
  state.filters.sessionType = elements.sessionTypeSelect.value;
  state.filters.wordLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? clamp(requestedLimit, 5, Math.max(5, tierSize))
    : tierSize;
  state.filters.shuffle = elements.shuffleToggle.checked;
  state.filters.hardMode = elements.hardModeToggle.checked;
  state.filters.extremeMode = elements.extremeModeToggle.checked;
  state.filters.requireAccents = elements.accentToggle.checked;
  state.filters.htOnly = elements.htOnlyToggle.checked;
  state.filters.starredOnly = elements.starredOnlyToggle.checked;
  state.filters.startFrom = elements.startLettersFrom.value;
  state.filters.startTo = elements.startLettersTo.value;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wireEvents() {
  [
    elements.tierSelect,
    elements.studyModeSelect,
    elements.directionSelect,
    elements.sessionTypeSelect,
    elements.wordLimitInput,
    elements.startLettersFrom,
    elements.startLettersTo,
    elements.shuffleToggle,
    elements.hardModeToggle,
    elements.extremeModeToggle,
    elements.accentToggle,
    elements.htOnlyToggle,
    elements.starredOnlyToggle,
  ].forEach((node) =>
    node.addEventListener("change", () => {
      const previousTier = state.filters.tier;
      syncFiltersFromUi();
      if (previousTier !== state.filters.tier) {
        state.filters.subjects.clear();
        state.filters.partsOfSpeech.clear();
        renderFilters();
      }
      updateSelectionSummary();
    }),
  );

  elements.selectAllSubjectsButton.addEventListener("click", () => {
    state.filters.subjects = new Set(getSubjectList());
    renderFilters();
    updateSelectionSummary();
  });
  elements.clearSubjectsButton.addEventListener("click", () => {
    state.filters.subjects.clear();
    renderFilters();
    updateSelectionSummary();
  });
  elements.selectAllPosButton.addEventListener("click", () => {
    state.filters.partsOfSpeech = new Set(getPosList());
    renderFilters();
    updateSelectionSummary();
  });
  elements.clearPosButton.addEventListener("click", () => {
    state.filters.partsOfSpeech.clear();
    renderFilters();
    updateSelectionSummary();
  });

  elements.beginSessionButton.addEventListener("click", () => {
    syncFiltersFromUi();
    startSession();
  });
  elements.flashcardButton.addEventListener("click", () => {
    syncFiltersFromUi();
    startSession({ studyMode: "flashcards" });
  });
  elements.viewWordsButton.addEventListener("click", showTable);
  elements.tryIncorrectButton.addEventListener("click", () => {
    const focusWords = getAllForTier(state.filters.tier).filter((item) => state.focusMap.has(item.id));
    startSession({ words: focusWords, studyMode: state.filters.studyMode });
  });

  elements.checkAnswerButton.addEventListener("click", checkWrittenAnswer);
  elements.revealAnswerButton.addEventListener("click", revealAnswer);
  elements.flipFlashcardButton.addEventListener("click", flipFlashcard);
  elements.previousFlashcardButton.addEventListener("click", () => {
    if (state.session && state.session.index > 0) {
      state.session.index -= 1;
      renderQuestion();
    }
  });
  elements.nextFlashcardButton.addEventListener("click", nextQuestion);
  elements.starWordButton.addEventListener("click", () => toggleStar());
  elements.starWordButtonChoice.addEventListener("click", () => toggleStar());
  elements.starWordButtonFlashcard.addEventListener("click", () => toggleStar());
  elements.switchTableButton.addEventListener("click", showTable);
  elements.returnToSessionButton.addEventListener("click", showSession);
  elements.resetSessionButton.addEventListener("click", resetSession);
  elements.exportIncorrectButton.addEventListener("click", exportFocusList);
  elements.exportSidebarButton.addEventListener("click", exportFocusList);
  elements.importFocusInput.addEventListener("change", importFocusList);
  elements.clearFocusButton.addEventListener("click", () => {
    state.focusMap = new Map();
    saveJson(STORAGE_KEYS.focus, []);
    updateSelectionSummary();
  });
  elements.clearStarredButton.addEventListener("click", () => {
    state.starred = new Set();
    saveJson(STORAGE_KEYS.starred, []);
    updateSelectionSummary();
  });
  elements.leaderboardForm.addEventListener("submit", saveLeaderboardEntry);
  elements.answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      checkWrittenAnswer();
    }
  });
  elements.answerInput.addEventListener("focus", () => {
    window.setTimeout(() => {
      elements.answerInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  });
  elements.resetAppButton.addEventListener("click", resetProgress);

  document.addEventListener("keydown", (event) => {
    if (!state.session) {
      return;
    }

    if (state.session.studyMode === "flashcards") {
      if (event.key === "Enter") {
        flipFlashcard();
      } else if (event.key === "ArrowRight") {
        nextQuestion();
      } else if (event.key === "ArrowLeft" && state.session.index > 0) {
        state.session.index -= 1;
        renderQuestion();
      } else if (event.key.toLowerCase() === "s") {
        toggleStar();
      }
    }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    elements.installButton.classList.remove("hidden");
  });

  elements.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) {
      return;
    }
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    elements.installButton.classList.add("hidden");
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function init() {
  syncFiltersFromUi();
  ensureFilterDefaults();
  renderFilters();
  updateSelectionSummary();
  renderLeaderboard();
  wireEvents();
  registerServiceWorker();
}

init();
