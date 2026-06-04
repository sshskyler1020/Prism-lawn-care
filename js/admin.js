// ═══════════════════════════════════════════════════════════════
//  js/admin.js — Coupon generation, admin panel, bookings view
//  Depends on: utils.js, auth.js, config.js
// ═══════════════════════════════════════════════════════════════

let isAdminUnlocked = false;

// ── Toggle admin panel visibility ─────────────────────────────
function toggleAdmin() {
  const panel   = document.getElementById("admin-panel");
  const showing = panel.style.display === "block";

  panel.style.display = showing ? "none" : "block";

  if (!showing) {
    panel.scrollIntoView({ behavior: "smooth" });
    if (!isAdminUnlocked) {
      document.getElementById("admin-login-card").style.display = "";
      document.getElementById("admin-content").style.display    = "none";
    } else {
      loadAdminData();
    }
  }
}
window.toggleAdmin = toggleAdmin;

// ── Admin password check ──────────────────────────────────────
function checkAdminPw() {
  const pw = document.getElementById("admin-pw-input").value;
  if (pw === window.ADMIN_PASSWORD) {
    isAdminUnlocked = true;
    document.getElementById("admin-login-card").style.display = "none";
    document.getElementById("admin-content").style.display    = "";
    loadAdminData();
  } else {
    const errEl = document.getElementById("admin-pw-err");
    errEl.style.display = "";
    setTimeout(() => errEl.style.display = "none", 2000);
  }
}
window.checkAdminPw = checkAdminPw;

// ── Load all admin data ───────────────────────────────────────
async function loadAdminData() {
  loadCouponsTable();
  await loadAllBookings();
}

// ── Generate a new coupon ─────────────────────────────────────
async function generateCoupon() {
  const type    = document.getElementById("coupon-type").value;
  const amount  = parseInt(document.getElementById("coupon-amount").value) || 0;
  const service = document.getElementById("coupon-service-limit").value;
  const custom  = document.getElementById("coupon-custom-code").value.trim().toUpperCase();

  if ((type === "percent" || type === "fixed") && (!amount || amount <= 0)) {
    alert("Enter a valid discount amount.");
    return;
  }

  const code = custom || generateCode();

  // Check for duplicate codes
  const existing = JSON.parse(localStorage.getItem("prism_coupons") || "[]");
  if (existing.find(c => c.code === code)) {
    alert("That code already exists. Try a different custom code.");
    return;
  }

  const coupon = {
    code,
    type,
    amount:    type === "free" ? 100 : amount,
    service,
    status:    "active",
    createdAt: new Date().toISOString()
  };

  // Save locally (always — even in live mode, so coupon redemption works client-side)
  existing.push(coupon);
  localStorage.setItem("prism_coupons", JSON.stringify(existing));

  // Also persist to Firestore when live
  if (!window.__demoMode) {
    try {
      await window.__fbFns.addDoc(window.__fbFns.collection(window.__db, "coupons"), coupon);
    } catch (e) { console.error("generateCoupon (Firestore):", e); }
  }

  // Show generated code
  const descStr =
    type === "free"    ? "Free service (100% off)" :
    type === "percent" ? `${amount}% off — ${service === "all" ? "All services" : SERVICE_LABELS[service]}` :
                         `$${amount} off — ${service === "all" ? "All services" : SERVICE_LABELS[service]}`;

  document.getElementById("generated-code-val").textContent  = code;
  document.getElementById("generated-code-desc").textContent = descStr;
  document.getElementById("generated-code-box").classList.add("visible");

  loadCouponsTable();
  toast(`🎟️ Coupon ${code} created!`);
}
window.generateCoupon = generateCoupon;

// ── Copy generated code to clipboard ─────────────────────────
function copyCode() {
  const code = document.getElementById("generated-code-val").textContent;
  copyToClipboard(code, "📋 Code copied to clipboard!");
}
window.copyCode = copyCode;

// ── Render coupons table ──────────────────────────────────────
function loadCouponsTable() {
  const coupons = JSON.parse(localStorage.getItem("prism_coupons") || "[]");
  const tbody   = document.getElementById("coupons-tbody");

  if (!coupons.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:rgba(255,255,255,.3);text-align:center;padding:20px">No coupons yet.</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  coupons.forEach((c, i) => {
    const discStr =
      c.type === "free"    ? "Free (100%)" :
      c.type === "percent" ? `${c.amount}%` :
                             `$${c.amount}`;

    const svcStr =
      c.service === "all" ? "All" :
      (SERVICE_LABELS[c.service]?.split(" ")[0] || c.service);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:'Bebas Neue',cursive;letter-spacing:2px;color:var(--prism-gold);font-size:16px">${c.code}</td>
      <td>${discStr}</td>
      <td>${svcStr}</td>
      <td><span class="status-pill ${c.status}">${c.status}</span></td>
      <td>
        ${c.status === "active"
          ? `<button class="btn-revoke" onclick="revokeCoupon(${i})">Revoke</button>`
          : `<small style="color:rgba(255,255,255,.3)">${c.usedBy || "—"}</small>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.loadCouponsTable = loadCouponsTable;

// ── Revoke a coupon ───────────────────────────────────────────
function revokeCoupon(index) {
  if (!confirm("Revoke this coupon? It will no longer be redeemable.")) return;
  const coupons = JSON.parse(localStorage.getItem("prism_coupons") || "[]");
  coupons[index].status  = "used";
  coupons[index].usedBy  = "revoked";
  coupons[index].usedAt  = new Date().toISOString();
  localStorage.setItem("prism_coupons", JSON.stringify(coupons));
  loadCouponsTable();
  toast("Coupon revoked.");
}
window.revokeCoupon = revokeCoupon;

// ── Load all bookings (admin view) ────────────────────────────
async function loadAllBookings() {
  const div = document.getElementById("admin-bookings-list");
  div.innerHTML = '<p style="color:rgba(255,255,255,.4);font-size:14px">Loading…</p>';

  let bookings = [];

  if (window.__demoMode) {
    bookings = JSON.parse(localStorage.getItem("prism_bookings") || "[]");
  } else {
    try {
      const { collection, getDocs } = window.__fbFns;
      const snap = await getDocs(collection(window.__db, "bookings"));
      snap.forEach(d => bookings.push({ id: d.id, ...d.data() }));
    } catch (e) { console.error("loadAllBookings:", e); }
  }

  if (!bookings.length) {
    div.innerHTML = '<p style="color:rgba(255,255,255,.4);font-size:14px">No bookings yet.</p>';
    return;
  }

  // Sort newest first
  bookings.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  div.innerHTML = "";
  bookings.forEach(b => {
    const row = document.createElement("div");
    row.style.cssText = "padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px;color:rgba(255,255,255,.7)";
    row.innerHTML = `
      <strong style="color:#fff">${b.serviceLabel}</strong>
      <span style="color:rgba(255,255,255,.4)"> — ${b.userName}</span><br>
      <span style="color:rgba(255,255,255,.45)">
        📅 ${formatDate(b.date)} &nbsp;⏰ ${b.slot}
        &nbsp;💵 ~$${b.finalAmount}
        ${b.couponUsed ? `&nbsp;🎟 <strong style="color:var(--prism-gold)">${b.couponUsed}</strong>` : ""}
      </span>
    `;
    div.appendChild(row);
  });
}
