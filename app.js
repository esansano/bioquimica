const QUESTION_COUNT = 20;
const UNANSWERED_MESSAGE = "✎ Sin responder";

const topicSelect = document.getElementById("topicSelect");
const regenerateBtn = document.getElementById("regenerateBtn");
const submitBtn = document.getElementById("submitBtn");
const questionsContainer = document.getElementById("questionsContainer");
const scoreValue = document.getElementById("scoreValue");
const counterValue = document.getElementById("counterValue");
const statusMessage = document.getElementById("statusMessage");

let allQuestions = [];
let currentQuestions = [];
let selections = new Map();
let hasSubmitted = false;
let score = 0;
const cardMap = new Map();

const normalize = (value) => value?.toString().trim().toLowerCase();

const setStatus = (message, type = "info") => {
  statusMessage.textContent = message ?? "";
  statusMessage.classList.toggle("error", type === "error");
};

const shuffle = (array) => {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const updateSelectionCounter = () => {
  const total = currentQuestions.length;
  counterValue.textContent = total ? `${selections.size} / ${total}` : "0 / 0";
};

const refreshScoreDisplay = () => {
  scoreValue.textContent = hasSubmitted ? score : "—";
};

const resetSession = () => {
  selections = new Map();
  hasSubmitted = false;
  score = 0;
  submitBtn.disabled = true;
  cardMap.clear();
  refreshScoreDisplay();
  updateSelectionCounter();
};

const handleSelection = (question, choice, card, button) => {
  if (hasSubmitted) {
    return;
  }

  const normalizedChoice = normalize(choice);
  selections.set(question.id, normalizedChoice);

  const buttons = card.querySelectorAll(".option-btn");
  buttons.forEach((btn) => {
    const isSelected = btn === button;
    btn.classList.toggle("selected", isSelected);
    btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });

  const feedback = card.querySelector(".feedback");
  feedback.textContent = "Respuesta guardada. Pulsa “Enviar respuestas”.";
  feedback.className = "feedback pending";

  updateSelectionCounter();
  submitBtn.disabled = selections.size === 0;
};

const gradeQuiz = () => {
  if (!currentQuestions.length) {
    setStatus("Genera una tanda antes de enviar.", "error");
    return;
  }

  if (hasSubmitted) {
    setStatus("Ya has enviado esta tanda. Genera una nueva para repetir.");
    return;
  }

  let computedScore = 0;

  currentQuestions.forEach((question) => {
    const card = cardMap.get(question.id);
    if (!card) {
      return;
    }

    const userAnswer = selections.get(question.id);
    const correctAnswer = normalize(question.correct_answer);

    const buttons = card.querySelectorAll(".option-btn");
    buttons.forEach((btn) => {
      const choice = normalize(btn.dataset.choice);
      btn.disabled = true;
      btn.classList.remove("selected");
      if (choice === correctAnswer) {
        btn.classList.add("correct");
      }
      if (userAnswer && choice === userAnswer && userAnswer !== correctAnswer) {
        btn.classList.add("incorrect");
      }
    });

    const feedback = card.querySelector(".feedback");
    let feedbackText = UNANSWERED_MESSAGE;
    let feedbackClass = "pending";

    if (!userAnswer) {
      feedbackText = UNANSWERED_MESSAGE;
    } else if (userAnswer === correctAnswer) {
      computedScore += 1;
      feedbackText = "✔ Correcto";
      feedbackClass = "correct";
    } else {
      computedScore -= 1;
      feedbackText = "✖ Incorrecto";
      feedbackClass = "incorrect";
    }

    feedback.textContent = feedbackText;
    feedback.className = `feedback ${feedbackClass}`;

    const explanation = card.querySelector(".explanation");
    explanation.hidden = false;
  });

  score = computedScore;
  hasSubmitted = true;
  refreshScoreDisplay();
  submitBtn.disabled = true;

  const unanswered = currentQuestions.length - selections.size;
  let message = `Resultados calculados. Puntuación: ${score}.`;
  if (unanswered > 0) {
    message += ` ${unanswered} pregunta(s) sin responder.`;
  }
  setStatus(message);
};

const createQuestionCard = (question, index) => {
  const card = document.createElement("article");
  card.className = "question-card";
  card.dataset.questionId = question.id;

  card.innerHTML = `
    <header>
      <p class="tag">T${String(question.unit).padStart(2, "0")}</p>
      <span>#${String(index + 1).padStart(2, "0")} · ${question.id}</span>
    </header>
    <h3>${question.question}</h3>
    <div class="options">
      <button class="option-btn" data-choice="verdadero" type="button" aria-pressed="false">Verdadero</button>
      <button class="option-btn" data-choice="falso" type="button" aria-pressed="false">Falso</button>
    </div>
    <p class="feedback pending" aria-live="polite">Selecciona una opción.</p>
    <div class="explanation" hidden>
      <p><strong>Explicación:</strong> ${question.explanation}</p>
      <p class="reference"><strong>Referencia:</strong> ${question.reference}</p>
    </div>
  `;

  const buttons = card.querySelectorAll(".option-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () =>
      handleSelection(question, btn.dataset.choice, card, btn)
    );
  });

  return card;
};

const renderQuestions = () => {
  questionsContainer.innerHTML = "";
  cardMap.clear();

  if (!currentQuestions.length) {
    questionsContainer.innerHTML =
      '<p class="placeholder">No hay preguntas disponibles para este tema.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  currentQuestions.forEach((question, index) => {
    const card = createQuestionCard(question, index);
    fragment.appendChild(card);
    cardMap.set(question.id, card);
  });
  questionsContainer.appendChild(fragment);
};

const regenerateQuestions = () => {
  if (!allQuestions.length) {
    setStatus("Aún no se han cargado las preguntas.", "error");
    return;
  }

  const topic = topicSelect.value;
  const pool =
    topic === "all"
      ? [...allQuestions]
      : allQuestions.filter((q) => String(q.unit) === topic);

  if (!pool.length) {
    currentQuestions = [];
    renderQuestions();
    resetSession();
    setStatus("No hay preguntas para ese tema.", "error");
    return;
  }

  const shuffled = shuffle(pool);
  currentQuestions =
    shuffled.length > QUESTION_COUNT
      ? shuffled.slice(0, QUESTION_COUNT)
      : shuffled;

  resetSession();
  renderQuestions();
  updateSelectionCounter();

  if (pool.length < QUESTION_COUNT) {
    setStatus(
      `Solo hay ${pool.length} preguntas en este tema. Completa tus respuestas y pulsa “Enviar respuestas”.`,
      "info"
    );
  } else {
    setStatus(
      "Selecciona tus respuestas y, cuando estés lista, pulsa “Enviar respuestas”."
    );
  }
};

const loadQuestions = async () => {
  setStatus("Cargando banco de preguntas…");
  regenerateBtn.disabled = true;
  submitBtn.disabled = true;
  try {
    const response = await fetch("preguntes.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo");
    }
    allQuestions = await response.json();
    setStatus(
      "Banco cargado. Genera una tanda, responde y pulsa “Enviar respuestas”."
    );
    regenerateBtn.disabled = false;
  } catch (error) {
    console.error(error);
    setStatus(
      "Error al cargar las preguntas. Revisa que `preguntes.json` esté disponible.",
      "error"
    );
  }
};

refreshScoreDisplay();
updateSelectionCounter();

regenerateBtn.addEventListener("click", regenerateQuestions);
topicSelect.addEventListener("change", regenerateQuestions);
submitBtn.addEventListener("click", gradeQuiz);

loadQuestions();
