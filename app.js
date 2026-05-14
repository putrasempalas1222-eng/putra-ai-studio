import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMdkeIeIQToOSwO6zRj04rbAvZaI2A5KE",
  authDomain: "play-integrity-2adpr7x4a8xhyex.firebaseapp.com",
  databaseURL: "https://play-integrity-2adpr7x4a8xhyex-default-rtdb.firebaseio.com",
  projectId: "play-integrity-2adpr7x4a8xhyex",
  storageBucket: "play-integrity-2adpr7x4a8xhyex.firebasestorage.app",
  messagingSenderId: "520643585460",
  appId: "1:520643585460:web:e86caf42b27344a2df3ee1",
  measurementId: "G-6GX7G5JDN2"
};

const CREATE_USER_API = "https://api-save-520643585460.us-central1.run.app";
const CHAT_API = "https://api-mzmdqh3n6a-uc.a.run.app/chat";
const REVIEW_API = "https://api-mzmdqh3n6a-uc.a.run.app/review";
const QRIS_API = "https://qris.interactive.co.id/restapi/qris/show_qris.php";
const QRIS_NMID = "ID1026514647324";
const QRIS_API_KEY = "";
const QRIS_MID = "";
const PLAN_PRICES = {
  Plus: 299000,
  Premium: 799000
};

const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(
    "6LdMRuosAAAAAOtJIpsCv1bhG5LYHAQH2Gj2nk0a"
  ),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const db = getFirestore(app);

let currentApiKey = "";
let authMode = "login";
let chatHistory = [];
let selectedPaymentPlan = "";
let selectedPaymentInvoice = "";
let currentUsageLimit = 100;
let currentUsageUsed = 0;
let reviewRating = 0;
let reviewTimer = null;
const REVIEW_DELAY = 60000;
const REVIEW_RETRY_DELAY = 60000;

function applyTheme(theme){
  const isNight = theme === "night";
  document.body.classList.toggle("night", isNight);

  const iconUrl = isNight
    ? "https://api.iconify.design/solar:sun-2-bold.svg?color=%23f8fafc"
    : "https://api.iconify.design/solar:moon-bold.svg?color=%23101828";

  ["themeIcon", "themeIconUser", "themeIconMobile"].forEach((id) => {
    const icon = document.getElementById(id);
    if(icon) icon.src = iconUrl;
  });

  localStorage.setItem("putraTheme", theme);
}

window.toggleTheme = function(){
  const nextTheme = document.body.classList.contains("night") ? "light" : "night";
  applyTheme(nextTheme);
};

applyTheme(localStorage.getItem("putraTheme") || "light");

window.toggleMenu = function(){
  document.getElementById("menu").classList.toggle("active");
};

window.showPage = function(pageId){
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".menu a").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === pageId);
  });

  document.getElementById("menu").classList.remove("active");
};

function showAuthMessage(message, type = "error"){
  const messageBox = document.getElementById("authMessage");
  messageBox.innerText = message;
  messageBox.className = "auth-message " + type;
}

function clearAuthMessage(){
  const messageBox = document.getElementById("authMessage");
  messageBox.innerText = "";
  messageBox.className = "auth-message hidden";
}

function setAuthLoading(isLoading){
  const submitBtn = document.getElementById("authSubmitBtn");
  submitBtn.disabled = isLoading;
  submitBtn.innerText = isLoading ? "Memproses..." : (authMode === "login" ? "Login" : "Buat Akun");
}

function getAuthInput(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if(!email || !password){
    showAuthMessage("Email dan password wajib diisi.");
    return null;
  }

  if(password.length < 6){
    showAuthMessage("Password minimal 6 karakter.");
    return null;
  }

  return { email, password };
}

function getAuthErrorMessage(error){
  const code = error.code || "";

  if(code.includes("auth/invalid-email")) return "Format email tidak valid.";
  if(code.includes("auth/email-already-in-use")) return "Email sudah terdaftar. Silakan login.";
  if(code.includes("auth/invalid-credential")) return "Email atau password salah.";
  if(code.includes("auth/wrong-password")) return "Password salah.";
  if(code.includes("auth/weak-password")) return "Password minimal 6 karakter.";
  if(code.includes("auth/too-many-requests")) return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if(code.includes("auth/unauthorized-continue-uri")) return "Domain website belum diizinkan di Firebase Authentication.";
  if(code.includes("auth/missing-continue-uri")) return "URL verifikasi email belum valid.";

  return error.message || "Terjadi kesalahan.";
}

function getVerificationActionSettings(){
  const isLocalFile = location.origin === "null";
  const continueUrl = isLocalFile
    ? "https://play-integrity-2adpr7x4a8xhyex.firebaseapp.com/"
    : location.origin + location.pathname;

  return {
    url: continueUrl,
    handleCodeInApp: false
  };
}

async function sendVerificationEmail(user){
  await sendEmailVerification(user, getVerificationActionSettings());
}

window.setAuthMode = function(mode){
  authMode = mode;
  clearAuthMessage();

  document.getElementById("loginTab").classList.toggle("active", mode === "login");
  document.getElementById("registerTab").classList.toggle("active", mode === "register");

  document.getElementById("authTitle").innerText = mode === "login" ? "Login" : "Register";

  document.getElementById("authSubtitle").innerText = mode === "login"
    ? "Masuk untuk melihat API key kamu."
    : "Buat akun baru dan dapatkan API key otomatis.";

  document.getElementById("password").setAttribute(
    "autocomplete",
    mode === "login" ? "current-password" : "new-password"
  );

  document.getElementById("authSubmitBtn").innerText = mode === "login" ? "Login" : "Buat Akun";

  document.getElementById("authFooter").innerHTML = mode === "login"
    ? "Belum punya akun? <span onclick=\"setAuthMode('register')\">Register sekarang</span>"
    : "Sudah punya akun? <span onclick=\"setAuthMode('login')\">Login sekarang</span>";
};

window.openAuthModal = function(mode = "login"){
  if(auth.currentUser) return;

  setAuthMode(mode);
  document.getElementById("authModal").classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("email").focus();
  }, 50);
};

window.closeAuthModal = function(event){
  if(event && event.target !== document.getElementById("authModal")) return;
  document.getElementById("authModal").classList.add("hidden");
};

document.addEventListener("keydown", (event) => {
  if(event.key === "Escape"){
    closeAuthModal();
    closePaymentModal();
    closeReviewModal();
    closeHtmlPreview();
  }
});

const firstPage = location.hash ? location.hash.replace("#", "") : "home";

if(document.getElementById(firstPage)?.classList.contains("page")){
  showPage(firstPage);
}

async function createUserProfileInBackend(user){
  const token = await user.getIdToken(true);

  const response = await fetch(CREATE_USER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  });

  const data = await response.json();

  if(!response.ok || data.success === false){
    throw new Error(data.message || data.error || "Gagal membuat API key.");
  }

  return data;
}

window.registerUser = async function(){
  const input = getAuthInput();
  if(!input) return;

  try{
    setAuthLoading(true);

    const userCred = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );

    const user = userCred.user;

    await sendVerificationEmail(user);
    await signOut(auth);

    setAuthMode("login");
    showAuthMessage("Link verifikasi sudah dikirim ke email kamu. Verifikasi dulu sebelum login.", "success");

  }catch(err){

    showAuthMessage(getAuthErrorMessage(err));

  }finally{

    setAuthLoading(false);

  }
};

window.loginUser = async function(){
  const input = getAuthInput();
  if(!input) return;

  try{
    setAuthLoading(true);

    await signInWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );

    const user = auth.currentUser;

    if(user && !user.emailVerified){
      await sendVerificationEmail(user);
      await signOut(auth);
      showAuthMessage("Email belum diverifikasi. Link verifikasi baru sudah dikirim ke email kamu.");
      return;
    }

    closeAuthModal();

  }catch(err){

    showAuthMessage(getAuthErrorMessage(err));

  }finally{

    setAuthLoading(false);

  }
};

window.submitAuth = async function(){
  if(authMode === "register"){
    await registerUser();
    return;
  }

  await loginUser();
};

window.logoutUser = async function(){
  await signOut(auth);
};

window.copyApiKey = async function(){
  if(!currentApiKey){
    alert("API key belum tersedia.");
    return;
  }

  await navigator.clipboard.writeText(currentApiKey);
  alert("API key disalin.");
};

window.selectPlan = function(planName){
  if(!auth.currentUser){
    openAuthModal("login");
    showAuthMessage("Login dulu untuk upgrade ke paket " + planName + ".");
    return;
  }

  selectedPaymentPlan = planName;
  selectedPaymentInvoice = "PUTRA-" + planName.toUpperCase() + "-" + Date.now();

  document.getElementById("paymentPlanName").innerText = planName;
  document.getElementById("paymentAmount").innerText = formatRupiah(PLAN_PRICES[planName] || 0);
  document.getElementById("paymentNmid").innerText = QRIS_NMID;
  document.getElementById("paymentInvoice").innerText = selectedPaymentInvoice;
  document.getElementById("paymentModal").classList.remove("hidden");

  clearPaymentMessage();
  clearPaymentQr();
  createQrisPayment();
};

window.closePaymentModal = function(event){
  if(event && event.target !== document.getElementById("paymentModal")) return;
  document.getElementById("paymentModal").classList.add("hidden");
};

function formatRupiah(value){
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function showPaymentMessage(message, type = "error"){
  const messageBox = document.getElementById("paymentMessage");
  messageBox.innerText = message;
  messageBox.className = "auth-message " + type;
}

function clearPaymentMessage(){
  const messageBox = document.getElementById("paymentMessage");
  messageBox.innerText = "";
  messageBox.className = "auth-message hidden";
}

function clearPaymentQr(){
  const canvas = document.getElementById("paymentQrCanvas");
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
}

window.createQrisPayment = async function(){
  const amount = PLAN_PRICES[selectedPaymentPlan] || 0;

  if(!selectedPaymentPlan || !amount){
    showPaymentMessage("Pilih paket upgrade terlebih dahulu.");
    return;
  }

  if(!QRIS_API_KEY || !QRIS_MID){
    showPaymentMessage("Isi QRIS_API_KEY dan QRIS_MID dari InterActive QRIS dulu agar invoice bisa dibuat.");
    return;
  }

  clearPaymentMessage();
  showPaymentMessage("Membuat invoice QRIS...", "success");

  try{
    const url = new URL(QRIS_API);
    url.searchParams.set("do", "create-invoice");
    url.searchParams.set("apikey", QRIS_API_KEY);
    url.searchParams.set("mID", QRIS_MID);
    url.searchParams.set("cliTrxNumber", selectedPaymentInvoice);
    url.searchParams.set("cliTrxAmount", amount);
    url.searchParams.set("useTip", "no");

    const response = await fetch(url.toString());
    const data = await response.json();

    if(data.status !== "success" || !data.data?.qris_content){
      throw new Error(data.data?.qris_status || "Gagal membuat QRIS.");
    }

    document.getElementById("paymentInvoice").innerText = data.data.qris_invoiceid || selectedPaymentInvoice;
    document.getElementById("paymentNmid").innerText = data.data.qris_nmid || QRIS_NMID;

    await QRCode.toCanvas(
      document.getElementById("paymentQrCanvas"),
      data.data.qris_content,
      {
        width: 220,
        margin: 2,
        color: {
          dark: "#101828",
          light: "#ffffff"
        }
      }
    );

    showPaymentMessage("QRIS berhasil dibuat. Silakan scan untuk membayar.", "success");
  }catch(err){
    showPaymentMessage(err.message || "Gagal membuat pembayaran QRIS.");
  }
};

function getReviewSentKey(user){
  return "putraReviewSent_" + user.uid;
}

function getReviewDelayKey(user){
  return "putraReviewDelay_" + user.uid;
}

function hasSentReview(user){
  return localStorage.getItem(getReviewSentKey(user)) === "true";
}

function scheduleReviewPopup(user, delay = REVIEW_DELAY){
  clearTimeout(reviewTimer);

  if(!user || hasSentReview(user)) return;

  const delayedUntil = Number(localStorage.getItem(getReviewDelayKey(user)) || 0);
  const now = Date.now();
  const finalDelay = Math.max(delay, delayedUntil - now, 0);

  reviewTimer = setTimeout(() => {
    if(auth.currentUser && auth.currentUser.uid === user.uid && !hasSentReview(user)){
      openReviewModal();
    }
  }, finalDelay);
}

function showReviewMessage(message, type = "error"){
  const messageBox = document.getElementById("reviewMessage");
  messageBox.innerText = message;
  messageBox.className = "auth-message " + type;
}

function clearReviewMessage(){
  const messageBox = document.getElementById("reviewMessage");
  messageBox.innerText = "";
  messageBox.className = "auth-message hidden";
}

function openReviewModal(){
  reviewRating = 0;
  document.getElementById("reviewText").value = "";
  clearReviewMessage();
  updateReviewStars();
  document.getElementById("reviewModal").classList.remove("hidden");
}

window.closeReviewModal = function(event){
  if(event && event.target !== document.getElementById("reviewModal")) return;
  if(document.getElementById("reviewModal").classList.contains("hidden")) return;
  cancelReview();
};

window.setReviewRating = function(rating){
  reviewRating = rating;
  updateReviewStars();
};

function updateReviewStars(){
  document.querySelectorAll(".rating-star").forEach((star, index) => {
    star.classList.toggle("active", index < reviewRating);
  });
}

window.cancelReview = function(){
  document.getElementById("reviewModal").classList.add("hidden");

  const user = auth.currentUser;
  if(!user || hasSentReview(user)) return;

  localStorage.setItem(getReviewDelayKey(user), String(Date.now() + REVIEW_RETRY_DELAY));
  scheduleReviewPopup(user, REVIEW_RETRY_DELAY);
};

window.submitReview = async function(){
  const user = auth.currentUser;
  const reviewText = document.getElementById("reviewText").value.trim();

  if(!user){
    showReviewMessage("Login dulu untuk mengirim ulasan.");
    return;
  }

  if(!reviewRating){
    showReviewMessage("Pilih rating 1 sampai 5 bintang dulu.");
    return;
  }

  if(!reviewText){
    showReviewMessage("Tulis ulasan kamu dulu.");
    return;
  }

  try{
    showReviewMessage("Mengirim ulasan...", "success");

    const token = await user.getIdToken();
    const response = await fetch(REVIEW_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        rating: reviewRating,
        review: reviewText
      })
    });

    const data = await response.json();

    if(!response.ok || data.success === false){
      throw new Error(data.error || data.message || "Gagal mengirim ulasan.");
    }

    localStorage.setItem(getReviewSentKey(user), "true");
    localStorage.removeItem(getReviewDelayKey(user));
    clearTimeout(reviewTimer);
    showReviewMessage("Ulasan berhasil dikirim. Terima kasih!", "success");
    document.getElementById("reviewModal").classList.add("hidden");
  }catch(err){
    showReviewMessage(err.message || "Gagal mengirim ulasan.");
  }
};

async function syncReviewStatus(user){
  if(!user || hasSentReview(user)) return;

  try{
    const reviewSnap = await getDoc(doc(db, "reviews", user.uid));
    if(reviewSnap.exists()){
      localStorage.setItem(getReviewSentKey(user), "true");
      localStorage.removeItem(getReviewDelayKey(user));
    }
  }catch(err){
    console.warn("Gagal mengecek status ulasan:", err);
  }
}

function addChatMessage(message, type = "ai", options = {}){
  const chatMessages = document.getElementById("chatMessages");
  const bubble = document.createElement("div");

  bubble.className = "chat-bubble " + type;
  bubble.innerText = message;

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if(options.speak){
    addSpeakButton(bubble, message);
  }

  return bubble;
}

function addSpeakButton(bubble, text){
  const speakButton = document.createElement("button");
  speakButton.className = "speak-btn";
  speakButton.innerHTML = "<img src=\"https://api.iconify.design/solar:volume-loud-bold.svg?color=%230a84ff\" alt=\"\">Speak";
  speakButton.onclick = () => speakText(text);
  bubble.appendChild(speakButton);
}

function updateAiBubble(bubble, message, canSpeak = true){
  bubble.innerHTML = "";
  renderAiContent(bubble, message);

  if(canSpeak){
    addSpeakButton(bubble, message);
  }

  const chatMessages = document.getElementById("chatMessages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderAiContent(container, message){
  const pattern = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while((match = pattern.exec(message)) !== null){
    appendTextPart(container, message.slice(lastIndex, match.index));
    appendCodeBlock(container, match[2].trim(), match[1] || "code");
    lastIndex = pattern.lastIndex;
  }

  appendTextPart(container, message.slice(lastIndex));
}

function appendTextPart(container, text){
  if(!text.trim()) return;

  const textBox = document.createElement("div");
  textBox.className = "chat-text";
  renderInlineCode(textBox, text.trim());
  container.appendChild(textBox);
}

function renderInlineCode(container, text){
  const parts = text.split(/(`[^`]+`)/g);

  parts.forEach((part) => {
    if(part.startsWith("`") && part.endsWith("`") && part.length > 2){
      const code = document.createElement("code");
      code.className = "inline-code";
      code.innerText = part.slice(1, -1);
      container.appendChild(code);
      return;
    }

    container.appendChild(document.createTextNode(part));
  });
}

function appendCodeBlock(container, code, language){
  const wrapper = document.createElement("div");
  wrapper.className = "code-block";
  const normalizedLanguage = String(language || "code").toLowerCase();

  const head = document.createElement("div");
  head.className = "code-head";

  const label = document.createElement("span");
  label.innerText = normalizedLanguage;

  const actions = document.createElement("div");
  actions.className = "code-actions";

  if(normalizedLanguage === "html"){
    const runButton = document.createElement("button");
    runButton.className = "run-code-btn";
    runButton.innerText = "Run";
    runButton.onclick = () => runHtmlPreview(code);
    actions.appendChild(runButton);
  }

  const copyButton = document.createElement("button");
  copyButton.className = "copy-code-btn";
  copyButton.innerText = "Copy";
  copyButton.onclick = async () => {
    await navigator.clipboard.writeText(code);
    copyButton.innerText = "Copied";
    setTimeout(() => copyButton.innerText = "Copy", 1200);
  };
  actions.appendChild(copyButton);

  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  codeEl.innerText = code;
  pre.appendChild(codeEl);

  head.appendChild(label);
  head.appendChild(actions);
  wrapper.appendChild(head);
  wrapper.appendChild(pre);
  container.appendChild(wrapper);
}

function runHtmlPreview(code){
  const frame = document.getElementById("htmlPreviewFrame");
  frame.srcdoc = code;
  document.getElementById("htmlPreviewModal").classList.remove("hidden");
}

window.closeHtmlPreview = function(event){
  if(event && event.target !== document.getElementById("htmlPreviewModal")) return;

  const frame = document.getElementById("htmlPreviewFrame");
  frame.srcdoc = "";
  document.getElementById("htmlPreviewModal").classList.add("hidden");
};

function speakText(text){
  if(!("speechSynthesis" in window)){
    alert("Browser belum mendukung fitur speak.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

function buildPromptWithHistory(){
  const recentHistory = chatHistory.slice(-12).map((item) => {
    const role = item.role === "user" ? "User" : "PUTRA AI STUDIO";
    return role + ": " + item.content;
  }).join("\n");

  return `
Jawab pesan terakhir user dengan memperhatikan riwayat percakapan berikut.
Jika user bertanya lanjutan seperti "itu", "yang tadi", atau "lanjut", gunakan konteks dari chat sebelumnya.

Riwayat percakapan:
${recentHistory}
`;
}

function resetChatHistory(isLoggedIn = false){
  chatHistory = [];

  const chatMessages = document.getElementById("chatMessages");

  const greeting = isLoggedIn
    ? "Halo, aku siap bantu test API kamu. Tulis pertanyaan atau prompt di bawah."
    : "Halo, aku siap bantu test API kamu. Login dulu, lalu tulis pertanyaan atau prompt di bawah.";

  if(chatMessages){
    chatMessages.innerHTML = `
      <div class="chat-bubble ai">
        ${greeting}
      </div>
    `;
  }
}

async function waitForUserProfile(user, maxTry = 10){
  for(let i = 0; i < maxTry; i++){
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if(userSnap.exists()){
      return userSnap.data();
    }

    await new Promise(resolve => setTimeout(resolve, 700));
  }

  return null;
}

async function loadUserData(user){
  document.getElementById("userEmail").innerText = user.email;
  document.getElementById("apiKeyBox").innerText = "Memuat API key...";
  document.getElementById("limitBox").innerText = "100";
  updateUsagePanel(0, 100);

  let data = await waitForUserProfile(user);

  if(!data){
    try{
      await createUserProfileInBackend(user);
      data = await waitForUserProfile(user);
    }catch(err){
      console.warn("Gagal membuat profile user:", err);
    }
  }

  if(!data){
    currentApiKey = "";
    document.getElementById("apiKeyBox").innerText = "API key belum tersedia. Silakan coba login kembali.";
    return;
  }

  currentApiKey = data.apiKey || "";
  currentUsageLimit = Number(data.limit || 100);

  document.getElementById("apiKeyBox").innerText = currentApiKey || "API key kosong.";
  document.getElementById("limitBox").innerText = currentUsageLimit;

  await loadUsageData(currentApiKey, currentUsageLimit);
}

function updateUsagePanel(used, limit){

  used = Number(used || 0);
  limit = Number(limit || 100);

  const remain = Math.max(limit - used, 0);

  document.getElementById("usedBox").innerText = used;

  document.getElementById("usageLimitBox").innerText = limit;

  

  const percent = Math.min((used / limit) * 100, 100);

  document.getElementById("usageFill").style.width =
    percent + "%";

  const panel = document.getElementById("usagePanel");

  panel.classList.remove("warning");
  panel.classList.remove("danger");

  if(percent >= 80){
    panel.classList.add("danger");
  }
  else if(percent >= 50){
    panel.classList.add("warning");
  }

}

async function loadUsageData(apiKey, limit){
  if(!apiKey){
    updateUsagePanel(0, limit);
    return;
  }

  try{
    const today = new Date().toISOString().split("T")[0];
    const usageId = apiKey + "_" + today;
    const usageSnap = await getDoc(doc(db, "usage_limits", usageId));

    if(usageSnap.exists()){
      const usageData = usageSnap.data();
      updateUsagePanel(usageData.count || 0, usageData.limit || limit);
      return;
    }

    updateUsagePanel(0, limit);
  }catch(err){
    console.warn("Gagal memuat pemakaian API:", err);
    updateUsagePanel(0, limit);
  }
}

window.testApi = async function(){

  const promptInput = document.getElementById("testPrompt");
  const prompt = promptInput.value.trim();

  if(!prompt){
    return;
  }

  if(!currentApiKey){
    addChatMessage("Login dulu untuk memakai API.", "error");
    return;
  }

  promptInput.value = "";

  addChatMessage(prompt, "user");

  const loadingBubble = addChatMessage("PUTRA AI sedang mengetik...", "ai");

  try{

    const response = await fetch(CHAT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": currentApiKey
      },
      body: JSON.stringify({
        prompt: prompt
      })
    });

    const data = await response.json();

    if(!response.ok || !data.success){

      updateAiBubble(
        loadingBubble,
        data.message || "Terjadi kesalahan.",
        false
      );

      return;
    }

    // =========================
    // UPDATE CHAT
    // =========================

    updateAiBubble(
      loadingBubble,
      data.content || "Tidak ada respon AI."
    );

    // =========================
    // UPDATE USAGE PANEL
    // =========================

    const used = Number(data.used || 0);
    const limit = Number(data.limit || 100);

    updateUsagePanel(used, limit);

    // OPTIONAL
    currentUsageUsed = used;
    currentUsageLimit = limit;

  }catch(err){

    updateAiBubble(
      loadingBubble,
      err.message || "Server error.",
      false
    );

  }

};

document.getElementById("testPrompt").addEventListener("keydown", (event) => {
  if(event.key === "Enter" && !event.shiftKey){
    event.preventDefault();
    testApi();
  }
});

onAuthStateChanged(auth, async (user) => {
  if(user){
    if(!user.emailVerified){
      await sendVerificationEmail(user);
      await signOut(auth);
      return;
    }

    resetChatHistory(true);

    document.getElementById("authBox").classList.add("hidden");
    document.getElementById("dashboardBox").classList.remove("hidden");
    document.getElementById("navAuth").classList.add("hidden");
    document.getElementById("navUser").classList.remove("hidden");
    document.getElementById("mobileLogoutBtn").classList.remove("hidden");
    document.getElementById("heroAuth").classList.add("hidden");

    closeAuthModal();

    await loadUserData(user);
    await syncReviewStatus(user);
    scheduleReviewPopup(user);

  }else{

    currentApiKey = "";
    currentUsageUsed = 0;
    currentUsageLimit = 100;
    clearTimeout(reviewTimer);
    document.getElementById("reviewModal").classList.add("hidden");
    resetChatHistory(false);

    document.getElementById("authBox").classList.remove("hidden");
    document.getElementById("dashboardBox").classList.add("hidden");
    document.getElementById("navAuth").classList.remove("hidden");
    document.getElementById("navUser").classList.add("hidden");
    document.getElementById("mobileLogoutBtn").classList.add("hidden");
    document.getElementById("heroAuth").classList.remove("hidden");

  }
});
