// ═══════════════════════════════════════════════════════════════
//  js/booking.js — Slots, coupon redemption, Stripe payment,
//                  booking creation and cancellation
//  Depends on: utils.js, auth.js, config.js
// ═══════════════════════════════════════════════════════════════

let selectedSlot   = null;
let appliedCoupon  = null;
let stripeInstance = null;
let cardElement    = null;

// ── Init Stripe when config fires ────────────────────────────
document.addEventListener("firebase-ready", () => {
  initStripe();
  loadSlots(); // Pre-load today's slots
});

function initStripe() {
  const realStripe = window.STRIPE_PK !== "YOUR_STRIPE_PUBLISHABLE_KEY";
  if (!realStripe) return; // Stay in demo mode

  stripeInstance = Stripe(window.STRIPE_PK);
  const elements = stripeInstance.elements();
  cardElement = elements.create("card", {
    style: {
      base: {
        color: "#ffffff",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "15px",
        "::placeholder": { color: "rgba(255,255,255,0.35)" }
      },
      invalid: { color: "#f04a78" }
    }
  });

  // Replace demo inputs with real Stripe element
  document.getElementById("demo-card-input").innerHTML = "";
  cardElement.mount("#demo-card-input");
  cardElement.on("change", e => {
    document.getElementById("card-error").textContent = e.error ? e.error.message : "";
  });

  // Hide the demo note
  document.getElementById("stripe-demo-note").style.display = "none";
}

// ── Service change ────────────────────────────────────────────
function onServiceChange() {
  updatePriceSummary();
  const svc = document.getElementById("service-select").value;
  document.getElementById("coupon-group").style.display = svc ? "" : "none";

  // Clear coupon if it doesn't apply to the newly selected service
  if (appliedCoupon && appliedCoupon.service !== "all" && appliedCoupon.service !== svc) {
    clearCoupon();
  }
  checkProceed();
}
window.onServiceChange = onServiceChange;

// ── Load time slots for selected date ────────────────────────
async function loadSlots() {
  const date = document.getElementById("date-input").value;
  if (!date) return;

  selectedSlot = null;
  checkProceed();

  const grid = document.getElementById("time-grid");
  grid.innerHTML = '<div style="color:rgba(255,255,255,.4);font-size:13px;grid-column:1/-1">Loading…</div>';
  document.getElementById("slots-group").style.display = "";

  let takenSlots = [];

  if (window.__demoMode) {
    const stored = JSON.parse(localStorage.getItem("prism_bookings") || "[]");
    takenSlots = stored.filter(b => b.date === date).map(b => b.slot);
  } else {
    try {
      const { collection, query, where, getDocs } = window.__fbFns;
      const snap = await getDocs(
        query(collection(window.__db, "bookings"), where("date", "==", date))
      );
      snap.forEach(d => takenSlots.push(d.data().slot));
    } catch (e) { console.error("loadSlots:", e); }
  }

  grid.innerHTML = "";
  TIME_SLOTS.forEach(slot => {
    const div = document.createElement("div");
    div.className = "time-slot" + (takenSlots.includes(slot) ? " taken" : "");
    div.textContent = slot;
    if (!takenSlots.includes(slot)) div.onclick = () => selectSlot(slot, div);
    grid.appendChild(div);
  });
}
window.loadSlots = loadSlots;

function selectSlot(slot, el) {
  document.querySelectorAll(".time-slot.selected").forEach(e => e.classList.remove("selected"));
  el.classList.add("selected");
  selectedSlot = slot;
  checkProceed();
}

function checkProceed() {
  const svc  = document.getElementById("service-select").value;
  const date = document.getElementById("date-input").value;
  const ok   = svc && date && selectedSlot && window.__currentUser;
  document.getElementById("proceed-btn").disabled = !ok;
  if (ok) updatePriceSummary();
}

// ── Price summary ─────────────────────────────────────────────
function updatePriceSummary() {
  const svc = document.getElementById("service-select").value;
  if (!svc) { document.getElementById("price-summary").style.display = "none"; return; }

  const { min, max } = SERVICE_PRICES[svc];
  document.getElementById("ps-range").textContent = `$${min} – $${max}`;

  const mid = Math.round((min + max) / 2);
  const discRow = document.getElementById("ps-discount-row");
  let discMidAmt = 0;

  if (appliedCoupon) {
    if      (appliedCoupon.type === "free")    { discMidAmt = mid; }
    else if (appliedCoupon.type === "percent") { discMidAmt = Math.round(mid * appliedCoupon.amount / 100); }
    else                                       { discMidAmt = Math.min(appliedCoupon.amount, mid); }

    const discText =
      appliedCoupon.type === "free"    ? `-$${mid} (100%)` :
      appliedCoupon.type === "percent" ? `-${appliedCoupon.amount}%` :
                                         `-$${discMidAmt}`;
    discRow.style.display = "";
    document.getElementById("ps-discount").textContent = discText;
  } else {
    discRow.style.display = "none";
  }

  const total = Math.max(0, mid - discMidAmt);
  document.getElementById("ps-total").textContent = appliedCoupon ? `~$${total}` : `$${min} – $${max}`;
  document.getElementById("price-summary").style.display = "";
}

// ── Coupon ────────────────────────────────────────────────────
function applyCoupon() {
  const raw  = document.getElementById("coupon-input").value.trim().toUpperCase();
  const succ = document.getElementById("coupon-success");
  const err  = document.getElementById("coupon-err");
  succ.classList.remove("visible");
  err.classList.remove("visible");

  if (!raw) {
    err.textContent = "Enter a coupon code.";
    err.classList.add("visible");
    return;
  }

  const coupons = JSON.parse(localStorage.getItem("prism_coupons") || "[]");
  const cp = coupons.find(c => c.code === raw && c.status === "active");

  if (!cp) {
    err.textContent = "Invalid or expired coupon code.";
    err.classList.add("visible");
    return;
  }

  const svc = document.getElementById("service-select").value;
  if (cp.service !== "all" && cp.service !== svc) {
    err.textContent = `This coupon only applies to ${SERVICE_LABELS[cp.service]}.`;
    err.classList.add("visible");
    return;
  }

  appliedCoupon = cp;
  document.getElementById("coupon-msg").textContent =
    cp.type === "free"    ? "100% off — Free service!" :
    cp.type === "percent" ? `${cp.amount}% off applied!` :
                            `$${cp.amount} off applied!`;
  succ.classList.add("visible");
  updatePriceSummary();
}
window.applyCoupon = applyCoupon;

function clearCoupon() {
  appliedCoupon = null;
  document.getElementById("coupon-input").value = "";
  document.getElementById("coupon-success").classList.remove("visible");
  document.getElementById("coupon-err").classList.remove("visible");
  updatePriceSummary();
}

// ── Step navigation ───────────────────────────────────────────
function proceedToPayment() {
  const svc  = document.getElementById("service-select").value;
  const date = document.getElementById("date-input").value;
  if (!svc || !date || !selectedSlot || !window.__currentUser) return;

  document.getElementById("step-1").style.display = "none";
  document.getElementById("step-2").style.display = "";

  const { min, max } = SERVICE_PRICES[svc];
  const mid = Math.round((min + max) / 2);

  document.getElementById("confirm-service").textContent  = SERVICE_LABELS[svc];
  document.getElementById("confirm-datetime").textContent = formatDate(date) + " at " + selectedSlot;

  let discMidAmt = 0;
  const confDiscRow = document.getElementById("confirm-discount-row");

  if (appliedCoupon) {
    confDiscRow.style.display = "";
    if      (appliedCoupon.type === "free")    { discMidAmt = mid;   document.getElementById("confirm-discount").textContent = "100% OFF"; }
    else if (appliedCoupon.type === "percent") { discMidAmt = Math.round(mid * appliedCoupon.amount / 100); document.getElementById("confirm-discount").textContent = `${appliedCoupon.amount}% OFF`; }
    else                                       { discMidAmt = Math.min(appliedCoupon.amount, mid); document.getElementById("confirm-discount").textContent = `-$${discMidAmt}`; }
  } else {
    confDiscRow.style.display = "none";
  }

  document.getElementById("confirm-total").textContent = `~$${Math.max(0, mid - discMidAmt)}`;
}
window.proceedToPayment = proceedToPayment;

function goBackToStep1() {
  document.getElementById("step-2").style.display = "none";
  document.getElementById("step-1").style.display = "";
}
window.goBackToStep1 = goBackToStep1;

// ── Payment ───────────────────────────────────────────────────
async function submitPayment() {
  const btn   = document.getElementById("pay-btn");
  const errEl = document.getElementById("card-error");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Processing…';
  errEl.textContent = "";

  const realStripe = window.STRIPE_PK !== "pk_live_51TbJcvBfcMB3uLr236hE2JGdcGs3iP1edIeEZ4MfMW04lHIr4MOYs9BjOaTQcSrsFgxRSnA00IS54ActTJcWdl1600DggcONd4";

  if (realStripe) {
    // ── Real Stripe flow ─────────────────────────────────────
    // You need a backend endpoint that creates a PaymentIntent
    // and returns { clientSecret }. Example (Node/Express):
    //
    //   app.post('/create-payment-intent', async (req, res) => {
    //     const intent = await stripe.paymentIntents.create({
    //       amount: req.body.amount,   // in cents
    //       currency: 'usd',
    //     });
    //     res.json({ clientSecret: intent.client_secret });
    //   });
    //
    // Then uncomment and configure below:
    //
    // try {
    //   const svc = document.getElementById("service-select").value;
    //   const { min, max } = SERVICE_PRICES[svc];
    //   const mid = Math.round((min + max) / 2);
    //   let discMidAmt = 0;
    //   if (appliedCoupon) { /* same discount calc as above */ }
    //   const totalCents = Math.max(100, Math.round((mid - discMidAmt) * 100));
    //
    //   const resp = await fetch("YOUR_BACKEND_URL/create-payment-intent", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ amount: totalCents, currency: "usd" })
    //   });
    //   const { clientSecret } = await resp.json();
    //
    //   const result = await stripeInstance.confirmCardPayment(clientSecret, {
    //     payment_method: { card: cardElement }
    //   });
    //   if (result.error) {
    //     errEl.textContent = result.error.message;
    //     btn.disabled = false; btn.textContent = "Pay & Confirm Booking";
    //     return;
    //   }
    //   await finalizeBooking("stripe_" + result.paymentIntent.id);
    // } catch (e) {
    //   errEl.textContent = "Payment failed. Please try again.";
    //   btn.disabled = false; btn.textContent = "Pay & Confirm Booking";
    // }

    // Temporary simulation until backend is connected:
    await new Promise(r => setTimeout(r, 1500));
    await finalizeBooking("stripe_" + Date.now());

  } else {
    // ── Demo mode: validate fake card ────────────────────────
    const num = document.getElementById("demo-card-num")?.value.replace(/\s/g, "");
    const exp = document.getElementById("demo-card-exp")?.value;
    const cvc = document.getElementById("demo-card-cvc")?.value;

    if (!num || num.length < 15) { errEl.textContent = "Enter a valid card number.";  btn.disabled = false; btn.textContent = "Pay & Confirm Booking"; return; }
    if (!exp || exp.length < 5)  { errEl.textContent = "Enter a valid expiry date.";  btn.disabled = false; btn.textContent = "Pay & Confirm Booking"; return; }
    if (!cvc || cvc.length < 3)  { errEl.textContent = "Enter a valid CVC.";          btn.disabled = false; btn.textContent = "Pay & Confirm Booking"; return; }

    await new Promise(r => setTimeout(r, 1800));
    await finalizeBooking("demo_" + Date.now());
  }
}
window.submitPayment = submitPayment;

// ── Save booking + mark coupon used ───────────────────────────
async function finalizeBooking(paymentId) {
  const svc  = document.getElementById("service-select").value;
  const date = document.getElementById("date-input").value;
  const { min, max } = SERVICE_PRICES[svc];
  const mid = Math.round((min + max) / 2);

  let finalAmt = mid;
  if (appliedCoupon) {
    if      (appliedCoupon.type === "free")    finalAmt = 0;
    else if (appliedCoupon.type === "percent") finalAmt = Math.round(mid * (1 - appliedCoupon.amount / 100));
    else                                       finalAmt = Math.max(0, mid - appliedCoupon.amount);
  }

  const booking = {
    uid:          window.__currentUser.uid,
    userName:     window.__currentUser.displayName || window.__currentUser.email,
    service:      svc,
    serviceLabel: SERVICE_LABELS[svc],
    date,
    slot:         selectedSlot,
    priceRange:   `$${min}–$${max}`,
    finalAmount:  finalAmt,
    couponUsed:   appliedCoupon ? appliedCoupon.code : null,
    paymentId,
    createdAt:    new Date().toISOString()
  };

  if (window.__demoMode) {
    const stored = JSON.parse(localStorage.getItem("prism_bookings") || "[]");

    // Double-check slot is still free
    if (stored.find(b => b.date === date && b.slot === selectedSlot)) {
      document.getElementById("card-error").textContent =
        "That slot was just taken! Please go back and choose another.";
      const btn = document.getElementById("pay-btn");
      btn.disabled = false; btn.textContent = "Pay & Confirm Booking";
      return;
    }

    booking.id = "bk_" + Date.now();
    stored.push(booking);
    localStorage.setItem("prism_bookings", JSON.stringify(stored));

    // Mark coupon as used
    if (appliedCoupon) markCouponUsed(appliedCoupon.code);

  } else {
    try {
      await window.__fbFns.addDoc(window.__fbFns.collection(window.__db, "bookings"), booking);
      if (appliedCoupon) {
        const { collection, query, where, getDocs, doc, updateDoc } = window.__fbFns;
        const snap = await getDocs(
          query(collection(window.__db, "coupons"), where("code", "==", appliedCoupon.code))
        );
        snap.forEach(async d =>
          await updateDoc(doc(window.__db, "coupons", d.id), {
            status: "used",
            usedBy: window.__currentUser.email,
            usedAt: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error("finalizeBooking:", e);
      document.getElementById("card-error").textContent = "Error saving booking. Please try again.";
      const btn = document.getElementById("pay-btn");
      btn.disabled = false; btn.textContent = "Pay & Confirm Booking";
      return;
    }
  }

  toast(`✅ Booked & paid! ${SERVICE_LABELS[svc]} on ${formatDate(date)} at ${selectedSlot}`);
  resetBookingForm();
  loadMyBookings();
  document.getElementById("my-bookings").scrollIntoView({ behavior: "smooth" });
}

function markCouponUsed(code) {
  const coupons = JSON.parse(localStorage.getItem("prism_coupons") || "[]");
  const idx = coupons.findIndex(c => c.code === code);
  if (idx > -1) {
    coupons[idx].status  = "used";
    coupons[idx].usedBy  = window.__currentUser?.email;
    coupons[idx].usedAt  = new Date().toISOString();
    localStorage.setItem("prism_coupons", JSON.stringify(coupons));
  }
}

function resetBookingForm() {
  appliedCoupon = null;
  selectedSlot  = null;
  document.getElementById("step-2").style.display        = "none";
  document.getElementById("step-1").style.display        = "";
  document.getElementById("service-select").value        = "";
  document.getElementById("coupon-input").value          = "";
  document.getElementById("coupon-group").style.display  = "none";
  document.getElementById("price-summary").style.display = "none";
  document.getElementById("slots-group").style.display   = "none";
  document.getElementById("proceed-btn").disabled        = true;
  document.getElementById("coupon-success").classList.remove("visible");
  document.getElementById("pay-btn").disabled  = false;
  document.getElementById("pay-btn").textContent = "Pay & Confirm Booking";
  document.getElementById("card-error").textContent = "";
  loadSlots();
}

// ── My Bookings list ──────────────────────────────────────────
async function loadMyBookings() {
  if (!window.__currentUser) return;
  const list = document.getElementById("bookings-list");
  list.innerHTML = '<div class="empty-state">Loading…</div>';

  let bookings = [];

  if (window.__demoMode) {
    const stored = JSON.parse(localStorage.getItem("prism_bookings") || "[]");
    bookings = stored.filter(b => b.uid === window.__currentUser.uid);
  } else {
    try {
      const { collection, query, where, getDocs } = window.__fbFns;
      const snap = await getDocs(
        query(collection(window.__db, "bookings"), where("uid", "==", window.__currentUser.uid))
      );
      snap.forEach(d => bookings.push({ id: d.id, ...d.data() }));
    } catch (e) { console.error("loadMyBookings:", e); }
  }

  bookings.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));

  if (!bookings.length) {
    list.innerHTML = '<div class="empty-state">No bookings yet. Book your first service above! 🌿</div>';
    return;
  }

  list.innerHTML = "";
  bookings.forEach(b => {
    const item = document.createElement("div");
    item.className = "booking-item";
    item.innerHTML = `
      <div class="booking-item-info" style="flex:1">
        <h4>
          ${b.serviceLabel}
          <span class="booking-badge paid">💳 Paid</span>
          ${b.couponUsed ? `<span class="booking-badge coupon">🎟 ${b.couponUsed}</span>` : ""}
        </h4>
        <p>
          📅 ${formatDate(b.date)} &nbsp;⏰ ${b.slot}<br>
          💵 Price range: ${b.priceRange} · Final: ~$${b.finalAmount}
        </p>
      </div>
      <button class="btn-cancel" onclick="cancelBooking('${b.id}','${b.date}')">Cancel</button>
    `;
    list.appendChild(item);
  });
}
window.loadMyBookings = loadMyBookings;

async function cancelBooking(id, date) {
  if (!confirm("Cancel this booking?\nNote: Refunds are handled separately by the business.")) return;

  if (window.__demoMode) {
    const stored = JSON.parse(localStorage.getItem("prism_bookings") || "[]");
    localStorage.setItem("prism_bookings", JSON.stringify(stored.filter(b => b.id !== id)));
  } else {
    try {
      await window.__fbFns.deleteDoc(window.__fbFns.doc(window.__db, "bookings", id));
    } catch (e) {
      toast("Error cancelling. Please try again.");
      return;
    }
  }

  toast("Booking cancelled.");
  loadMyBookings();
  const curDate = document.getElementById("date-input").value;
  if (curDate === date) loadSlots();
}
window.cancelBooking = cancelBooking;
