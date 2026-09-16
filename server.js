const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- BASE DE DONNÉES SIMULÉE ---
let registeredUsers = [];
let currentUser = null;   

let discoveryProfiles = [
  { id: 1, name: 'Julie', age: 24, bio: 'Passionnée de voyages et de café ☕', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500' },
  { id: 2, name: 'Thomas', age: 27, bio: 'Développeur et fan de randonnée 🏔️', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500' },
  { id: 3, name: 'Chloé', age: 22, bio: 'Artiste dans l’âme, j’adore les expos 🎨', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500' },
  { id: 4, name: 'David', age: 30, bio: 'Entrepreneur & passionné de musique 🎸', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500' }
];

let matches = []; // Liste des IDs ou objets matchés
let messages = {}; // Stockage des messages par match (ex: { '1_2': [ {sender: 1, text: 'Hello'} ] })

// --- PWA MANIFEST & SERVICE WORKER ---
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "MatchLove",
    "short_name": "MatchLove",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ff4b4b",
    "theme_color": "#ff4b4b",
    "icons": [
      { "src": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=192&h=192&fit=crop", "sizes": "192x192", "type": "image/jpeg" },
      { "src": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=512&h=512&fit=crop", "sizes": "512x512", "type": "image/jpeg" }
    ]
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    self.addEventListener('install', (e) => { self.skipWaiting(); });
    self.addEventListener('activate', (e) => { return self.clients.claim(); });
    self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
  `);
});

// --- INTERFACE WEB COMPLÈTE ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>MatchLove</title>
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#ff4b4b">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

        <style>
            * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #f0f2f5; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
            .container { width: 100%; max-width: 400px; background: white; height: 100%; max-height: 100vh; border-radius: 0; display: flex; flex-direction: column; overflow: hidden; position: relative; }
            @media (min-width: 768px) { .container { height: 750px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #ddd; } }
            
            header { background: #ff4b4b; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 1.2rem; display: flex; justify-content: space-between; align-items: center; }
            .screen { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
            
            /* Auth Screen */
            .auth-screen { padding: 25px; display: flex; flex-direction: column; justify-content: center; height: 100%; text-align: center; overflow-y: auto; }
            .auth-screen h2 { color: #ff4b4b; margin-bottom: 15px; }
            .auth-screen input { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 8px; outline: none; }
            .auth-btn { background: #ff4b4b; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 5px; }
            .quick-login-btn { background: #fff; color: #333; border: 2px solid #ff4b4b; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 12px; }
            .switch-auth { margin-top: 15px; font-size: 0.85rem; color: #666; cursor: pointer; }

            /* Swipe & Filtres */
            .filter-bar { padding: 10px 15px; background: #fff; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #555; }
            .filter-bar select { padding: 4px; border-radius: 5px; border: 1px solid #ccc; }
            .card-area { flex: 1; padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .profile-card { width: 100%; height: 350px; border-radius: 15px; background-size: cover; background-position: center; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; flex-direction: column; justify-content: flex-end; }
            .profile-info { background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; padding: 20px; border-bottom-left-radius: 15px; border-bottom-right-radius: 15px; }
            .profile-info h2 { margin: 0 0 5px 0; }
            .profile-info p { margin: 0; font-size: 0.9rem; opacity: 0.9; }
            .buttons { display: flex; justify-content: space-around; padding: 10px; width: 100%; }
            .btn { width: 55px; height: 55px; border-radius: 50%; border: none; font-size: 1.4rem; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .btn-pass { background: white; color: #ff4b4b; border: 2px solid #ff4b4b; }
            .btn-like { background: #ff4b4b; color: white; }

            /* Navigation */
            nav { display: flex; background: #fff; border-top: 1px solid #eee; height: 60px; justify-content: space-around; align-items: center; }
            nav button { background: none; border: none; font-size: 0.85rem; cursor: pointer; color: #777; flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
            nav button.active { color: #ff4b4b; font-weight: bold; }

            /* Matchs & Chat */
            .matches-list { flex: 1; overflow-y: auto; padding: 15px; }
            .match-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
            .match-item img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-right: 15px; }
            
            .chat-screen { display: flex; flex-direction: column; height: 100%; }
            .chat-header { background: #fff; padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; font-weight: bold; }
            .chat-header img { width: 35px; height: 35px; border-radius: 50%; object-fit: cover; }
            .chat-messages { flex: 1; padding: 15px; overflow-y: auto; background: #fafafa; display: flex; flex-direction: column; gap: 10px; }
            .msg { padding: 10px 14px; border-radius: 15px; max-width: 75%; font-size: 0.9rem; }
            .msg.sent { background: #ff4b4b; color: white; align-self: flex-end; }
            .msg.received { background: #e4e6eb; color: black; align-self: flex-start; }
            .chat-input-area { display: flex; padding: 10px; background: white; border-top: 1px solid #ddd; }
            .chat-input-area input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 20px; outline: none; }
            .chat-input-area button { background: #ff4b4b; color: white; border: none; padding: 0 15px; border-radius: 20px; margin-left: 5px; cursor: pointer; }

            /* Profile Edit Screen */
            .profile-screen { padding: 25px; display: flex; flex-direction: column; height: 100%; overflow-y: auto; text-align: center; }
            .profile-screen img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin: 0 auto 15px auto; border: 3px solid #ff4b4b; }
            .profile-screen input, .profile-screen textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 8px; }

            /* VIP / M-Pesa */
            .vip-screen { padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 100%; overflow-y: auto; }
            .mpesa-box { background: #e6f4ea; border: 2px dashed #34a853; padding: 12px; border-radius: 10px; margin-top: 10px; text-align: left; }
            .mpesa-box input { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 5px; }
            .mpesa-btn { background: #34a853; color: white; border: none; padding: 10px; width: 100%; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <span>🔥 MatchLove</span>
                <span id="vipBadge" style="font-size: 0.75rem; background: gold; color: #333; padding: 3px 8px; border-radius: 10px; display:none;">VIP ✨</span>
            </header>

            <div class="screen" id="mainScreen"></div>

            <nav id="bottomNav" style="display:none;">
                <button onclick="switchTab('swipe')" id="navSwipe" class="active">🔥 <span>Découvrir</span></button>
                <button onclick="switchTab('matches')" id="navMatches">💬 <span>Matchs</span></button>
                <button onclick="switchTab('vip')" id="navVip">💎 <span>M-Pesa</span></button>
                <button onclick="switchTab('profile')" id="navProfile">👤 <span>Profil</span></button>
            </nav>
        </div>

        <script>
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error', err));
            }

            let currentUser = null;
            let currentTab = 'swipe';
            let currentIndex = 0;
            let discoveryProfiles = [];
            let matches = [];
            let activeChatUser = null;
            let ageFilter = 'all';
            let isRegisterMode = false;

            async function init() {
                const res = await fetch('/api/state');
                const data = await res.json();
                currentUser = data.currentUser;
                discoveryProfiles = data.discoveryProfiles;
                matches = data.matches;

                if (!currentUser) {
                    renderAuthScreen();
                    document.getElementById('bottomNav').style.display = 'none';
                } else {
                    document.getElementById('bottomNav').style.display = 'flex';
                    if (currentUser.isVip) document.getElementById('vipBadge').style.display = 'inline-block';
                    renderTab();
                }
            }

            function renderAuthScreen() {
                const screen = document.getElementById('mainScreen');
                if (isRegisterMode) {
                    screen.innerHTML = \`
                        <div class="auth-screen">
                            <h2>Créer un compte 🚀</h2>
                            <input type="text" id="regName" placeholder="Prénom" />
                            <input type="number" id="regAge" placeholder="Âge" />
                            <input type="text" id="regBio" placeholder="Bio..." />
                            <input type="email" id="regEmail" placeholder="Email" />
                            <input type="password" id="regPassword" placeholder="Mot de passe" />
                            <button class="auth-btn" onclick="register()">S'inscrire</button>
                            <div class="switch-auth" onclick="isRegisterMode = false; renderAuthScreen();">Déjà un compte ? Se connecter</div>
                        </div>
                    \`;
                } else {
                    screen.innerHTML = \`
                        <div class="auth-screen">
                            <h2>Connexion 👋</h2>
                            <button class="quick-login-btn" onclick="quickLogin()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4b4b" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <span>Connexion Rapide (Invité)</span>
                            </button>
                            <div style="margin: 15px 0; color: #aaa; font-size: 0.85rem;">ou avec votre compte</div>
                            <input type="email" id="loginEmail" placeholder="Email" />
                            <input type="password" id="loginPassword" placeholder="Mot de passe" />
                            <button class="auth-btn" onclick="login()">Se connecter</button>
                            <div class="switch-auth" onclick="isRegisterMode = true; renderAuthScreen();">Pas de compte ? S'inscrire</div>
                        </div>
                    \`;
                }
            }

            async function quickLogin() {
                const res = await fetch('/api/quick-login', { method: 'POST' });
                const data = await res.json();
                if (data.success) init();
            }

            async function register() {
                const name = document.getElementById('regName').value;
                const age = document.getElementById('regAge').value;
                const bio = document.getElementById('regBio').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;
                if (!name || !email || !password) { alert('Remplissez les champs obligatoires.'); return; }

                const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, age, bio, email, password }) });
                const data = await res.json();
                if (data.success) init(); else alert(data.message);
            }

            async function login() {
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const data = await res.json();
                if (data.success) init(); else alert('Email ou mot de passe incorrect.');
            }

            function switchTab(tab) {
                currentTab = tab;
                activeChatUser = null;
                document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
                if(tab !== 'chat') document.getElementById('nav' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
                renderTab();
            }

            function renderTab() {
                const screen = document.getElementById('mainScreen');
                
                if (currentTab === 'swipe') {
                    // Filtrage des profils selon l'âge choisi
                    let filtered = discoveryProfiles.filter(p => {
                        if (ageFilter === '20-25') return p.age >= 20 && p.age <= 25;
                        if (ageFilter === '26+') return p.age >= 26;
                        return true;
                    });

                    if (currentIndex >= filtered.length) {
                        screen.innerHTML = \`
                            <div class="filter-bar">
                                <span>Filtre d'âge :</span>
                                <select onchange="changeFilter(this.value)">
                                    <option value="all" \${ageFilter==='all'?'selected':''}>Tous</option>
                                    <option value="20-25" \${ageFilter==='20-25'?'selected':''}>20 - 25 ans</option>
                                    <option value="26+" \${ageFilter==='26+'?'selected':''}>26+ ans</option>
                                </select>
                            </div>
                            <div style="flex:1; display:flex; align-items:center; justify-content:center; color:#777; text-align:center; padding:20px;">Plus de profils avec ce filtre ! 😊</div>\`;
                        return;
                    }
                    const user = filtered[currentIndex];
                    screen.innerHTML = \`
                        <div class="filter-bar">
                            <span>Filtre d'âge :</span>
                            <select onchange="changeFilter(this.value)">
                                <option value="all" \${ageFilter==='all'?'selected':''}>Tous</option>
                                <option value="20-25" \${ageFilter==='20-25'?'selected':''}>20 - 25 ans</option>
                                <option value="26+" \${ageFilter==='26+'?'selected':''}>26+ ans</option>
                            </select>
                        </div>
                        <div class="card-area">
                            <div class="profile-card" style="background-image: url('\${user.photo}')">
                                <div class="profile-info"><h2>\${user.name}, \${user.age}</h2><p>\${user.bio}</p></div>
                            </div>
                        </div>
                        <div class="buttons">
                            <button class="btn btn-pass" onclick="swipe('pass')">❌</button>
                            <button class="btn btn-like" onclick="swipe('like', \${user.id})">💖</button>
                        </div>
                    \`;
                } 
                else if (currentTab === 'matches') {
                    let html = '<div class="matches-list"><h3>Vos Matchs & Conversations</h3>';
                    if (matches.length === 0) html += '<p style="color:#777; text-align:center; margin-top:30px;">Aucun match pour l\\'instant. Swipez pour matcher !</p>';
                    else matches.forEach(m => {
                        html += \`<div class="match-item" onclick="openChat(\${m.id})"><img src="\${m.photo}" /><div><strong>\${m.name}</strong><br><small style="color:#777;">Cliquez pour chatter 💬</small></div></div>\`;
                    });
                    screen.innerHTML = html + '</div>';
                } 
                else if (currentTab === 'chat' && activeChatUser) {
                    screen.innerHTML = \`
                        <div class="chat-screen">
                            <div class="chat-header">
                                <button onclick="switchTab('matches')" style="background:none; border:none; font-size:1rem; cursor:pointer;">⬅</button>
                                <img src="\${activeChatUser.photo}" />
                                <span>\${activeChatUser.name}</span>
                            </div>
                            <div class="chat-messages" id="chatBox"></div>
                            <div class="chat-input-area">
                                <input type="text" id="msgInput" placeholder="Écrivez votre message..." onkeypress="if(event.key==='Enter') sendMsg()" />
                                <button onclick="sendMsg()">Envoyer</button>
                            </div>
                        </div>
                    \`;
                    loadMessages();
                }
                else if (currentTab === 'vip') {
                    screen.innerHTML = \`
                        <div class="vip-screen">
                            <h2>Abonnement VIP M-Pesa 🟢</h2>
                            <p style="font-size:0.85rem; color:#555;">Envoyez votre paiement sur le numéro M-Pesa officiel : <br><strong style="font-size:1.1rem; color:#000;">+243 81 56 28 477</strong></p>
                            \${currentUser.isVip ? '<p style="color:green; font-weight:bold; margin-top:20px;">✅ Compte VIP Actif !</p>' : 
                              currentUser.paymentPending ? '<p style="color:orange; font-weight:bold; margin-top:20px;">⏳ Vérification du paiement...</p>' : 
                              \`<div class="mpesa-box">
                                  <label style="font-size:0.8rem; font-weight:bold; color:#2e7d32;">Numéro payeur :</label>
                                  <input type="text" id="mpesaPhone" placeholder="Ex: +243815628477" />
                                  <label style="font-size:0.8rem; font-weight:bold; color:#2e7d32; margin-top:8px; display:block;">Référence M-Pesa :</label>
                                  <input type="text" id="mpesaRef" placeholder="Ex: MP26.1234.ABCD" />
                                  <button class="mpesa-btn" onclick="submitManualPayment()">Valider mon paiement</button>
                              </div>\`
                            }
                        </div>
                    \`;
                }
                else if (currentTab === 'profile') {
                    screen.innerHTML = \`
                        <div class="profile-screen">
                            <h2>Mon Profil 👤</h2>
                            <img src="\${currentUser.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500'}" />
                            <label style="text-align:left; font-size:0.8rem; font-weight:bold;">Prénom :</label>
                            <input type="text" id="editName" value="\${currentUser.name}" />
                            <label style="text-align:left; font-size:0.8rem; font-weight:bold;">Âge :</label>
                            <input type="number" id="editAge" value="\${currentUser.age || ''}" />
                            <label style="text-align:left; font-size:0.8rem; font-weight:bold;">Photo (URL) :</label>
                            <input type="text" id="editPhoto" value="\${currentUser.photo || ''}" />
                            <label style="text-align:left; font-size:0.8rem; font-weight:bold;">Bio :</label>
                            <textarea id="editBio">\${currentUser.bio || ''}</textarea>
                            <button class="auth-btn" onclick="saveProfile()">Enregistrer les modifications</button>
                            <button onclick="logout()" style="background:none; border:none; color:#ff4b4b; margin-top:15px; cursor:pointer; font-weight:bold;">Se déconnecter</button>
                        </div>
                    \`;
                }
            }

            function changeFilter(val) {
                ageFilter = val;
                currentIndex = 0;
                renderTab();
            }

            async function swipe(action, targetId) {
                if (action === 'like') {
                    const res = await fetch('/api/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId }) });
                    const data = await res.json();
                    matches = data.matches;
                }
                currentIndex++;
                renderTab();
            }

            function openChat(targetId) {
                activeChatUser = matches.find(m => m.id === targetId);
                currentTab = 'chat';
                renderTab();
            }

            async function loadMessages() {
                if (!activeChatUser) return;
                const res = await fetch(\`/api/messages?targetId=\${activeChatUser.id}\`);
                const data = await res.json();
                const chatBox = document.getElementById('chatBox');
                chatBox.innerHTML = data.messages.map(m => \`<div class="msg \${m.sender === currentUser.id ? 'sent' : 'received'}">\${m.text}</div>\`).join('');
                chatBox.scrollTop = chatBox.scrollHeight;
            }

            async function sendMsg() {
                const input = document.getElementById('msgInput');
                const text = input.value.trim();
                if (!text || !activeChatUser) return;

                await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetId: activeChatUser.id, text })
                });
                input.value = '';
                loadMessages();
            }

            async function saveProfile() {
                const name = document.getElementById('editName').value;
                const age = document.getElementById('editAge').value;
                const photo = document.getElementById('editPhoto').value;
                const bio = document.getElementById('editBio').value;

                const res = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, age, photo, bio })
                });
                const data = await res.json();
                if (data.success) {
                    currentUser = data.currentUser;
                    alert('Profil mis à jour avec succès !');
                    switchTab('swipe');
                }
            }

            async function submitManualPayment() {
                const phone = document.getElementById('mpesaPhone').value;
                const ref = document.getElementById('mpesaRef').value;
                if (!phone || !ref) { alert('Remplissez tous les champs.'); return; }

                const res = await fetch('/api/pay-manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, ref }) });
                const data = await res.json();
                if (data.success) {
                    currentUser.paymentPending = true;
                    alert('Demande enregistrée. Validation en cours...');
                    renderTab();
                }
            }

            async function logout() {
                await fetch('/api/logout', { method: 'POST' });
                init();
            }

            init();
        </script>
    </body>
    </html>
  `);
});

// --- API BACKEND ---
app.get('/api/state', (req, res) => {
  res.json({ currentUser, discoveryProfiles, matches });
});

app.post('/api/quick-login', (req, res) => {
  currentUser = { id: Date.now(), name: 'Utilisateur Mobile', age: 25, bio: 'Connecté par icône', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500', isVip: false, paymentPending: false };
  res.json({ success: true });
});

app.post('/api/register', (req, res) => {
  const { name, age, bio, email, password } = req.body;
  if (registeredUsers.some(u => u.email === email)) return res.json({ success: false, message: 'Email déjà utilisé.' });
  const newUser = { id: Date.now(), name, age, bio, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500', email, password, isVip: false, paymentPending: false };
  registeredUsers.push(newUser);
  currentUser = newUser;
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = registeredUsers.find(u => u.email === email && u.password === password);
  if (user) { currentUser = user; res.json({ success: true }); }
  else res.json({ success: false });
});

app.post('/api/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

app.post('/api/like', (req, res) => {
  const liked = discoveryProfiles.find(u => u.id === req.body.targetId);
  if (liked && !matches.some(m => m.id === liked.id)) matches.push(liked);
  res.json({ success: true, matches });
});

// Gestion du Chat
app.get('/api/messages', (req, res) => {
  if (!currentUser) return res.json({ messages: [] });
  const targetId = req.query.targetId;
  const chatId = [currentUser.id, targetId].sort().join('_');
  res.json({ messages: messages[chatId] || [] });
});

app.post('/api/messages', (req, res) => {
  if (!currentUser) return res.sendStatus(401);
  const { targetId, text } = req.body;
  const chatId = [currentUser.id, targetId].sort().join('_');
  if (!messages[chatId]) messages[chatId] = [];
  messages[chatId].push({ sender: currentUser.id, text, time: Date.now() });
  res.json({ success: true });
});

// Édition du Profil
app.put('/api/profile', (req, res) => {
  if (!currentUser) return res.sendStatus(401);
  const { name, age, photo, bio } = req.body;
  currentUser.name = name;
  currentUser.age = age;
  currentUser.photo = photo;
  currentUser.bio = bio;
  res.json({ success: true, currentUser });
});

app.post('/api/pay-manual', (req, res) => {
  const { phone, ref } = req.body;
  if (currentUser) {
    currentUser.paymentPending = true;
    console.log(`[M-PESA] Paiement reçu sur +243815628477 | Numéro: ${phone} | Ref: ${ref}`);
    setTimeout(() => {
      currentUser.isVip = true;
      currentUser.paymentPending = false;
    }, 5000);
  }
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Serveur prêt sur http://localhost:${PORT}`));