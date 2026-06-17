import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdPeZ-KGIfaKAb-6bWV7Sr-HsYEFqxXng",
  authDomain: "high-school-chinese-exam-paper.firebaseapp.com",
  projectId: "high-school-chinese-exam-paper",
  storageBucket: "high-school-chinese-exam-paper.firebasestorage.app",
  messagingSenderId: "745266792403",
  appId: "1:745266792403:web:c35cf38468db258e9b1126",
  measurementId: "G-6F5PX1M125",
};

const fallbackQuiz = {
  title: "高中國文基礎練習",
  description: "Firestore 尚未建立題目時，系統會先使用這組內建範例題。",
  questions: [
    {
      text: "下列哪一項最接近「修辭」的意思？",
      options: ["整理資料表", "美化與調整語言表達", "設定網路連線", "建立程式索引"],
      answerIndex: 1,
      explanation: "修辭是調整語言表達，使文字更精確、生動或有感染力。",
    },
    {
      text: "閱讀古文時，先判斷句子的主詞、動詞與受詞，主要是為了什麼？",
      options: ["分析句意結構", "增加字數", "替換標點符號", "背誦作者生平"],
      answerIndex: 0,
      explanation: "掌握句子結構能幫助理解文意，特別是省略或倒裝的古文句式。",
    },
    {
      text: "下列哪一種方式較適合練習閱讀理解？",
      options: ["只看答案不看題目", "先讀題幹再回文章找線索", "完全猜測", "只背單一字詞"],
      answerIndex: 1,
      explanation: "先讀題幹可以知道要找的資訊，再回文章定位線索與判斷答案。",
    },
  ],
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  quizId: "oracle-basic",
  questions: [],
  submitted: false,
};

const authButton = document.querySelector("#authButton");
const authStatus = document.querySelector("#authStatus");
const authCard = document.querySelector("#authCard");
const authMessage = document.querySelector("#authMessage");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const loginEmailButton = document.querySelector("#loginEmailButton");
const registerEmailButton = document.querySelector("#registerEmailButton");
const resetPasswordButton = document.querySelector("#resetPasswordButton");
const quizSelect = document.querySelector("#quizSelect");
const loadQuizButton = document.querySelector("#loadQuizButton");
const quizTitle = document.querySelector("#quizTitle");
const quizDescription = document.querySelector("#quizDescription");
const questionCount = document.querySelector("#questionCount");
const quizForm = document.querySelector("#quizForm");
const submitQuizButton = document.querySelector("#submitQuizButton");
const scoreText = document.querySelector("#scoreText");
const saveStatus = document.querySelector("#saveStatus");
const recordsList = document.querySelector("#recordsList");

authButton.addEventListener("click", async () => {
  if (state.user) {
    await signOut(auth);
    return;
  }
  authCard.scrollIntoView({ behavior: "smooth", block: "center" });
  emailInput.focus();
});

authCard.addEventListener("submit", (event) => {
  event.preventDefault();
  signInWithEmail();
});

loginEmailButton.addEventListener("click", () => {
  signInWithEmail();
});

registerEmailButton.addEventListener("click", () => {
  registerWithEmail();
});

resetPasswordButton.addEventListener("click", () => {
  resetPassword();
});

loadQuizButton.addEventListener("click", () => {
  state.quizId = quizSelect.value;
  loadQuiz(state.quizId);
});

submitQuizButton.addEventListener("click", () => {
  submitQuiz();
});

onAuthStateChanged(auth, (user) => {
  state.user = user;
  authButton.textContent = user ? "登出" : "帳號登入";
  authStatus.textContent = user ? `已登入：${user.email}` : "尚未登入";
  setSaveStatus(user ? "送出後會儲存作答紀錄" : "登入後可儲存作答紀錄");
  loadRecords();
});

loadQuiz(state.quizId);

async function signInWithEmail() {
  const { email, password } = getEmailCredentials();
  if (!email || !password) return;

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    setSaveStatus("登入成功。");
  } catch (error) {
    setSaveStatus(getEmailAuthErrorMessage(error));
  }
}

async function registerWithEmail() {
  const { email, password } = getEmailCredentials();
  if (!email || !password) return;

  try {
    await setPersistence(auth, browserLocalPersistence);
    await createUserWithEmailAndPassword(auth, email, password);
    setSaveStatus("註冊成功，已登入。");
  } catch (error) {
    setSaveStatus(getEmailAuthErrorMessage(error));
  }
}

async function resetPassword() {
  const email = emailInput.value.trim();
  if (!email) {
    setSaveStatus("請先輸入 Email，再寄送重設密碼信。");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    setSaveStatus("重設密碼信已寄出，請檢查信箱。");
  } catch (error) {
    setSaveStatus(getEmailAuthErrorMessage(error));
  }
}

function getEmailCredentials() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    setSaveStatus("請輸入 Email。");
    emailInput.focus();
    return { email: "", password: "" };
  }

  if (password.length < 6) {
    setSaveStatus("密碼至少需要 6 個字元。");
    passwordInput.focus();
    return { email: "", password: "" };
  }

  return { email, password };
}

async function loadQuiz(quizId) {
  resetResult();

  try {
    const questionsRef = collection(db, "quizzes", quizId, "questions");
    const snapshot = await withTimeout(getDocs(questionsRef), 6000);
    const questions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (!questions.length) {
      renderQuiz(fallbackQuiz.title, fallbackQuiz.description, fallbackQuiz.questions);
      setSaveStatus("Firestore 尚無題目，目前使用內建範例題。");
      return;
    }

    renderQuiz("高中國文基礎練習", "題目已從 Firestore 載入。", questions);
    setSaveStatus(state.user ? "送出後會儲存作答紀錄" : "登入後可儲存作答紀錄");
  } catch (error) {
    renderQuiz(fallbackQuiz.title, fallbackQuiz.description, fallbackQuiz.questions);
    setSaveStatus(`讀取 Firestore 失敗，已改用範例題：${error.message}`);
  }
}

function renderQuiz(title, description, questions) {
  state.questions = questions.map((question, index) => ({
    ...question,
    answerIndex: Number(question.answerIndex),
    id: question.id || `fallback-${index}`,
  }));
  state.submitted = false;
  quizTitle.textContent = title;
  quizDescription.textContent = description;
  questionCount.textContent = `${state.questions.length} 題`;
  submitQuizButton.disabled = state.questions.length === 0;

  quizForm.innerHTML = state.questions
    .map((question, questionIndex) => {
      const options = Array.isArray(question.options) ? question.options : [];
      return `
        <article class="question-card" data-question-index="${questionIndex}">
          <p class="question-title">${questionIndex + 1}. ${escapeHtml(question.text || "")}</p>
          <div class="option-list">
            ${options
              .map(
                (option, optionIndex) => `
                  <label class="option-row" data-option-index="${optionIndex}">
                    <input type="radio" name="question-${questionIndex}" value="${optionIndex}" />
                    <span>${escapeHtml(option)}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
          <p class="explanation">${escapeHtml(question.explanation || "")}</p>
        </article>
      `;
    })
    .join("");
}

async function submitQuiz() {
  if (!state.questions.length || state.submitted) return;

  const answers = state.questions.map((_, index) => {
    const checked = quizForm.querySelector(`input[name="question-${index}"]:checked`);
    return checked ? Number(checked.value) : null;
  });

  let score = 0;
  state.questions.forEach((question, questionIndex) => {
    const card = quizForm.querySelector(`[data-question-index="${questionIndex}"]`);
    card.classList.add("reviewed");

    const selected = answers[questionIndex];
    if (selected === question.answerIndex) score += 1;

    card.querySelectorAll(".option-row").forEach((row) => {
      const optionIndex = Number(row.dataset.optionIndex);
      if (optionIndex === question.answerIndex) row.classList.add("correct");
      if (optionIndex === selected && selected !== question.answerIndex) row.classList.add("wrong");
    });
  });

  state.submitted = true;
  submitQuizButton.disabled = true;
  scoreText.textContent = `得分 ${score} / ${state.questions.length}`;

  if (!state.user) {
    setSaveStatus("未登入，因此沒有儲存紀錄。");
    return;
  }

  try {
    await addDoc(collection(db, "attempts"), {
      uid: state.user.uid,
      email: state.user.email || "",
      quizId: state.quizId,
      score,
      total: state.questions.length,
      answers,
      createdAt: serverTimestamp(),
    });
    setSaveStatus("作答紀錄已儲存。");
    await loadRecords();
  } catch (error) {
    setSaveStatus(`儲存失敗：${error.message}`);
  }
}

async function loadRecords() {
  if (!state.user) {
    recordsList.innerHTML = `<p class="empty-state">請先登入以查看作答紀錄。</p>`;
    return;
  }

  try {
    const recordsQuery = query(collection(db, "attempts"), where("uid", "==", state.user.uid), limit(8));
    const snapshot = await getDocs(recordsQuery);
    const records = snapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => {
        const left = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const right = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return right - left;
      });

    if (!records.length) {
      recordsList.innerHTML = `<p class="empty-state">尚無作答紀錄。</p>`;
      return;
    }

    recordsList.innerHTML = records
      .map((record) => {
        const date = record.createdAt?.toDate ? record.createdAt.toDate().toLocaleString("zh-TW") : "剛剛";
        return `
          <article class="record-item">
            <div>
              <strong>${escapeHtml(record.quizId || "quiz")}</strong>
              <div>${escapeHtml(date)}</div>
            </div>
            <strong>${Number(record.score || 0)} / ${Number(record.total || 0)}</strong>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    recordsList.innerHTML = `<p class="empty-state">讀取紀錄失敗：${escapeHtml(error.message)}</p>`;
  }
}

function resetResult() {
  scoreText.textContent = "尚未送出";
  submitQuizButton.disabled = true;
  state.submitted = false;
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
  if (authMessage) authMessage.textContent = message;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Firestore 讀取逾時")), timeoutMs);
    }),
  ]);
}

function getEmailAuthErrorMessage(error) {
  const code = error?.code || "";
  if (code === "auth/email-already-in-use") return "這個 Email 已註冊，請直接登入。";
  if (code === "auth/invalid-email") return "Email 格式不正確。";
  if (code === "auth/invalid-credential") return "Email 或密碼錯誤。";
  if (code === "auth/operation-not-allowed") return "Firebase 尚未啟用 Email/Password 登入，請到 Authentication > Sign-in method 啟用。";
  if (code === "auth/weak-password") return "密碼強度不足，至少需要 6 個字元。";
  return `帳號操作失敗：${error?.message || String(error)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
