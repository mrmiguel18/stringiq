/* StringIQ — app.js (Firebase Cloud + Admin PIN + Smart Install + History) */

// 1. YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyCfSVizTInAFx0zDyt6JDsfHUpVvN6BELY",
    authDomain: "stringiq-c6c09.firebaseapp.com",
    projectId: "stringiq-c6c09",
    storageBucket: "stringiq-c6c09.firebasestorage.app",
    messagingSenderId: "884545730906",
    appId: "1:884545730906:web:9e448908d02d13b5d09b63",
    measurementId: "G-0W0HP22NF9"
};

// 2. INITIALIZE FIREBASE
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const $ = (id) => document.getElementById(id);

// --- SECURITY SETTINGS ---
const MASTER_PIN = "1234"; // CHANGE THIS to your preferred 4-digit code

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
  "Generic": ["Natural Gut", "Synthetic Gut", "Multifilament", "Poly"]
};

let crossTouched = false;
let allPlayers = []; 
let deferredPrompt;

// --- INSTALL LOGIC ---
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

window.addEventListener('load', () => {
  if (!isStandalone) {
    if (isIOS || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      if($("installBanner")) $("installBanner").style.display = "block";
    }
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if($("installBanner")) $("installBanner").style.display = "block";
});

if($("installBtn")) {
    $("installBtn").addEventListener('click', () => {
      if (isIOS) {
        if($("iosPrompt")) $("iosPrompt").style.display = "block";
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') $("installBanner").style.display = "none";
          deferredPrompt = null;
        });
      }
    });
}

// --- CLOUD HELPERS ---
function uid() { return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function escapeHtml(str) { return String(str || "").replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s])); }

function showSuccess(btn, text = "Success!") {
  const original = btn.textContent;
  btn.textContent = "✅ " + text;
  btn.classList.add("save-success");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("save-success");
  }, 2000);
}

// --- CLOUD SYNC ---
db.collection("players").onSnapshot((snapshot) => {
    allPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});

// --- RENDER & SORT ---
function render() {
  const list = $("playerList");
  const sortVal = $("sortBy")?.value || "name";
  const q = ($("search")?.value || "").toLowerCase().trim();
  
  let filtered = allPlayers.filter(p => (p.name || "").toLowerCase().includes(q));

  filtered.sort((a, b) => {
    if (sortVal === "ratingHigh") return (Number(b.setupRating) || 0) - (Number(a.setupRating) || 0);
    if (sortVal === "ratingLow") return (Number(a.setupRating) || 0) - (Number(b.setupRating) || 0);
    if (sortVal === "newest") return (b.updatedAt || 0) - (a.updatedAt || 0);
    return (a.name || "").localeCompare(b.name || "");
  });

  list.innerHTML = "";
  $("empty").style.display = filtered.length ? "none" : "block";

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "item";
    const setupHigh = Number(p.setupRating) >= 85;
    
    div.innerHTML = `
      <div class="title">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="actions">
          <button class="btn" style="font-size:11px; padding:4px 8px;" onclick="viewHistory('${p.id}')">History</button>
          <button class="btn" data-edit="${p.id}">Edit</button>
          <button class="btn" data-del="${p.id}">Delete</button>
        </div>
      </div>
      <div class="badges">
        <span class="badge" style="${setupHigh ? 'border-color:#4b79ff;color:#4b79ff;font-weight:bold;' : ''}">
          Setup: ${p.setupRating || 0}/100 ${setupHigh ? '🔥' : ''}
        </span>
        <span class="badge">UTR: ${p.utr || 'N/A'}</span>
        <span class="badge">${escapeHtml(p.racketModel)}</span>
        <span class="badge">${p.tensionMain}/${p.tensionCross} lbs</span>
      </div>
      ${p.notes ? `<p>${escapeHtml(p.notes)}</p>` : ""}
    `;
    list.appendChild(div);
  });
}

// --- HISTORY VIEW ---
async function viewHistory(playerId) {
    const snap = await db.collection("players").doc(playerId).collection("history").orderBy("archivedAt", "desc").limit(5).get();
    if (snap.empty) return alert("No previous setups recorded for this player.");
    
    let historyText = "Recent History:\n------------------\n";
    snap.forEach(doc => {
        const d = doc.data();
        const date = new Date(d.archivedAt).toLocaleDateString();
        historyText += `📅 ${date}\n🎾 ${d.racketModel}\n🧵 ${d.mainString}/${d.crossString}\n⚡ ${d.tensionMain}/${d.tensionCross} lbs\n⭐ Rating: ${d.setupRating}/100\n------------------\n`;
    });
    alert(historyText);
}

// --- CRUD ---
async function deletePlayer(id) {
    const pin = prompt("Enter Admin PIN to delete:");
    if (pin === MASTER_PIN) {
        if (confirm("Are you sure? This cannot be undone.")) {
            await db.collection("players").doc(id).delete();
        }
    } else {
        alert("Incorrect PIN.");
    }
}

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
  const p = allPlayers.find(x => x.id === id);
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

// --- SUBMIT HANDLER ---
$("playerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if ($("adminPin").value !== MASTER_PIN) {
    alert("Incorrect Admin PIN. Changes not saved.");
    return;
  }

  const id = $("playerId").value || uid();
  const existingPlayer = allPlayers.find(p => p.id === id);

  // Archive history if updating existing player
  if (existingPlayer) {
    try {
        await db.collection("players").doc(id).collection("history").add({
            ...existingPlayer,
            archivedAt: Date.now()
        });
    } catch(e) { console.error("History fail", e); }
  }

  const data = {
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

  if (!data.name) return alert("Name required.");

  try {
    await db.collection("players").doc(id).set(data);
    showSuccess(e.target.querySelector('button[type="submit"]'), "Saved to Cloud!");
    resetForm();
    $("adminPin").value = ""; 
  } catch (err) {
    alert("Firebase Error: " + err.message);
  }
});

// --- UI HELPERS ---
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
  
  const tm = $("tensionMain"), tc = $("tensionCross");
  for (let i = 30; i <= 75; i++) {
      tm.add(new Option(`${i} lbs`, String(i)));
      tc.add(new Option(`${i} lbs`, String(i)));
  }
  tm.value = "52"; tc.value = "50";
  hookCustomToggles();
  hookSliders();
}

function hookCustomToggles() {
  const toggle = (selectId, wrapId) => {
    const sel = $(selectId), wrap = $(wrapId);
    if (!sel || !wrap) return;
    sel.addEventListener("change", () => wrap.style.display = (sel.value === "Custom...") ? "block" : "none");
  };
  toggle("racketModel", "racketCustomWrap");
  toggle("stringMain", "mainCustomWrap");
  toggle("stringCross", "crossCustomWrap");
  toggle("pattern", "patternCustomWrap");
}

function hookSliders() {
  [$("mainStringRating"), $("crossStringRating")].forEach(s => {
    if (!s) return;
    s.addEventListener("input", () => $(s.id + "Val").textContent = s.value);
  });
}

function getStringValue(sel, cus) {
  if (!sel) return "";
  return (sel.value === "Custom...") ? (cus?.value || "").trim() : sel.value;
}

$("playerList").addEventListener("click", e => {
  if (e.target.dataset.edit) editPlayer(e.target.dataset.edit);
  if (e.target.dataset.del) deletePlayer(e.target.dataset.del);
});

$("search").addEventListener("input", render);
$("sortBy").addEventListener("change", render);
$("cancelEdit").addEventListener("click", resetForm);

initDropdowns();
