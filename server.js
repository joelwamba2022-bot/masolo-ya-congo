const express = require('express');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration des sessions
app.use(session({
    secret: 'masolo-congo-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Base de données en mémoire (avec createdAt pour gérer l'essai gratuit de 3 jours)
let users = [
  { id: 1, name: 'Julie', age: 24, gender: 'Femme', seeking: 'Homme', city: 'Kinshasa', country: 'RDC', phone: '+243810000001', email: 'julie@masolo.cd', password: 'password123', bio: 'Passionnée de voyages et de café ☕', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500', isVip: true, vipPlan: '1 an', role: 'member', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2, name: 'Thomas', age: 27, gender: 'Homme', seeking: 'Femme', city: 'Lubumbashi', country: 'RDC', phone: '+243820000002', email: 'thomas@masolo.cd', password: 'password123', bio: 'Développeur et fan de randonnée 🏔️', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', isVip: false, vipPlan: null, role: 'member', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 3, name: 'Admin Masolo', age: 35, gender: 'Homme', seeking: '', city: 'Kinshasa', country: 'RDC', phone: '+243815628477', email: 'admin@masolo.cd', password: 'adminpassword', bio: 'Administrateur système', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500', isVip: true, vipPlan: '1 an', role: 'admin', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' }
];

let pendingPayments = [
  { id: 101, userId: 2, userName: 'Thomas', formula: '5 mois (20 USD)', amount: '20 USD', operator: 'M-Pesa', phone: '+24381****002', ref: 'MP26.1234.ABCD', date: '2026-09-16 12:00', status: 'pending' }
];

// Manifest PWA
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "Masolo-ya-Congo",
    "short_name": "MasoloCongo",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1b5e20",
    "theme_color": "#1b5e20",
    "icons": [
      { "src": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=192", "sizes": "192x192", "type": "image/jpeg" }
    ]
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`self.addEventListener('fetch', (e) => {});`);
});

// Page HTML principale
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Masolo-ya-Congo</title>
    <link rel="manifest" href="/manifest.json">
    <style>
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
        body { background: #f0f2f5; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .container { width: 100%; max-width: 420px; background: white; height: 100%; max-height: 100vh; display: flex; flex-direction: column; position: relative; }
        @media (min-width: 768px) { .container { height: 780px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); } }
        header { background: #1b5e20; color: white; padding: 15px; text-align: center; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .screen { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; }
        .btn { background: #1b5e20; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        input, select { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px; }
        label { font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 3px; text-align: left; }
        nav { display: flex; background: #fff; border-top: 1px solid #ddd; height: 60px; justify-content: space-around; align-items: center; }
        nav button { background: none; border: none; font-size: 0.75rem; cursor: pointer; color: #777; flex: 1; height: 100%; }
        nav button.active { color: #1b5e20; font-weight: bold; }
        .badge { font-size: 0.7rem; background: gold; color: #333; padding: 3px 6px; border-radius: 6px; font-weight: bold; }
        .profile-card { width: 100%; height: 320px; background-size: cover; background-position: center; border-radius: 8px; display: flex; flex-direction: column; justify-content: flex-end; color: white; padding: 15px; margin-bottom: 15px; }
        .pricing-card { background: #f9f9f9; border: 1px solid #1b5e20; padding: 10px; border-radius: 6px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <span>🇨🇩 Masolo-ya-Congo</span>
            <div id="headerRight"></div>
        </header>
        <div class="screen" id="mainScreen">Chargement...</div>
        <nav id="bottomNav" style="display:none;"></nav>
    </div>

    <script>
        let currentUser = null;
        let discoveryProfiles = [];
        let discIndex = 0;

        async function init() {
            try {
                let res = await fetch('/api/state');
                let data = await res.json();
                currentUser = data.currentUser;
                discoveryProfiles = data.discoveryProfiles;

                if (!currentUser) {
                    renderWelcome();
                    document.getElementById('bottomNav').style.display = 'none';
                    document.getElementById('headerRight').innerHTML = '';
                } else {
                    document.getElementById('bottomNav').style.display = 'flex';
                    let badge = currentUser.isVip ? '<span class="badge">VIP ✨</span>' : '<span class="badge" style="background:#ff9800;color:white;">Essai (3j)</span>';
                    if(currentUser.role === 'admin') badge += ' <span class="badge" style="background:#d32f2f;color:white;">ADMIN</span>';
                    document.getElementById('headerRight').innerHTML = badge;

                    // Si l'essai est expiré et non VIP, on force l'écran des tarifs
                    if(currentUser.trialExpired && currentUser.role !== 'admin') {
                        renderPricingLocked();
                    } else {
                        renderTab(currentUser.role === 'admin' ? 'admin' : 'discovery');
                    }
                }
            } catch (e) {
                console.error(e);
                document.getElementById('mainScreen').innerHTML = '<p style="color:red; text-align:center;">Erreur de connexion au serveur.</p>';
            }
        }

        function renderWelcome() {
            document.getElementById('mainScreen').innerHTML = `
                <div style="text-align:center; margin-top:auto; margin-bottom:auto;">
                    <h2 style="color: #1b5e20;">Bienvenue sur Masolo-ya-Congo 🇨🇩</h2>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 20px;">Le réseau de rencontres sécurisé en RDC (18+).<br><b>3 jours d'essai offerts !</b></p>
                    <button class="btn" onclick="renderRegister()">Créer un compte</button>
                    <button class="btn btn-secondary" onclick="renderLogin()">Se connecter</button>
                    <button class="btn btn-secondary" onclick="renderPricing()" style="margin-top:10px;">Voir les Tarifs M-Pesa 💎</button>
                </div>
            `;
        }

        function renderPricingLocked() {
            document.getElementById('bottomNav').style.display = 'none';
            document.getElementById('mainScreen').innerHTML = `
                <div style="text-align:center; padding-top:10px;">
                    <h3 style="color:#d32f2f;">⏳ Période d'essai expirée !</h3>
                    <p style="font-size:0.85rem; color:#555;">Vos 3 jours d'essai gratuits sont terminés. Abonnez-vous via M-Pesa pour continuer à profiter de l'application.</p>
                    <div class="pricing-card"><h4>1 Mois - 5 USD</h4><button class="btn" onclick="payModal('1 Mois', '5 USD')">Choisir</button></div>
                    <div class="pricing-card"><h4>5 Mois - 20 USD</h4><button class="btn" onclick="payModal('5 Mois', '20 USD')">Choisir</button></div>
                    <div class="pricing-card"><h4>1 An - 50 USD</h4><button class="btn" onclick="payModal('1 An', '50 USD')">Choisir</button></div>
                    <button class="btn btn-secondary" style="margin-top:20px; background:#d32f2f; color:white;" onclick="logout()">Se déconnecter</button>
                </div>
            `;
        }

        function renderPricing() {
            document.getElementById('mainScreen').innerHTML = `
                <div>
                    <button onclick="\${currentUser ? (currentUser.trialExpired ? 'renderPricingLocked()' : 'renderTab(\\'discovery\\')') : 'renderWelcome()'}" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:10px;">⬅ Retour</button>
                    <h3 style="color:#1b5e20;">Formules M-Pesa 💎</h3>
                    <div class="pricing-card"><h4>1 Mois - 5 USD</h4><button class="btn" onclick="payModal('1 Mois', '5 USD')">Choisir</button></div>
                    <div class="pricing-card"><h4>5 Mois - 20 USD</h4><button class="btn" onclick="payModal('5 Mois', '20 USD')">Choisir</button></div>
                    <div class="pricing-card"><h4>1 An - 50 USD</h4><button class="btn" onclick="payModal('1 An', '50 USD')">Choisir</button></div>
                </div>
            `;
        }

        function payModal(formula, price) {
            document.getElementById('mainScreen').innerHTML = `
                <div>
                    <button onclick="renderPricing()" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:10px;">⬅ Retour</button>
                    <h3>Paiement M-Pesa pour \${formula} (\${price})</h3>
                    <p style="font-size:0.85rem;">Envoyez l'argent au marchand : <strong>+243 81 56 28 477</strong></p>
                    <label>Votre Numéro M-Pesa :</label>
                    <input type="text" id="pPhone" placeholder="Ex: +243812345678" />
                    <label>Référence de transaction :</label>
                    <input type="text" id="pRef" placeholder="Ex: MP26.XXXX.YYYY" />
                    <button class="btn" onclick="submitPay('\${formula}', '\${price}')">Valider le paiement</button>
                </div>
            `;
        }

        async function submitPay(formula, amount) {
            let phone = document.getElementById('pPhone').value;
            let ref = document.getElementById('pRef').value;
            if(!phone || !ref) { alert('Remplissez tous les champs'); return; }
            let res = await fetch('/api/pay-submit', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ formula, amount, operator: 'M-Pesa', phone, ref })
            });
            let data = await res.json();
            if(data.success) { alert('Paiement soumis ! En attente de validation admin.'); init(); }
        }

        function renderRegister() {
            document.getElementById('mainScreen').innerHTML = `
                <div>
                    <button onclick="renderWelcome()" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:10px;">⬅ Retour</button>
                    <h3>Créer un compte (3 jours offerts)</h3>
                    <label>Prénom :</label><input type="text" id="rName" />
                    <label>Sexe :</label><select id="rGender"><option>Femme</option><option>Homme</option></select>
                    <label>Recherche :</label><select id="rSeeking"><option>Homme</option><option>Femme</option></select>
                    <label>Date de naissance (18+ min) :</label><input type="date" id="rDob" />
                    <label>Ville :</label><input type="text" id="rCity" value="Kinshasa" />
                    <label>Email / Téléphone :</label><input type="text" id="rEmail" />
                    <label>Mot de passe :</label><input type="password" id="rPass" />
                    <button class="btn" onclick="doRegister()">S'inscrire</button>
                </div>
            `;
        }

        async function doRegister() {
            let name = document.getElementById('rName').value;
            let gender = document.getElementById('rGender').value;
            let seeking = document.getElementById('rSeeking').value;
            let dob = document.getElementById('rDob').value;
            let city = document.getElementById('rCity').value;
            let email = document.getElementById('rEmail').value;
            let password = document.getElementById('rPass').value;

            if(!name || !dob || !email || !password) { alert('Tous les champs sont requis'); return; }
            let age = new Date().getFullYear() - new Date(dob).getFullYear();
            if(age < 18) { alert('Vous devez avoir au moins 18 ans.'); return; }

            let res = await fetch('/api/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name, gender, seeking, dob, city, email, password, age })
            });
            let data = await res.json();
            if(data.success) { init(); } else { alert(data.message); }
        }

        function renderLogin() {
            document.getElementById('mainScreen').innerHTML = `
                <div style="margin-top:auto; margin-bottom:auto;">
                    <button onclick="renderWelcome()" style="background:none; border:none; color:#1b5e20; font-weight:bold; cursor:pointer; margin-bottom:10px;">⬅ Retour</button>
                    <h3>Connexion</h3>
                    <label>Email ou Téléphone :</label><input type="text" id="lEmail" />
                    <label>Mot de passe :</label><input type="password" id="lPass" />
                    <button class="btn" onclick="doLogin()">Se connecter</button>
                </div>
            `;
        }

        async function doLogin() {
            let email = document.getElementById('lEmail').value;
            let password = document.getElementById('lPass').value;
            let res = await fetch('/api/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, password })
            });
            let data = await res.json();
            if(data.success) { init(); } else { alert('Identifiants incorrects'); }
        }

        function renderNav(active) {
            let nav = document.getElementById('bottomNav');
            if(currentUser.role === 'admin') {
                nav.innerHTML = `<button class="active">🛡️ Admin M-Pesa</button><button onclick="logout()">🚪 Quitter</button>`;
            } else {
                nav.innerHTML = `
                    <button onclick="renderTab('discovery')" class="\${active==='discovery'?'active':''}">🔥 Découvrir</button>
                    <button onclick="renderTab('pricing')" class="\${active==='pricing'?'active':''}">💎 VIP</button>
                    <button onclick="renderTab('profile')" class="\${active==='profile'?'active':''}">👤 Profil</button>
                `;
            }
        }

        function renderTab(tab) {
            renderNav(tab);
            let screen = document.getElementById('mainScreen');
            if(tab === 'discovery') {
                let filtered = discoveryProfiles.filter(u => u.id !== currentUser.id && u.role !== 'admin');
                if(discIndex >= filtered.length) discIndex = 0;
                if(filtered.length === 0) { screen.innerHTML = '<p style="text-align:center; margin-top:50px; color:#777;">Aucun profil disponible.</p>'; return; }
                let p = filtered[discIndex];
                screen.innerHTML = `
                    <div class="profile-card" style="background-image: url('\${p.photo}')">
                        <h2>\${p.name}, \${p.age} ans</h2>
                        <p>📍 \${p.city} • \${p.bio}</p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-secondary" onclick="discIndex++; renderTab('discovery')">❌ Passer</button>
                        <button class="btn" onclick="alert('Like !'); discIndex++; renderTab('discovery')">💖 J'aime</button>
                    </div>
                `;
            } else if(tab === 'pricing') {
                renderPricing();
            } else if(tab === 'profile') {
                screen.innerHTML = `
                    <div style="text-align:center; padding-top:20px;">
                        <img src="\${currentUser.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;" />
                        <h3>\${currentUser.name}</h3>
                        <p>Statut : \${currentUser.isVip ? 'VIP ('+currentUser.vipPlan+')' : 'Essai Gratuit (3 jours)'}</p>
                        <button class="btn" style="background:#d32f2f; margin-top:30px;" onclick="logout()">Se déconnecter</button>
                    </div>
                `;
            } else if(tab === 'admin') {
                loadAdminData();
            }
        }

        async function loadAdminData() {
            let res = await fetch('/api/admin/data');
            let data = await res.json();
            let html = '<h3>Panneau Administrateur</h3>';
            if(data.pendingPayments.length === 0) {
                html += '<p style="color:#777;">Aucun paiement M-Pesa en attente.</p>';
            } else {
                data.pendingPayments.forEach(p => {
                    html += `<div class="pricing-card">
                        <b>Utilisateur :</b> \${p.userName} (\${p.phone})<br>
                        <b>Formule :</b> \${p.formula} (\${p.amount})<br>
                        <b>Réf :</b> \${p.ref}<br>
                        <button class="btn" style="background:#2e7d32;" onclick="approve(\${p.id})">✅ Approuver VIP</button>
                    </div>`;
                });
            }
            document.getElementById('mainScreen').innerHTML = html;
        }

        async function approve(id) {
            await fetch('/api/admin/approve', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ paymentId: id })
            });
            alert('Paiement approuvé !');
            loadAdminData();
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST' });
            init();
        }

        init();
    </script>
</body>
</html>`);
});

// APIs Backend
app.get('/api/state', (req, res) => {
  let currentUser = users.find(u => u.id === req.session.userId) || null;
  let enhancedUser = null;
  
  if (currentUser) {
    // Calcul de la période d'essai de 3 jours
    const createdAt = new Date(currentUser.createdAt || Date.now());
    const now = new Date();
    const diffTime = now - createdAt;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const trialExpired = diffDays > 3 && !currentUser.isVip;

    enhancedUser = { ...currentUser, trialExpired };
  }

  res.json({ currentUser: enhancedUser, discoveryProfiles: users });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => (u.email === email || u.phone === email) && u.password === password);
  if (user) {
    req.session.userId = user.id;
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
    bio: 'Nouveau membre',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
    isVip: false,
    vipPlan: null,
    role: 'member',
    status: 'active',
    createdAt: new Date().toISOString() // Date exacte d'inscription pour l'essai de 3 jours
  };
  users.push(newUser);
  req.session.userId = newUser.id;
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.post('/api/pay-submit', (req, res) => {
  const { formula, amount, operator, phone, ref } = req.body;
  const user = users.find(u => u.id === req.session.userId);
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
  let paymentItem = pendingPayments.find(p => p.id === paymentId);
  if(paymentItem) {
    paymentItem.status = 'approved';
    let targetUser = users.find(u => u.id === paymentItem.userId);
    if(targetUser) {
      targetUser.isVip = true;
      targetUser.vipPlan = paymentItem.formula;
    }
    pendingPayments = pendingPayments.filter(p => p.id !== paymentId);
  }
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
