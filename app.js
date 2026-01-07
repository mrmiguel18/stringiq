/* StringIQ — app.js (Full Version: Auth, Identity, Toolbox, & CRUD) */

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
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
const $ = (id) => document.getElementById(id);

let currentUserRole = "player"; 
let allPlayers = [];

// --- AUTHENTICATION & IDENTITY GATE ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const email = user.email.toLowerCase();
            let doc = await db.collection("approved_users").doc(email).get();
            
            // Auto-Approval logic for new users
            if (!doc.exists) {
                await db.collection("approved_users").doc(email).set({
                    role: "player",
                    createdAt: Date.now()
                });
                doc = await db.collection("approved_users").doc(email).get();
            }

            currentUserRole = doc.data().role || "player";

            // Show/Hide Admin Dashboard button based on role
            if ($("adminLink")) {
                $("adminLink").style.display = (currentUserRole === "admin") ? "block" : "none";
            }

            $("authScreen").style.display = "none";
            $("appContent").style.display = "block";
            initApp(); 
            
        } catch (error) {
            console.error("Auth state error:", error);
            auth.signOut();
        }
    } else {
        $("authScreen").style.display = "flex";
        $("appContent").style.display = "none";
    }
});

// --- ADMIN DASHBOARD ---
async function openAdminDashboard() {
    if (currentUserRole !== "admin") return alert("Unauthorized access.");

    const querySnapshot = await db.collection("approved_users").get();
    let userList = "Current Users:\n------------------\n";
    
    querySnapshot.forEach((doc) => {
        userList += `${doc.id} [${doc.data().role}]\n`;
    });

    const targetEmail = prompt(userList + "\nEnter user email to change role:");
    if (targetEmail) {
        const newRole = prompt("Enter new role (admin or player):").toLowerCase();
        if (newRole === "admin" || newRole === "player") {
            await db.collection("approved_users").doc(targetEmail.toLowerCase().trim()).update({ role: newRole });
            alert("User updated!");
        } else {
            alert("Invalid role choice.");
        }
    }
}

// --- TENSION LOSS PREDICTOR (TOOLBOX) ---
function calculateTensionLoss() {
    const dateInput = $("stringingDate").value;
    if (!dateInput) return;

    const start = new Date(dateInput);
    const today = new Date();
    const days = Math.floor((today - start) / (1000 * 60 * 60 * 24));

    let lossPercent = 0;
    if (days >= 1) lossPercent = 10 + (days * 0.8);
    if (days > 45) lossPercent = 40; // Hard cap

    const result = $("tensionResult");
    result.innerHTML = days < 0 ? "Invalid Date" : 
        `Loss: <strong>${lossPercent.toFixed(1)}%</strong><br><small>${days} days old</small>`;
    
    result.style.color = lossPercent > 22 ? "#ff4b4b" : "#2ecc71";
}

// --- DATA & UI LOGIC ---
const RACKET_DATA = {
    "Yonex": ["EZONE 98", "EZONE 100", "VCORE 98", "VCORE 100", "Percept 97", "Percept 100"],
    "Wilson": ["Blade 98 V9", "Pro Staff 97 V14", "Ultra 100 V4", "Clash 100 V2"],
    "Head": ["Speed MP", "Radical MP", "Extreme MP", "Gravity MP", "Boom MP"],
    "Babolat": ["Pure Drive", "Pure Aero", "Pure Strike 98"],
    "Solinco": ["Whiteout 305", "Blackout 300"]
};

const STRING_DATA = {
    "Luxilon": ["ALU Power", "4G", "Element"],
    "Solinco": ["Hyper-G", "Tour Bite", "Confidential"],
    "Babolat": ["RPM Blast", "VS Touch (Gut)"],
    "Yonex": ["Poly Tour Pro", "Poly Tour Rev"],
    "Head": ["Lynx Tour", "Hawk Touch"],
    "Generic": ["Natural Gut", "Synthetic Gut", "Multifilament", "Poly"]
};

function initApp() {
    db.collection("players").onSnapshot((snapshot) => {
        allPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
    });
    initDropdowns();
}

function uid() { return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function escapeHtml(str) { return String(str || "").replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s])); }

// --- RENDER LIST ---
function render() {
    const list = $("playerList");
    const sortVal = $("sortBy")?.value || "name";
    const q = ($("search")?.value || "").toLowerCase().trim();
    const userEmail = auth.currentUser?.email.toLowerCase();
    
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
        const canEdit = (p.lastUpdatedBy === userEmail) || (currentUserRole === "admin");
        
        div.innerHTML = `
            <div class="title">
                <h3>${escapeHtml(p.name)}</h3>
                <div class="actions">
                    <button class="btn" style="font-size:11px; padding:4px 8px;" onclick="viewHistory('${p.id}')">History</button>
                    ${canEdit ? `<button class="btn" onclick="editPlayer('${p.id}')">Edit</button>` : ""}
                    ${canEdit ? `<button class="btn" onclick="deletePlayer('${p.id}')">Delete</button>` : ""}
                </div>
            </div>
            <div class="badges">
                <span class="badge" style="${setupHigh ? 'border-color:#4b79ff;color:#4b79ff;font-weight:bold;' : ''}">
                    Setup: ${p.setupRating || 0}/100 ${setupHigh ? '🔥' : ''}
                </span>
                <span class="badge">UTR: ${p.utr || 'N/A'}</span>
                <span class="badge">${escapeHtml(p.racketModel)}</span>
                <span class="badge">${p.tensionMain}/${p.tensionCross} lbs</span>
                ${p.usedBallMachine ? '<span class="badge" style="background:#4b79ff; color:white; border:none;">Ball Machine</span>' : ''}
            </div>
            ${p.notes ? `<p>${escapeHtml(p.notes)}</p>` : ""}
        `;
        list.appendChild(div);
    });
}

// --- CRUD OPERATIONS ---
async function deletePlayer(id) {
    if (confirm("Are you sure you want to delete this player?")) {
        try { 
            await db.collection("players").doc(id).delete(); 
        } catch(e) { 
            alert("Permission Denied."); 
        }
    }
}

function editPlayer(id) {
    const p = allPlayers.find(x => x.id === id);
    if (!p) return;
    $("playerId").value = p.id;
    $("name").value = p.name || "";
    $("utr").value = p.utr || "";
    $("racketModel").value = p.racketModel || "";
    $("tensionMain").value = p.tensionMain || "";
    $("tensionCross").value = p.tensionCross || "";
    $("setupRating").value = p.setupRating || "";
    $("usedBallMachine").checked = p.usedBallMachine || false;
    $("notes").value = p.notes || "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

$("playerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("playerId").value || uid();
    
    const data = {
        name: $("name").value.trim(),
        utr: $("utr").value,
        racketModel: $("racketModel").value,
        tensionMain: $("tensionMain").value,
        tensionCross: $("tensionCross").value,
        setupRating: $("setupRating").value,
        usedBallMachine: $("usedBallMachine").checked,
        notes: $("notes").value.trim(),
        updatedAt: Date.now(),
        lastUpdatedBy: auth.currentUser.email.toLowerCase()
    };

    try {
        await db.collection("players").doc(id).set(data);
        $("playerId").value = "";
        $("playerForm").reset();
        alert("Profile Saved!");
    } catch (err) {
        alert("Permission Denied.");
    }
});

// --- AUTH HANDLERS ---
async function handleGoogleLogin() {
    try { await auth.signInWithPopup(googleProvider); } 
    catch (e) { alert(e.message); }
}

async function handleEmailLogin() {
    const email = $("loginEmail").value.toLowerCase().trim();
    const pass = $("loginPass").value;
    try { await auth.signInWithEmailAndPassword(email, pass); }
    catch (e) { alert(e.message); }
}

async function handleEmailSignUp() {
    const email = $("loginEmail").value.toLowerCase().trim();
    const pass = $("loginPass").value;
    if(confirm("Create account? You will be authorized as a player.")) {
        try { await auth.createUserWithEmailAndPassword(email, pass); } 
        catch (e) { alert(e.message); }
    }
}

async function handleResetPassword() {
    const email = $("loginEmail").value;
    if(!email) return alert("Enter your email address first.");
    try {
        await auth.sendPasswordResetEmail(email);
        alert("Password reset link sent!");
    } catch (e) { alert(e.message); }
}

async function handleLogout() {
    if(confirm("Log out of StringIQ?")) await auth.signOut();
}

// --- DROPDOWNS & HELPERS ---
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
    };
    populate($("racketModel"), RACKET_DATA);
    
    // Fill Tension selects if empty
    const tm = $("tensionMain"), tc = $("tensionCross");
    if (tm && tm.options.length <= 1) {
        for(let i=40; i<=65; i++) {
            tm.add(new Option(i + " lbs", i));
            tc.add(new Option(i + " lbs", i));
        }
    }
}

if($("search")) $("search").addEventListener("input", render);
if($("sortBy")) $("sortBy").addEventListener("change", render);
