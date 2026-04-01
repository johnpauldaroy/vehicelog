// --------------------------------------------------------------
// GasWatch PH - Application Logic
// --------------------------------------------------------------

// Always start at top on refresh (prevents iOS mid-page restore)
// Force scroll-behavior: auto before jumping — CSS `smooth` on <html> overrides `behavior:"instant"` on iOS
function scrollToTopInstant() {
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  setTimeout(() => { document.documentElement.style.scrollBehavior = ""; }, 50);
}
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.addEventListener("load", () => { scrollToTopInstant(); setTimeout(scrollToTopInstant, 120); });
window.addEventListener("pageshow", scrollToTopInstant);

// --- Dark Mode -------------------------------------------------
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

// --- State -----------------------------------------------------
let currentFuelType = "diesel";
let currentBrand = "all";
let map;
let markers = [];
let markersById = {}; // station.id ? Leaflet marker, for individual popup refresh
let OOS_FLAGS = {}; // { "stationId_fuelType": true }
let _oosFuelType = null;

// Short labels for the 2-column popup grid (avoids badge wrapping)
const POPUP_FUEL_LABELS = {
  diesel: "Diesel",
  unleaded: "Unleaded 91",
  egasoline: "E-Gasoline",
  premium95: "Premium 95",
  premium97: "Premium 97",
  kerosene: "Kerosene",
  premiumDiesel: "Prem. Diesel",
};

// --- Init ------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initStats();
  initUpdateWeek();
  initAdvisories();

  // Scroll: swap hero pill ? speed dial FAB + back-to-top at 400px
  const backToTopBtn  = document.getElementById("backToTopBtn");
  const fabHeroPill   = document.getElementById("fabHeroPill");
  const fabSpeedDial  = document.getElementById("fabSpeedDial");
  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY > 400;
    if (backToTopBtn)  backToTopBtn.classList.toggle("visible", scrolled);
    if (fabSpeedDial)  fabSpeedDial.classList.toggle("visible", scrolled);
    if (fabHeroPill)   fabHeroPill.classList.toggle("hidden", scrolled);
  }, { passive: true });
  // Lazy-load map — only init when section scrolls into view
  const mapSection = document.getElementById("map-section");
  if ("IntersectionObserver" in window) {
    const mapObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        initMap();
        mapObserver.disconnect();
      }
    }, { rootMargin: "0px" });
    mapObserver.observe(mapSection);
  } else {
    initMap();
  }
  applyStationOverrides(); // bake per-station community prices into station.prices before table renders
  initBrandFilter();
  initAreaFilter();
  initFilters();
  initTable();
  initGasul();
  initNavbar();
  initMobileMenu();
  initHelpForm();
  // Firebase community prices always apply last — Firebase always wins
  applyAllCommunityPricesToTable();
  // Load OOS flags in parallel — no dependency on prices
  fetchAllOosFlags().then(flags => { OOS_FLAGS = flags; });
  initSwipeHint();

});

// --- Brand Table Swipe Hint ---------------------------------
function initSwipeHint() {
  const scroller = document.getElementById("brandTableScroller");
  const hint = document.getElementById("swipeHint");
  const wrap = scroller && scroller.closest(".table-scroll-wrap");
  if (!scroller || !hint || !wrap) return;

  function onScroll() {
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8;
    if (atEnd) {
      wrap.classList.add("scrolled-end");
      hint.classList.add("hidden");
      scroller.removeEventListener("scroll", onScroll);
    }
  }
  scroller.addEventListener("scroll", onScroll, { passive: true });
}

// --- Stats -----------------------------------------------------
function initStats() {
  ["statDiesel", "statUnleaded", "statStations", "statAreas"].forEach(
    (id) => document.getElementById(id).classList.remove("skeleton-block")
  );

  const avgDiesel = getAveragePrice("diesel");
  const avgUnleaded = getAveragePrice("unleaded");

  document.getElementById("statDiesel").textContent = avgDiesel.toFixed(2);
  document.getElementById("statUnleaded").textContent = avgUnleaded.toFixed(2);
  document.getElementById("statStations").textContent = GAS_STATIONS.length;
  const areas = [...new Set(GAS_STATIONS.map((s) => s.area))];
  document.getElementById("statAreas").textContent = areas.length;
  document.getElementById("navDate").textContent = LAST_UPDATED;

  // Price change badges — compare current avg vs PREV_AVG (station-weighted previous week)
  if (typeof PREV_AVG !== "undefined") {
    function setChgBadge(id, current, previous) {
      const el = document.getElementById(id);
      if (!el || isNaN(previous)) return;
      const delta = current - previous;
      if (Math.abs(delta) < 0.01) return;
      const sign = delta > 0 ? "+" : "-";
      el.textContent = `${sign}${Math.abs(delta).toFixed(2)} vs last week`;
      el.classList.add(delta > 0 ? "up" : "down");
    }

    setChgBadge("statDieselChg", avgDiesel, PREV_AVG.diesel);
    setChgBadge("statUnleadedChg", avgUnleaded, PREV_AVG.unleaded);
  }
}

// --- Advisory Ticker --------------------------------------------
function initAdvisories() {
  if (typeof ADVISORIES === "undefined" || !ADVISORIES.length) return;
  const badge = document.getElementById("tickerBadge");
  const text = document.getElementById("tickerText");
  const ticker = document.getElementById("advisoryTicker");
  if (!badge || !text) return;

  const labels = { alert: "ALERT", update: "UPDATE", new: "NEW", live: "LIVE" };
  let idx = 0;

  function show() {
    const a = ADVISORIES[idx];
    // Fade both out together
    badge.style.opacity = 0;
    badge.style.visibility = "hidden";
    text.style.opacity = 0;
    setTimeout(() => {
      // Swap content while hidden
      badge.textContent = labels[a.type] || "INFO";
      badge.className = "advisory-ticker-badge ticker-badge-" + a.type;
      text.textContent = a.title;
      // Fade both in together
      badge.style.visibility = "visible";
      badge.style.opacity = 1;
      text.style.opacity = 1;
    }, 350);
    idx = (idx + 1) % ADVISORIES.length;
  }

  show();
  setInterval(show, 5000);
}

// --- Map -------------------------------------------------------
function initMap() {
  // Center on Metro Manila
  map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: true,
  }).setView([14.58, 121.02], 12);
  window._map = map;
  L.control.zoom({ position: "bottomleft" }).addTo(map);

  // Clean map tiles (CartoDB Positron - light/minimal)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }
  ).addTo(map);

  updateMapMarkers();

  // Locate-me button
  let locateMarker = null;
  const locateBtn = document.getElementById("locateMeMapBtn");
  locateBtn.addEventListener("click", function () {
    if (!navigator.geolocation) {
      showMapToast("Geolocation is not supported by your browser.");
      return;
    }
    locateBtn.classList.add("locating");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        locateBtn.classList.remove("locating");
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        map.setView([lat, lng], 15);
        if (locateMarker) map.removeLayer(locateMarker);
        locateMarker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: "#3d71e1",
          color: "#fff",
          weight: 2.5,
          fillOpacity: 1,
        }).addTo(map).bindTooltip(
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> You are here',
          { permanent: true, direction: "top", className: "you-are-here-tooltip", offset: [0, -6] }
        ).openTooltip();
      },
      function (err) {
        locateBtn.classList.remove("locating");
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        const isAndroid = /android/i.test(navigator.userAgent);
        const isDesktop = !isIOS && !isAndroid;
        if (err.code === 1) {
          showMapToast("Location access denied. Please allow location in your browser settings.");
        } else if (err.code === 2 && isDesktop) {
          showMapToast("Location not available on desktop. Use 'Jump to area' or try on your phone.");
        } else if (err.code === 2) {
          showMapToast("Location unavailable. Try again.");
        } else {
          showMapToast("Location request timed out. Try again.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  // Area dropdown — populate + fly to selected city
  const AREA_COORDS = {
    "Caloocan":    [14.6499, 120.9667],
    "Las Piñas":   [14.4500, 120.9833],
    "Makati":      [14.5547, 121.0244],
    "Malabon":     [14.6625, 120.9575],
    "Mandaluyong": [14.5794, 121.0359],
    "Manila":      [14.5995, 120.9842],
    "Marikina":    [14.6392, 121.1022],
    "Muntinlupa":  [14.4081, 121.0415],
    "Navotas":     [14.6667, 120.9417],
    "Parañaque":   [14.4793, 121.0198],
    "Pasay":       [14.5378, 121.0014],
    "Pasig":       [14.5764, 121.0851],
    "Pateros":     [14.5453, 121.0687],
    "Quezon City": [14.6760, 121.0437],
    "San Juan":    [14.6019, 121.0355],
    "Taguig":      [14.5243, 121.0792],
    "Valenzuela":  [14.7011, 120.9830],
  };

  const mapAreaSel = document.getElementById("mapAreaSelect");
  const areas = [...new Set(GAS_STATIONS.map((s) => s.area))].sort();
  areas.forEach((area) => {
    const opt = document.createElement("option");
    opt.value = area;
    opt.textContent = area;
    mapAreaSel.appendChild(opt);
  });
  mapAreaSel.addEventListener("change", function () {
    const area = this.value;
    if (!area) return;
    const coords = AREA_COORDS[area];
    if (coords) {
      map.flyTo(coords, 14, { animate: true, duration: 1 });
    } else {
      // fallback: find centroid of all stations in that area
      const pts = GAS_STATIONS.filter((s) => s.area === area && s.lat && s.lng);
      if (pts.length) {
        const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
        const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
        map.flyTo([lat, lng], 14, { animate: true, duration: 1 });
      }
    }
    // reset select back to placeholder so it reads as a button
    setTimeout(() => { this.value = ""; }, 1200);
  });

  function showMapToast(msg) {
    let toast = document.getElementById("mapToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "mapToast";
      toast.className = "map-toast";
      document.querySelector(".map-wrapper").appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 4000);
  }
}

// Rebuild and refresh a single station's map popup after a price report is submitted
function refreshStationPopupInMap(stationId) {
  const marker = markersById[stationId];
  const station = GAS_STATIONS.find(s => s.id === stationId);
  if (!marker || !station) return;
  const brand = BRANDS[station.brand];
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`;
  const _popupHikeCutoff = new Date('2026-03-17T00:00:00+08:00');
  const popupHtml = `
    <div class="station-popup">
      <div class="popup-brand">${brand.name}</div>
      <div class="popup-name">${station.name}</div>
      <div class="popup-area">${station.area}</div>
      <div class="popup-prices">
        ${Object.entries(station.prices)
          .map(([type, p]) => {
            if (p === null) return "";
            let displayPrice = p;
            let isReported = false;
            if (station._liveMatch && station._liveMatch[type]) {
              displayPrice = station._liveMatch[type].price;
              isReported = station._liveMatch[type].isUserPrice;
            } else {
              const stationEntry = typeof STATION_OVERRIDES !== "undefined" &&
                STATION_OVERRIDES[station.id] && STATION_OVERRIDES[station.id][type];
              if (stationEntry) { displayPrice = stationEntry.p; isReported = stationEntry.r === 1; }
            }
            const communityEntry = _communityCache[station.id] && _communityCache[station.id][type];
            if (communityEntry && communityEntry.price != null) {
              const isStale = communityEntry.timestamp instanceof Date && communityEntry.timestamp < _popupHikeCutoff;
              if (!isStale) { displayPrice = communityEntry.price; isReported = true; }
            }
            return `
            <div class="popup-price">
              <span class="popup-price-label"><span>${POPUP_FUEL_LABELS[type] || FUEL_TYPES[type]}</span>${isReported ? '<span class="price-community-badge">actual</span>' : ""}</span>
              <span class="popup-price-value">&#8369;${displayPrice.toFixed(2)}</span>
            </div>`;
          }).join("")}
      </div>
      <div class="popup-nav">
        <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-nav-btn popup-nav-maps">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          Google Maps
        </a>
        <a href="${wazeUrl}" target="_blank" rel="noopener" class="popup-nav-btn popup-nav-waze">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          Waze
        </a>
      </div>
      <button class="popup-nav-btn popup-nav-report" onclick="openStationSheetById(${station.id})">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Update price
      </button>
      <div style="font-size:10px;color:#bbb;text-align:right;margin-top:4px">#${station.id}</div>
    </div>
  `;
  marker.setPopupContent(popupHtml);

  // Also update the pin icon number if the reported fuel type is currently visible on the map
  const reportedFuelType = Object.keys(_communityCache[stationId] || {}).find(ft => {
    const entry = _communityCache[stationId][ft];
    return entry && entry.timestamp && (new Date() - entry.timestamp) < 5000; // submitted in last 5s
  });
  if (reportedFuelType && reportedFuelType === currentFuelType) {
    const newPrice = station.prices[reportedFuelType];
    if (newPrice != null) {
      const newLevel = getPriceLevel(newPrice, reportedFuelType);
      const isOos = !!OOS_FLAGS[`${station.id}_${reportedFuelType}`];
      const newPinHtml = isOos
        ? `<div class="oos-pin-wrap"><div class="price-marker level-oos"><span class="marker-brand">${brand.short}</span><span class="marker-price">no stk</span></div><div class="oos-pin-dot"><svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>`
        : `<div class="price-marker level-${newLevel}"><span class="marker-brand">${brand.short}</span> <span class="marker-price">${newPrice.toFixed(0)}</span></div>`;
      marker.setIcon(L.divIcon({
        className: "price-marker-wrapper",
        html: newPinHtml,
        iconSize: [0, 0],
        iconAnchor: [35, 15],
      }));
    }
  }
}

function updateMapMarkers() {
  if (!map) return;
  // Clear existing markers
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  markersById = {};

  const filtered = GAS_STATIONS.filter((station) => {
    if (currentBrand !== "all" && station.brand !== currentBrand) return false;
    if (station.prices[currentFuelType] == null) return false;
    return true;
  });

  filtered.forEach((station) => {
    const price = station.prices[currentFuelType];
    const level = getPriceLevel(price, currentFuelType);
    const brand = BRANDS[station.brand];

    // Create custom HTML marker
    const isOos = !!OOS_FLAGS[`${station.id}_${currentFuelType}`];
    const pinHtml = isOos
      ? `<div class="oos-pin-wrap"><div class="price-marker level-oos"><span class="marker-brand">${brand.short}</span><span class="marker-price">no stk</span></div><div class="oos-pin-dot"><svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>`
      : `<div class="price-marker level-${level}"><span class="marker-brand">${brand.short}</span> <span class="marker-price">${price.toFixed(0)}</span></div>`;
    const icon = L.divIcon({
      className: "price-marker-wrapper",
      html: pinHtml,
      iconSize: [0, 0],
      iconAnchor: [35, 15],
    });

    const marker = L.marker([station.lat, station.lng], { icon }).addTo(map);

    // Popup content
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    const wazeUrl = `https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`;
    const popupHtml = `
      <div class="station-popup">
        <div class="popup-brand">${brand.name}</div>
        <div class="popup-name">${station.name}</div>
        <div class="popup-area">${station.area}</div>
        <div class="popup-prices">
          ${Object.entries(station.prices)
            .map(([type, p]) => {
              if (p === null) return "";
              // All fuel types: use live match first, then baked override as fallback.
              let displayPrice = p;
              let isReported = false;
              if (station._liveMatch && station._liveMatch[type]) {
                displayPrice = station._liveMatch[type].price;
                isReported = station._liveMatch[type].isUserPrice;
              } else {
                const stationEntry = typeof STATION_OVERRIDES !== "undefined" &&
                  STATION_OVERRIDES[station.id] &&
                  STATION_OVERRIDES[station.id][type];
                if (stationEntry) { displayPrice = stationEntry.p; isReported = stationEntry.r === 1; }
              }
              // Community reports (Firebase) always win — highest priority + show "actual" badge
              const _popupHikeCutoff = new Date('2026-03-17T00:00:00+08:00');
              const communityEntry = _communityCache[station.id] && _communityCache[station.id][type];
              if (communityEntry && communityEntry.price != null) {
                const isStale = communityEntry.timestamp instanceof Date && communityEntry.timestamp < _popupHikeCutoff;
                if (!isStale) { displayPrice = communityEntry.price; isReported = true; }
              }
              // No timestamp shown for community prices
              const popupTimeHtml = "";
              return `
              <div class="popup-price">
                <span class="popup-price-label"><span>${POPUP_FUEL_LABELS[type] || FUEL_TYPES[type]}</span>${isReported ? '<span class="price-community-badge">actual</span>' : ""}</span>
                ${popupTimeHtml}
                <span class="popup-price-value">&#8369;${displayPrice.toFixed(2)}</span>
              </div>`;
            })
            .join("")}
        </div>
        <div class="popup-nav">
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-nav-btn popup-nav-maps">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            Google Maps
          </a>
          <a href="${wazeUrl}" target="_blank" rel="noopener" class="popup-nav-btn popup-nav-waze">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            Waze
          </a>
        </div>
        <button class="popup-nav-btn popup-nav-report" onclick="openStationSheetById(${station.id})">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Update price
        </button>
        <div style="font-size:10px;color:#bbb;text-align:right;margin-top:4px">#${station.id}</div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 250, minWidth: 200 });
    marker.on("popupopen", () => {
      const isFullscreen = document.querySelector(".map-wrapper")?.classList.contains("map-fullscreen");
      if (!isFullscreen) openStationSheet(station);
    });
    markers.push(marker);
    markersById[station.id] = marker;
  });
}

// --- Brand Filter (Map) ----------------------------------------
function initBrandFilter() {
  const brandFilterEl = document.getElementById("brandFilter");

  Object.entries(BRANDS).forEach(([key, brand]) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.brand = key;
    btn.textContent = brand.name;
    brandFilterEl.appendChild(btn);
  });
}

// --- Area Filter (Table) ---------------------------------------
function initAreaFilter() {
  const areas = [...new Set(GAS_STATIONS.map((s) => s.area))].sort();
  const select = document.getElementById("areaFilter");
  areas.forEach((area) => {
    const opt = document.createElement("option");
    opt.value = area;
    opt.textContent = area;
    select.appendChild(opt);
  });
}

// --- Filter Listeners ------------------------------------------
function initFilters() {
  // Fuel type chips (map)
  document.getElementById("fuelTypeFilter").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document
      .querySelectorAll("#fuelTypeFilter .chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentFuelType = chip.dataset.fuel;
    updateMapMarkers();
  });

  // Brand chips (map)
  document.getElementById("brandFilter").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document
      .querySelectorAll("#brandFilter .chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentBrand = chip.dataset.brand;
    updateMapMarkers();
  });

  // Table filters
  document
    .getElementById("searchInput")
    .addEventListener("input", updateTable);
  document
    .getElementById("areaFilter")
    .addEventListener("change", updateTable);
  document.getElementById("tableFuelFilter").addEventListener("change", (e) => {
    const val = e.target.value;
    document.getElementById("priceTableWrap").dataset.activeFuel = val === "all" ? "diesel" : val;
    updateTable();
  });
  document
    .getElementById("sortFilter")
    .addEventListener("change", updateTable);
}

// --- Price Table -----------------------------------------------
let mobileFuelType = "diesel";

function initTable() {
  renderBrandSummary();
  updateTable();
  initMobileCards();
}

// Apply baked-in per-station prices to station.prices so the table shows
// actual pump prices (not just the same DOE brand price) for all fuel types.
// Also sets _liveMatch for popup/sheet display and shows the live badge.
// Runs once on page load, before initTable().
function applyStationOverrides() {
  if (typeof STATION_OVERRIDES === "undefined") return;
  let matched = 0;
  const stationMap = {};
  GAS_STATIONS.forEach(s => { stationMap[s.id] = s; });
  Object.entries(STATION_OVERRIDES).forEach(([id, fuels]) => {
    const station = stationMap[parseInt(id, 10)];
    if (!station) return;
    const priceMap = {};
    Object.entries(fuels).forEach(([ft, data]) => {
      if (station.prices[ft] !== undefined && data.p != null) {
        station.prices[ft] = data.p;
        priceMap[ft] = { price: data.p, isUserPrice: data.r === 1 };
      }
    });
    if (Object.keys(priceMap).length > 0) {
      station._liveMatch = priceMap;
      matched++;
    }
  });

  // Show live indicator badge (only if meaningful count)
  const el = document.getElementById("livePriceIndicator");
  if (el && matched >= 300) {
    el.innerHTML = `<span class="live-dot"></span> ${matched.toLocaleString()} online`;
    el.style.display = "inline-flex";
  }
}

function renderBrandSummary() {
  const container = document.getElementById("brandSummaryBody");
  if (!container) return;

  const fuelTypes = ["diesel", "premiumDiesel", "unleaded", "egasoline", "premium95", "premium97", "kerosene"];

  const rows = Object.entries(BRANDS).map(([key, brand]) => {
    const stations = GAS_STATIONS.filter((s) => s.brand === key);
    if (!stations.length) return "";

    // Use average price per fuel type across all stations of this brand
    const prices = {};
    fuelTypes.forEach((ft) => {
      const vals = stations.map((s) => s.prices[ft]).filter((v) => v != null);
      if (!vals.length) { prices[ft] = null; return; }
      prices[ft] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
    });

    // Compute price deltas from previous week (if available)
    const prev = (typeof PREVIOUS_PRICES !== "undefined" && PREVIOUS_PRICES[key]) || {};
    const delta = {};
    fuelTypes.forEach((ft) => {
      if (prices[ft] !== null && prev[ft] != null) {
        delta[ft] = parseFloat((prices[ft] - prev[ft]).toFixed(2));
      } else {
        delta[ft] = null;
      }
    });

    return `<tr class="brand-summary-row">
      <td>
        <div class="brand-badge">
          <span class="brand-dot" style="background: ${brand.color}"></span>
          <strong>${brand.name}</strong>
        </div>
      </td>
      <td class="area-name">${stations.length}</td>
      ${priceCell(prices.diesel, "diesel", delta.diesel)}
      ${priceCell(prices.premiumDiesel, "premiumDiesel", delta.premiumDiesel)}
      ${priceCell(prices.unleaded, "unleaded", delta.unleaded)}
      ${priceCell(prices.egasoline, "egasoline", delta.egasoline)}
      ${priceCell(prices.premium95, "premium95", delta.premium95)}
      ${priceCell(prices.premium97, "premium97", delta.premium97)}
      ${priceCell(prices.kerosene, "kerosene", delta.kerosene)}
    </tr>`;
  }).join("");

  container.innerHTML = rows;

  // Show only top 5 brands, hide the rest
  const allRows = container.querySelectorAll(".brand-summary-row");
  const showMoreWrap = document.getElementById("brandShowMore");
  const showLessWrap = document.getElementById("brandShowLess");
  if (allRows.length > 5) {
    allRows.forEach((row, i) => { if (i >= 5) row.classList.add("row-hidden"); });
    document.getElementById("brandShowMoreCount").textContent = allRows.length;
    if (showMoreWrap) showMoreWrap.style.display = "block";
    if (showLessWrap) showLessWrap.style.display = "none";
  } else {
    if (showMoreWrap) showMoreWrap.style.display = "none";
    if (showLessWrap) showLessWrap.style.display = "none";
  }
}

function expandBrandTable() {
  document.querySelectorAll("#brandSummaryBody .brand-summary-row").forEach(r => r.classList.remove("row-hidden"));
  document.getElementById("brandShowMore").style.display = "none";
  document.getElementById("brandShowLess").style.display = "block";
}

function collapseBrandTable() {
  const rows = document.querySelectorAll("#brandSummaryBody .brand-summary-row");
  rows.forEach((r, i) => { if (i >= 5) r.classList.add("row-hidden"); });
  document.getElementById("brandShowMore").style.display = "block";
  document.getElementById("brandShowLess").style.display = "none";
  document.querySelector(".brand-summary-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateTable() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const areaVal = document.getElementById("areaFilter").value;
  const fuelVal = document.getElementById("tableFuelFilter").value;
  const sortVal = document.getElementById("sortFilter").value;

  let stations = [...GAS_STATIONS];

  // Filter
  if (search) {
    stations = stations.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        BRANDS[s.brand].name.toLowerCase().includes(search) ||
        s.area.toLowerCase().includes(search)
    );
  }

  if (areaVal !== "all") {
    stations = stations.filter((s) => s.area === areaVal);
  }

  if (fuelVal !== "all") {
    stations = stations.filter((s) => s.prices[fuelVal] != null);
  }

  // Sort
  const sortFuel = fuelVal !== "all" ? fuelVal : "diesel";
  switch (sortVal) {
    case "price-asc":
      stations.sort(
        (a, b) => (a.prices[sortFuel] || 999) - (b.prices[sortFuel] || 999)
      );
      break;
    case "price-desc":
      stations.sort(
        (a, b) => (b.prices[sortFuel] || 0) - (a.prices[sortFuel] || 0)
      );
      break;
    case "brand":
      stations.sort((a, b) =>
        BRANDS[a.brand].name.localeCompare(BRANDS[b.brand].name)
      );
      break;
    case "area":
      stations.sort((a, b) => a.area.localeCompare(b.area));
      break;
  }

  // Render
  const LIMIT = 5;
  const totalCount = stations.length;

  // For the initial preview, cap at 1 station per brand so all brands get
  // representation (e.g. "Price: Low to High" won't fill 5 rows with Caltex).
  // Clicking "See all" removes this cap and shows the full sorted list.
  let preview = stations;
  if (totalCount > LIMIT) {
    const brandCount = {};
    const MAX_PER_BRAND = 1;
    preview = stations.filter((s) => {
      brandCount[s.brand] = (brandCount[s.brand] || 0) + 1;
      return brandCount[s.brand] <= MAX_PER_BRAND;
    });
    if (preview.length > LIMIT) preview = preview.slice(0, LIMIT);
  }

  const showAll = totalCount <= LIMIT;
  const visible = showAll ? stations : preview;

  function rowHtml(s) {
    const brand = BRANDS[s.brand];
    return `
      <tr data-station-id="${s.id}">
        <td>
          <div class="brand-badge">
            <span class="brand-dot" style="background: ${brand.color}"></span>
            ${brand.name}
          </div>
        </td>
        <td class="station-name" data-label="Station">${s.name}</td>
        ${priceCell(s.prices.diesel, "diesel")}
        ${priceCell(s.prices.premiumDiesel, "premiumDiesel")}
        ${priceCell(s.prices.unleaded, "unleaded")}
        ${priceCell(s.prices.egasoline, "egasoline")}
        ${priceCell(s.prices.premium95, "premium95")}
        ${priceCell(s.prices.premium97, "premium97")}
        ${priceCell(s.prices.kerosene, "kerosene")}
        <td class="area-name" data-label="Area">${s.area}</td>
      </tr>
    `;
  }

  const tbody = document.getElementById("priceTableBody");
  tbody.innerHTML = visible.map(rowHtml).join("");
  // Attach row click ? station sheet (after each render)
  setTimeout(attachTableRowClicks, 0);

  const showMoreWrap = document.getElementById("tableShowMore");
  if (!showAll) {
    document.getElementById("showMoreCount").textContent = totalCount;
    showMoreWrap.style.display = "block";
    window._tableAllStations = stations;
    window._tableRowHtml = rowHtml;
  } else {
    showMoreWrap.style.display = "none";
  }

}

function expandTable() {
  const stations = window._tableAllStations;
  const rowHtml = window._tableRowHtml;
  if (!stations) return;
  document.getElementById("priceTableBody").innerHTML = stations.map(rowHtml).join("");
  document.getElementById("tableShowMore").style.display = "none";
  document.getElementById("tableShowLess").style.display = "block";
  document.getElementById("floatingCollapseBtn").style.display = "block";
  attachTableRowClicks();
}

function collapseTable() {
  document.getElementById("tableShowLess").style.display = "none";
  document.getElementById("floatingCollapseBtn").style.display = "none";
  updateTable();
  setTimeout(() => {
    document.getElementById("priceTableWrap").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

function handleBackToTop() {
  const tableExpanded = document.getElementById("tableShowLess").style.display === "block";
  const mobileExpanded = document.getElementById("mobileShowLess").style.display === "block";
  if (tableExpanded) { collapseTable(); return; }
  if (mobileExpanded) { collapseMobileCards(); return; }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Mobile Cards ----------------------------------------------
const MOBILE_FUEL_CHIPS = [
  { key: "diesel",        label: "Diesel"        },
  { key: "premiumDiesel", label: "Prem. Diesel"  },
  { key: "unleaded",      label: "Unleaded 91"   },
  { key: "egasoline", label: "E-Gasoline" },
  { key: "premium95", label: "Premium 95" },
  { key: "premium97", label: "Premium 97" },
  { key: "kerosene",  label: "Kerosene"   },
];

function initMobileCards() {
  // Set default active fuel on the table wrapper (chips removed, use dropdown instead)
  document.getElementById("priceTableWrap").dataset.activeFuel = "diesel";
}

function renderMobileCards() {
  const container = document.getElementById("mobileCards");
  const showMoreWrap = document.getElementById("mobileShowMore");
  if (!container) return;

  const search = document.getElementById("searchInput").value.toLowerCase();
  const areaVal = document.getElementById("areaFilter").value;

  let stations = GAS_STATIONS.filter((s) => {
    if (s.prices[mobileFuelType] == null) return false;
    if (areaVal !== "all" && s.area !== areaVal) return false;
    if (search && !s.name.toLowerCase().includes(search) &&
        !BRANDS[s.brand].name.toLowerCase().includes(search) &&
        !s.area.toLowerCase().includes(search)) return false;
    return true;
  });

  stations.sort((a, b) => a.prices[mobileFuelType] - b.prices[mobileFuelType]);

  const LIMIT = 10;
  const total = stations.length;
  const visible = stations.slice(0, LIMIT);

  const fuelLabel = MOBILE_FUEL_CHIPS.find((f) => f.key === mobileFuelType)?.label || mobileFuelType;

  container.innerHTML = visible.map((s) => {
    const brand = BRANDS[s.brand];
    const price = s.prices[mobileFuelType];
    const level = getPriceLevel(price, mobileFuelType);
    return `
      <div class="mobile-price-card">
        <span class="brand-dot" style="background: ${brand.color}; width:10px; height:10px; border-radius:50%; flex-shrink:0;"></span>
        <div class="mobile-card-info">
          <div class="mobile-card-name">${s.name}</div>
          <div class="mobile-card-area">${s.area}</div>
        </div>
        <div class="mobile-card-price">
          <span class="price-pill price-pill-${level}">?${price.toFixed(2)}</span>
          <span class="mobile-card-fuel-label">${fuelLabel}</span>
        </div>
      </div>`;
  }).join("");

  if (total > LIMIT) {
    document.getElementById("mobileShowMoreCount").textContent = total;
    showMoreWrap.style.display = "block";
    window._mobileAllStations = stations;
    window._mobileFuelLabel = fuelLabel;
  } else {
    showMoreWrap.style.display = "none";
  }
}

function expandMobileCards() {
  const stations = window._mobileAllStations;
  const fuelLabel = window._mobileFuelLabel;
  if (!stations) return;
  const container = document.getElementById("mobileCards");
  container.innerHTML = stations.map((s) => {
    const brand = BRANDS[s.brand];
    const price = s.prices[mobileFuelType];
    const level = getPriceLevel(price, mobileFuelType);
    return `
      <div class="mobile-price-card">
        <span class="brand-dot" style="background: ${brand.color}; width:10px; height:10px; border-radius:50%; flex-shrink:0;"></span>
        <div class="mobile-card-info">
          <div class="mobile-card-name">${s.name}</div>
          <div class="mobile-card-area">${s.area}</div>
        </div>
        <div class="mobile-card-price">
          <span class="price-pill price-pill-${level}">?${price.toFixed(2)}</span>
          <span class="mobile-card-fuel-label">${fuelLabel}</span>
        </div>
      </div>`;
  }).join("");
  document.getElementById("mobileShowMore").style.display = "none";
  document.getElementById("mobileShowLess").style.display = "block";
  document.getElementById("floatingCollapseBtn").style.display = "block";
}

function collapseMobileCards() {
  document.getElementById("mobileShowLess").style.display = "none";
  document.getElementById("floatingCollapseBtn").style.display = "none";
  renderMobileCards();
  setTimeout(() => {
    document.getElementById("mobileCards").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

function priceCell(price, fuelType, delta) {
  const fuelLabels = { diesel: "Diesel", premiumDiesel: "Prem Diesel", unleaded: "Unleaded 91", egasoline: "E-Gas", premium95: "Prem 95", premium97: "Prem 97", kerosene: "Kerosene" };
  const label = fuelLabels[fuelType] || fuelType;
  if (price == null) {
    return `<td class="price-cell na" data-label="${label}" data-fuel="${fuelType}">N/A</td>`;
  }
  const level = getPriceLevel(price, fuelType);
  let changeBadge = "";
  if (delta !== null && delta !== undefined && delta !== 0) {
    const dir = delta > 0 ? "up" : "down";
    const arrow = delta > 0 ? "?" : "?";
    const sign = delta > 0 ? "+" : "";
    changeBadge = `<div><span class="price-change ${dir}">${arrow} ${sign}${delta.toFixed(2)}</span></div>`;
  }
  return `<td class="price-cell ${level}" data-label="${label}" data-fuel="${fuelType}">${price.toFixed(2)}${changeBadge}</td>`;
}

// --- Gasul / LPG ----------------------------------------------
let currentGasulSize = "11kg";

function initGasul() {
  renderGasul();

  // Tab listeners
  document.querySelectorAll(".gasul-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".gasul-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentGasulSize = tab.dataset.size;
      renderGasul();
    });
  });
}

function renderGasul() {
  const grid = document.getElementById("gasulGrid");

  // Filter brands that have the current size
  const brands = GASUL_PRICES.filter(
    (b) => b.sizes[currentGasulSize] !== null
  ).sort((a, b) => a.sizes[currentGasulSize] - b.sizes[currentGasulSize]);

  const cheapestPrice = brands.length > 0 ? brands[0].sizes[currentGasulSize] : null;

  grid.innerHTML = brands
    .map((b) => {
      const price = b.sizes[currentGasulSize];
      const isCheapest = price === cheapestPrice;
      return `
      <div class="gasul-card ${isCheapest ? "gasul-cheapest" : ""}">
        <div class="gasul-brand">
          <span class="gasul-brand-dot" style="background: ${b.color}"></span>
          ${b.brand}
        </div>
        <div class="gasul-price">
          <span class="currency">PHP</span> ${price.toLocaleString()}
        </div>
        <div class="gasul-size">${currentGasulSize} tank${isCheapest ? " &middot; Cheapest" : ""}</div>
      </div>
    `;
    })
    .join("");
}

// --- Navbar Scroll Effect --------------------------------------
function initNavbar() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// --- Mobile Menu -----------------------------------------------
function initMobileMenu() {
  const btn = document.getElementById("mobileMenuBtn");
  const links = document.getElementById("navLinks");

  btn.addEventListener("click", () => {
    links.classList.toggle("open");
  });

  // Close menu on link click
  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
    });
  });
}

// --- Update Week Label -------------------------------------------
function initUpdateWeek() {
  const el = document.getElementById("updateWeek");
  if (el) el.textContent = LAST_UPDATED;
}

// --- Help Form --------------------------------------------------
function initHelpForm() {
  const form = document.getElementById("helpForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.textContent = "Sending...";
    btn.disabled = true;

    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.value,
        area: form.area.value,
        message: form.message.value,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((data) => {
        if (data.success) {
          form.style.display = "none";
          document.getElementById("formSuccess").style.display = "block";
        } else {
          throw new Error(data.error || "Unknown error");
        }
      })
      .catch(() => {
        btn.textContent = "Send";
        btn.disabled = false;
        alert("Something went wrong. Please try again.");
      });
  });
}

// --- Find Cheapest Near Me --------------------------------------
const nearestBtnSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;

const fuelLabels = {
  diesel:        "Diesel",
  premiumDiesel: "Prem Diesel",
  unleaded:      "Unleaded 91",
  egasoline:     "E-Gasoline",
  premium95:     "Premium 95",
  premium97:     "Premium 97",
  kerosene:      "Kerosene",
};

const nearestFuelPills = [
  { key: "diesel",        label: "Diesel" },
  { key: "premiumDiesel", label: "Prem Diesel" },
  { key: "unleaded",      label: "Unleaded 91" },
  { key: "premium95",     label: "Prem 95" },
];

let _nearestLat = null;
let _nearestLng = null;
let _nearestFuel = "diesel";

function findNearestCheapest() {
  const btn = document.getElementById("nearestBtn");
  const result = document.getElementById("nearestResult");
  const cards = document.getElementById("nearestCards");

  if (!navigator.geolocation) {
    cards.innerHTML = `<p style="text-align:center;color:#64748b;font-size:0.8125rem;padding:12px;">Your browser doesn't support location services.</p>`;
    result.style.display = "block";
    return;
  }

  // If we already have location, just re-render with current fuel
  if (_nearestLat !== null) {
    renderNearestResults(_nearestFuel);
    result.style.display = "block";
    return;
  }

  btn.innerHTML = `${nearestBtnSvg} Locating you...`;
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      _nearestLat = pos.coords.latitude;
      _nearestLng = pos.coords.longitude;
      _nearestFuel = currentFuelType || "diesel";

      renderNearestResults(_nearestFuel);
      result.style.display = "block";
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
      btn.innerHTML = `${nearestBtnSvg} Find Cheapest Near Me`;
      btn.disabled = false;
    },
    (err) => {
      const isIOS = /iphone|ipad/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);
      const isDesktop = !isIOS && !isAndroid;
      // For desktop error code 2 (unavailable), try IP-based fallback
      if (err.code === 2 && isDesktop) {
        btn.innerHTML = `${nearestBtnSvg} Locating you...`;
        fetch("https://ipapi.co/json/")
          .then((r) => r.json())
          .then((data) => {
            if (data && data.latitude && data.longitude) {
              _nearestLat = data.latitude;
              _nearestLng = data.longitude;
              _nearestFuel = currentFuelType || "diesel";
              renderNearestResults(_nearestFuel);
              result.style.display = "block";
              result.scrollIntoView({ behavior: "smooth", block: "nearest" });
              const note = document.createElement("p");
              note.style.cssText = "text-align:center;color:#94a3b8;font-size:0.75rem;padding:4px 12px 0;margin:0;";
              note.textContent = "?? Approximate location based on your internet connection";
              cards.prepend(note);
              btn.innerHTML = `${nearestBtnSvg} Find Cheapest Near Me`;
              btn.disabled = false;
            } else {
              throw new Error("no coords");
            }
          })
          .catch(() => {
            btn.innerHTML = `${nearestBtnSvg} Find Cheapest Near Me`;
            btn.disabled = false;
            cards.innerHTML = `<p style="text-align:center;color:#64748b;font-size:0.8125rem;padding:12px;">?? Location unavailable. Make sure WiFi is on (needed for Mac location) or try on your phone.</p>`;
            result.style.display = "block";
          });
        return;
      }
      btn.innerHTML = `${nearestBtnSvg} Find Cheapest Near Me`;
      btn.disabled = false;
      let hint = "";
      if (err.code === 3) {
        if (isAndroid) hint = "Location timed out. Make sure Location is on in Android Settings, then try again.";
        else if (isIOS) hint = "Location timed out. On iPhone: Settings \u2192 Safari \u2192 Location \u2192 Allow";
        else hint = "Location timed out. If you\u2019re on a VPN, try turning it off and retrying.";
      } else if (err.code === 1) {
        if (isIOS) hint = "Location blocked. On iPhone: Settings \u2192 Safari \u2192 Location \u2192 Allow";
        else if (isAndroid) hint = "Location blocked. Tap the lock icon in your browser address bar to allow location.";
        else hint = "Location blocked. Click the lock icon \uD83D\uDD12 in your browser\u2019s address bar and allow location access.";
      } else {
        hint = "Location unavailable. Please try again.";
      }
      cards.innerHTML = `<p style="text-align:center;color:#64748b;font-size:0.8125rem;padding:12px;">?? ${hint}</p>`;
      result.style.display = "block";
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
  );
}

function renderNearestResults(fuelType) {
  _nearestFuel = fuelType;
  const cards = document.getElementById("nearestCards");
  if (!cards || _nearestLat === null) return;

  // Filter + sort stations
  const withDist = GAS_STATIONS.map((s) => ({
    ...s,
    dist: haversine(_nearestLat, _nearestLng, s.lat, s.lng),
  })).filter((s) => s.prices && s.prices[fuelType] != null);

  let nearby = withDist.filter((s) => s.dist <= 8);
  if (nearby.length === 0) nearby = withDist.sort((a, b) => a.dist - b.dist).slice(0, 20);

  nearby.sort((a, b) => a.prices[fuelType] - b.prices[fuelType] || a.dist - b.dist);

  // One per brand, max 6
  const seenBrands = new Set();
  nearby = nearby.filter((s) => {
    if (seenBrands.has(s.brand)) return false;
    seenBrands.add(s.brand);
    return true;
  }).slice(0, 6);

  const fuelLabel = fuelLabels[fuelType] || "Fuel";

  // Fuel switch pills + close button
  const pillsHTML = nearestFuelPills.map((p) =>
    `<button class="nearest-fuel-pill${p.key === fuelType ? " active" : ""}" onclick="renderNearestResults('${p.key}')">${p.label}</button>`
  ).join("");

  // Card builder
  const makeCard = (s, idx) => {
    const brand = (typeof BRANDS !== "undefined" && BRANDS[s.brand]) || { short: s.brand.slice(0, 3).toUpperCase(), color: "#64748b", textColor: "#fff" };
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
    const shortName = s.name.length > 22 ? s.name.slice(0, 22).trimEnd() + "…" : s.name;
    return `
      <div class="nearest-card">
        <div class="nearest-brand-dot" style="background:${brand.color};color:${brand.textColor};">${brand.short}</div>
        <div class="nearest-card-body">
          <div class="nearest-card-name">${shortName}${idx === 0 ? '<span class="nearest-cheapest-badge">Cheapest</span>' : ""}</div>
          <div class="nearest-card-meta">${s.area} &bull; ${fuelLabel}</div>
        </div>
        <div class="nearest-card-right">
          <div class="nearest-card-price">&#8369;${s.prices[fuelType].toFixed(2)}/L</div>
          <div class="nearest-card-actions">
            <span class="nearest-card-dist">${s.dist.toFixed(1)} km</span>
            <a class="nearest-go" href="${mapsUrl}" target="_blank" rel="noopener">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
              Go
            </a>
          </div>
        </div>
      </div>`;
  };

  const first3 = nearby.slice(0, 3).map((s, i) => makeCard(s, i)).join("");
  const rest   = nearby.slice(3).map((s, i) => makeCard(s, i + 3)).join("");
  const seeMoreBtn = nearby.length > 3
    ? `<button class="nearest-see-more" id="nearestSeeMore" onclick="toggleNearestMore()">See more <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>`
    : "";

  cards.innerHTML = `
    <div class="nearest-fuel-switch">
      ${pillsHTML}
      <button class="nearest-close" onclick="document.getElementById('nearestResult').style.display='none'">&times;</button>
    </div>
    ${first3}
    <div class="nearest-extra" id="nearestExtra" style="display:none;">${rest}</div>
    ${seeMoreBtn}
  `;
}

function toggleNearestMore() {
  const extra = document.getElementById("nearestExtra");
  const btn   = document.getElementById("nearestSeeMore");
  const expanded = extra.style.display !== "none";
  extra.style.display = expanded ? "none" : "block";
  btn.innerHTML = expanded
    ? `See more <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`
    : `See less <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>`;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Share Functions --------------------------------------------
function shareNative() {
  const shareData = {
    title: "GasWatch PH",
    text: "Find the cheapest gas prices near you in Metro Manila!",
    url: "https://gaswatchph.com",
  };

  if (navigator.share) {
    navigator.share(shareData);
  } else {
    copyLink();
  }
}

function copyLink() {
  navigator.clipboard
    .writeText("https://gaswatchph.com")
    .then(() => {
      const btn = document.querySelector(".btn-share-copy");
      const original = btn.innerHTML;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Copied!`;
      setTimeout(() => {
        btn.innerHTML = original;
      }, 2000);
    });
}

// --- Live Per-Station Price Enrichment -------------------------

// --- Station Detail Sheet ---------------------------------------
const SHEET_FUEL_LABELS = {
  diesel:        "Diesel",
  premiumDiesel: "Premium Diesel",
  unleaded:      "Unleaded 91",
  egasoline:     "E-Gasoline",
  premium95:     "Premium 95",
  premium97:     "Premium 97/98/100",
  kerosene:      "Kerosene",
};

let _sheetStation = null;   // currently open station
let _reportFuelType = null; // fuel type being reported
let _reportFormOriginalHTML = null; // saved so we can restore after success wipes it

// Called from popup "Update price" button via station ID
function openStationSheetById(id) {
  const station = GAS_STATIONS.find(s => s.id === id);
  if (station) {
    if (window._map) window._map.closePopup();
    openStationSheet(station);
  }
}

function openStationSheet(station) {
  _sheetStation = station;
  const brand = BRANDS[station.brand];

  // Header
  document.getElementById("sheetBrandDot").style.background = brand.color;
  document.getElementById("sheetBrandName").textContent = brand.name;
  document.getElementById("sheetStationName").textContent = station.name;
  document.getElementById("sheetArea").textContent = station.area;
  const idEl = document.getElementById("sheetStationId");
  if (idEl) idEl.textContent = "#" + station.id;

  // Nav buttons
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`;
  document.getElementById("sheetMapsBtn").href = mapsUrl;
  document.getElementById("sheetWazeBtn").href = wazeUrl;

  // Show sheet
  document.getElementById("stationSheetOverlay").classList.add("active");
  document.getElementById("stationSheet").classList.add("active");
  document.body.style.overflow = "hidden";

  // Pan map so station pin is centered in the visible area above the sheet
  setTimeout(() => {
    const sheetEl = document.getElementById("stationSheet");
    const sheetHeight = sheetEl ? sheetEl.offsetHeight : 300;
    const pt = map.latLngToContainerPoint([station.lat, station.lng]);
    const newPt = L.point(pt.x, pt.y - sheetHeight / 2);
    map.panTo(map.containerPointToLatLng(newPt), { animate: true, duration: 0.5 });
  }, 50);

  // Hide report form
  closeReportForm();

  // Render with cached community data immediately (no ACTUAL badge flash)
  renderSheetPrices(station, _communityCache[station.id] || {});

  // Then fetch fresh per-station reports and re-render
  fetchStationReports(station.id).then(reports => {
    renderSheetPrices(station, reports);
  });
}

function toggleMapFullscreen() {
  const wrapper = document.querySelector(".map-wrapper");
  const mapEl = document.getElementById("map");
  const icon = document.getElementById("fullscreenIcon");
  const isFs = wrapper.classList.toggle("map-fullscreen");
  // Swap icon: expand ? compress
  icon.innerHTML = isFs
    ? '<path d="M8 3v5H3m13-5v5h5M8 21v-5H3m13 5v-5h5"/>'
    : '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
  // Use visualViewport.height = exact visible area (excludes Android nav bar + browser chrome)
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  // Set both wrapper and map to exact pixel height so nothing bleeds through on narrow phones
  wrapper.style.height = isFs ? vh + "px" : "";
  mapEl.style.height = isFs ? "100%" : "";
  // Hide all floating buttons when fullscreen so they can't show through the map
  const fabBtn  = document.getElementById("fabReportBtn");
  const backBtn = document.getElementById("backToTopBtn");
  const fabPill = document.getElementById("fabHeroPill");
  if (fabBtn)  fabBtn.style.display  = isFs ? "none" : "";
  if (backBtn) backBtn.style.display = isFs ? "none" : "";
  if (fabPill) fabPill.style.display = isFs ? "none" : "";
  setTimeout(() => window._map && window._map.invalidateSize(), 50);
}

function closeStationSheet() {
  document.getElementById("stationSheetOverlay").classList.remove("active");
  document.getElementById("stationSheet").classList.remove("active");
  document.body.style.overflow = "";
  closeReportForm();
  closeOosForm();
  _sheetStation = null;
}

function openOosForm(fuelType) {
  closeReportForm();
  _oosFuelType = fuelType;
  document.getElementById("oosFormFuelLabel").textContent = "Flag as No Stock — " + SHEET_FUEL_LABELS[fuelType];
  document.getElementById("oosFormFuelName").textContent = SHEET_FUEL_LABELS[fuelType];
  const btn = document.getElementById("oosConfirmBtn");
  btn.disabled = false;
  btn.textContent = "Yes, No Stock";
  document.getElementById("sheetOosForm").style.display = "flex";
  document.getElementById("stationSheet").classList.add("oos-open");
  const activeRow = document.querySelector(`.sheet-price-row[data-fuel="${fuelType}"]`);
  if (activeRow) setTimeout(() => activeRow.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
}

function closeOosForm() {
  const form = document.getElementById("sheetOosForm");
  if (form) form.style.display = "none";
  document.getElementById("stationSheet").classList.remove("oos-open");
  _oosFuelType = null;
}

async function confirmOosFlag() {
  if (!_sheetStation || !_oosFuelType) return;
  const btn = document.getElementById("oosConfirmBtn");
  btn.disabled = true;
  btn.textContent = "Flagging…";
  try {
    await submitOosFlag({ stationId: _sheetStation.id, fuelType: _oosFuelType });
    OOS_FLAGS[`${_sheetStation.id}_${_oosFuelType}`] = true;
    document.getElementById("sheetOosForm").innerHTML = `
      <div class="report-success">
        ? Flagged as no stock. Auto-clears in 24 hours.<br>
        <small style="font-weight:400;color:#64748b;">Another driver can re-flag or clear it.</small>
      </div>`;
    setTimeout(() => {
      closeOosForm();
      fetchStationReports(_sheetStation.id).then(r => renderSheetPrices(_sheetStation, r));
      updateMapMarkers();
    }, 1800);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Yes, No Stock";
    console.warn("submitOosFlag error:", e);
  }
}

async function clearOosFromSheet(fuelType) {
  if (!_sheetStation) return;
  delete OOS_FLAGS[`${_sheetStation.id}_${fuelType}`];
  fetchStationReports(_sheetStation.id).then(r => renderSheetPrices(_sheetStation, r));
  updateMapMarkers();
  clearOosFlag(_sheetStation.id, fuelType);
}

// On page load, fetch all community reports at once and update every affected table row
let _communityCache = {}; // cached community reports from page-load fetch, keyed by stationId
async function applyAllCommunityPricesToTable() {
  const allReports = await fetchAllCommunityPrices();
  _communityCache = allReports;
  let updated = 0;
  let communityOnly = 0;
  GAS_STATIONS.forEach(station => {
    const fuels = allReports[station.id];
    if (!fuels) return;
    let stationUpdated = false;
    Object.entries(fuels).forEach(([ft, data]) => {
      if (station.prices[ft] !== undefined && data.price !== null) {
        station.prices[ft] = data.price;
        updated++;
        stationUpdated = true;
      }
    });
    // Count stations with Firebase prices that weren't already counted by live overrides
    if (stationUpdated && !station._liveMatch) communityOnly++;
  });
  if (updated > 0) { updateTable(); renderBrandSummary(); }

  // Update badge to include Firebase-only stations
  if (communityOnly > 0) {
    const el = document.getElementById("livePriceIndicator");
    if (el) {
      const current = el.textContent.match(/[\d,]+/);
      const overrideCount = current ? parseInt(current[0].replace(/,/g, "")) : 0;
      const total = overrideCount + communityOnly;
      if (total >= 300) el.innerHTML = `<span class="live-dot"></span> ${total.toLocaleString()} online`;
    }
  }
}

function renderSheetPrices(station, communityReports) {
  const container = document.getElementById("sheetPrices");
  const fuelTypes = ["diesel", "premiumDiesel", "unleaded", "egasoline", "premium95", "premium97", "kerosene"];
  const resolvedPrices = {};

  // Resolve all prices first so we can sort N/A rows to the bottom
  const resolvedRows = fuelTypes.map(ft => {
    let basePrice = station.prices[ft];
    let isReported = false;

    if (station._liveMatch && station._liveMatch[ft]) {
      basePrice = station._liveMatch[ft].price;
      isReported = station._liveMatch[ft].isUserPrice;
    } else {
      const stationEntry2 = typeof STATION_OVERRIDES !== "undefined" && STATION_OVERRIDES[station.id] && STATION_OVERRIDES[station.id][ft];
      if (stationEntry2) { basePrice = stationEntry2.p; isReported = stationEntry2.r === 1; }
    }

    // Community report (takes priority display-wise)
    // Skip pre-hike reports — prices changed March 17, 2026
    const community = communityReports[ft];
    const _hikeCutoff = new Date('2026-03-17T00:00:00+08:00');
    const _stale = community && community.timestamp instanceof Date && community.timestamp < _hikeCutoff;
    const displayPrice = (community && !_stale) ? community.price : basePrice;
    const hasCommunity = !!community && !_stale;
    resolvedPrices[ft] = displayPrice;

    return { ft, basePrice, isReported, displayPrice, hasCommunity, community };
  });

  // Rows with a price first, N/A rows at the bottom
  resolvedRows.sort((a, b) => (a.displayPrice != null ? 0 : 1) - (b.displayPrice != null ? 0 : 1));

  const communityCount = Object.keys(OOS_FLAGS).length + Object.keys(_communityCache).length;
  const _phHour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }));
  // Drivers nearby by hour (index = PH hour 0–23)
  const _driverSchedule = [3,3,3,3,3,3,5,12,18,15,12,10,23,7,7,14,17,20,27,30,29,20,19,17];
  const _timeBase = _driverSchedule[_phHour] ?? 3;
  const countDisplay = Math.max(communityCount, _timeBase);
  const bannerHtml = `<div class="sheet-community-banner">Visited this station? Help ${countDisplay} drivers nearby — let them know if fuel is in stock.</div>`;

  container.innerHTML = bannerHtml + resolvedRows.map(({ ft, basePrice, isReported, displayPrice, hasCommunity, community }) => {
    const priceHtml = displayPrice != null
      ? `<span class="sheet-price-value">&#8369;${displayPrice.toFixed(2)}</span>`
      : `<span class="sheet-price-value na">N/A</span>`;

    let sourceHtml = "";
    if (hasCommunity) {
      const ago = timeAgo(community.timestamp);
      const dt = formatDateTime(community.timestamp);
      const countTxt = community.count > 1 ? `${community.count} reports` : "1 report";
      const note = community.note ? ` · ${community.note}` : "";
      sourceHtml = `<span class="sheet-community-badge">actual</span><span class="sheet-community-time">${countTxt} · ${ago} · ${dt}${note}</span>`;
    } else if (basePrice != null) {
      if (isReported) {
        sourceHtml = `<span class="sheet-community-badge">actual</span>`;
      } else {
        sourceHtml = "Posted price";
      }
    }

    const isOos = !!OOS_FLAGS[`${station.id}_${ft}`];

    const actionsHtml = displayPrice == null ? "" : `
      <div class="sheet-row-actions">
        ${isOos
          ? `<button class="sheet-back-stock-btn" onclick="clearOosFromSheet('${ft}')">Back in stock</button>`
          : `<button class="sheet-report-btn" onclick="openReportForm('${ft}')">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
               Update
             </button>
             <button class="sheet-oos-btn" onclick="openOosForm('${ft}')">No stock</button>`
        }
      </div>`;

    return `
      <div class="sheet-price-row${displayPrice == null ? " sheet-na-row" : ""}${isOos ? " is-oos" : ""}" data-fuel="${ft}">
        <div class="sheet-price-info">
          <div class="sheet-fuel-name">${SHEET_FUEL_LABELS[ft]}</div>
          ${isOos
            ? `<div class="sheet-price-source"><span class="sheet-oos-badge">No stock · clears in 24h</span></div>`
            : sourceHtml ? `<div class="sheet-price-source">${sourceHtml}</div>` : ""
          }
        </div>
        ${priceHtml}
        ${actionsHtml}
      </div>`;
  }).join("");

  // Sync resolved prices back to the table row so it stays up-to-date
  const tableRow = document.querySelector(`tr[data-station-id="${station.id}"]`);
  if (tableRow) {
    fuelTypes.forEach(ft => {
      const cell = tableRow.querySelector(`td[data-fuel="${ft}"]`);
      if (!cell) return;
      const price = resolvedPrices[ft];
      if (price === null || price === undefined) {
        cell.className = `price-cell na`;
        cell.textContent = "N/A";
      } else {
        const level = getPriceLevel(price, ft);
        cell.className = `price-cell ${level}`;
        cell.textContent = price.toFixed(2);
      }
    });
  }
}

function openReportForm(fuelType) {
  const form = document.getElementById("sheetReportForm");

  // Save original form HTML once, so we can restore it after success wipes it
  if (!_reportFormOriginalHTML) {
    _reportFormOriginalHTML = form.innerHTML;
  }

  // If submitReport() replaced the form with the success message, restore it
  if (!document.getElementById("reportPriceInput")) {
    form.innerHTML = _reportFormOriginalHTML;
  }

  _reportFuelType = fuelType;
  document.getElementById("reportFuelLabel").textContent = "Report price — " + SHEET_FUEL_LABELS[fuelType];
  document.getElementById("reportPriceInput").value = "";
  document.getElementById("reportNoteInput").value = "";
  document.getElementById("reportSubmitBtn").textContent = "Submit Price";
  document.getElementById("reportSubmitBtn").disabled = false;
  form.style.display = "flex";

  document.getElementById("stationSheet").classList.add("report-open");

  // Highlight the row being edited and scroll it into view
  document.querySelectorAll(".sheet-price-row").forEach(r => r.classList.remove("editing"));
  const activeRow = document.querySelector(`.sheet-price-row[data-fuel="${fuelType}"]`);
  if (activeRow) {
    activeRow.classList.add("editing");
    setTimeout(() => activeRow.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  }

}

function closeReportForm() {
  document.getElementById("sheetReportForm").style.display = "none";
  document.getElementById("stationSheet").classList.remove("report-open");
  _reportFuelType = null;
  document.querySelectorAll(".sheet-price-row").forEach(r => r.classList.remove("editing"));

}

// Valid price ranges per fuel type — matches Firestore security rules
// Price ranges updated March 2026 — PH fuel prices now realistically 130+ for many types.
// Caps are intentionally generous to never block valid community reports.
// ?? KEEP IN SYNC WITH firestore.rules — any change here must be mirrored there.
// Run: python3 scripts/check-validation-sync.py to verify they match before deploying.
// RULE: Do NOT tighten these without checking actual pump prices first.
// Any time prices are updated, verify caps still cover real market prices + 30% headroom.
const FUEL_PRICE_RANGES = {
  diesel:        [40, 180],
  premiumDiesel: [40, 180],
  unleaded:      [40, 180],
  egasoline:     [40, 180],
  premium95:     [40, 180],
  premium97:     [40, 180],
  kerosene:      [40, 180],
};

async function submitReport() {
  if (!_sheetStation || !_reportFuelType) return;
  const priceVal = parseFloat(document.getElementById("reportPriceInput").value);
  const [minP, maxP] = FUEL_PRICE_RANGES[_reportFuelType] || [1, 200];
  if (isNaN(priceVal) || priceVal < minP || priceVal > maxP) {
    document.getElementById("reportPriceInput").focus();
    document.getElementById("reportPriceInput").style.borderColor = "#ef4444";
    document.getElementById("reportPriceInput").placeholder = `?${minP}–${maxP}`;
    setTimeout(() => {
      document.getElementById("reportPriceInput").style.borderColor = "";
      document.getElementById("reportPriceInput").placeholder = "e.g. 68.50";
    }, 2000);
    return;
  }

  const note = document.getElementById("reportNoteInput").value.trim();
  const btn = document.getElementById("reportSubmitBtn");
  btn.textContent = "Submitting…";
  btn.disabled = true;

  try {
    await submitPriceReport({
      stationId: _sheetStation.id,
      stationName: _sheetStation.name,
      brand: _sheetStation.brand,
      fuelType: _reportFuelType,
      price: priceVal,
      note,
    });

    // Update local community cache immediately so popup reflects new price
    if (!_communityCache[_sheetStation.id]) _communityCache[_sheetStation.id] = {};
    _communityCache[_sheetStation.id][_reportFuelType] = { price: priceVal, r: 1, timestamp: new Date(), count: 1 };
    const _sheetStationObj = GAS_STATIONS.find(s => s.id === _sheetStation.id);
    if (_sheetStationObj) _sheetStationObj.prices[_reportFuelType] = priceVal;
    refreshStationPopupInMap(_sheetStation.id);

    // Show success
    document.getElementById("sheetReportForm").innerHTML = `
      <div class="report-success">
        ? Price submitted! Thank you for helping fellow drivers.<br>
        <small style="font-weight:400;color:#64748b;">Your update will appear shortly.</small>
      </div>`;

    // Refresh prices in sheet after short delay
    setTimeout(() => {
      closeReportForm();
      fetchStationReports(_sheetStation.id).then(reports => {
        renderSheetPrices(_sheetStation, reports);
      });
    }, 2000);

  } catch (e) {
    btn.textContent = "Submit Price";
    btn.disabled = false;
    alert("Something went wrong. Please try again.");
  }
}

// Make table rows clickable
function attachTableRowClicks() {
  const tbody = document.getElementById("priceTableBody");
  if (!tbody) return;
  tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row) return;
    const stationId = parseInt(row.dataset.stationId, 10);
    const station = GAS_STATIONS.find(s => s.id === stationId);
    if (station) openStationSheet(station);
  });
}

// --- FAQ Accordion --------------------------------------------
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// --- FAB: Guided Report Modal -----------------------------------
let _fabStation = null;
let _fabFuelType = null;

const FAB_FUEL_LABELS = {
  diesel:        "Diesel",
  premiumDiesel: "Premium Diesel",
  unleaded:      "Unleaded 91",
  egasoline:     "E-Gasoline",
  premium95:     "Premium 95",
  premium97:     "Premium 97/98/100",
  kerosene:      "Kerosene",
};

function openFabModal() {
  document.getElementById("fabModal").classList.add("visible");
  document.getElementById("fabOverlay").classList.add("visible");
  document.getElementById("fabSearchInput").value = "";
  document.getElementById("fabSearchResults").innerHTML = "";
  document.getElementById("fabDotRow").style.display = "flex";
  fabShowStep(1);
}

function closeFabModal() {
  document.getElementById("fabModal").classList.remove("visible");
  document.getElementById("fabOverlay").classList.remove("visible");
  _fabStation = null;
  _fabFuelType = null;
}

function fabShowStep(n) {
  document.querySelectorAll(".fab-step").forEach((s, i) => s.classList.toggle("active", i === n - 1));
  document.querySelectorAll(".fab-dot").forEach((d, i) => d.classList.toggle("active", i === n - 1));
}

function fabSearch(query) {
  const q = query.trim().toLowerCase();
  const container = document.getElementById("fabSearchResults");
  if (!q) { container.innerHTML = ""; return; }
  const results = GAS_STATIONS
    .filter(s => s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || s.area.toLowerCase().includes(q))
    .slice(0, 6);
  if (!results.length) {
    container.innerHTML = `<div class="fab-no-results">No stations found</div>`;
    return;
  }
  container.innerHTML = results.map(s =>
    `<div class="fab-result" onclick="fabPickStation(${s.id})">
      <div class="fab-result-name">${s.name}</div>
      <div class="fab-result-area">${s.area}</div>
    </div>`
  ).join("");
}

function fabPickStation(stationId) {
  _fabStation = GAS_STATIONS.find(s => s.id === stationId);
  if (!_fabStation) return;
  document.getElementById("fabFuelStationName").textContent = _fabStation.name;
  const fuelTypes = Object.entries(_fabStation.prices)
    .filter(([, p]) => p != null)
    .map(([ft]) => ft);
  document.getElementById("fabFuelOptions").innerHTML = fuelTypes.map(ft =>
    `<div class="fab-fuel-option" onclick="fabPickFuel('${ft}')">
      <div class="fab-fuel-name">${FAB_FUEL_LABELS[ft] || ft}</div>
      <div class="fab-fuel-price">&#8369;${_fabStation.prices[ft].toFixed(2)} official</div>
    </div>`
  ).join("");
  fabShowStep(2);
}

function fabPickFuel(fuelType) {
  _fabFuelType = fuelType;
  document.getElementById("fabPriceTitle").textContent = `${FAB_FUEL_LABELS[fuelType] || fuelType} at ${_fabStation.name}`;
  document.getElementById("fabPriceInput").value = "";
  document.getElementById("fabNoteInput").value = "";
  const btn = document.getElementById("fabSubmitBtn");
  btn.textContent = "Submit Price";
  btn.disabled = false;
  fabShowStep(3);
}

function fabGoBack(toStep) { fabShowStep(toStep); }

function fabReportAnother() {
  // Go back to fuel selection for the same station
  _fabFuelType = null;
  fabShowStep(2);
}

function fabLocateMe() {
  const btn = document.getElementById("fabLocateBtn");
  if (!navigator.geolocation) {
    btn.textContent = "Location not supported";
    return;
  }
  btn.classList.add("loading");
  btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Locating…`;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: uLat, longitude: uLng } = pos.coords;
      function haversine(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }
      const nearest = GAS_STATIONS
        .map(s => ({ ...s, dist: haversine(uLat, uLng, s.lat, s.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 6);
      const container = document.getElementById("fabSearchResults");
      container.innerHTML = nearest.map(s =>
        `<div class="fab-result" onclick="fabPickStation(${s.id})">
          <div class="fab-result-name">${s.name}</div>
          <div class="fab-result-area">${s.area} · ${s.dist < 1 ? Math.round(s.dist * 1000) + "m" : s.dist.toFixed(1) + "km"} away</div>
        </div>`
      ).join("");
      btn.classList.remove("loading");
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Stations near me`;
    },
    (err) => {
      btn.classList.remove("loading");
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Stations near me`;
      let msg = "Couldn't get your location. Try searching instead.";
      if (err.code === 1) msg = "Location blocked. Allow location in your browser, then try again.";
      else if (err.code === 3) msg = "Location timed out. Check your signal and try again.";
      document.getElementById("fabSearchResults").innerHTML =
        `<div class="fab-no-results">?? ${msg}</div>`;
    },
    { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
  );
}

async function fabSubmit() {
  if (!_fabStation || !_fabFuelType) return;
  const priceVal = parseFloat(document.getElementById("fabPriceInput").value);
  const [minP, maxP] = FUEL_PRICE_RANGES[_fabFuelType] || [1, 200];
  if (isNaN(priceVal) || priceVal < minP || priceVal > maxP) {
    const input = document.getElementById("fabPriceInput");
    input.style.borderColor = "#ef4444";
    input.placeholder = `${minP}–${maxP}`;
    setTimeout(() => { input.style.borderColor = ""; input.placeholder = "0.00"; }, 2000);
    return;
  }
  const note = document.getElementById("fabNoteInput").value.trim();
  const btn = document.getElementById("fabSubmitBtn");
  btn.textContent = "Submitting…";
  btn.disabled = true;
  try {
    await submitPriceReport({
      stationId: _fabStation.id,
      stationName: _fabStation.name,
      brand: _fabStation.brand,
      fuelType: _fabFuelType,
      price: priceVal,
      note,
    });
    // Update local community cache so popup and sheet reflect the new price immediately
    if (!_communityCache[_fabStation.id]) _communityCache[_fabStation.id] = {};
    _communityCache[_fabStation.id][_fabFuelType] = { price: priceVal, r: 1, timestamp: new Date(), count: 1 };
    // Update station prices object so table also reflects it
    const _fabStationObj = GAS_STATIONS.find(s => s.id === _fabStation.id);
    if (_fabStationObj) _fabStationObj.prices[_fabFuelType] = priceVal;
    // Refresh map popup if marker exists
    refreshStationPopupInMap(_fabStation.id);
    document.getElementById("fabDotRow").style.display = "none";
    document.getElementById("fabSuccessSub").textContent =
      `${FAB_FUEL_LABELS[_fabFuelType] || _fabFuelType} at ${_fabStation.name} — submitted! Want to report another fuel?`;
    fabShowStep(4);
  } catch (e) {
    btn.textContent = "Submit Price";
    btn.disabled = false;
    alert("Something went wrong. Please try again.");
  }
}

// --- Advisory Popup (What's New) ------------------------------
function openAdvisoryPopup() {
  if (typeof ADVISORIES === "undefined" || !ADVISORIES.length) return;
  const body = document.getElementById("advisoryPopupBody");
  const labels = { alert: "ALERT", update: "UPDATE", new: "NEW", live: "LIVE" };

  // Sort newest first
  const sorted = [...ADVISORIES].sort((a, b) => b.date.localeCompare(a.date));

  body.innerHTML = sorted.map(a => {
    const badgeClass = "advisory-badge-" + a.type;
    const borderClass = "advisory-" + a.type;
    const dateStr = new Date(a.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `<div class="advisory-card ${borderClass}">
      <div class="advisory-header">
        <span class="advisory-badge ${badgeClass}">${labels[a.type] || "INFO"}</span>
        <span class="advisory-date">${dateStr}</span>
      </div>
      <div class="advisory-title">${a.title}</div>
      ${a.body ? `<p class="advisory-body">${a.body}</p>` : ""}
    </div>`;
  }).join("");

  document.getElementById("advisoryOverlay").classList.add("visible");
  document.getElementById("advisoryPopup").classList.add("visible");
  document.body.style.overflow = "hidden";
}

function closeAdvisoryPopup() {
  document.getElementById("advisoryOverlay").classList.remove("visible");
  document.getElementById("advisoryPopup").classList.remove("visible");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape" && document.getElementById("advisoryPopup").classList.contains("visible")) {
    closeAdvisoryPopup();
  }
  if (e.key === "Escape" && document.getElementById("calcSheet").classList.contains("visible")) {
    closeCalcSheet();
  }
});

/* --- Speed Dial FAB ---------------------------------------- */
let _sdOpen = false;
function toggleSpeedDial() {
  _sdOpen = !_sdOpen;
  document.getElementById("fabSdMain").classList.toggle("open", _sdOpen);
  document.getElementById("fabSdBackdrop").classList.toggle("visible", _sdOpen);
  var btt = document.getElementById("backToTopBtn");
  if (btt) btt.style.display = _sdOpen ? "none" : "";
  const calc = document.getElementById("fabSdCalc");
  const report = document.getElementById("fabSdReport");
  if (_sdOpen) {
    report.classList.add("visible");
    setTimeout(() => calc.classList.add("visible"), 60);
  } else {
    calc.classList.remove("visible");
    report.classList.remove("visible");
  }
}
function closeSpeedDial() {
  if (_sdOpen) toggleSpeedDial();
}

/* --- Fuel Cost Calculator ---------------------------------- */
const CALC_FUEL_LABELS = {
  diesel: "Diesel", unleaded: "Unl. 91", egasoline: "E-Gas",
  premium95: "Prem 95", premium97: "Prem 97", premiumDiesel: "Prem Diesel",
};
const CALC_FUEL_ORDER = ["diesel", "premiumDiesel", "unleaded", "egasoline", "premium95", "premium97"];

let _calcFuel = "unleaded";
let _calcBrand = null; // null = average
let _calcLiters = 0;
let _calcDropdownOpen = false;

function calcGetBrandAvg(brandKey, fuelType) {
  const stations = GAS_STATIONS.filter(s => s.brand === brandKey && s.prices[fuelType] != null);
  if (!stations.length) return null;
  return stations.reduce((sum, s) => sum + s.prices[fuelType], 0) / stations.length;
}

function calcGetAllAvg(fuelType) {
  const prices = GAS_STATIONS.map(s => s.prices[fuelType]).filter(p => p != null);
  if (!prices.length) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

function calcGetBrandCount(brandKey) {
  return GAS_STATIONS.filter(s => s.brand === brandKey).length;
}

function openCalcSheet() {
  closeSpeedDial();
  // Small delay if coming from speed dial animation
  setTimeout(() => {
    document.getElementById("calcOverlay").classList.add("visible");
    document.getElementById("calcSheet").classList.add("visible");
    calcRenderFuelPills();
    calcRenderBrandDropdown();
    calcUpdateBrandDisplay();
    calcUpdateResult();
    // Set date note
    const noteEl = document.getElementById("calcNote");
    if (noteEl && typeof LAST_UPDATED !== "undefined") {
      noteEl.textContent = "Based on avg. DOE & community prices \u00B7 " + LAST_UPDATED;
    }
  }, _sdOpen ? 150 : 0);
}

function closeCalcSheet() {
  document.getElementById("calcSheet").classList.remove("visible");
  document.getElementById("calcOverlay").classList.remove("visible");
  _calcDropdownOpen = false;
  document.getElementById("calcBrandDropdown").classList.remove("open");
  document.getElementById("calcBrandSelect").classList.remove("open");
}

function calcRenderFuelPills() {
  const el = document.getElementById("calcFuelPills");
  el.innerHTML = CALC_FUEL_ORDER.map(key =>
    '<button class="calc-fuel-pill' + (key === _calcFuel ? ' active' : '') +
    '" onclick="calcSelectFuel(\'' + key + '\')">' + CALC_FUEL_LABELS[key] + '</button>'
  ).join("");
}

function calcSelectFuel(fuel) {
  _calcFuel = fuel;
  calcRenderFuelPills();
  calcRenderBrandDropdown();
  if (_calcBrand && calcGetBrandAvg(_calcBrand, _calcFuel) === null) _calcBrand = null;
  calcUpdateBrandDisplay();
  calcUpdateResult();
}

function calcToggleBrandDropdown() {
  _calcDropdownOpen = !_calcDropdownOpen;
  document.getElementById("calcBrandDropdown").classList.toggle("open", _calcDropdownOpen);
  document.getElementById("calcBrandSelect").classList.toggle("open", _calcDropdownOpen);
}

function calcRenderBrandDropdown() {
  const el = document.getElementById("calcBrandDropdown");
  const allAvg = calcGetAllAvg(_calcFuel);
  const totalStations = GAS_STATIONS.length;

  // Find cheapest brand
  let cheapestKey = null, cheapestPrice = Infinity;
  let brandCount = 0;
  const brandKeys = Object.keys(BRANDS);
  const brandData = [];

  brandKeys.forEach(key => {
    const avg = calcGetBrandAvg(key, _calcFuel);
    if (avg === null) return;
    brandCount++;
    const count = calcGetBrandCount(key);
    brandData.push({ key, avg, count });
    if (avg < cheapestPrice) { cheapestPrice = avg; cheapestKey = key; }
  });

  // Average option
  let html = '<div class="calc-brand-option' + (_calcBrand === null ? ' selected' : '') +
    '" onclick="calcSelectBrand(null)">' +
    '<div class="calc-brand-opt-left"><div class="calc-brand-opt-dot" style="background:#888"></div>' +
    '<div><div class="calc-opt-name">Average (all brands)</div>' +
    '<div class="calc-opt-count">' + brandCount + ' brands \u00B7 ' + totalStations.toLocaleString() + ' stations</div></div></div>' +
    '<div style="display:flex;align-items:center"><span class="calc-opt-price">\u20B1' + allAvg.toFixed(2) + '</span>' +
    (_calcBrand === null ? '<span class="calc-opt-check">\u2713</span>' : '') + '</div></div>';

  // Brand options
  brandData.forEach(({ key, avg, count }) => {
    const brand = BRANDS[key];
    const isCheapest = key === cheapestKey;
    const isSelected = _calcBrand === key;
    html += '<div class="calc-brand-option' + (isSelected ? ' selected' : '') + (isCheapest ? ' cheapest' : '') +
      '" onclick="calcSelectBrand(\'' + key + '\')">' +
      '<div class="calc-brand-opt-left"><div class="calc-brand-opt-dot" style="background:' + brand.color + '"></div>' +
      '<div><div class="calc-opt-name">' + brand.name + '</div>' +
      '<div class="calc-opt-count">' + count + ' stations</div></div></div>' +
      '<div style="display:flex;align-items:center"><span class="calc-opt-price">\u20B1' + avg.toFixed(2) + '</span>' +
      (isSelected ? '<span class="calc-opt-check">\u2713</span>' : '') + '</div></div>';
  });

  el.innerHTML = html;
}

function calcSelectBrand(brand) {
  _calcBrand = brand;
  _calcDropdownOpen = false;
  document.getElementById("calcBrandDropdown").classList.remove("open");
  document.getElementById("calcBrandSelect").classList.remove("open");
  calcRenderBrandDropdown();
  calcUpdateBrandDisplay();
  calcUpdateResult();
}

function calcUpdateBrandDisplay() {
  const dot = document.getElementById("calcBrandDot");
  const name = document.getElementById("calcBrandName");
  const priceEl = document.getElementById("calcBrandPrice");

  if (_calcBrand === null) {
    dot.style.background = "#888";
    name.textContent = "Average (all brands)";
    priceEl.textContent = "\u20B1" + calcGetAllAvg(_calcFuel).toFixed(2) + "/L";
  } else {
    dot.style.background = BRANDS[_calcBrand].color;
    name.textContent = BRANDS[_calcBrand].name;
    const avg = calcGetBrandAvg(_calcBrand, _calcFuel);
    priceEl.textContent = avg !== null ? "\u20B1" + avg.toFixed(2) + "/L" : "N/A";
  }
}

function calcOnLitersChange() {
  const val = parseFloat(document.getElementById("calcLitersInput").value);
  _calcLiters = isNaN(val) || val < 0 ? 0 : val;
  document.querySelectorAll(".calc-preset").forEach(b => b.classList.remove("active"));
  if ([10, 20, 30, 40].includes(_calcLiters)) {
    document.querySelectorAll(".calc-preset").forEach(b => {
      if (parseFloat(b.textContent) === _calcLiters || (_calcLiters === 40 && b.textContent.includes("40")))
        b.classList.add("active");
    });
  }
  calcUpdateResult();
}

function calcSetPreset(val) {
  _calcLiters = val;
  document.getElementById("calcLitersInput").value = val;
  document.querySelectorAll(".calc-preset").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".calc-preset").forEach(b => {
    if ((val < 40 && b.textContent === val + "L") || (val === 40 && b.textContent.includes("40")))
      b.classList.add("active");
  });
  calcUpdateResult();
}

function calcUpdateResult() {
  const card = document.getElementById("calcResult");
  const totalEl = document.getElementById("calcResultTotal");
  const breakEl = document.getElementById("calcResultBreakdown");
  const compEl = document.getElementById("calcResultCompare");

  if (_calcLiters <= 0) { card.classList.remove("visible"); return; }

  let ppl, brandLabel;
  if (_calcBrand === null) {
    ppl = calcGetAllAvg(_calcFuel);
    brandLabel = "Average";
  } else {
    ppl = calcGetBrandAvg(_calcBrand, _calcFuel) || 0;
    brandLabel = BRANDS[_calcBrand].name;
  }

  const total = _calcLiters * ppl;
  totalEl.textContent = total.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  breakEl.textContent = _calcLiters + "L \u00D7 \u20B1" + ppl.toFixed(2) + "/L \u00B7 " + brandLabel + " \u00B7 " + CALC_FUEL_LABELS[_calcFuel];

  // Find cheapest brand
  let cheapKey = null, cheapPrice = Infinity;
  Object.keys(BRANDS).forEach(k => {
    const avg = calcGetBrandAvg(k, _calcFuel);
    if (avg !== null && avg < cheapPrice) { cheapPrice = avg; cheapKey = k; }
  });

  if (cheapKey && (_calcBrand === null || cheapKey !== _calcBrand)) {
    const cheapTotal = _calcLiters * cheapPrice;
    const savings = total - cheapTotal;
    if (savings > 0) {
      compEl.innerHTML = 'Cheapest option: <strong>' + BRANDS[cheapKey].name +
        ' \u20B1' + cheapPrice.toFixed(2) + '/L \u2192 \u20B1' +
        cheapTotal.toLocaleString("en-PH", { maximumFractionDigits: 0 }) +
        '</strong> (save \u20B1' + savings.toFixed(0) + ')';
    } else { compEl.textContent = ""; }
  } else if (cheapKey === _calcBrand) {
    compEl.innerHTML = '<strong>This is the cheapest option!</strong>';
  } else { compEl.textContent = ""; }

  card.classList.add("visible");
}

// Swipe to dismiss calculator — only on the handle/header area
(function() {
  let startY = 0;
  const header = document.querySelector(".calc-header");
  if (!header) return;
  header.addEventListener("touchstart", function(e) { startY = e.touches[0].clientY; }, { passive: true });
  header.addEventListener("touchmove", function(e) {
    if (e.touches[0].clientY - startY > 60) closeCalcSheet();
  }, { passive: true });
})();

