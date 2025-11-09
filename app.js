const QUESTION_COUNT = 20;

const topicSelect = document.getElementById("topicSelect");
const regenerateBtn = document.getElementById("regenerateBtn");
const questionsContainer = document.getElementById("questionsContainer");
const scoreValue = document.getElementById("scoreValue");
const counterValue = document.getElementById("counterValue");
const statusMessage = document.getElementById("statusMessage");

let allQuestions = [];
let currentQuestions = [];
let score = 0;
let answered = 0;

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

const updateScoreboard = () => {
  scoreValue.textContent = score;
  counterValue.textContent = `${answered} / ${currentQuestions.length}`;
};

const resetScore = () => {
  score = 0;
  answered = 0;
  updateScoreboard();
};

const handleAnswer = (question, userAnswer, card) => {
  if (card.dataset.answered === "true") {
    return;
  }

  const isCorrect = question.correct_answer.toLowerCase() === userAnswer;
  score += isCorrect ? 1 : -1;
  answered += 1;
  updateScoreboard();

  const buttons = card.querySelectorAll(".option-btn");
  buttons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.choice === question.correct_answer.toLowerCase()) {
      btn.classList.add("correct");
    } else if (btn.dataset.choice === userAnswer) {
      btn.classList.add("incorrect");
    }
  });

  const feedback = card.querySelector(".feedback");
  feedback.textContent = isCorrect ? "✔ Correcto" : "✖ Incorrecto";
  feedback.classList.toggle("correct", isCorrect);
  feedback.classList.toggle("incorrect", !isCorrect);

  const explanation = card.querySelector(".explanation");
  explanation.hidden = false;

  card.dataset.answered = "true";
};

const createQuestionCard = (question, index) => {
  const card = document.createElement("article");
  card.className = "question-card";
  card.dataset.answered = "false";

  card.innerHTML = `
    <header>
      <p class="tag">T${String(question.unit).padStart(2, "0")}</p>
      <span>#${String(index + 1).padStart(2, "0")} · ${question.id}</span>
    </header>
    <h3>${question.question}</h3>
    <div class="options">
      <button class="option-btn" data-choice="verdadero" type="button">Verdadero</button>
      <button class="option-btn" data-choice="falso" type="button">Falso</button>
    </div>
    <p class="feedback" aria-live="polite">&nbsp;</p>
    <div class="explanation" hidden>
      <p><strong>Explicación:</strong> ${question.explanation}</p>
      <p class="reference"><strong>Referencia:</strong> ${question.reference}</p>
    </div>
  `;

  const buttons = card.querySelectorAll(".option-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () =>
      handleAnswer(question, btn.dataset.choice, card)
    );
  });

  return card;
};

const renderQuestions = () => {
  questionsContainer.innerHTML = "";

  if (!currentQuestions.length) {
    questionsContainer.innerHTML =
      '<p class="placeholder">No hay preguntas disponibles para este tema.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  currentQuestions.forEach((question, index) => {
    fragment.appendChild(createQuestionCard(question, index));
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
    resetScore();
    setStatus("No hay preguntas para ese tema.", "error");
    return;
  }

  const shuffled = shuffle(pool);
  currentQuestions =
    shuffled.length > QUESTION_COUNT
      ? shuffled.slice(0, QUESTION_COUNT)
      : shuffled;

  if (pool.length < QUESTION_COUNT) {
    setStatus(
      `Solo hay ${pool.length} preguntas en este tema. Se mostrarán todas.`,
      "info"
    );
  } else {
    setStatus("Nueva tanda lista. ¡A por ello!");
  }

  resetScore();
  renderQuestions();
};

const loadQuestions = async () => {
  setStatus("Cargando banco de preguntas…");
  regenerateBtn.disabled = true;
  try {
    const response = await fetch("preguntes.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo");
    }
    allQuestions = await response.json();
    setStatus("Banco cargado. Genera tu primera tanda.");
    regenerateBtn.disabled = false;
  } catch (error) {
    console.error(error);
    setStatus(
      "Error al cargar las preguntas. Revisa que `preguntes.json` esté disponible.",
      "error"
    );
  }
};

regenerateBtn.addEventListener("click", regenerateQuestions);
topicSelect.addEventListener("change", regenerateQuestions);

loadQuestions();
