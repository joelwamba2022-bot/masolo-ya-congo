const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- BASE DE DONNÉES EN MÉMOIRE (ÉVOLUTIVE) ---
let users = [
  { id: 1, name: 'Julie', age: 24, gender: 'Femme', seeking: 'Homme', city: 'Kinshasa', country: 'RDC', phone: '+243810000001', email: 'julie@masolo.cd', password: 'password123', bio: 'Passionnée de voyages et de café ☕', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500', isVip: true, vipPlan: '1 an', role: 'member', status: 'active' },
  { id: 2, name: 'Thomas', age: 27, gender: 'Homme', seeking: 'Femme', city: 'Lubumbashi', country: 'RDC', phone: '+243820000002', email: 'thomas@masolo.cd', password: 'password123', bio: 'Développeur et fan de randonnée 🏔️', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', isVip: false, vipPlan: null, role: 'member', status: 'active' },
  { id: 3, name: 'Admin Masolo', age: 35, gender: 'Homme', seeking: '', city: 'Kinshasa', country: 'RDC', phone: '+243815628477', email: 'admin@masolo.cd', password: 'adminpassword', bio: 'Administrateur système', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500', isVip: true, vipPlan: '1 an', role: 'admin', status: 'active' }
];

let pendingPayments = [
  { id: 101, userId: 2, userName: 'Thomas', formula: '5 mois (20 USD)', amount: '20 USD', operator: 'M-Pesa', phone: '+24381****002', ref: 'MP26.1234.ABCD', date: '2026-09-16 12:00', status: 'pending' }
];

let matches = [
  { user1: 1, user2: 2, status: 'accepted' }
];

let messages = {
  '1_2': [
    { sender: 1, text: 'Mbote Thomas ! Comment ça va ?', time: '12:05' },
    { sender: 2, text: 'Mpova Julie ! Ça va super et toi ?', time: '12:06' }
  ]
};

// --- PWA MANIFEST & SERVICE WORKER ---
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "Masolo-ya-Congo",
    "short_name": "MasoloCongo",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1b5e20",
    "theme_color": "#1b5e20",
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

// --- ROUTE PRINCIPALE FRONT-END ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Masolo-ya-Congo</title>
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#1b5e20">
        <style>
            * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #f0f2f5; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
            .container { width: 100%; max-width: 420px; background: white; height: 100%; max-height: 100vh; display: flex; flex-direction: column; overflow: hidden; position: relative; }
            @media (min-width: 768px) { .container { height: 780px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #ddd; } }
            
            header { background: #1b5e20; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center; }
            .screen { flex: 1; display: flex; flex-direction: column; overflow-y: auto; position: relative; background: #fff; }
            
            .btn { background: #1b5e20; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px; text-align: center; }
            .btn-secondary { background: #f0f2f5; color: #333; border: 1px solid #ccc; }
            input, select, textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 8px; outline: none; }
            label { font-size: 0.85rem; font-weight: bold; color: #333; display: block; text-align: left; margin-bottom: 3px; }
            
            nav { display: flex; background: #fff; border-top: 1px solid #eee; height: 60px; justify-content: space-around; align-items: center; }
            nav button { background: none; border: none; font-size: 0.75rem; cursor: pointer; color: #777; flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
            nav button.active { color: #1b5e20; font-weight: bold; }

            .profile-card { width: 100%; height: 360px; border-radius: 12px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 15px; }
            .profile-info { background: linear-gradient(transparent, rgba(0,0,0,0.85)); color: white; padding: 20px; border-radius: 0 0 12px 12px; }
            .match-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
            .match-item img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-right: 15px; }

            .chat-messages { flex: 1; padding: 15px; overflow-y: auto; background: #fafafa; display: flex; flex-direction: column; gap: 10px; }
            .msg { padding: 10px 14px; border-radius: 15px; max-width: 75%; font-size: 0.9rem; }
            .msg.sent { background: #1b5e20; color: white; align-self: flex-end; }
            .msg.received { background: #e4e6eb; color: black; align-self: flex-start; }
            .chat-input-area { display: flex; padding: 10px; background: white; border-top: 1px solid #ddd; }
            
            .badge { font-size: 0.7rem; background: gold; color: #333; padding: 3px 8px; border-radius: 10px; font-weight: bold; }
            .admin-badge { background: #d32f2f; color: white; }
            .pricing-card { background: #f9f9f9; border: 2px solid #1b5e20; padding: 12px; border-radius: 10px; margin-bottom: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <span>🇨🇩 Masolo-ya-Congo</span>
                <div id="headerRight"></div>
            </header>

            <div class="screen" id="mainScreen"></div>
            <nav id="bottomNav" style="display:none;"></nav>
        </div>

        <script>
            let currentUser = null;
            let currentTab = 'welcome';
            let discoveryProfiles = [];
            let matchesList = [];
            let activeChatUser = null;

            async function init() {
                const res = await fetch('/api/state');
                const data = await res.json();
                currentUser = data.currentUser;
                discoveryProfiles = data.discoveryProfiles;
                matchesList = data.matchesList;

                if (!currentUser) {
                    renderWelcome();
                    document.getElementById('bottomNav').style.display = 'none';
                    document.getElementById('headerRight').innerHTML = '';
                } else {
                    document.getElementById('bottomNav').style.display = 'flex';
                    let badgeHtml = currentUser.isVip ? '<span class="badge">VIP ✨</span>' : '';
                    if (currentUser.role === 'admin') badgeHtml += ' <span class="badge admin-badge">ADMIN 🛡️</span>';
                    document.getElementById('headerRight').innerHTML = badgeHtml;
                    renderTab(currentUser.role === 'admin' ? 'admin' : 'discovery');
                }
            }

            function renderWelcome() {
                document.getElementById('mainScreen').innerHTML = \`
                    <div style="padding: 25px; text-align: center; display:flex; flex-direction:column; justify-content:center; height:100%;">
                        <h2 style="color: #1b5e20; margin-bottom: 5px;">Bienvenue sur Masolo-ya-Congo 🇨🇩</h2>
                        <p style="color: #666; font-size: 0.9rem; margin-bottom: 25px;">Le réseau de rencontres sécurisé en RDC.</p>
                        <div style="background:#e8f5e9; padding:15px; border-radius:10px; margin-bottom:20px; text-align:left; font-size:0.85rem; color:#2e7d32;">
                            🔒 <strong>Sécurité & Majorité :</strong> Réservé strictement aux personnes de 18 ans et plus.
                        </div>
                        <button class="btn" onclick="renderRegister()">Créer un compte</button>
                        <button class="btn btn-secondary" onclick="renderLogin()">Se connecter</button>
                        <button class="btn btn-secondary" onclick="renderPricing()" style="margin-top:15px;">Voir les Tarifs M-Pesa 💎</button>
                    </div>
                \`;
            }

            function renderPricing() {
                document.getElementById('mainScreen').innerHTML = \`
                    <div style="padding: 20px;">
                        <button onclick="\${currentUser ? 'renderTab(\\'discovery\\')' : 'renderWelcome()'}" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:10px;">⬅ Retour</button>
                        <h3 style="color:#1b5e20;">Formules d'Abonnement M-Pesa 💎</h3>
                        <p style="font-size:0.85rem; color:#666;">Paiement manuel sécurisé via M-Pesa.</p>
                        
                        <div class="pricing-card">
                            <h4 style="margin:0 0 5px 0; color:#1b5e20;">1 Mois</h4>
                            <p style="font-size:1.1rem; font-weight:bold; margin:5px 0;">5 USD</p>
                            <button class="btn" onclick="renderPaymentInstructions('1 Mois', '5 USD')">Choisir (5 USD)</button>
                        </div>

                        <div class="pricing-card">
                            <h4 style="margin:0 0 5px 0; color:#1b5e20;">5 Mois</h4>
                            <p style="font-size:1.1rem; font-weight:bold; margin:5px 0;">20 USD</p>
                            <button class="btn" onclick="renderPaymentInstructions('5 Mois', '20 USD')">Choisir (20 USD)</button>
                        </div>

                        <div class="pricing-card">
                            <h4 style="margin:0 0 5px 0; color:#1b5e20;">7 Mois</h4>
                            <p style="font-size:1.1rem; font-weight:bold; margin:5px 0;">30 USD</p>
                            <button class="btn" onclick="renderPaymentInstructions('7 Mois', '30 USD')">Choisir (30 USD)</button>
                        </div>

                        <div class="pricing-card">
                            <h4 style="margin:0 0 5px 0; color:#1b5e20;">1 An</h4>
                            <p style="font-size:1.1rem; font-weight:bold; margin:5px 0;">50 USD</p>
                            <button class="btn" onclick="renderPaymentInstructions('1 An', '50 USD')">Choisir (50 USD)</button>
                        </div>
                    </div>
                \`;
            }

            function renderPaymentInstructions(formula, price) {
                document.getElementById('mainScreen').innerHTML = \`
                    <div style="padding: 20px;">
                        <button onclick="renderPricing()" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:10px;">⬅ Retour</button>
                        <h3 style="color:#1b5e20;">Instructions de Paiement M-Pesa 🟢</h3>
                        <p style="font-size:0.85rem;">Formule choisie : <strong>\${formula}</strong> (\${price})</p>
                        
                        <div style="background:#e8f5e9; border:1px solid #34a853; padding:12px; border-radius:8px; font-size:0.85rem; margin-bottom:15px;">
                            <strong>Opérateur :</strong> M-Pesa uniquement<br>
                            <strong>Numéro Marchand / Bénéficiaire :</strong> +243 81 56 28 477<br>
                            <strong>Nom :</strong> Masolo Congo SARL<br>
                            ⚠️ <em>Ne communiquez jamais votre code PIN secret !</em>
                        </div>

                        <label>Votre numéro M-Pesa payeur :</label>
                        <input type="text" id="payPhone" placeholder="Ex: +243812345678" />

                        <label>Référence de transaction M-Pesa :</label>
                        <input type="text" id="payRef" placeholder="Ex: MP26.XXXX.YYYY" />

                        <button class="btn" onclick="submitPayment('\${formula}', '\${price}')">Soumettre pour vérification</button>
                    </div>
                \`;
            }

            async function submitPayment(formula, price) {
                const phone = document.getElementById('payPhone').value;
                const ref = document.getElementById('payRef').value;
                if(!phone || !ref) { alert('Veuillez remplir tous les champs de paiement.'); return; }

                const res = await fetch('/api/pay-submit', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ formula, amount: price, operator: 'M-Pesa', phone, ref })
                });
                const data = await res.json();
                if(data.success) {
                    alert('Paiement M-Pesa soumis avec succès ! En attente de validation par l\'administrateur.');
                    init();
                }
            }

            function renderRegister() {
                document.getElementById('mainScreen').innerHTML = \`
                    <div style="padding: 20px;">
                        <button onclick="renderWelcome()" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:10px;">⬅ Retour</button>
                        <h3>Créer un compte 🚀</h3>
                        <label>Prénom / Pseudonyme :</label>
                        <input type="text" id="regName" placeholder="Ex: Chantal" />
                        <label>Sexe :</label>
                        <select id="regGender"><option>Femme</option><option>Homme</option></select>
                        <label>Je recherche :</label>
                        <select id="regSeeking"><option>Homme</option><option>Femme</option><option>Les deux</option></select>
                        <label>Date de naissance (Contrôle 18 ans min) :</label>
                        <input type="date" id="regDob" />
                        <label>Ville & Pays :</label>
                        <input type="text" id="regCity" placeholder="Kinshasa, RDC" />
                        <label>Téléphone ou Email :</label>
                        <input type="text" id="regEmail" placeholder="0812345678 ou email@domaine.com" />
                        <label>Mot de passe :</label>
                        <input type="password" id="regPass" placeholder="Mot de passe sécurisé" />
                        <div style="font-size:0.75rem; color:#666; margin:10px 0;">
                            <input type="checkbox" id="regTerms" /> J'accepte les conditions d'utilisation et certifie être majeur(e).
                        </div>
                        <button class="btn" onclick="registerUser()">S'inscrire</button>
                    </div>
                \`;
            }

            async function registerUser() {
                const name = document.getElementById('regName').value;
                const gender = document.getElementById('regGender').value;
                const seeking = document.getElementById('regSeeking').value;
                const dob = document.getElementById('regDob').value;
                const city = document.getElementById('regCity').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPass').value;
                const terms = document.getElementById('regTerms').checked;

                if(!name || !dob || !email || !password) { alert('Veuillez remplir tous les champs.'); return; }
                if(!terms) { alert('Vous devez accepter les conditions.'); return; }

                const birthYear = new Date(dob).getFullYear();
                const currentYear = new Date().getFullYear();
                if(currentYear - birthYear < 18) {
                    alert('Accès refusé : Vous devez avoir au moins 18 ans.');
                    return;
                }

                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name, gender, seeking, dob, city, email, password, age: currentYear - birthYear })
                });
                const data = await res.json();
                if(data.success) { init(); } else { alert(data.message); }
            }

            function renderLogin() {
                document.getElementById('mainScreen').innerHTML = \`
                    <div style="padding: 25px; display:flex; flex-direction:column; justify-content:center; height:100%;">
                        <button onclick="renderWelcome()" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:15px; text-align:left;">⬅ Retour</button>
                        <h3>Connexion 👋</h3>
                        <label>Téléphone ou Email :</label>
                        <input type="text" id="loginEmail" placeholder="Votre email ou téléphone" />
                        <label>Mot de passe :</label>
                        <input type="password" id="loginPass" placeholder="Votre mot de passe" />
                        <button class="btn" onclick="loginUser()">Se connecter</button>
                    </div>
                \`;
            }

            async function loginUser() {
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPass').value;
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if(data.success) { init(); } else { alert('Identifiants incorrects.'); }
            }

            function renderNav(active) {
                const nav = document.getElementById('bottomNav');
                if(currentUser.role === 'admin') {
                    nav.innerHTML = \`
                        <button onclick="renderTab('admin')" class="\${active==='admin'?'active':''}">🛡️ <span>Admin M-Pesa</span></button>
                        <button onclick="logout()">🚪 <span>Quitter</span></button>
                    \`;
                } else {
                    nav.innerHTML = \`
                        <button onclick="renderTab('discovery')" class="\${active==='discovery'?'active':''}">🔥 <span>Découvrir</span></button>
                        <button onclick="renderTab('matches')" class="\${active==='matches'?'active':''}">💬 <span>Masolo</span></button>
                        <button onclick="renderTab('pricing')" class="\${active==='pricing'?'active':''}">💎 <span>M-Pesa VIP</span></button>
                        <button onclick="renderTab('profile')" class="\${active==='profile'?'active':''}">👤 <span>Profil</span></button>
                    \`;
                }
            }

            let discIndex = 0;
            function renderTab(tab) {
                currentTab = tab;
                activeChatUser = null;
                renderNav(tab);
                const screen = document.getElementById('mainScreen');

                if(tab === 'discovery') {
                    let filtered = discoveryProfiles.filter(p => p.id !== currentUser.id && p.role !== 'admin');
                    if(discIndex >= filtered.length) discIndex = 0;
                    if(filtered.length === 0) {
                        screen.innerHTML = '<div style="padding:40px; text-align:center; color:#777;">Aucun autre profil pour le moment.</div>';
                        return;
                    }
                    let p = filtered[discIndex];
                    screen.innerHTML = \`
                        <div style="padding:15px; display:flex; flex-direction:column; height:100%;">
                            <div class="profile-card" style="background-image: url('\${p.photo}')">
                                <div class="profile-info">
                                    <h2 style="margin:0;">\${p.name}, \${p.age} ans</h2>
                                    <p style="margin:5px 0 0 0; font-size:0.85rem;">📍 \${p.city} • \${p.bio}</p>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-around; gap:10px;">
                                <button class="btn" style="background:#fff; color:#d32f2f; border:1px solid #d32f2f;" onclick="nextProfile()">❌ Passer</button>
                                <button class="btn" style="background:#1b5e20;" onclick="sendLike()">💖 J'aime</button>
                            </div>
                        </div>
                    \`;
                }
                else if(tab === 'matches') {
                    let html = '<div style="padding:15px;"><h3>Mes Conversations (Masolo) 💬</h3>';
                    let myMatches = discoveryProfiles.filter(u => u.id !== currentUser.id && u.role !== 'admin');
                    if(myMatches.length === 0) html += '<p style="color:#777;">Aucune conversation pour l\'instant.</p>';
                    else myMatches.forEach(m => {
                        html += \`<div class="match-item" onclick="openChat(\${m.id})">
                            <img src="\${m.photo}" />
                            <div><strong>\${m.name}</strong><br><small style="color:#777;">Cliquez pour discuter...</small></div>
                        </div>\`;
                    });
                    screen.innerHTML = html + '</div>';
                }
                else if(tab === 'pricing') {
                    renderPricing();
                }
                else if(tab === 'profile') {
                    screen.innerHTML = \`
                        <div style="padding:20px;">
                            <h3>Mon Profil 👤</h3>
                            <img src="\${currentUser.photo}" style="width:90px; height:90px; border-radius:50%; object-fit:cover; display:block; margin:0 auto 15px auto;" />
                            <p style="text-align:center;"><strong>\${currentUser.name}</strong></p>
                            <p style="text-align:center; font-size:0.85rem; color:#666;">Statut VIP : \${currentUser.isVip ? 'Actif ('+currentUser.vipPlan+') ✨' : 'Gratuit'}</p>
                            <button class="btn" style="background:#d32f2f; margin-top:20px;" onclick="logout()">Se déconnecter</button>
                        </div>
                    \`;
                }
                else if(tab === 'admin') {
                    renderAdminDashboard();
                }
            }

            function nextProfile() { discIndex++; renderTab('discovery'); }
            function sendLike() { alert('Like envoyé !'); nextProfile(); }

            function openChat(targetId) {
                activeChatUser = discoveryProfiles.find(u => u.id === targetId);
                const screen = document.getElementById('mainScreen');
                screen.innerHTML = \`
                    <div style="display:flex; flex-direction:column; height:100%;">
                        <div style="background:#f5f5f5; padding:10px 15px; display:flex; align-items:center; gap:10px; border-bottom:1px solid #ddd;">
                            <button onclick="renderTab('matches')" style="background:none; border:none; font-weight:bold; cursor:pointer;">⬅</button>
                            <img src="\${activeChatUser.photo}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;" />
                            <strong>\${activeChatUser.name}</strong>
                        </div>
                        <div class="chat-messages" id="chatBox">
                            <div class="msg received">Mbote ! Heureux de discuter sur Masolo-ya-Congo.</div>
                        </div>
                        <div class="chat-input-area">
                            <input type="text" id="msgInput" placeholder="Écrivez votre message..." />
                            <button class="btn" style="width:auto; margin:0; padding:8px 15px;" onclick="sendMsg()">Envoyer</button>
                        </div>
                    </div>
                \`;
            }

            function sendMsg() {
                const txt = document.getElementById('msgInput').value;
                if(!txt) return;
                const box = document.getElementById('chatBox');
                box.innerHTML += \`<div class="msg sent">\${txt}</div>\`;
                document.getElementById('msgInput').value = '';
                box.scrollTop = box.scrollHeight;
            }

            async function renderAdminDashboard() {
                const res = await fetch('/api/admin/data');
                const data = await res.json();
                let paymentsHtml = '';
                data.pendingPayments.forEach(p => {
                    paymentsHtml += \`
                        <div style="background:#f9f9f9; border:1px solid #ddd; padding:12px; border-radius:8px; margin-bottom:10px; font-size:0.85rem;">
                            <strong>Membre :</strong> \${p.userName} (<span style="color:#1b5e20;">\${p.phone}</span>)<br>
                            <strong>Formule M-Pesa :</strong> \${p.formula} (<span style="color:blue;">\${p.amount}</span>)<br>
                            <strong>Réf M-Pesa :</strong> \${p.ref}<br>
                            <button class="btn" style="background:#34a853; padding:8px; font-size:0.85rem; margin-top:8px;" onclick="approvePayment(\${p.id})">✅ Approuver et Activer VIP</button>
                        </div>
                    \`;
                });

                document.getElementById('mainScreen').innerHTML = \`
                    <div style="padding:20px;">
                        <h3>Panneau Administrateur M-Pesa 🛡️</h3>
                        <p style="font-size:0.85rem; color:#666;">Validation des paiements manuels M-Pesa pour activation des abonnements.</p>
                        <h4 style="color:#1b5e20; margin-top:15px;">Paiements en attente :</h4>
                        \${paymentsHtml || '<p style="font-size:0.85rem; color:#777;">Aucun paiement en attente pour le moment.</p>'}
                    </div>
                \`;
            }

            async function approvePayment(id) {
                const res = await fetch('/api/admin/approve', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ paymentId: id })
                });
                const data = await res.json();
                if(data.success) { alert('Paiement M-Pesa approuvé ! Abonnement VIP activé.'); renderAdminDashboard(); }
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
  let currentUser = users.find(u => u.id === req.sessionUserId) || null;
  res.json({ currentUser, discoveryProfiles: users, matchesList: matches });
});

let currentSessionId = 1;
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => (u.email === email || u.phone === email) && u.password === password);
  if (user) {
    req.sessionUserId = user.id;
    currentSessionId = user.id;
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/register', (req, res) => {
  const { name, gender, seeking, dob, city, email, password, age } = req.body;
  if(users.some(u => u.email === email || u.phone === email)) {
    return res.json({ success: false, message: 'Cet email ou téléphone est déjà utilisé.' });
  }
  const newUser = {
    id: users.length + 1,
    name, gender, seeking, dob, city, email, password, age,
    phone: email,
    bio: 'Nouveau membre sur Masolo-ya-Congo',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
    isVip: false,
    vipPlan: null,
    role: 'member',
    status: 'active'
  };
  users.push(newUser);
  req.sessionUserId = newUser.id;
  currentSessionId = newUser.id;
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  req.sessionUserId = null;
  currentSessionId = null;
  res.json({ success: true });
});

app.post('/api/pay-submit', (req, res) => {
  const { formula, amount, operator, phone, ref } = req.body;
  const user = users.find(u => u.id === currentSessionId);
  if(!user) return res.sendStatus(401);

  pendingPayments.push({
    id: Date.now(),
    userId: user.id,
    userName: user.name,
    formula, amount, operator, phone, ref,
    date: new Date().toISOString(),
    status: 'pending'
  });
  res.json({ success: true });
});

app.get('/api/admin/data', (req, res) => {
  res.json({ pendingPayments });
});

app.post('/api/admin/approve', (req, res) => {
  const { paymentId } = req.body;
  const pay = pendingPayments.find(p => p.id === paymentId);
  if(pay) {
    pay.status = 'approved';
    const targetUser = users.find(u => u.id === pay.userId);
    if(targetUser) {
      targetUser.isVip = true;
      targetUser.vipPlan = pay.formula;
    }
    pendingPayments = pendingPayments.filter(p => p.id !== paymentId);
  }
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Masolo-ya-Congo mis à jour et actif sur le port ${PORT}`));
