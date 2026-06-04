// ═══════════════════════════════════════════════════════════════
//  js/utils.js — Shared helpers used by all other JS files
// ═══════════════════════════════════════════════════════════════

// ── Service data (single source of truth) ────────────────────
const SERVICE_LABELS = {
  mow:     "Lawn Mowing & Weed Whacking",
  cleanup: "Lawn Clean-Up",
  trim:    "Edging & Trimming"
};

const SERVICE_PRICES = {
  mow:     { min: 30, max: 75 },
  cleanup: { min: 10, max: 40 },
  trim:    { min: 20, max: 50 }
};

const TIME_SLOTS = [
  "8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM",
  "1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM"
];

// Make available globally
window.SERVICE_LABELS = SERVICE_LABELS;
window.SERVICE_PRICES = SERVICE_PRICES;
window.TIME_SLOTS     = TIME_SLOTS;

// ── Toast notification ────────────────────────────────────────
function toast(msg, duration = 3200) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), duration);
}
window.toast = toast;

// ── Format ISO date → "Jun 2, 2026" ──────────────────────────
function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+m - 1]} ${+d}, ${y}`;
}
window.formatDate = formatDate;

// ── Friendly Firebase error messages ─────────────────────────
function friendlyErr(code) {
  const map = {
    "auth/user-not-found":       "No account found with that email.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/email-already-in-use": "Email already in use.",
    "auth/invalid-email":        "Invalid email address.",
    "auth/weak-password":        "Password needs at least 6 characters.",
    "auth/invalid-credential":   "Invalid email or password."
  };
  return map[code] || "Something went wrong. Please try again.";
}
window.friendlyErr = friendlyErr;

// ── Credit card input formatters ─────────────────────────────
function formatCard(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 16);
  el.value = v.match(/.{1,4}/g)?.join(" ") || v;
}
function formatExp(el) {
  let v = el.value.replace(/\D/g, "");
  if (v.length >= 2) v = v.slice(0, 2) + " / " + v.slice(2, 4);
  el.value = v;
}
window.formatCard = formatCard;
window.formatExp  = formatExp;

// ── Generate random coupon code ───────────────────────────────
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
window.generateCode = generateCode;

// ── Animated grass blades in hero ────────────────────────────
function initGrass() {
  const container = document.getElementById("grass-blades");
  if (!container) return;
  for (let i = 0; i < 80; i++) {
    const b = document.createElement("div");
    b.className = "blade";
    const h = 18 + Math.random() * 44;
    b.style.cssText = [
      `left:${(i / 80) * 100 + Math.random() * 1.5}%`,
      `height:${h}px`,
      `animation-delay:${Math.random() * 3}s`,
      `animation-duration:${2 + Math.random() * 2}s`,
      `opacity:${0.45 + Math.random() * 0.55}`,
      `width:${2 + Math.random() * 2}px`
    ].join(";");
    container.appendChild(b);
  }
}
window.initGrass = initGrass;

// ── Set date input minimum to today ──────────────────────────
function initDateInput() {
  const d = document.getElementById("date-input");
  if (!d) return;
  const today = new Date().toISOString().split("T")[0];
  d.min   = today;
  d.value = today;
}
window.initDateInput = initDateInput;

// ── Copy text to clipboard (with fallback) ───────────────────
function copyToClipboard(text, successMsg = "📋 Copied!") {
  navigator.clipboard.writeText(text)
    .then(() => toast(successMsg))
    .catch(() => {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
      toast(successMsg);
    });
}
window.copyToClipboard = copyToClipboard;

// ── Run init helpers once DOM is ready ───────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initGrass();
  initDateInput();
});
