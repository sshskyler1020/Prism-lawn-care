// ═══════════════════════════════════════════════════════════════
//  js/auth.js — Sign up, sign in, sign out, auth modal
//  Depends on: utils.js (toast, friendlyErr)
//              config.js (window.__demoMode, window.__auth, etc.)
// ═══════════════════════════════════════════════════════════════

// ── Modal helpers ─────────────────────────────────────────────
function openModal(view) {
  switchModal(view);
  document.getElementById("auth-modal").classList.add("open");
}
function closeModal() {
  document.getElementById("auth-modal").classList.remove("open");
}
function switchModal(view) {
  document.getElementById("login-view").style.display  = view === "login"  ? "" : "none";
  document.getElementById("signup-view").style.display = view === "signup" ? "" : "none";
  document.getElementById("login-error").classList.remove("visible");
  document.getElementById("signup-error").classList.remove("visible");
}
function showModalErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add("visible");
}

window.openModal   = openModal;
window.closeModal  = closeModal;
window.switchModal = switchModal;

// ── Sign In ───────────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-password").value;
  if (!email || !pass) return showModalErr("login-error", "Please fill in all fields.");

  if (window.__demoMode) {
    const users = JSON.parse(localStorage.getItem("prism_users") || "[]");
    const user  = users.find(u => u.email === email && u.password === pass);
    if (!user) return showModalErr("login-error", "Invalid email or password.");
    onUserLoggedIn({ uid: user.uid, email: user.email, displayName: user.name });
    closeModal();
  } else {
    try {
      await window.__fbFns.signInWithEmailAndPassword(window.__auth, email, pass);
      closeModal();
    } catch (e) {
      showModalErr("login-error", friendlyErr(e.code));
    }
  }
}
window.handleLogin = handleLogin;

// ── Sign Up ───────────────────────────────────────────────────
async function handleSignup() {
  const name  = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const pass  = document.getElementById("signup-password").value;

  if (!name || !email || !pass) return showModalErr("signup-error", "Please fill in all fields.");
  if (pass.length < 6)          return showModalErr("signup-error", "Password needs at least 6 characters.");

  if (window.__demoMode) {
    const users = JSON.parse(localStorage.getItem("prism_users") || "[]");
    if (users.find(u => u.email === email))
      return showModalErr("signup-error", "Email already in use.");
    const uid = "demo_" + Date.now();
    users.push({ uid, email, password: pass, name });
    localStorage.setItem("prism_users", JSON.stringify(users));
    onUserLoggedIn({ uid, email, displayName: name });
    closeModal();
  } else {
    try {
      const cred = await window.__fbFns.createUserWithEmailAndPassword(window.__auth, email, pass);
      await window.__fbFns.updateProfile(cred.user, { displayName: name });
      closeModal();
    } catch (e) {
      showModalErr("signup-error", friendlyErr(e.code));
    }
  }
}
window.handleSignup = handleSignup;

// ── Sign Out ──────────────────────────────────────────────────
async function handleSignOut() {
  if (window.__demoMode) {
    window.__currentUser = null;
    onUserLoggedOut();
  } else {
    await window.__fbFns.signOut(window.__auth);
  }
}
window.handleSignOut = handleSignOut;

// ── On login success ──────────────────────────────────────────
function onUserLoggedIn(user) {
  window.__currentUser = user;

  document.getElementById("nav-auth").style.display     = "none";
  document.getElementById("user-display").style.display = "flex";
  document.getElementById("user-name-nav").textContent  = user.displayName || user.email;
  document.getElementById("my-bookings").style.display  = "";
  document.getElementById("booking-gate").style.display = "none";
  document.getElementById("booking-form-wrap").style.display = "";

  // Show admin button if this is the admin account
  if (user.email === window.ADMIN_EMAIL) {
    document.getElementById("nav-admin-btn").style.display = "";
  }

  if (typeof loadMyBookings === "function") loadMyBookings();
  toast("👋 Welcome, " + (user.displayName || user.email) + "!");
}
window.onUserLoggedIn = onUserLoggedIn;

// ── On logout ─────────────────────────────────────────────────
function onUserLoggedOut() {
  window.__currentUser = null;

  document.getElementById("nav-auth").style.display         = "flex";
  document.getElementById("user-display").style.display     = "none";
  document.getElementById("my-bookings").style.display      = "none";
  document.getElementById("admin-panel").style.display      = "none";
  document.getElementById("nav-admin-btn").style.display    = "none";
  document.getElementById("bookings-list").innerHTML =
    '<div class="empty-state">No bookings yet.</div>';

  toast("Signed out successfully.");
}
window.onUserLoggedOut = onUserLoggedOut;

// ── Demo mode: listen for firebase-ready, show banner ─────────
document.addEventListener("firebase-ready", () => {
  if (window.__demoMode) {
    document.getElementById("demo-banner").classList.add("visible");
  }
});
