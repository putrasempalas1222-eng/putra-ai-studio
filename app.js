import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMdkeIeIQToOSwO6zRj04rbAvZaI2A5KE",
  authDomain: "play-integrity-2adpr7x4a8xhyex.firebaseapp.com",
  databaseURL: "https://play-integrity-2adpr7x4a8xhyex-default-rtdb.firebaseio.com",
  projectId: "play-integrity-2adpr7x4a8xhyex",
  storageBucket: "play-integrity-2adpr7x4a8xhyex.firebasestorage.app",
  messagingSenderId: "520643585460",
  appId: "1:520643585460:web:e86caf42b27344a2df3ee1",
  measurementId: "G-6GX7G5JDN2",
};

const CREATE_USER_API = "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api/auth/create-profile";
const CHAT_API = "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api/chat";
const STUDENT_VERIFICATION_API = "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api/student-verifications";
const STUDENT_VERIFICATION_SETTINGS_API = "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api/student-verifications/settings";
const STUDENT_VERIFICATION_ME_API = "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api/student-verifications/me";
const REVIEW_API = "https://api-mzmdqh3n6a-uc.a.run.app/review";
const BAN_CHECK_API = "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api/auth/check-ban";
const QRIS_API = "https://qris.interactive.co.id/restapi/qris/show_qris.php";
const QRIS_NMID = "ID1026514647324";
const QRIS_API_KEY = "";
const QRIS_MID = "";
const PLAN_PRICES = {
  Plus: 299000,
  Premium: 799000,
};

const app = initializeApp(firebaseConfig);

const isLocalDevelopment =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.origin === "null";

if (!isLocalDevelopment) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("6LdMRuosAAAAAOtJIpsCv1bhG5LYHAQH2Gj2nk0a"),
    isTokenAutoRefreshEnabled: true,
  });
}

const auth = getAuth(app);
const db = getFirestore(app);

let currentApiKey = "";
let isApiKeyVisible = false;
let authMode = "login";
let chatHistory = [];
let selectedPaymentPlan = "";
let selectedPaymentInvoice = "";
let currentUsageLimit = 50;
let currentUsageUsed = 0;
let currentImageRequestLimit = 2;
let currentImageRequestUsed = 0;
let currentGeneratedImageLimit = 2;
let currentGeneratedImageUsed = 0;
let reviewRating = 0;
let reviewTimer = null;
let isShowingBanModal = false;
let chatImageBase64 = "";
let chatImageDataUrl = "";
let maintenanceCountdownTimer = null;
let runnerTimer = null;
let runnerScoreTimer = null;
let runnerRunning = false;
let runnerScore = 0;
let runnerSpeed = 5;
let musicEnabled = true;
let audioContext = null;
let musicTimer = null;
let environmentTimer = null;
let currentEnvironmentIndex = 0;
const runnerEnvironments = ["day", "foggy", "sandstorm", "night"];
const REVIEW_DELAY = 60000;
const REVIEW_RETRY_DELAY = 60000;
const MAINTENANCE_API =
  "https://us-central1-play-integrity-2adpr7x4a8xhyex.cloudfunctions.net/api/maintenance";

let deviceId = localStorage.getItem("device_id");

if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("device_id", deviceId);
}

function applyTheme(theme) {
  const isNight = theme === "night";
  document.body.classList.toggle("night", isNight);

  const iconUrl = isNight ? "https://api.iconify.design/solar:sun-2-bold.svg?color=%23f8fafc" : "https://api.iconify.design/solar:moon-bold.svg?color=%23101828";

  ["themeIcon", "themeIconUser", "themeIconMobile"].forEach((id) => {
    const icon = document.getElementById(id);
    if (icon) icon.src = iconUrl;
  });

  localStorage.setItem("putraTheme", theme);
}

window.toggleTheme = function () {
  const nextTheme = document.body.classList.contains("night") ? "light" : "night";
  applyTheme(nextTheme);
};

applyTheme(localStorage.getItem("putraTheme") || "light");

function applyMaintenanceState(data = {}) {
  const isEnabled = data.enabled === true;
  const modal = document.getElementById("maintenanceModal");
  const messageBox = document.getElementById("maintenanceMessage");
  const adminInfo = document.getElementById("maintenanceAdminInfo");
  const adminMessageText = document.getElementById("maintenanceAdminMessageText");
  const countdownCard = document.getElementById("maintenanceCountdownCard");

  if (messageBox) {
    messageBox.innerText = "Layanan saat ini sedang dalam maintenance.";
  }

  if (adminMessageText && adminInfo) {
    const adminMessage = String(data.message || "").trim();
    adminMessageText.innerText =
      adminMessage || "Admin belum menambahkan informasi tambahan.";
    adminInfo.classList.toggle("empty", !adminMessage);
  }

  if (modal) {
    modal.classList.toggle("hidden", !isEnabled);
  }

  updateMaintenanceCountdown(data.endsAt, isEnabled);
  if (countdownCard) {
    countdownCard.classList.toggle("empty", !data.endsAt);
  }
}

function updateMaintenanceCountdown(endsAt, isEnabled) {
  clearInterval(maintenanceCountdownTimer);

  const countdownText = document.getElementById("maintenanceCountdownText");
  const endsAtText = document.getElementById("maintenanceEndsAtText");
  if (!countdownText || !endsAtText) return;

  const endTime = Number(endsAt || 0);
  if (!isEnabled || !endTime) {
    countdownText.innerText = "--";
    endsAtText.innerText = "Belum ada waktu selesai dari admin.";
    return;
  }

  const renderCountdown = () => {
    const remaining = endTime - Date.now();
    const endDate = new Date(endTime);

    endsAtText.innerText =
      "Sampai " +
      endDate.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });

    if (remaining <= 0) {
      countdownText.innerText = "Maintenance selesai";
      applyMaintenanceState({
        enabled: false,
        message: adminMessageText?.innerText || "",
        endsAt: endTime,
      });
      loadMaintenanceState();
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdownText.innerText = [
      days ? `${days} hari` : "",
      `${String(hours).padStart(2, "0")} jam`,
      `${String(minutes).padStart(2, "0")} menit`,
      `${String(seconds).padStart(2, "0")} detik`,
    ]
      .filter(Boolean)
      .join(" ");
  };

  renderCountdown();
  maintenanceCountdownTimer = setInterval(renderCountdown, 1000);
}

async function loadMaintenanceState() {
  try {
    const response = await fetch(MAINTENANCE_API, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Gagal memuat status maintenance.");
    }

    applyMaintenanceState(data.data || {});
  } catch (error) {
    console.warn("Gagal memuat status maintenance:", error);
  }
}

loadMaintenanceState();
setInterval(loadMaintenanceState, 5000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadMaintenanceState();
});

window.toggleMenu = function () {
  const menu = document.getElementById("menu");
  const button = document.getElementById("mobileMenuBtn");
  const isOpen = menu.classList.toggle("active");
  button?.classList.toggle("active", isOpen);
  button?.setAttribute("aria-expanded", String(isOpen));
};

window.showPage = function (pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".menu a").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === pageId);
  });

  document.getElementById("menu")?.classList.remove("active");
  document.getElementById("mobileMenuBtn")?.classList.remove("active");
  document.getElementById("mobileMenuBtn")?.setAttribute("aria-expanded", "false");

  document.getElementById("menu").classList.remove("active");
};

function showAuthMessage(message, type = "error") {
  const messageBox = document.getElementById("authMessage");
  messageBox.innerText = message;
  messageBox.className = "auth-message " + type;
}

function clearAuthMessage() {
  const messageBox = document.getElementById("authMessage");
  messageBox.innerText = "";
  messageBox.className = "auth-message hidden";
}

function showVerifyPanel() {
  document.getElementById("verifyPanel").classList.remove("hidden");
}

function hideVerifyPanel() {
  document.getElementById("verifyPanel").classList.add("hidden");
}

window.openVerificationHelp = function () {
  openAuthModal("login");
  showAuthMessage("Belum menerima email verifikasi? Cek Inbox, Spam, atau Promosi.", "success");
  showVerifyPanel();
};

window.showDocFeature = function (feature) {
  document.querySelectorAll(".docs-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.doc === feature);
  });

  document.querySelectorAll(".doc-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === "doc-" + feature);
  });
};

window.showDocLanguage = function (feature, language) {
  const panel = document.getElementById("doc-" + feature);
  panel.querySelectorAll(".lang-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === language);
  });
  panel.querySelectorAll(".lang-code").forEach((code) => {
    code.classList.toggle(
      "active",
      code.dataset.feature === feature && code.dataset.lang === language
    );
  });
};

function setAuthLoading(isLoading) {
  const submitBtn = document.getElementById("authSubmitBtn");
  submitBtn.disabled = isLoading;
  submitBtn.innerText = isLoading ? "Memproses..." : authMode === "login" ? "Login" : "Buat Akun";
}

function getAuthInput() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    showAuthMessage("Email dan password wajib diisi.");
    return null;
  }

  if (password.length < 6) {
    showAuthMessage("Password minimal 6 karakter.");
    return null;
  }

  return { email, password };
}

function getAuthErrorMessage(error) {
  const code = error.code || "";

  if (code.includes("auth/invalid-email")) return "Format email tidak valid.";
  if (code.includes("auth/email-already-in-use")) return "Email sudah terdaftar. Silakan login.";
  if (code.includes("auth/invalid-credential")) return "Email atau password salah.";
  if (code.includes("auth/wrong-password")) return "Password salah.";
  if (code.includes("auth/weak-password")) return "Password minimal 6 karakter.";
  if (code.includes("auth/too-many-requests")) return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if (code.includes("auth/unauthorized-continue-uri")) return "Domain website belum diizinkan di Firebase Authentication.";
  if (code.includes("auth/missing-continue-uri")) return "URL verifikasi email belum valid.";

  return error.message || "Terjadi kesalahan.";
}

function getVerificationActionSettings() {
  const isLocalFile = location.origin === "null";
  const continueUrl = isLocalFile ? "https://play-integrity-2adpr7x4a8xhyex.firebaseapp.com/" : location.origin + location.pathname;

  return {
    url: continueUrl,
    handleCodeInApp: false,
  };
}

async function sendVerificationEmail(user) {
  await sendEmailVerification(user, getVerificationActionSettings());
}

window.setAuthMode = function (mode) {
  authMode = mode;
  clearAuthMessage();
  hideVerifyPanel();

  document.getElementById("loginTab").classList.toggle("active", mode === "login");
  document.getElementById("registerTab").classList.toggle("active", mode === "register");

  document.getElementById("authTitle").innerText = mode === "login" ? "Login" : "Register";

  document.getElementById("authSubtitle").innerText = mode === "login" ? "Masuk untuk melihat API key kamu." : "Buat akun baru dan dapatkan API key otomatis.";

  document.getElementById("password").setAttribute("autocomplete", mode === "login" ? "current-password" : "new-password");

  document.getElementById("authSubmitBtn").innerText = mode === "login" ? "Login" : "Buat Akun";

  document.getElementById("authFooter").innerHTML =
    mode === "login" ? "Belum punya akun? <span onclick=\"setAuthMode('register')\">Register sekarang</span>" : "Sudah punya akun? <span onclick=\"setAuthMode('login')\">Login sekarang</span>";
};

window.openAuthModal = function (mode = "login") {
  if (auth.currentUser) return;

  setAuthMode(mode);
  document.getElementById("authModal").classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("email").focus();
  }, 50);
};

window.closeAuthModal = function (event) {
  if (event && event.target !== document.getElementById("authModal")) return;
  document.getElementById("authModal").classList.add("hidden");
};

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAuthModal();
    closePaymentModal();
    closeReviewModal();
    closeHtmlPreview();
    closeMaintenanceGame();
  }
});

const firstPage = location.hash ? location.hash.replace("#", "") : "home";

if (document.getElementById(firstPage)?.classList.contains("page")) {
  showPage(firstPage);
}

async function createUserProfileInBackend(user) {
  const token = await user.getIdToken();

  const response = await fetch(CREATE_USER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      "x-device-id": deviceId,
    },
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || data.error || "Gagal membuat API key.");
  }

  return data;
}

window.registerUser = async function () {
  const input = getAuthInput();
  if (!input) return;

  try {
    setAuthLoading(true);

    const userCred = await createUserWithEmailAndPassword(auth, input.email, input.password);

    const user = userCred.user;

    await sendVerificationEmail(user);
    await signOut(auth);

    setAuthMode("login");
    showAuthMessage("Link verifikasi sudah dikirim ke email kamu.", "success");
    showVerifyPanel();
  } catch (err) {
    showAuthMessage(getAuthErrorMessage(err));
  } finally {
    setAuthLoading(false);
  }
};

window.loginUser = async function () {
  const input = getAuthInput();
  if (!input) return;

  try {
    setAuthLoading(true);

    await signInWithEmailAndPassword(auth, input.email, input.password);

    const user = auth.currentUser;

    if (user && !user.emailVerified) {
      await sendVerificationEmail(user);
      await signOut(auth);
      showAuthMessage("Email belum diverifikasi. Link verifikasi baru sudah dikirim ke email kamu.");
      showVerifyPanel();
      return;
    }

    closeAuthModal();
  } catch (err) {
    showAuthMessage(getAuthErrorMessage(err));
  } finally {
    setAuthLoading(false);
  }
};

window.submitAuth = async function () {
  if (authMode === "register") {
    await registerUser();
    return;
  }

  await loginUser();
};

window.logoutUser = async function () {
  await signOut(auth);
};

async function checkUserBanStatus(user) {
  const token = await user.getIdToken();
  const response = await fetch(BAN_CHECK_API, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "x-device-id": deviceId,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawBody = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Endpoint cek banned belum tersedia atau belum dideploy.");
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch (err) {
    throw new Error("Respons cek banned bukan JSON valid.");
  }

  if (response.status === 403 && data.banned) {
    return {
      banned: true,
      message: data.error || "Akun ini dibanned.",
    };
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || "Gagal mengecek status akun.");
  }

  return { banned: false };
}

async function handleBannedSession(message) {
  isShowingBanModal = true;
  await signOut(auth);
  closeAuthModal();
  document.getElementById("bannedMessage").innerText = message;
  document.getElementById("bannedModal").classList.remove("hidden");
}

window.closeBannedModal = function () {
  document.getElementById("bannedModal").classList.add("hidden");
  isShowingBanModal = false;
  openAuthModal("login");
  showAuthMessage("Akun dibanned: " + document.getElementById("bannedMessage").innerText);
};

window.copyApiKey = async function () {
  if (!currentApiKey) {
    showToast("API key belum tersedia.");
    return;
  }

  await navigator.clipboard.writeText(currentApiKey);
  showToast("Copy API key berhasil");
};

let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toastMessage");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("hidden");
  requestAnimationFrame(() => toast.classList.add("show"));
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 220);
  }, 1800);
}

window.selectPlan = function (planName) {
  if (!auth.currentUser) {
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

window.closePaymentModal = function (event) {
  if (event && event.target !== document.getElementById("paymentModal")) return;
  document.getElementById("paymentModal").classList.add("hidden");
};

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function showPaymentMessage(message, type = "error") {
  const messageBox = document.getElementById("paymentMessage");
  messageBox.innerText = message;
  messageBox.className = "auth-message " + type;
}

function clearPaymentMessage() {
  const messageBox = document.getElementById("paymentMessage");
  messageBox.innerText = "";
  messageBox.className = "auth-message hidden";
}

function clearPaymentQr() {
  const canvas = document.getElementById("paymentQrCanvas");
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
}

window.createQrisPayment = async function () {
  const amount = PLAN_PRICES[selectedPaymentPlan] || 0;

  if (!selectedPaymentPlan || !amount) {
    showPaymentMessage("Pilih paket upgrade terlebih dahulu.");
    return;
  }

  if (!QRIS_API_KEY || !QRIS_MID) {
    showPaymentMessage("Isi QRIS_API_KEY dan QRIS_MID dari InterActive QRIS dulu agar invoice bisa dibuat.");
    return;
  }

  clearPaymentMessage();
  showPaymentMessage("Membuat invoice QRIS...", "success");

  try {
    const url = new URL(QRIS_API);
    url.searchParams.set("do", "create-invoice");
    url.searchParams.set("apikey", QRIS_API_KEY);
    url.searchParams.set("mID", QRIS_MID);
    url.searchParams.set("cliTrxNumber", selectedPaymentInvoice);
    url.searchParams.set("cliTrxAmount", amount);
    url.searchParams.set("useTip", "no");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "success" || !data.data?.qris_content) {
      throw new Error(data.data?.qris_status || "Gagal membuat QRIS.");
    }

    document.getElementById("paymentInvoice").innerText = data.data.qris_invoiceid || selectedPaymentInvoice;
    document.getElementById("paymentNmid").innerText = data.data.qris_nmid || QRIS_NMID;

    await QRCode.toCanvas(document.getElementById("paymentQrCanvas"), data.data.qris_content, {
      width: 220,
      margin: 2,
      color: {
        dark: "#101828",
        light: "#ffffff",
      },
    });

    showPaymentMessage("QRIS berhasil dibuat. Silakan scan untuk membayar.", "success");
  } catch (err) {
    showPaymentMessage(err.message || "Gagal membuat pembayaran QRIS.");
  }
};

function getReviewSentKey(user) {
  return "putraReviewSent_" + user.uid;
}

function getReviewDelayKey(user) {
  return "putraReviewDelay_" + user.uid;
}

function hasSentReview(user) {
  return localStorage.getItem(getReviewSentKey(user)) === "true";
}

function scheduleReviewPopup(user, delay = REVIEW_DELAY) {
  clearTimeout(reviewTimer);

  if (!user || hasSentReview(user)) return;

  reviewTimer = setTimeout(() => {
    if (auth.currentUser && auth.currentUser.uid === user.uid && !hasSentReview(user)) {
      openReviewModal();
    }
  }, delay);
}

function showReviewMessage(message, type = "error") {
  const messageBox = document.getElementById("reviewMessage");
  messageBox.innerText = message;
  messageBox.className = "auth-message " + type;
}

function clearReviewMessage() {
  const messageBox = document.getElementById("reviewMessage");
  messageBox.innerText = "";
  messageBox.className = "auth-message hidden";
}

function openReviewModal() {
  reviewRating = 0;
  document.getElementById("reviewText").value = "";
  clearReviewMessage();
  updateReviewStars();
  document.getElementById("reviewModal").classList.remove("hidden");
}

window.closeReviewModal = function (event) {
  if (event && event.target !== document.getElementById("reviewModal")) return;
  if (document.getElementById("reviewModal").classList.contains("hidden")) return;
  cancelReview();
};

window.setReviewRating = function (rating) {
  reviewRating = rating;
  updateReviewStars();
};

function updateReviewStars() {
  document.querySelectorAll(".rating-star").forEach((star, index) => {
    star.classList.toggle("active", index < reviewRating);
  });
}

window.cancelReview = function () {
  document.getElementById("reviewModal").classList.add("hidden");

  const user = auth.currentUser;
  if (!user || hasSentReview(user)) return;

  scheduleReviewPopup(user, REVIEW_RETRY_DELAY);
};

function maskEmail(email = "") {
  const [name = "", domain = ""] = email.split("@");
  if (!domain) return email;
  const visibleStart = name.slice(0, Math.min(2, name.length));
  const maskedName = visibleStart + "*".repeat(Math.max(name.length - visibleStart.length, 3));
  return `${maskedName}@${domain}`;
}

function renderApiKey() {
  const apiKeyBox = document.getElementById("apiKeyBox");
  const icon = document.getElementById("apiKeyVisibilityIcon");
  if (!apiKeyBox) return;

  if (!currentApiKey) {
    apiKeyBox.innerText = "API key kosong.";
    apiKeyBox.classList.remove("masked");
    return;
  }

  apiKeyBox.innerText = isApiKeyVisible ? currentApiKey : "•".repeat(Math.max(currentApiKey.length, 18));
  apiKeyBox.classList.toggle("masked", !isApiKeyVisible);

  if (icon) {
    icon.src = isApiKeyVisible
      ? "https://api.iconify.design/solar:eye-closed-bold.svg?color=%230a84ff"
      : "https://api.iconify.design/solar:eye-bold.svg?color=%230a84ff";
  }
}

function updateApiStatus(data = {}) {
  const statusBox = document.getElementById("apiStatusBox");
  const statusCard = statusBox?.closest(".metric");
  if (!statusBox || !statusCard) return;

  const rawStatus = String(data.status || "").toLowerCase();
  const isInactive =
    data.active === false ||
    data.enabled === false ||
    data.disabled === true ||
    rawStatus === "inactive" ||
    rawStatus === "nonaktif" ||
    rawStatus === "disabled";

  statusBox.innerText = isInactive ? "Nonaktif" : "Aktif";
  statusCard.classList.toggle("inactive", isInactive);
}

window.toggleApiKeyVisibility = function () {
  isApiKeyVisible = !isApiKeyVisible;
  renderApiKey();
};

window.openMaintenanceGame = function () {
  document.getElementById("maintenanceGameModal").classList.remove("hidden");
  prepareRunnerIntro();
};

window.closeMaintenanceGame = function (event) {
  if (event && event.target !== document.getElementById("maintenanceGameModal")) return;
  document.getElementById("maintenanceGameModal").classList.add("hidden");
  stopRunnerGame();
  stopGameMusic();
};

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(frequency, duration, type = "sine", volume = 0.05) {
  ensureAudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.stop(audioContext.currentTime + duration);
}

function playJumpSound() {
  playTone(520, 0.14, "triangle", 0.05);
}

function playCrashSound() {
  playTone(120, 0.28, "sawtooth", 0.07);
}

function startGameMusic() {
  if (!musicEnabled || musicTimer) return;
  const melody = [330, 392, 440, 392, 523, 440];
  let step = 0;
  musicTimer = setInterval(() => {
    playTone(melody[step % melody.length], 0.18, "sine", 0.025);
    step += 1;
  }, 320);
}

function stopGameMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

window.toggleGameMusic = function () {
  musicEnabled = !musicEnabled;
  document.getElementById("gameMusicBtn").innerText = "Musik: " + (musicEnabled ? "ON" : "OFF");
  if (musicEnabled) {
    startGameMusic();
  } else {
    stopGameMusic();
  }
};

window.toggleGameFullscreen = async function () {
  const modal = document.getElementById("maintenanceGameModal");
  const card = modal.querySelector(".game-card");

  try {
    if (!document.fullscreenElement) {
      await card.requestFullscreen?.();
      modal.classList.add("fullscreen-active");
      try {
        await screen.orientation?.lock?.("landscape");
      } catch (err) {
        console.warn("Browser tidak mengizinkan lock landscape:", err);
      }
      return;
    }

    await document.exitFullscreen?.();
  } catch (err) {
    console.warn("Gagal mengubah mode fullscreen:", err);
  }
};

document.addEventListener("fullscreenchange", () => {
  const modal = document.getElementById("maintenanceGameModal");
  modal.classList.toggle("fullscreen-active", Boolean(document.fullscreenElement));

  if (!document.fullscreenElement) {
    try {
      screen.orientation?.unlock?.();
    } catch (err) {
      console.warn("Browser tidak mengizinkan unlock orientation:", err);
    }
  }
});

window.jumpRunner = function () {
  if (!runnerRunning) return;
  const player = document.getElementById("runnerPlayer");
  if (player.classList.contains("jumping")) return;
  player.classList.add("jumping");
  playJumpSound();
  setTimeout(() => player.classList.remove("jumping"), 720);
};

function stopRunnerGame() {
  runnerRunning = false;
  clearInterval(runnerTimer);
  clearInterval(runnerScoreTimer);
  runnerTimer = null;
  runnerScoreTimer = null;
  clearInterval(environmentTimer);
  environmentTimer = null;
}

window.restartRunnerGame = function () {
  stopRunnerGame();
  runnerRunning = true;
  runnerScore = 0;
  runnerSpeed = 5;

  const obstacle = document.getElementById("runnerObstacle");
  const overlay = document.getElementById("gameOverlay");
  obstacle.style.right = "-34px";
  setNextObstacleType();
  overlay.classList.add("hidden");
  document.getElementById("gameScore").innerText = "0";
  if (musicEnabled) startGameMusic();
  startEnvironmentCycle();

  runnerTimer = setInterval(updateRunnerFrame, 16);
  runnerScoreTimer = setInterval(() => {
    if (!runnerRunning) return;
    runnerScore += 1;
    runnerSpeed = Math.min(12, 5 + runnerScore / 120);
    document.getElementById("gameScore").innerText = String(runnerScore);
  }, 100);
};

function prepareRunnerIntro() {
  stopRunnerGame();
  stopGameMusic();
  runnerScore = 0;
  runnerSpeed = 5;
  document.getElementById("gameScore").innerText = "0";
  document.getElementById("gameOverlay").classList.add("hidden");
  document.getElementById("gameIntro").classList.remove("hidden");
  setRunnerEnvironment("day");
}

window.startRunnerFromIntro = function (event) {
  event?.stopPropagation();
  document.getElementById("gameIntro").classList.add("hidden");
  restartRunnerGame();
};

function updateRunnerFrame() {
  const obstacle = document.getElementById("runnerObstacle");
  const player = document.getElementById("runnerPlayer");
  const stage = document.getElementById("runnerStage");
  const currentRight = parseFloat(obstacle.style.right || "-34");
  const nextRight = currentRight + runnerSpeed;

  if (nextRight > stage.clientWidth + 34) {
    obstacle.style.right = "-34px";
    setNextObstacleType();
  } else {
    obstacle.style.right = nextRight + "px";
  }

  const playerRect = getPlayerHitbox(player.getBoundingClientRect());
  const obstacleRect = getObstacleHitbox(
    obstacle.getBoundingClientRect(),
    obstacle.classList.contains("crate"),
  );
  const collided =
    playerRect.left < obstacleRect.right &&
    playerRect.right > obstacleRect.left &&
    playerRect.top < obstacleRect.bottom &&
    playerRect.bottom > obstacleRect.top;

  if (collided) {
    runnerRunning = false;
    stopRunnerGame();
    stopGameMusic();
    playCrashSound();
    document.getElementById("finalGameScore").innerText = String(runnerScore);
    document.getElementById("gameOverlay").classList.remove("hidden");
  }
}

function setNextObstacleType() {
  const obstacle = document.getElementById("runnerObstacle");
  const type = Math.random() < 0.5 ? "cactus" : "crate";
  obstacle.className = "runner-obstacle " + type;
}

function startEnvironmentCycle() {
  clearInterval(environmentTimer);
  currentEnvironmentIndex = 0;
  setRunnerEnvironment(runnerEnvironments[currentEnvironmentIndex]);
  environmentTimer = setInterval(() => {
    currentEnvironmentIndex = (currentEnvironmentIndex + 1) % runnerEnvironments.length;
    setRunnerEnvironment(runnerEnvironments[currentEnvironmentIndex]);
  }, 12000);
}

function setRunnerEnvironment(name) {
  const stage = document.getElementById("runnerStage");
  stage.classList.remove("day", "night", "foggy", "sandstorm");
  stage.classList.add(name);
}

function getPlayerHitbox(rect) {
  return {
    left: rect.left + 14,
    right: rect.right - 10,
    top: rect.top + 18,
    bottom: rect.bottom - 2,
  };
}

function getObstacleHitbox(rect, isCrate) {
  return {
    left: rect.left + (isCrate ? 3 : 6),
    right: rect.right - (isCrate ? 3 : 6),
    top: rect.top + (isCrate ? 3 : 6),
    bottom: rect.bottom,
  };
}

document.addEventListener("keydown", (event) => {
  const gameModal = document.getElementById("maintenanceGameModal");
  if (gameModal.classList.contains("hidden")) return;
  if (event.code === "Space" || event.key === "ArrowUp") {
    event.preventDefault();
    jumpRunner();
  }
});

window.submitReview = async function () {
  const user = auth.currentUser;
  const reviewText = document.getElementById("reviewText").value.trim();

  if (!user) {
    showReviewMessage("Login dulu untuk mengirim ulasan.");
    return;
  }

  if (!reviewRating) {
    showReviewMessage("Pilih rating 1 sampai 5 bintang dulu.");
    return;
  }

  if (!reviewText) {
    showReviewMessage("Tulis ulasan kamu dulu.");
    return;
  }

  try {
    showReviewMessage("Mengirim ulasan...", "success");

    const token = await user.getIdToken();
    const response = await fetch(REVIEW_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        "x-api-key": currentApiKey,
        "x-device-id": deviceId,
      },
      body: JSON.stringify({
        rating: reviewRating,
        review: reviewText,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || data.message || "Gagal mengirim ulasan.");
    }

    localStorage.setItem(getReviewSentKey(user), "true");
    clearTimeout(reviewTimer);
    showReviewMessage("Ulasan berhasil dikirim. Terima kasih!", "success");
    document.getElementById("reviewModal").classList.add("hidden");
  } catch (err) {
    showReviewMessage(err.message || "Gagal mengirim ulasan.");
  }
};

async function syncReviewStatus(user) {
  if (!user || hasSentReview(user)) return;

  try {
    const reviewSnap = await getDoc(doc(db, "reviews", user.uid));
    if (reviewSnap.exists()) {
      localStorage.setItem(getReviewSentKey(user), "true");
    }
  } catch (err) {
    console.warn("Gagal mengecek status ulasan:", err);
  }
}

function addChatMessage(message, type = "ai", options = {}) {
  const chatMessages = document.getElementById("chatMessages");
  const bubble = document.createElement("div");

  bubble.className = "chat-bubble " + type;
  bubble.classList.toggle("has-image", Boolean(options.imageUrl));

  if (options.imageUrl) {
    const image = document.createElement("img");
    image.className = "chat-uploaded-image";
    image.src = options.imageUrl;
    image.alt = "Gambar yang dikirim";
    bubble.appendChild(image);
  }

  if (message) {
    const text = document.createElement("div");
    text.className = "chat-text";
    text.innerText = message;
    bubble.appendChild(text);
  }

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (options.speak) {
    addSpeakButton(bubble, message);
  }

  return bubble;
}

function addSpeakButton(bubble, text) {
  const speakButton = document.createElement("button");
  speakButton.className = "speak-btn";
  speakButton.innerHTML = '<img src="https://api.iconify.design/solar:volume-loud-bold.svg?color=%230a84ff" alt="">Speak';
  speakButton.onclick = () => speakText(text);
  bubble.appendChild(speakButton);
}

function updateAiBubble(bubble, message, canSpeak = true, imageUrl = "") {
  bubble.innerHTML = "";
  bubble.classList.toggle("has-image", Boolean(imageUrl));

  if (imageUrl) {
    const imageWrap = document.createElement("div");
    imageWrap.className = "chat-generated-image-wrap";

    const image = document.createElement("img");
    image.className = "chat-generated-image";
    image.src = imageUrl;
    image.alt = "Gambar hasil AI";

    const downloadButton = document.createElement("a");
    downloadButton.className = "download-image-btn";
    downloadButton.href = imageUrl;
    downloadButton.download = "putra-ai-image.png";
    downloadButton.innerText = "Download";

    imageWrap.appendChild(image);
    imageWrap.appendChild(downloadButton);
    bubble.appendChild(imageWrap);
  }

  renderAiContent(bubble, message);

  if (canSpeak) {
    addSpeakButton(bubble, message);
  }

  const chatMessages = document.getElementById("chatMessages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function wantsGeneratedImagePrompt(text) {
  const clean = String(text || "").toLowerCase();
  const hasImageWord = /\b(gambar|image)\b/.test(clean);
  const hasCreateIntent =
    /\b(buat|buatkan|bikin|generate|create|gambarkan)\b/.test(clean);

  return hasImageWord && hasCreateIntent;
}

function wantsEditedImagePrompt(text) {
  const clean = String(text || "").toLowerCase();
  return /\b(edit|ubah|ganti|tambahkan|tambah|hapus|hilangkan|jadikan|bikin jadi|buat jadi|replace|remove|add)\b/.test(
    clean
  );
}

function setAiLoadingState(bubble, mode = "text") {
  const label =
    mode === "image-editing"
      ? "PUTRA AI sedang mengedit gambar"
      : mode === "image-analysis"
      ? "PUTRA AI sedang menganalisis gambar"
      : mode === "image-generation"
        ? "PUTRA AI sedang menggambar"
        : "PUTRA AI sedang mengetik";

  bubble.classList.add("typing");
  bubble.innerHTML = `
    <span>${label}</span>
    <span class="typing-dots" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
  `;
}

function setChatSendingState(isSending) {
  const sendButton = document.getElementById("sendChatBtn");
  const promptInput = document.getElementById("testPrompt");
  const imageInput = document.getElementById("chatImageInput");
  const uploadButton = document.querySelector(".upload-chat-btn");
  sendButton.disabled = isSending;
  sendButton.classList.toggle("loading", isSending);
  promptInput.disabled = isSending;
  imageInput.disabled = isSending;
  uploadButton.disabled = isSending;
}

async function typeAiBubble(bubble, message, canSpeak = true, imageUrl = "") {
  bubble.classList.remove("typing");
  bubble.innerHTML = "";

  const textBox = document.createElement("div");
  textBox.className = "chat-text";
  bubble.appendChild(textBox);

  const text = String(message || "");
  const chunkSize = text.length > 500 ? 3 : 1;
  const delay = text.length > 500 ? 8 : 16;

  for (let i = 0; i < text.length; i += chunkSize) {
    textBox.innerText = text.slice(0, i + chunkSize);
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  updateAiBubble(bubble, text, canSpeak, imageUrl);
}

function renderAiContent(container, message) {
  const pattern = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(message)) !== null) {
    appendTextPart(container, message.slice(lastIndex, match.index));
    appendCodeBlock(container, match[2].trim(), match[1] || "code");
    lastIndex = pattern.lastIndex;
  }

  appendTextPart(container, message.slice(lastIndex));
}

function appendTextPart(container, text) {
  if (!text.trim()) return;

  const textBox = document.createElement("div");
  textBox.className = "chat-text";
  renderInlineCode(textBox, text.trim());
  container.appendChild(textBox);
}

function renderInlineCode(container, text) {
  const parts = text.split(/(`[^`]+`)/g);

  parts.forEach((part) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      const code = document.createElement("code");
      code.className = "inline-code";
      code.innerText = part.slice(1, -1);
      container.appendChild(code);
      return;
    }

    container.appendChild(document.createTextNode(part));
  });
}

function appendCodeBlock(container, code, language) {
  const wrapper = document.createElement("div");
  wrapper.className = "code-block";
  const normalizedLanguage = String(language || "code").toLowerCase();

  const head = document.createElement("div");
  head.className = "code-head";

  const label = document.createElement("span");
  label.innerText = normalizedLanguage;

  const actions = document.createElement("div");
  actions.className = "code-actions";

  if (normalizedLanguage === "html") {
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
    setTimeout(() => (copyButton.innerText = "Copy"), 1200);
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

function runHtmlPreview(code) {
  const frame = document.getElementById("htmlPreviewFrame");
  frame.srcdoc = code;
  document.getElementById("htmlPreviewModal").classList.remove("hidden");
}

window.closeHtmlPreview = function (event) {
  if (event && event.target !== document.getElementById("htmlPreviewModal")) return;

  const frame = document.getElementById("htmlPreviewFrame");
  frame.srcdoc = "";
  document.getElementById("htmlPreviewModal").classList.add("hidden");
};

function speakText(text) {
  if (!("speechSynthesis" in window)) {
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

function buildPromptWithHistory() {
  const recentHistory = chatHistory
    .slice(-12)
    .map((item) => {
      const role = item.role === "user" ? "User" : "PUTRA AI STUDIO";
      return role + ": " + item.content;
    })
    .join("\n");

  return `
Jawab pesan terakhir user dengan memperhatikan riwayat percakapan berikut.
Jika user bertanya lanjutan seperti "itu", "yang tadi", atau "lanjut", gunakan konteks dari chat sebelumnya.

Riwayat percakapan:
${recentHistory}
`;
}

function resetChatHistory(isLoggedIn = false) {
  chatHistory = [];

  const chatMessages = document.getElementById("chatMessages");

  const greeting = isLoggedIn ? "Halo, aku siap bantu test API kamu. Tulis pertanyaan atau prompt di bawah." : "Halo, aku siap bantu test API kamu. Login dulu, lalu tulis pertanyaan atau prompt di bawah.";

  if (chatMessages) {
    chatMessages.innerHTML = `
      <div class="chat-bubble ai">
        ${greeting}
      </div>
    `;
  }
}

async function waitForUserProfile(user, maxTry = 10) {
  for (let i = 0; i < maxTry; i++) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  return null;
}

async function loadUserData(user) {
  document.getElementById("userEmail").innerText = maskEmail(user.email);
  document.getElementById("apiKeyBox").innerText = "Memuat API key...";
  document.getElementById("limitBox").innerText = "50";
  updateApiStatus();
  updateUsagePanel(0, 50);
  updateImageUsagePanel(0, 2, 0, 2);

  let data = await waitForUserProfile(user);

  if (!data) {
    try {
      await createUserProfileInBackend(user);
      data = await waitForUserProfile(user);
    } catch (err) {
      console.warn("Gagal membuat profile user:", err);
    }
  }

  if (!data) {
    currentApiKey = "";
    document.getElementById("apiKeyBox").innerText = "API key belum tersedia. Silakan coba login kembali.";
    return;
  }

  currentApiKey = data.apiKey || "";
  currentUsageLimit = Number(data.limit || 50);

  isApiKeyVisible = false;
  renderApiKey();
  document.getElementById("limitBox").innerText = currentUsageLimit;
  updateApiStatus(data);

  await loadUsageData(currentApiKey, currentUsageLimit);
}

function updateUsagePanel(used, limit) {
  used = Number(used || 0);
  limit = Number(limit || 50);

  const remain = Math.max(limit - used, 0);

  document.getElementById("usedBox").innerText = used;

  document.getElementById("usageLimitBox").innerText = limit;

  const percent = Math.min((used / limit) * 100, 100);

  document.getElementById("usageFill").style.width = percent + "%";

  const panel = document.getElementById("usagePanel");

  panel.classList.remove("warning");
  panel.classList.remove("danger");

  if (percent >= 80) {
    panel.classList.add("danger");
  } else if (percent >= 50) {
    panel.classList.add("warning");
  }
}

function updateImageUsagePanel(
  imageUsed,
  imageLimit,
  generatedUsed,
  generatedLimit
) {
  imageUsed = Number(imageUsed || 0);
  imageLimit = Number(imageLimit || 2);
  generatedUsed = Number(generatedUsed || 0);
  generatedLimit = Number(generatedLimit || 2);

  document.getElementById("imageRequestUsedBox").innerText = Number(
    imageUsed
  );
  document.getElementById("imageRequestLimitBox").innerText = Number(
    imageLimit
  );
  document.getElementById("generatedImageUsedBox").innerText = Number(
    generatedUsed
  );
  document.getElementById("generatedImageLimitBox").innerText = Number(
    generatedLimit
  );

  updateMiniUsageCard(
    document.getElementById("imageRequestUsageFill"),
    document.getElementById("imageRequestUsagePanel"),
    imageUsed,
    imageLimit
  );

  updateMiniUsageCard(
    document.getElementById("generatedImageUsageFill"),
    document.getElementById("generatedImageUsagePanel"),
    generatedUsed,
    generatedLimit
  );
}

function updateMiniUsageCard(fill, card, used, limit) {
  const percent = Math.min((used / Math.max(limit, 1)) * 100, 100);
  fill.style.width = percent + "%";

  card.classList.remove("warning", "danger");
  if (percent >= 80) {
    card.classList.add("danger");
  } else if (percent >= 50) {
    card.classList.add("warning");
  }
}

async function loadUsageData(apiKey, limit) {
  if (!apiKey) {
    updateUsagePanel(0, limit);
    return;
  }

  try {
    const now = new Date();
    const day = now.toISOString().split("T")[0];
    const month =
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const dailyUsageId = apiKey + "_" + day;
    const monthlyImageUsageId = apiKey + "_images_" + month;
    const [dailyUsageSnap, monthlyImageUsageSnap] = await Promise.all([
      getDoc(doc(db, "usage_limits", dailyUsageId)),
      getDoc(doc(db, "usage_limits", monthlyImageUsageId)),
    ]);

    const dailyUsageData = dailyUsageSnap.exists() ? dailyUsageSnap.data() : {};
    const monthlyImageUsageData = monthlyImageUsageSnap.exists()
      ? monthlyImageUsageSnap.data()
      : {};

    updateUsagePanel(dailyUsageData.count || 0, dailyUsageData.limit || limit);
    updateImageUsagePanel(
      monthlyImageUsageData.imageRequestCount || 0,
      monthlyImageUsageData.imageRequestLimit || 2,
      monthlyImageUsageData.generatedImageCount || 0,
      monthlyImageUsageData.generatedImageLimit || 2
    );
  } catch (err) {
    console.warn("Gagal memuat pemakaian API:", err);
    updateUsagePanel(0, limit);
    updateImageUsagePanel(0, 2, 0, 2);
  }
}

window.testApi = async function () {
  const promptInput = document.getElementById("testPrompt");
  const prompt = promptInput.value.trim();
  const hasImage = Boolean(chatImageBase64);
  const requestImageBase64 = chatImageBase64;
  const requestImageDataUrl = chatImageDataUrl;
  const userMessage = prompt || (hasImage ? "Analisis gambar ini." : "");
  const requestMode = hasImage
    ? wantsEditedImagePrompt(userMessage)
      ? "image-editing"
      : "image-analysis"
    : wantsGeneratedImagePrompt(userMessage)
      ? "image-generation"
      : "text";

  if (!userMessage) {
    return;
  }

  if (!currentApiKey) {
    addChatMessage("Login dulu untuk memakai API.", "error");
    return;
  }

  promptInput.value = "";

  addChatMessage(userMessage, "user", {
    imageUrl: requestImageDataUrl || "",
  });
  removeChatImage();

  const loadingBubble = addChatMessage("", "ai");
  setAiLoadingState(loadingBubble, requestMode);
  setChatSendingState(true);

  try {
    const response = await fetch(CHAT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": currentApiKey,
        "x-device-id": deviceId,
      },
      body: JSON.stringify({
        prompt: userMessage,
        ...(hasImage ? { imageBase64: requestImageBase64 } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (data.banned) {
        await handleBannedSession(data.message || data.error || "Akun ini dibanned.");
        await typeAiBubble(loadingBubble, data.message || data.error || "Akun ini dibanned.", false);
        return;
      }

      await typeAiBubble(
        loadingBubble,
        data.message || data.error || "Terjadi kesalahan.",
        false
      );

      return;
    }

    // =========================
    // UPDATE CHAT
    // =========================

    await typeAiBubble(
      loadingBubble,
      data.content || "Tidak ada respon AI.",
      true,
      data.imageBase64 || ""
    );

    if (data.launchGame) {
      openMaintenanceGame();
    }

    // =========================
    // UPDATE USAGE PANEL
    // =========================

    const used = Number(data.used || 0);
    const limit = Number(data.limit || 50);

    updateUsagePanel(used, limit);
    updateImageUsagePanel(
      data.imageRequestUsed || 0,
      data.imageRequestLimit || 2,
      data.generatedImageUsed || 0,
      data.generatedImageLimit || 2
    );

    // OPTIONAL
    currentUsageUsed = used;
    currentUsageLimit = limit;
    currentImageRequestUsed = Number(data.imageRequestUsed || 0);
    currentImageRequestLimit = Number(data.imageRequestLimit || 2);
    currentGeneratedImageUsed = Number(data.generatedImageUsed || 0);
    currentGeneratedImageLimit = Number(data.generatedImageLimit || 2);
  } catch (err) {
    await typeAiBubble(loadingBubble, err.message || "Server error.", false);
  } finally {
    setChatSendingState(false);
    promptInput.focus();
  }
};

document.getElementById("chatImageInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    addChatMessage("File harus berupa gambar.", "error");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    chatImageDataUrl = String(reader.result || "");
    chatImageBase64 = chatImageDataUrl;
    document.getElementById("chatPreviewImage").src = chatImageDataUrl;
    document.getElementById("chatImagePreview").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

window.removeChatImage = function () {
  chatImageBase64 = "";
  chatImageDataUrl = "";
  const imageInput = document.getElementById("chatImageInput");
  const previewImage = document.getElementById("chatPreviewImage");
  imageInput.value = "";
  previewImage.src = "";
  document.getElementById("chatImagePreview").classList.add("hidden");
};

document.getElementById("testPrompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    testApi();
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (!user.emailVerified) {
      await sendVerificationEmail(user);
      await signOut(auth);
      return;
    }

    try {
      const banStatus = await checkUserBanStatus(user);
      if (banStatus.banned) {
        await handleBannedSession(banStatus.message);
        return;
      }
    } catch (err) {
      console.warn("Gagal mengecek status banned:", err);
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
    await loadMyStudentVerificationStatus();
  } else {
    currentApiKey = "";
    currentUsageUsed = 0;
    currentUsageLimit = 50;
    currentImageRequestUsed = 0;
    currentImageRequestLimit = 2;
    currentGeneratedImageUsed = 0;
    currentGeneratedImageLimit = 2;
    clearTimeout(reviewTimer);
    document.getElementById("reviewModal").classList.add("hidden");
    resetChatHistory(false);

    document.getElementById("authBox").classList.remove("hidden");
    document.getElementById("dashboardBox").classList.add("hidden");
    document.getElementById("navAuth").classList.remove("hidden");
    document.getElementById("navUser").classList.add("hidden");
    document.getElementById("mobileLogoutBtn").classList.add("hidden");
    document.getElementById("heroAuth").classList.remove("hidden");

    if (isShowingBanModal) {
      return;
    }
  }
});

const csAnswers = {
  gratis: "Ya. PUTRA AI STUDIO menyediakan paket Basic gratis agar kamu bisa mencoba layanan AI terlebih dahulu.",
  apikey: "Daftar akun, verifikasi email, lalu login. Setelah itu API key kamu akan muncul otomatis di dashboard.",
  fitur: "Fitur utama saat ini: chat text, analisis gambar, edit gambar, generate gambar, API key otomatis, dan pemantauan kuota.",
  limit: "Paket Basic memiliki 50 request per hari, 2 request kirim gambar per bulan, dan 2 request pembuatan gambar per bulan.",
  gambar: "Bisa. Kamu dapat mengirim gambar untuk dianalisis, mengedit gambar, dan membuat gambar baru dari prompt teks.",
  dokumentasi: "Buka menu Dokumentasi untuk melihat endpoint, header, body request, contoh kode, response, dan error umum.",
  upgrade: "Jika butuh limit lebih besar, buka menu Upgrade untuk melihat paket Plus dan Premium.",
};

function appendCsMessage(text, type) {
  const messages = document.getElementById("csMessages");
  if (!messages) return;
  const bubble = document.createElement("div");
  bubble.className = `cs-message ${type}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function appendCsTypingMessage() {
  const messages = document.getElementById("csMessages");
  if (!messages) return null;
  const bubble = document.createElement("div");
  bubble.className = "cs-message bot typing";
  bubble.innerHTML = `
    <span class="cs-typing-dots" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
  `;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

async function typeCsReply(text) {
  const messages = document.getElementById("csMessages");
  if (!messages) return;

  const typingBubble = appendCsTypingMessage();
  await new Promise((resolve) => setTimeout(resolve, 700));
  typingBubble?.remove();

  const bubble = document.createElement("div");
  bubble.className = "cs-message bot";
  messages.appendChild(bubble);

  for (const char of text) {
    bubble.textContent += char;
    messages.scrollTop = messages.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, 18));
  }
}

function getCsAutoReply(text) {
  const value = text.toLowerCase();
  if (value.includes("gratis") || value.includes("free")) return csAnswers.gratis;
  if (value.includes("api key") || value.includes("apikey") || value.includes("key")) return csAnswers.apikey;
  if (value.includes("fitur")) return csAnswers.fitur;
  if (value.includes("limit") || value.includes("kuota")) return csAnswers.limit;
  if (value.includes("gambar") || value.includes("image")) return csAnswers.gambar;
  if (value.includes("dokumen") || value.includes("docs")) return csAnswers.dokumentasi;
  if (value.includes("upgrade") || value.includes("premium") || value.includes("plus")) return csAnswers.upgrade;
  return "Terima kasih sudah menghubungi CS Putra AI. Untuk saat ini saya bisa bantu soal layanan gratis, API key, fitur, limit, gambar, dokumentasi, dan upgrade.";
}

window.toggleCsChat = function () {
  document.getElementById("csChat")?.classList.toggle("hidden");
};

window.askCsQuestion = function (key) {
  const questionMap = {
    gratis: "Apakah layanan ini gratis?",
    apikey: "Cara mendapatkan API key?",
    fitur: "Fitur apa saja yang tersedia?",
    limit: "Berapa limit paket Basic?",
    gambar: "Bisa buat dan analisis gambar?",
  };

  appendCsMessage(questionMap[key] || "Saya ingin bertanya.", "user");
  typeCsReply(csAnswers[key] || getCsAutoReply(questionMap[key] || ""));
};

window.sendCsMessage = function () {
  const input = document.getElementById("csInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  appendCsMessage(text, "user");
  typeCsReply(getCsAutoReply(text));
  input.value = "";
};

window.handleCsKeydown = function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendCsMessage();
  }
};

window.openStudentVerificationModal = function () {
  if (document.getElementById("studentApplyBtn")?.disabled) return;
  document.getElementById("studentVerificationModal").classList.remove("hidden");
};

window.closeStudentVerificationModal = function (event) {
  if (event && event.target !== document.getElementById("studentVerificationModal")) return;
  document.getElementById("studentVerificationModal").classList.add("hidden");
};

window.closeStudentResultModal = function (event) {
  if (event && event.target !== document.getElementById("studentResultModal")) return;
  document.getElementById("studentResultModal").classList.add("hidden");
};

window.closeProgramPopup = function (event) {
  if (event && event.target !== document.getElementById("programPopup")) return;
  document.getElementById("programPopup").classList.add("hidden");
  document.body.classList.remove("modal-open");
};

window.openStudentProgramFromPromo = function () {
  closeProgramPopup();
  if (auth.currentUser) {
    openStudentVerificationModal();
  } else {
    openAuthModal("login");
  }
};

function showStudentResultModal({title, text, actionLabel = "Tutup", onAction = null}) {
  document.getElementById("studentResultTitle").innerText = title;
  document.getElementById("studentResultText").innerText = text;
  const button = document.getElementById("studentResultPrimaryBtn");
  button.innerText = actionLabel;
  button.onclick = () => {
    closeStudentResultModal();
    onAction?.();
  };
  document.getElementById("studentResultModal").classList.remove("hidden");
}

function showStudentVerificationMessage(message, type = "success") {
  const box = document.getElementById("studentVerificationMessage");
  box.innerText = message;
  box.className = `auth-message ${type}`;
}

async function fileToCompressedDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = reject;
      image.src = String(reader.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.submitStudentVerification = async function () {
  const user = auth.currentUser;
  const fullName = document.getElementById("studentFullName").value.trim();
  const nim = document.getElementById("studentNim").value.trim();
  const university = document.getElementById("studentUniversity").value.trim();
  const file = document.getElementById("studentEvidence").files?.[0];

  if (!user) {
    showStudentVerificationMessage("Masuk dulu sebelum mengajukan verifikasi.", "error");
    return;
  }
  if (!fullName || !nim || !university || !file) {
    showStudentVerificationMessage("Nama, NIM, kampus, dan bukti wajib diisi.", "error");
    return;
  }
  if (!file.type.startsWith("image/")) {
    showStudentVerificationMessage("Bukti wajib berupa gambar.", "error");
    return;
  }

  try {
    showStudentVerificationMessage("Mengirim pengajuan...", "success");
    const evidenceDataUrl = await fileToCompressedDataUrl(file);
    const token = await user.getIdToken();
    const response = await fetch(STUDENT_VERIFICATION_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({fullName, nim, university, evidenceDataUrl}),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Gagal mengirim pengajuan.");
    }
    showStudentVerificationMessage("Pengajuan berhasil dikirim. Tunggu persetujuan admin.", "success");
    updateStudentProgramUi({status: "pending"});
  } catch (err) {
    showStudentVerificationMessage(err.message || "Gagal mengirim pengajuan.", "error");
  }
};

async function loadStudentVerificationSettings() {
  try {
    const response = await fetch(STUDENT_VERIFICATION_SETTINGS_API);
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error();
    const enabled = data.data?.enabled !== false;
    const button = document.getElementById("studentApplyBtn");
    const text = document.getElementById("studentProgramText");
    if (button) {
      button.disabled = !enabled;
      button.innerText = enabled ? "Ajukan" : "Ditutup";
    }
    if (text) {
      text.innerText = enabled
        ? "Mahasiswa dari kampus mana pun dapat mengajukan peningkatan kuota terbatas."
        : data.data?.message || "Pengajuan sedang ditutup sementara oleh admin.";
    }
  } catch {
    // Biarkan default UI tetap aktif jika status tidak bisa dimuat.
  }
}

async function loadMyStudentVerificationStatus() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const token = await user.getIdToken();
    const response = await fetch(STUDENT_VERIFICATION_ME_API, {
      headers: {Authorization: "Bearer " + token},
    });
    const data = await response.json();
    if (!response.ok || data.success === false || !data.data) return;

    const status = data.data.status;
    updateStudentProgramUi(data.data);
    const noticeKey = `student_notice_${user.uid}_${status}_${data.data.updatedAt || ""}`;
    if (sessionStorage.getItem(noticeKey)) return;
    sessionStorage.setItem(noticeKey, "1");

    if (status === "rejected") {
      showStudentResultModal({
        title: "Pengajuan Ditolak",
        text:
          (data.data.reason ? `${data.data.reason}. ` : "") +
          "Kamu bisa mengirim pengajuan baru dengan bukti yang lebih jelas.",
        actionLabel: "Ajukan Lagi",
        onAction: () => openStudentVerificationModal(),
      });
    } else if (status === "approved") {
      showStudentResultModal({
        title: "Upgrade Berhasil",
        text: "Verifikasi mahasiswa disetujui. Batas akun kamu telah ditingkatkan menjadi 250 request per hari selama 30 hari.",
      });
    }
  } catch {
    // Abaikan jika status belum bisa dimuat.
  }
}

function updateStudentProgramUi(data = null) {
  const button = document.getElementById("studentApplyBtn");
  const text = document.getElementById("studentProgramText");
  if (!button || !text || !data) return;

  if (data.status === "pending") {
    button.disabled = true;
    button.innerText = "Menunggu";
    text.innerText = "Pengajuan kamu sedang menunggu keputusan admin.";
    return;
  }

  if (data.status === "approved" || data.studentVerified === true) {
    button.disabled = true;
    button.innerText = "Terverifikasi";
    text.innerText = "Status kamu sudah menjadi mahasiswa terverifikasi. Pengajuan ulang tidak diperlukan.";
    return;
  }

  if (data.status === "rejected") {
    button.disabled = false;
    button.innerText = "Ajukan Lagi";
    text.innerText = "Pengajuan sebelumnya ditolak. Kamu dapat mengajukan ulang dengan bukti yang lebih jelas.";
  }
}

let lastScrollY = window.scrollY || 0;

function updateScrollEdges() {
  const topEdge = document.getElementById("scrollEdgeTop");
  const bottomEdge = document.getElementById("scrollEdgeBottom");
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll =
    document.documentElement.scrollHeight - document.documentElement.clientHeight;

  if (scrollTop <= 8) {
    topEdge?.classList.remove("visible");
    bottomEdge?.classList.toggle("visible", maxScroll > 8);
  } else if (scrollTop >= maxScroll - 8) {
    topEdge?.classList.add("visible");
    bottomEdge?.classList.remove("visible");
  } else if (scrollTop > lastScrollY) {
    topEdge?.classList.add("visible");
    bottomEdge?.classList.remove("visible");
  } else if (scrollTop < lastScrollY) {
    topEdge?.classList.remove("visible");
    bottomEdge?.classList.add("visible");
  }

  lastScrollY = scrollTop;
}

function initScrollReveal() {
  const revealTargets = document.querySelectorAll(
    ".home-stat-card, .home-info-card, .process-card, .faq-card, .sponsor-strip, .home-cta-card, .journey-item, .achievement-card, .docs-intro-block, .docs-guide-card, .feature, .plan-card, .policy-block"
  );

  revealTargets.forEach((element) => element.classList.add("reveal-on-scroll"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -24px 0px",
    }
  );

  revealTargets.forEach((element) => observer.observe(element));
}

window.addEventListener("scroll", updateScrollEdges, { passive: true });
window.addEventListener("resize", updateScrollEdges);
updateScrollEdges();
initScrollReveal();
loadStudentVerificationSettings();

setTimeout(() => {
  document.getElementById("programPopup")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
}, 600);
