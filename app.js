/* StringIQ — app.js */
const KEY = "stringiq_players_v1";
const $ = (id) => document.getElementById(id);

// --- THE MASTER INDEX ---
const RACKET_DATA = {
  "Yonex": ["EZONE 98", "EZONE 98 Tour", "EZONE 100", "EZONE 100 Tour", "EZONE 98+", "VCORE 95", "VCORE 98", "VCORE 98 Tour", "VCORE 100", "VCORE 100 Tour", "Percept 97", "Percept 97D", "Percept 100", "Percept 100D"],
  "Wilson": ["Blade 98 (16x19) V9", "Blade 98 (18x20) V9", "Blade 100 V9", "Blade 100L", "Pro Staff 97 V14", "Pro Staff RF97", "Pro Staff X (100)", "Ultra 100 V4", "Ultra 100 Tour", "Ultra 108", "Clash 98 V2", "Clash 100 V2", "Clash 100 Pro"],
  "Head": ["Speed Pro (100)", "Speed MP (100)", "Speed Tour (97)", "Speed Team", "Radical Pro (98)", "Radical MP (98)", "Radical Tour", "Extreme Tour (98)", "Extreme MP (100)", "Extreme Pro", "Gravity Pro", "Gravity Tour", "Gravity MP", "Boom Pro (98)", "Boom MP (100)", "Prestige Pro", "Prestige Tour", "Prestige MP"],
  "Babolat": ["Pure Drive", "Pure Drive Tour", "Pure Drive 98", "Pure Drive Plus", "Pure Aero", "Pure Aero Tour", "Pure Aero 98", "Pure Aero Rafa", "Pure Strike 97", "Pure Strike 98 (16x19)", "Pure Strike 98 (18x20)", "Pure Strike 100"],
  "Dunlop": ["CX 200 Tour (18x20)", "CX 200 Tour (16x19)", "CX 200", "CX 400 Tour", "SX 300 Tour", "SX 300", "FX 500 Tour", "FX 500"],
  "Tecnifibre": ["TFight ISO 305", "TFight ISO 300", "TF40 (305) 16x19", "TF40 (305) 18x20", "TF-X1 300"],
  "Prince": ["Phantom 93P", "Phantom 100", "Phantom 100X", "Phantom Graffiti","Tour 95", "Tour 98", "Tour 100 (310)", "Tour 100 (290)","Ripstick 100", "Warrior 100"],
  "Solinco": [ "Whiteout 290", "Whiteout 305", "Whiteout 305 XTD","Blackout 285", "Blackout 300"]
};

const STRING_DATA = {
  "Luxilon": ["ALU Power", "ALU Power Rough", "4G", "4G Soft", "Element"],
  "Solinco": ["Hyper-G", "Hyper-G Round", "Tour Bite", "Confidential"],
  "Babolat": ["RPM Blast", "RPM Rough", "RPM Power", "VS Touch (Gut)"],
  "Yonex": ["Poly Tour Pro", "Poly Tour Rev", "Poly Tour Strike"],
  "Head": ["Lynx", "Lynx Tour", "Hawk Touch"],
  "Wilson": ["NXT", "Sensation", "Revolve"],
  "Tecnifibre": ["Razor Code", "X-One Biphase"],
  "Generic": ["Natural Gut", "Synthetic Gut", "Multifilament"]
};

let crossTouched = false;

// --- HELPERS ---
function loadPlayers() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
}
function savePlayers(players) { localStorage.setItem(KEY, JSON.stringify(players)); }
function uid() { return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function escapeHtml(str) { return String(str || "").replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s])); }

// Visual Feedback Helper
function showSuccess(btn, text = "Success!") {
  const original = btn.textContent;
  btn.textContent = "✅ " + text;
  btn.classList.add("save-success");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("save-success");
  }, 2000);
}

// --- EXPORT / IMPORT LOGIC ---
function exportData() {
  const players = loadPlayers();
  if (!players.length) return alert("No data to export!");
  
  const blob = new Blob([JSON.stringify(players, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stringiq_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported)) throw new Error();
      
      if (confirm(`Import ${imported.length} players? This will add to your current list.`)) {
        const current = loadPlayers();
        const merged = [...current, ...imported];
        const unique = Array.from(new Map(merged.map(p => [p.id, p])).values());
        
        savePlayers(unique);
        render();
        alert("Import Successful!");
      }
    } catch (err) {
      alert("Invalid backup file.");
    }
  };
  reader.readAsText(file);
  e.target.value = ""; 
}

// --- INITIALIZATION ---
function initDropdowns() {
  const populate = (el, data) => {
    if (!el) return;
    el.innerHTML = '<option value="">-- Select --</option>';
    for (const [brand, models] of Object.entries(data)) {
      const group = document.createElement("optgroup");
      group.label = brand;
      models.forEach(m => group.appendChild(new Option(`${brand} ${m}`, `${brand} ${m}`)));
      el.appendChild(group);
    }
    el.add(new Option("Custom...", "Custom..."));
  };

  populate($("racketModel"), RACKET_DATA);
  populate($("stringMain"), STRING_DATA);
  populate($("stringCross"), STRING_DATA);

  const tMain = $("tensionMain"), tCross = $("tensionCross");
  if (tMain && tCross) {
    tMain.innerHTML = ""; tCross.innerHTML = "";
    for (let i = 30; i <= 75; i++) {
      tMain.add(new Option(`${i} lbs`, String(i)));
      tCross.add(new Option(`${i} lbs`, String(i)));
    }
    tMain.value = "52"; tCross.value = "50";
  }
  hookCustomToggles();
  hookSliders();
  hookAutoCrossTension();
}

function hookCustomToggles() {
  const toggle = (selectId, wrapId) => {
    const sel = $(selectId), wrap = $(wrapId);
    if (!sel || !wrap) return;
    const apply = () => wrap.style.display = (sel.value === "Custom...") ? "block" : "none";
    sel.addEventListener("change", apply);
    apply();
  };
  toggle("racketModel", "racketCustomWrap");
  toggle("stringMain", "mainCustomWrap");
  toggle("stringCross", "crossCustomWrap");
  toggle("pattern", "patternCustomWrap");
}

function hookSliders() {
  [$("mainStringRating"), $("crossStringRating")].forEach(s => {
    if (!s) return;
    const valDisplay = $(s.id + "Val");
    s.addEventListener("input", () => { if(valDisplay) valDisplay.textContent = s.value; });
  });
}

function hookAutoCrossTension() {
  const tm = $("tensionMain"), tc = $("tensionCross");
  if (!tm || !tc) return;
  tc.addEventListener("change", () => crossTouched = true);
  tm.addEventListener("change", () => {
    if ($("playerId").value || crossTouched) return;
    tc.value = String(Math.max(30, parseInt(tm.value) - 2));
  });
}

function getStringValue(sel, cus) {
  if (!sel) return "";
  return (sel.value === "Custom...") ? (cus?.value || "").trim() : sel.value;
}

// --- RENDER & SORT ---
function render() {
  const list = $("playerList");
  const sortVal = $("sortBy")?.value || "name";
  const q = ($("search")?.value || "").toLowerCase().trim();
  
  let players = loadPlayers().filter(p => (p.name || "").toLowerCase().includes(q));

  players.sort((a, b) => {
    if (sortVal === "ratingHigh") return (Number(b.setupRating) || 0) - (Number(a.setupRating) || 0);
    if (sortVal === "ratingLow") return (Number(a.setupRating) || 0) - (Number(b.setupRating) || 0);
    if (sortVal === "newest") return (b.updatedAt || 0) - (a.updatedAt || 0);
    return (a.name || "").localeCompare(b.name || "");
  });

  list.innerHTML = "";
  $("empty").style.display = players.length ? "none" : "block";

  players.forEach(p => {
    const div = document.createElement("div");
    div.className = "item";
    const setupHigh = Number(p.setupRating) >= 85;
    
    div.innerHTML = `
      <div class="title">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="actions">
          <button class="btn" data-edit="${p.id}">Edit</button>
          <button class="btn" data-del="${p.id}">Delete</button>
        </div>
      </div>
      <div class="badges">
        <span class="badge" style="${setupHigh ? 'border-color:#4b79ff;color:#4b79ff;font-weight:bold;' : ''}">
          Setup: ${p.setupRating || 0}/100 ${setupHigh ? '🔥' : ''}
        </span>
        <span class="badge">UTR: ${p.utr || 'N/A'}</span>
        <span class="badge">${escapeHtml(p.racketModel)} (${escapeHtml(p.pattern || 'N/A')})</span>
        <span class="badge">${p.tensionMain}/${p.tensionCross} lbs</span>
      </div>
      ${p.notes ? `<p>${escapeHtml(p.notes)}</p>` : ""}
    `;
    list.appendChild(div);
  });
}

// --- CRUD ---
function resetForm() {
  $("playerId").value = "";
  $("playerForm").reset();
  crossTouched = false;
  if ($("mainStringRatingVal")) $("mainStringRatingVal").textContent = "50";
  if ($("crossStringRatingVal")) $("crossStringRatingVal").textContent = "50";
  ["racketCustomWrap", "mainCustomWrap", "crossCustomWrap", "patternCustomWrap"].forEach(id => {
    if($(id)) $(id).style.display = "none";
  });
}

function editPlayer(id) {
  const p = loadPlayers().find(x => x.id === id);
  if (!p) return;
  $("playerId").value = p.id;
  $("name").value = p.name || "";
  $("utr").value = p.utr || "";
  $("age").value = p.age || "";
  $("hand").value = p.hand || "Right";

  const setDrop = (selId, cusId, wrapId, val) => {
    const sel = $(selId);
    if(!sel) return;
    const hasMatch = Array.from(sel.options).some(o => o.value === val);
    if (hasMatch) { 
      sel.value = val; 
      if($(wrapId)) $(wrapId).style.display = "none"; 
    } else { 
      sel.value = "Custom..."; 
      if($(wrapId)) $(wrapId).style.display = "block"; 
      if($(cusId)) $(cusId).value = val || ""; 
    }
  };

  setDrop("racketModel", "racketCustom", "racketCustomWrap", p.racketModel);
  setDrop("stringMain", "mainCustom", "mainCustomWrap", p.mainString);
  setDrop("stringCross", "crossCustom", "crossCustomWrap", p.crossString);
  setDrop("pattern", "patternCustom", "patternCustomWrap", p.pattern);
  
  $("tensionMain").value = p.tensionMain || "52";
  $("tensionCross").value = p.tensionCross || "50";
  $("setupRating").value = p.setupRating || "";
  if ($("weeklyFeeling")) $("weeklyFeeling").value = p.weeklyFeeling || "";
  if ($("stringer")) $("stringer").value = p.stringer || "";

  $("mainStringRating").value = p.mainRating || 50;
  $("mainStringRatingVal").textContent = p.mainRating || 50;
  $("crossStringRating").value = p.crossRating || 50;
  $("crossStringRatingVal").textContent = p.crossRating || 50;
  $("notes").value = p.notes || "";
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$("playerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const players = loadPlayers();
  const data = {
    id: $("playerId").value || uid(),
    name: $("name").value.trim(),
    utr: $("utr").value,
    age: $("age").value,
    hand: $("hand").value,
    racketModel: getStringValue($("racketModel"), $("racketCustom")),
    pattern: getStringValue($("pattern"), $("patternCustom")),
    mainString: getStringValue($("stringMain"), $("mainCustom")),
    crossString: getStringValue($("stringCross"), $("crossCustom")),
    tensionMain: $("tensionMain").value,
    tensionCross: $("tensionCross").value,
    setupRating: $("setupRating").value,
    weeklyFeeling: $("weeklyFeeling") ? $("weeklyFeeling").value : "",
    stringer: $("stringer") ? $("stringer").value.trim() : "",
    mainRating: $("mainStringRating").value,
    crossRating: $("crossStringRating").value,
    notes: $("notes").value.trim(),
    updatedAt: Date.now()
  };

  if (!data.name) {
    alert("Please enter a player name.");
    return;
  }

  const idx = players.findIndex(p => p.id === data.id);
  if (idx > -1) players[idx] = data; else players.push(data);
  savePlayers(players);
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  showSuccess(submitBtn, "Saved!");

  resetForm();
  render();
});

$("playerList").addEventListener("click", e => {
  if (e.target.dataset.edit) editPlayer(e.target.dataset.edit);
  if (e.target.dataset.del && confirm("Delete?")) {
    savePlayers(loadPlayers().filter(p => p.id !== e.target.dataset.del));
    render();
  }
});

$("search").addEventListener("input", render);
$("sortBy").addEventListener("change", render);
$("cancelEdit").addEventListener("click", resetForm);

document.addEventListener("click", e => {
  if (e.target.id === "exportBtn") exportData();
  if (e.target.id === "importBtn") $("importFile").click();
});

if ($("importFile")) $("importFile").addEventListener("change", handleImport);

initDropdowns();
render();