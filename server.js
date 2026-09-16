const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // <-- CORRIGÉ ICI : sert les fichiers directement depuis la racine

// Configuration des sessions
const sessionMiddleware = session({
    secret: 'masolo-congo-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
});

app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Base de données en mémoire
let users = [
  { id: 1, name: 'Julie', age: 24, gender: 'Femme', seeking: 'Homme', city: 'Kinshasa', country: 'RDC', phone: '+243810000001', email: 'julie@masolo.cd', password: 'password123', bio: 'Passionnée de voyages et de café ☕', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500', isVip: true, vipPlan: '1 an', role: 'member', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2, name: 'Thomas', age: 27, gender: 'Homme', seeking: 'Femme', city: 'Lubumbashi', country: 'RDC', phone: '+243820000002', email: 'thomas@masolo.cd', password: 'password123', bio: 'Développeur et fan de randonnée 🏔️', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', isVip: false, vipPlan: null, role: 'member', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 3, name: 'Admin Masolo', age: 35, gender: 'Homme', seeking: '', city: 'Kinshasa', country: 'RDC', phone: '+243815628477', email: 'admin@masolo.cd', password: 'adminpassword', bio: 'Administrateur système', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500', isVip: true, vipPlan: '1 an', role: 'admin', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' }
];

let likes = [];
let matches = [];
let messages = [];
let pendingPayments = [
  { id: 101, userId: 2, userName: 'Thomas', formula: '5 mois (20 USD)', amount: '20 USD', operator: 'M-Pesa', phone: '+24381****002', ref: 'MP26.1234.ABCD', date: '2026-09-16 12:00', status: 'pending' }
];

// Routes API Backend
app.get('/api/state', (req, res) => {
  let currentUser = users.find(u => u.id === req.session.userId) || null;
  let enhancedUser = null;
  
  if (currentUser) {
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
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  req.session.userId = newUser.id;
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.post('/api/like', (req, res) => {
  const userId = req.session.userId;
  const { targetId } = req.body;
  if(!userId) return res.sendStatus(401);

  likes.push({ fromUserId: userId, toUserId: targetId });

  const mutualLike = likes.find(l => l.fromUserId === targetId && l.toUserId === userId);
  let matched = false;

  if(mutualLike) {
    matched = true;
    const matchExists = matches.some(m => m.users.includes(userId) && m.users.includes(targetId));
    if(!matchExists) {
      matches.push({
        matchId: 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        users: [userId, targetId]
      });
    }
  }

  res.json({ success: true, matched });
});

app.get('/api/matches', (req, res) => {
  const userId = req.session.userId;
  if(!userId) return res.sendStatus(401);

  const userMatches = matches.filter(m => m.users.includes(userId));
  const formattedMatches = userMatches.map(m => {
    const otherId = m.users.find(id => id !== userId);
    const otherUser = users.find(u => u.id === otherId);
    return { matchId: m.matchId, otherUser };
  });

  res.json({ matches: formattedMatches });
});

app.get('/api/messages/:matchId', (req, res) => {
  const { matchId } = req.params;
  const matchMessages = messages.filter(msg => msg.matchId === matchId);
  res.json({ messages: matchMessages });
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

io.on('connection', (socket) => {
  socket.on('joinMatch', (matchId) => {
    socket.join(matchId);
  });

  socket.on('sendMessage', (data) => {
    const sessionUser = socket.request.session.userId;
    if(!sessionUser) return;

    const newMessage = {
      matchId: data.matchId,
      senderId: sessionUser,
      text: data.text,
      time: new Date().toISOString()
    };

    messages.push(newMessage);
    io.to(data.matchId).emit('receiveMessage', newMessage);
  });
});

server.listen(PORT, () => console.log(`Serveur propre prêt sur le port ${PORT}`));
