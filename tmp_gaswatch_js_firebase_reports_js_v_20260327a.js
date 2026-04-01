// --- GasWatch PH — Firebase Community Price Reports -------------
// Handles submitting and fetching community price reports via Firestore

// Reports older than LAST_UPDATED (from data.js) are ignored — prevents
// pre-hike community prices from overriding freshly updated brand prices.
function _reportCutoff() {
  if (typeof LAST_UPDATED === "undefined") return null;
  const d = new Date(LAST_UPDATED);
  return isNaN(d.getTime()) ? null : d;
}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDW1nF5Clz2b9Les0k2zihTbpXOJyntB-E",
  authDomain: "gaswatch-ph.firebaseapp.com",
  projectId: "gaswatch-ph",
  storageBucket: "gaswatch-ph.firebasestorage.app",
  messagingSenderId: "644256399623",
  appId: "1:644256399623:web:0f3587530d64e1c60485a2"
};

let _db = null;

function getDb() {
  if (_db) return _db;
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  _db = firebase.firestore();
  return _db;
}

// Submit a community price report
async function submitPriceReport({ stationId, stationName, brand, fuelType, price, note }) {
  const db = getDb();
  await db.collection("reports").add({
    stationId,
    stationName,
    brand,
    fuelType,
    price: parseFloat(price),
    note: note || "",
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// Fetch reports for a station and return the MEDIAN price per fuel type
// Uses up to 10 most recent reports per fuel type to smooth out bad submissions
// Returns: { diesel: { price, note, timestamp, count }, unleaded: { ... }, ... }
async function fetchStationReports(stationId) {
  const db = getDb();
  try {
    const snap = await db.collection("reports")
      .where("stationId", "==", stationId)
      .orderBy("timestamp", "desc")
      .limit(60)
      .get();

    // Group into buckets of up to 10 per fuelType (already sorted newest first)
    // Skip reports submitted before LAST_UPDATED — those are pre-hike prices
    const cutoff = _reportCutoff();
    const buckets = {};
    snap.forEach(doc => {
      const d = doc.data();
      const ts = d.timestamp ? d.timestamp.toDate() : null;
      if (cutoff && ts && ts < cutoff) return;
      if (!buckets[d.fuelType]) buckets[d.fuelType] = [];
      if (buckets[d.fuelType].length < 10) {
        buckets[d.fuelType].push({
          price: d.price,
          note: d.note || "",
          timestamp: ts,
        });
      }
    });

    // Compute median price for each fuel type
    const result = {};
    Object.entries(buckets).forEach(([ft, reports]) => {
      const sorted = reports.map(r => r.price).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

      result[ft] = {
        price: Math.round(median * 100) / 100,
        note: reports[0].note,          // most recent report's note
        timestamp: reports[0].timestamp, // most recent timestamp
        count: reports.length,
      };
    });

    return result;
  } catch (e) {
    console.warn("fetchStationReports error:", e);
    return {};
  }
}

// Fetch the most recent community reports across ALL stations in one query.
// Returns: { [stationId]: { [fuelType]: { price, note, timestamp, count } } }
async function fetchAllCommunityPrices() {
  const db = getDb();
  try {
    const snap = await db.collection("reports")
      .orderBy("timestamp", "desc")
      .limit(500)
      .get();

    // Group: stationId ? fuelType ? up to 10 most recent reports
    // Skip reports submitted before LAST_UPDATED — those are pre-hike prices
    const cutoff = _reportCutoff();
    const grouped = {};
    snap.forEach(doc => {
      const d = doc.data();
      const ts = d.timestamp ? d.timestamp.toDate() : null;
      if (cutoff && ts && ts < cutoff) return;
      if (!grouped[d.stationId]) grouped[d.stationId] = {};
      if (!grouped[d.stationId][d.fuelType]) grouped[d.stationId][d.fuelType] = [];
      if (grouped[d.stationId][d.fuelType].length < 10) {
        grouped[d.stationId][d.fuelType].push({
          price: d.price,
          note: d.note || "",
          timestamp: ts,
        });
      }
    });

    // Compute median per station per fuel type
    const result = {};
    Object.entries(grouped).forEach(([stationId, fuels]) => {
      result[stationId] = {};
      Object.entries(fuels).forEach(([ft, reports]) => {
        const sorted = reports.map(r => r.price).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
        result[stationId][ft] = {
          price: Math.round(median * 100) / 100,
          note: reports[0].note,
          timestamp: reports[0].timestamp,
          count: reports.length,
        };
      });
    });

    return result;
  } catch (e) {
    console.warn("fetchAllCommunityPrices error:", e);
    return {};
  }
}

// --- Out-of-Stock Flags --------------------------------------

// Submit an OOS flag for a station + fuel type (expires after 24h)
// Uses a deterministic doc ID (stationId_fuelType) so re-flagging the same fuel
// replaces the old entry rather than stacking duplicates.
async function submitOosFlag({ stationId, fuelType }) {
  const db = getDb();
  const docId = `${stationId}_${fuelType}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // Delete first so the subsequent create always fires the "create" rule path
  try { await db.collection("oos_flags").doc(docId).delete(); } catch (e) {}
  await db.collection("oos_flags").doc(docId).set({
    stationId,
    fuelType,
    flaggedAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  });
}

// Clear an OOS flag — deletes the deterministic-ID doc plus any old auto-ID docs
async function clearOosFlag(stationId, fuelType) {
  const db = getDb();
  try {
    await db.collection("oos_flags").doc(`${stationId}_${fuelType}`).delete();
    console.log("[OOS] deleted deterministic doc:", `${stationId}_${fuelType}`);

    const snap = await db.collection("oos_flags")
      .where("stationId", "==", stationId)
      .get();
    console.log("[OOS] query found", snap.size, "docs for stationId", stationId);

    const batch = db.batch();
    snap.forEach(doc => {
      console.log("[OOS] checking doc:", doc.id, "fuelType:", doc.data().fuelType);
      if (doc.data().fuelType === fuelType) batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("[OOS] batch committed");
  } catch (e) {
    console.error("[OOS] clearOosFlag FAILED:", e);
  }
}

// Fetch all non-expired OOS flags on page load
// Returns: { "stationId_fuelType": true }
async function fetchAllOosFlags() {
  const db = getDb();
  try {
    const now = new Date();
    const snap = await db.collection("oos_flags")
      .where("expiresAt", ">", now)
      .get();
    console.log("[OOS] fetchAllOosFlags found", snap.size, "active flag(s)");
    snap.forEach(doc => {
      const d = doc.data();
      console.log("[OOS] flag:", doc.id, "stationId:", d.stationId, "fuel:", d.fuelType, "expires:", d.expiresAt);
    });
    const result = {};
    snap.forEach(doc => {
      const d = doc.data();
      result[`${d.stationId}_${d.fuelType}`] = true;
    });
    return result;
  } catch (e) {
    console.warn("fetchAllOosFlags error:", e);
    return {};
  }
}

// Format time ago (e.g. "2 hours ago", "just now")
function timeAgo(date) {
  if (!date) return "";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// Format absolute date + time (e.g. "Mar 11 · 2:30 PM")
function formatDateTime(date) {
  if (!date) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = date instanceof Date ? date : new Date(date);
  const month = months[d.getMonth()];
  const day = d.getDate();
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${month} ${day} · ${hours}:${mins} ${ampm}`;
}

