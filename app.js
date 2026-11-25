// ==========================================
// GENERAR DESTELLOS DE PISTA DE DISCOTECA
// ==========================================
function initDiscoSparkles() {
  const container = document.getElementById('disco-sparkles');
  if (!container) return;
  const colors = ['#ffffff', '#ec4899', '#06b6d4', '#fbbf24', '#c084fc'];
  for (let i = 0; i < 42; i++) {
    const dot = document.createElement('span');
    dot.className = 'sparkle-dot';
    const size = Math.random() * 4 + 2;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.top = `${Math.random() * 100}%`;
    dot.style.backgroundColor = colors[i % colors.length];
    dot.style.boxShadow = `0 0 8px ${colors[i % colors.length]}`;
    dot.style.setProperty('--dur', `${(Math.random() * 2.5 + 1.5).toFixed(2)}s`);
    dot.style.setProperty('--delay', `${(Math.random() * 3).toFixed(2)}s`);
    container.appendChild(dot);
  }
}
initDiscoSparkles();

function triggerDiscoPartyBoost(durationMs = 2200) {
  const bg = document.getElementById('disco-bg');
  if (!bg) return;
  bg.classList.add('party-boost');
  setTimeout(() => bg.classList.remove('party-boost'), durationMs);
}

// ==========================================
// SISTEMA DE CONFETI VISUAL (CANVAS)
// ==========================================
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimId = null;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

function launchConfetti(count = 75) {
  const colors = ['#fbbf24', '#ec4899', '#06b6d4', '#10b981', '#a855f7', '#ffffff'];
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height * 0.35 - 40,
      w: Math.random() * 9 + 5,
      h: Math.random() * 5 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2.5,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 10,
      life: 120 + Math.random() * 40
    });
  }
  if (!confettiAnimId) animateConfetti();
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.angle += p.spin;
    p.life--;

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.angle * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });

  confettiParticles = confettiParticles.filter(p => p.life > 0 && p.y < confettiCanvas.height + 20);
  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ==========================================
// AVATARES Y DETECCIÓN DE ROL (HOST VS CELULAR)
// ==========================================
const AVATAR_OPTIONS = [
  '🎸', '🎧', '🎤', '🎹', '🥁', '🎷', '🎺', '🎻',
  '🦦', '🦊', '🚀', '🔥', '⚡', '👑', '👾', '🦄'
];

const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');

if (roomParam) {
  document.getElementById('host-app').style.display = 'none';
  document.getElementById('client-app').style.display = 'block';
  initClientMode(roomParam.trim());
} else {
  initHostMode();
}

// ============================================================================
// PARTE A: LÓGICA DEL ANFITRIÓN (PC / TV)
// ============================================================================
function initHostMode() {
  const state = {
    phase: 'setup', // 'setup' | 'music' | 'game' | 'results'
    mode: 'solo',   // 'solo' | 'team'
    participants: [
      { name: 'Jugador 1', avatar: '🎸', members: [''], score: 0, peerIds: [] },
      { name: 'Jugador 2', avatar: '🎧', members: [''], score: 0, peerIds: [] }
    ],
    hasRemotePlayers: false,
    tracks: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: '',
      url: null,
      startSec: 0,
      isDemo: false
    })),
    clipDuration: 6,
    cards: [],
    flippedCards: [],
    lockBoard: false,
    currentTurnIndex: 0,
    pairsFound: 0,
    attempts: 0,
    secondsElapsed: 0,
    timerInterval: null
  };

  // PeerJS (Servidor de señalización gratuito en nube para conectar QR con celulares)
  const roomShortCode = 'MM-' + Math.floor(1000 + Math.random() * 9000);
  const peer = new Peer(roomShortCode);
  const connectedPeers = new Map(); // peerId -> conn

  peer.on('open', (id) => {
    document.getElementById('room-code-text').textContent = id;
    document.getElementById('host-conn-status').textContent = '🟢 Sala lista para escanear QR';

    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(id)}`;
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: joinUrl,
      width: 132,
      height: 132,
      colorDark: '#0c0418',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });

    document.getElementById('btn-copy-link').onclick = () => {
      navigator.clipboard.writeText(joinUrl).then(() => {
        const btn = document.getElementById('btn-copy-link');
        btn.textContent = '✅ ¡Copiado!';
        setTimeout(() => (btn.textContent = '🔗 Copiar enlace'), 2000);
      });
    };
  });

  peer.on('error', () => {
    document.getElementById('host-conn-status').textContent = '⚠️ Sin conexión P2P (modo local activo)';
  });

  peer.on('connection', (conn) => {
    connectedPeers.set(conn.peer, conn);

    conn.on('open', () => {
      sendSyncToClient(conn);
    });

    conn.on('data', (msg) => {
      handleClientMessage(conn, msg);
    });

    conn.on('close', () => {
      connectedPeers.delete(conn.peer);
    });
  });

  function broadcastState() {
    connectedPeers.forEach((conn) => {
      if (conn.open) sendSyncToClient(conn);
    });
  }

  function sendSyncToClient(conn) {
    // Determinar a qué slot de participante pertenece este celular
    const slotIndex = state.participants.findIndex((p) => p.peerIds && p.peerIds.includes(conn.peer));

    const payload = {
      type: 'SYNC',
      phase: state.phase,
      mode: state.mode,
      slotIndex,
      participants: state.participants.map((p) => ({
        name: p.name,
        avatar: p.avatar,
        members: p.members,
        score: p.score || 0
      })),
      currentTurnIndex: state.currentTurnIndex,
      lockBoard: state.lockBoard,
      cards: state.cards.map((c, idx) => ({
        matched: c.matched,
        selected: state.flippedCards.some((f) => f.index === idx)
      }))
    };
    conn.send(payload);
  }

  function handleClientMessage(conn, msg) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'JOIN') {
      const cleanName = (msg.name || 'Invitado').trim().slice(0, 18);
      const avatar = AVATAR_OPTIONS.includes(msg.avatar) ? msg.avatar : '🎸';

      // Si es la primera conexión remota y aún estaban los placeholders por defecto, limpiar placeholders vacíos
      if (!state.hasRemotePlayers) {
        state.hasRemotePlayers = true;
        if (state.mode === 'solo') {
          state.participants = [];
        } else {
          state.participants = [];
        }
      }

      if (state.mode === 'solo') {
        // Verificar si este peer ya estaba registrado
        const existingIdx = state.participants.findIndex((p) => p.peerIds.includes(conn.peer));
        if (existingIdx !== -1) {
          state.participants[existingIdx].name = cleanName;
          state.participants[existingIdx].avatar = avatar;
        } else {
          if (state.participants.length >= 4) {
            conn.send({ type: 'ERROR', message: 'La sala ya alcanzó el máximo de 4 jugadores.' });
            return;
          }
          state.participants.push({
            name: cleanName,
            avatar,
            members: [''],
            score: 0,
            peerIds: [conn.peer]
          });
        }
      } else {
        // Modo equipos (0 a 3)
        const teamIdx = Math.max(0, Math.min(3, parseInt(msg.teamIndex, 10) || 0));
        while (state.participants.length <= teamIdx) {
          const n = state.participants.length + 1;
          state.participants.push({
            name: `Equipo ${n}`,
            avatar: AVATAR_OPTIONS[(n + 1) % AVATAR_OPTIONS.length],
            members: ['', ''],
            score: 0,
            peerIds: []
          });
        }
        const team = state.participants[teamIdx];
        if (!team.peerIds.includes(conn.peer)) {
          if (team.peerIds.length >= 2) {
            conn.send({ type: 'ERROR', message: 'Ese equipo ya tiene sus 2 integrantes conectados.' });
            return;
          }
          team.peerIds.push(conn.peer);
          if (!team.members[0]) team.members[0] = cleanName;
          else team.members[1] = cleanName;
        }
        team.avatar = avatar;
        if (msg.teamName && msg.teamName.trim()) {
          team.name = msg.teamName.trim().slice(0, 20);
        }
      }

      renderParticipants();
      broadcastState();
    }

    if (msg.type === 'PICK_CARD') {
      if (state.phase !== 'game' || state.lockBoard) return;
      const slotIndex = state.participants.findIndex((p) => p.peerIds && p.peerIds.includes(conn.peer));
      if (slotIndex === -1 || slotIndex !== state.currentTurnIndex) return;

      const cardIdx = parseInt(msg.index, 10);
      if (cardIdx >= 0 && cardIdx < 20) {
        const cardBtn = document.querySelector(`.memory-card[data-index="${cardIdx}"]`);
        if (cardBtn) handleCardClick(cardIdx, cardBtn);
      }
    }
  }

  // Audio y Web Audio API (Anfitrión)
  const audioPlayer = new Audio();
  let clipTimeout = null;
  let audioCtx = null;
  let activeDemoNodes = [];

  function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  const screens = {
    setup: document.getElementById('screen-setup'),
    music: document.getElementById('screen-music'),
    game: document.getElementById('screen-game'),
    results: document.getElementById('screen-results')
  };

  function showScreen(name) {
    state.phase = name;
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
    broadcastState();
  }

  // Pantalla 1: Configuración
  const participantsContainer = document.getElementById('participants-container');
  const btnAddParticipant = document.getElementById('btn-add-participant');

  document.querySelectorAll('#host-app .mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#host-app .mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      state.hasRemotePlayers = false;

      if (state.mode === 'solo') {
        state.participants = [
          { name: 'Jugador 1', avatar: '🎸', members: [''], score: 0, peerIds: [] },
          { name: 'Jugador 2', avatar: '🎧', members: [''], score: 0, peerIds: [] }
        ];
      } else {
        state.participants = [
          { name: 'Equipo 1', avatar: '🔥', members: ['Integrante 1', 'Integrante 2'], score: 0, peerIds: [] },
          { name: 'Equipo 2', avatar: '⚡', members: ['Integrante 1', 'Integrante 2'], score: 0, peerIds: [] }
        ];
      }
      renderParticipants();
      broadcastState();
    });
  });

  function renderParticipants() {
    participantsContainer.innerHTML = '';
    state.participants.forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'participant-item';

      const remoteCount = p.peerIds ? p.peerIds.length : 0;
      const remoteTag = remoteCount > 0 ? `<span class="remote-badge">📱 ${remoteCount} conectado${remoteCount > 1 ? 's' : ''}</span>` : '';

      const label = state.mode === 'solo'
        ? `${p.avatar} Participante ${idx + 1} ${remoteTag}`
        : `${p.avatar} Equipo ${idx + 1} ${remoteTag}`;

      const removeBtn = state.participants.length > 1
        ? `<button type="button" class="btn danger-text" data-remove="${idx}">✕ Quitar</button>`
        : '';

      const avatarsHtml = AVATAR_OPTIONS.map((av) => `
        <button type="button" class="avatar-option ${p.avatar === av ? 'selected' : ''}"
                data-avatar-idx="${idx}" data-avatar-val="${av}">${av}</button>
      `).join('');

      const inputsHtml = state.mode === 'solo'
        ? `<input type="text" value="${p.name}" placeholder="Nombre del jugador" data-name-idx="${idx}" />`
        : `<div class="inputs-grid">
             <input type="text" value="${p.name}" placeholder="Nombre del equipo" data-name-idx="${idx}" />
             <input type="text" value="${p.members[0] || ''}" placeholder="Integrante 1" data-member-idx="${idx}" data-m-pos="0" />
             <input type="text" value="${p.members[1] || ''}" placeholder="Integrante 2" data-member-idx="${idx}" data-m-pos="1" />
           </div>`;

      div.innerHTML = `
        <div class="participant-header">
          <span>${label}</span>
          ${removeBtn}
        </div>
        <div class="avatar-picker">
          <span class="avatar-picker-label">Avatar:</span>
          ${avatarsHtml}
        </div>
        ${inputsHtml}
      `;
      participantsContainer.appendChild(div);
    });

    // Eventos delegados
    participantsContainer.querySelectorAll('[data-remove]').forEach((b) => {
      b.onclick = () => {
        state.participants.splice(parseInt(b.dataset.remove, 10), 1);
        renderParticipants();
        broadcastState();
      };
    });

    participantsContainer.querySelectorAll('[data-avatar-idx]').forEach((b) => {
      b.onclick = () => {
        state.participants[parseInt(b.dataset.avatarIdx, 10)].avatar = b.dataset.avatarVal;
        renderParticipants();
        broadcastState();
      };
    });

    participantsContainer.querySelectorAll('[data-name-idx]').forEach((inp) => {
      inp.oninput = () => {
        state.participants[parseInt(inp.dataset.nameIdx, 10)].name = inp.value;
      };
    });

    participantsContainer.querySelectorAll('[data-member-idx]').forEach((inp) => {
      inp.oninput = () => {
        state.participants[parseInt(inp.dataset.memberIdx, 10)].members[parseInt(inp.dataset.mPos, 10)] = inp.value;
      };
    });

    btnAddParticipant.style.display = state.participants.length >= 4 ? 'none' : 'inline-flex';
  }

  btnAddParticipant.addEventListener('click', () => {
    if (state.participants.length >= 4) return;
    const num = state.participants.length + 1;
    const defaultAvatar = AVATAR_OPTIONS[(num + 1) % AVATAR_OPTIONS.length];
    if (state.mode === 'solo') {
      state.participants.push({ name: `Jugador ${num}`, avatar: defaultAvatar, members: [''], score: 0, peerIds: [] });
    } else {
      state.participants.push({ name: `Equipo ${num}`, avatar: defaultAvatar, members: ['Integrante 1', 'Integrante 2'], score: 0, peerIds: [] });
    }
    renderParticipants();
    broadcastState();
  });

  document.getElementById('btn-to-music').addEventListener('click', () => {
    if (state.participants.length === 0) {
      state.participants.push({ name: 'Jugador 1', avatar: '🎸', members: [''], score: 0, peerIds: [] });
    }
    state.participants.forEach((p, i) => {
      if (!p.name.trim()) p.name = state.mode === 'solo' ? `Jugador ${i + 1}` : `Equipo ${i + 1}`;
      if (state.mode === 'team') {
        p.members[0] = (p.members[0] || '').trim() || 'Integrante 1';
        p.members[1] = (p.members[1] || '').trim() || 'Integrante 2';
      }
    });
    renderTracksAdmin();
    showScreen('music');
  });

  // Pantalla 2: Música (Anfitrión)
  const tracksList = document.getElementById('tracks-list');
  const musicError = document.getElementById('music-error');

  function renderTracksAdmin() {
    tracksList.innerHTML = '';
    state.tracks.forEach((track, idx) => {
      const isReady = Boolean(track.url || track.isDemo);
      const row = document.createElement('div');
      row.className = `track-row ${isReady ? 'ready' : ''}`;
      row.innerHTML = `
        <div class="track-num">#${idx + 1}</div>
        <div class="track-info">
          <span class="track-name">${track.title || 'Sin canción asignada'}</span>
          <label class="btn small secondary" style="width: fit-content;">
            📁 Elegir MP3
            <input type="file" accept="audio/*" hidden data-single-upload="${idx}" />
          </label>
        </div>
        <div class="track-start-wrap">
          <span>Inicio (s):</span>
          <input type="number" min="0" max="600" value="${track.startSec}" data-start-idx="${idx}" />
        </div>
        <button type="button" class="btn small secondary" ${!isReady ? 'disabled' : ''} data-preview-idx="${idx}">
          ▶ Probar
        </button>
      `;
      tracksList.appendChild(row);
    });

    tracksList.querySelectorAll('[data-single-upload]').forEach((inp) => {
      inp.onchange = () => {
        const idx = parseInt(inp.dataset.singleUpload, 10);
        const file = inp.files[0];
        if (!file) return;
        if (state.tracks[idx].url) URL.revokeObjectURL(state.tracks[idx].url);
        state.tracks[idx] = {
          id: idx + 1,
          title: file.name.replace(/\.[^/.]+$/, ''),
          url: URL.createObjectURL(file),
          startSec: state.tracks[idx].startSec || 0,
          isDemo: false
        };
        musicError.textContent = '';
        renderTracksAdmin();
      };
    });

    tracksList.querySelectorAll('[data-start-idx]').forEach((inp) => {
      inp.onchange = () => {
        state.tracks[parseInt(inp.dataset.startIdx, 10)].startSec = Math.max(0, parseInt(inp.value, 10) || 0);
      };
    });

    tracksList.querySelectorAll('[data-preview-idx]').forEach((btn) => {
      btn.onclick = () => {
        const duration = parseInt(document.getElementById('clip-duration').value, 10) || 6;
        playTrackSnippet(state.tracks[parseInt(btn.dataset.previewIdx, 10)], duration);
      };
    });
  }

  document.getElementById('bulk-audio-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    files.forEach((file, i) => {
      if (state.tracks[i].url) URL.revokeObjectURL(state.tracks[i].url);
      state.tracks[i] = {
        id: i + 1,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: URL.createObjectURL(file),
        startSec: 0,
        isDemo: false
      };
    });
    musicError.textContent = '';
    renderTracksAdmin();
  });

  const N = {
    B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08,
    C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Gb4: 369.99, G4: 392.00, A4: 440.00, Bb4: 466.16, B4: 493.88,
    C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, Gb5: 739.99, G5: 783.99, A5: 880.00, B5: 987.77
  };

  const DEMO_MELODIES = [
    { title: 'Super Mario Bros', wave: 'square', notes: [[N.E5, 0.14], [N.E5, 0.28], [N.E5, 0.28], [N.C5, 0.14], [N.E5, 0.28], [N.G5, 0.52], [N.G4, 0.52]] },
    { title: 'Star Wars - Marcha Imperial', wave: 'sawtooth', notes: [[N.A3, 0.45], [N.A3, 0.45], [N.A3, 0.45], [N.F3, 0.34], [N.C4, 0.14], [N.A3, 0.45], [N.F3, 0.34], [N.C4, 0.14], [N.A3, 0.75]] },
    { title: 'Tetris (Korobeiniki)', wave: 'square', notes: [[N.E5, 0.34], [N.B4, 0.17], [N.C5, 0.17], [N.D5, 0.34], [N.C5, 0.17], [N.B4, 0.17], [N.A4, 0.34], [N.A4, 0.17], [N.C5, 0.17], [N.E5, 0.34], [N.D5, 0.17], [N.C5, 0.17], [N.B4, 0.5]] },
    { title: 'Seven Nation Army', wave: 'sawtooth', notes: [[N.E3, 0.55], [N.E3, 0.22], [N.G3, 0.32], [N.E3, 0.32], [N.D3, 0.32], [N.C3, 0.85], [N.B2, 0.75]] },
    { title: 'Smoke on the Water', wave: 'sawtooth', notes: [[N.G3, 0.38], [N.Bb3, 0.38], [N.C4, 0.62], [N.G3, 0.38], [N.Bb3, 0.38], [N.Db4, 0.22], [N.C4, 0.65], [N.G3, 0.38], [N.Bb3, 0.38], [N.C4, 0.55], [N.Bb3, 0.35], [N.G3, 0.65]] },
    { title: 'Himno de la Alegría', wave: 'triangle', notes: [[N.E4, 0.32], [N.E4, 0.32], [N.F4, 0.32], [N.G4, 0.32], [N.G4, 0.32], [N.F4, 0.32], [N.E4, 0.32], [N.D4, 0.32], [N.C4, 0.32], [N.C4, 0.32], [N.D4, 0.32], [N.E4, 0.32], [N.E4, 0.48], [N.D4, 0.22], [N.D4, 0.5]] },
    { title: 'Para Elisa (Beethoven)', wave: 'triangle', notes: [[N.E5, 0.22], [N.Eb5, 0.22], [N.E5, 0.22], [N.Eb5, 0.22], [N.E5, 0.22], [N.B4, 0.22], [N.D5, 0.22], [N.C5, 0.22], [N.A4, 0.55]] },
    { title: 'Harry Potter (Hedwig)', wave: 'triangle', notes: [[N.B4, 0.30], [N.E5, 0.45], [N.G5, 0.20], [N.Gb5, 0.32], [N.E5, 0.60], [N.B5, 0.32], [N.A5, 0.75], [N.Gb5, 0.75]] },
    { title: 'Misión Imposible', wave: 'sawtooth', notes: [[N.G3, 0.28], [0, 0.08], [N.G3, 0.28], [0, 0.08], [N.Bb3, 0.24], [N.C4, 0.24], [N.G3, 0.28], [0, 0.08], [N.G3, 0.28], [0, 0.08], [N.F3, 0.24], [N.Gb3, 0.24], [N.G3, 0.45]] },
    { title: 'Cumpleaños Feliz', wave: 'triangle', notes: [[N.C4, 0.24], [N.C4, 0.14], [N.D4, 0.38], [N.C4, 0.38], [N.F4, 0.38], [N.E4, 0.70], [N.C4, 0.24], [N.C4, 0.14], [N.D4, 0.38], [N.C4, 0.38], [N.G4, 0.38], [N.F4, 0.70]] }
  ];

  document.getElementById('btn-load-demo').addEventListener('click', () => {
    state.tracks = DEMO_MELODIES.map((m, i) => ({
      id: i + 1, title: m.title, url: null, startSec: 0, isDemo: true, wave: m.wave, notes: m.notes
    }));
    musicError.textContent = '';
    renderTracksAdmin();
  });

  function playTrackSnippet(track, durationSec, onEndedCallback) {
    stopCurrentAudio();
    if (track.isDemo) {
      const ctx = getAudioContext();
      let cursor = ctx.currentTime + 0.02;
      track.notes.forEach(([freq, dur]) => {
        if (freq > 0) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = track.wave || 'triangle';
          osc.frequency.setValueAtTime(freq, cursor);
          const vol = track.wave === 'triangle' ? 0.24 : 0.12;
          gain.gain.setValueAtTime(vol, cursor);
          gain.gain.exponentialRampToValueAtTime(0.001, cursor + dur * 0.92);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(cursor);
          osc.stop(cursor + dur);
          activeDemoNodes.push(osc);
        }
        cursor += dur;
      });
      const totalMs = Math.max(1200, (cursor - ctx.currentTime) * 1000);
      clipTimeout = setTimeout(() => { if (onEndedCallback) onEndedCallback(); }, totalMs);
      return;
    }

    audioPlayer.src = track.url;
    audioPlayer.currentTime = track.startSec || 0;
    audioPlayer.play().catch(() => {});
    clipTimeout = setTimeout(() => {
      stopCurrentAudio();
      if (onEndedCallback) onEndedCallback();
    }, durationSec * 1000);
  }

  function stopCurrentAudio() {
    clearTimeout(clipTimeout);
    audioPlayer.pause();
    activeDemoNodes.forEach((osc) => { try { osc.stop(); } catch (_) {} });
    activeDemoNodes = [];
    document.querySelectorAll('.memory-card.playing').forEach((c) => c.classList.remove('playing'));
  }

  document.getElementById('btn-back-setup').addEventListener('click', () => {
    stopCurrentAudio();
    showScreen('setup');
  });

  document.getElementById('btn-start-game').addEventListener('click', () => {
    const allReady = state.tracks.every((t) => t.url || t.isDemo);
    if (!allReady) {
      musicError.textContent = '⚠️ Debes cargar las 10 canciones (o usar las 10 Melodías Demo) para comenzar.';
      return;
    }
    state.clipDuration = Math.max(2, Math.min(30, parseInt(document.getElementById('clip-duration').value, 10) || 6));
    stopCurrentAudio();
    initGame();
  });

  // Pantalla 3: Juego
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function playFeedbackSound(isMatch) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    if (isMatch) {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.18, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.45);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(185, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  function initGame() {
    state.participants.forEach((p) => { p.score = 0; });
    state.currentTurnIndex = Math.floor(Math.random() * state.participants.length);
    state.pairsFound = 0;
    state.attempts = 0;
    state.secondsElapsed = 0;
    state.flippedCards = [];
    state.lockBoard = false;

    const deck = [];
    state.tracks.forEach((track) => {
      deck.push({ trackId: track.id, track, matched: false });
      deck.push({ trackId: track.id, track, matched: false });
    });
    state.cards = shuffleArray(deck);

    updateTopStats();
    renderScoreboard();
    renderBoard();
    startTimer();
    showScreen('game');
  }

  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.secondsElapsed++;
      document.getElementById('game-timer').textContent = formatTime(state.secondsElapsed);
    }, 1000);
  }

  function formatTime(totalSec) {
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function updateTopStats() {
    const activePlayer = state.participants[state.currentTurnIndex];
    document.getElementById('pairs-found').textContent = `${state.pairsFound} / 10`;
    document.getElementById('attempts-count').textContent = state.attempts;
    document.getElementById('game-timer').textContent = formatTime(state.secondsElapsed);
    document.getElementById('current-turn-name').textContent = `${activePlayer.avatar} ${activePlayer.name}`;
  }

  function renderScoreboard(bumpIndex = -1) {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';
    state.participants.forEach((p, idx) => {
      const isTurn = idx === state.currentTurnIndex;
      const isBump = idx === bumpIndex;
      const subtext = state.mode === 'team' ? `${p.members[0]} y ${p.members[1]}` : 'Individual';
      const card = document.createElement('div');
      card.className = `score-card ${isTurn ? 'active-turn' : ''} ${isBump ? 'score-bump' : ''}`;
      card.innerHTML = `
        <div class="score-left">
          <span class="score-avatar">${p.avatar}</span>
          <div class="score-info">
            <h4>${p.name}</h4>
            <small>${subtext}</small>
          </div>
        </div>
        <div class="score-points">${p.score}</div>
      `;
      scoreboard.appendChild(card);
    });
  }

  function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    state.cards.forEach((cardData, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'memory-card';
      btn.dataset.index = idx;
      btn.innerHTML = `
        <span class="card-number">${idx + 1}</span>
        <span class="card-icon">🎵</span>
        <span class="card-label">Escuchar</span>
      `;
      btn.addEventListener('click', () => handleCardClick(idx, btn));
      board.appendChild(btn);
    });
  }

  function handleCardClick(index, cardElement) {
    if (state.lockBoard) return;
    const cardData = state.cards[index];
    if (cardData.matched) return;

    if (state.flippedCards.length === 1 && state.flippedCards[0].index === index) {
      cardElement.classList.add('playing');
      playTrackSnippet(cardData.track, state.clipDuration, () => {
        cardElement.classList.remove('playing');
      });
      return;
    }

    cardElement.classList.add('selected', 'playing');
    cardElement.querySelector('.card-icon').textContent = '🔊';
    cardElement.querySelector('.card-label').textContent = 'Sonando...';

    playTrackSnippet(cardData.track, state.clipDuration, () => {
      cardElement.classList.remove('playing');
      if (!cardData.matched && cardElement.classList.contains('selected')) {
        cardElement.querySelector('.card-icon').textContent = '🎧';
        cardElement.querySelector('.card-label').textContent = 'Seleccionada';
      }
    });

    state.flippedCards.push({ index, element: cardElement, data: cardData });
    broadcastState();

    if (state.flippedCards.length === 2) {
      state.attempts++;
      updateTopStats();
      checkForMatch();
    }
  }

  function checkForMatch() {
    state.lockBoard = true;
    broadcastState();

    const [first, second] = state.flippedCards;
    const isMatch = first.data.trackId === second.data.trackId;

    setTimeout(() => {
      stopCurrentAudio();

      if (isMatch) {
        playFeedbackSound(true);
        launchConfetti(65);
        triggerDiscoPartyBoost(2000);

        first.data.matched = true;
        second.data.matched = true;

        [first.element, second.element].forEach((el) => {
          el.classList.remove('selected', 'playing');
          el.classList.add('matched', 'match-celebrate');
          el.disabled = true;
          el.querySelector('.card-icon').textContent = '🌟';
          el.querySelector('.card-label').textContent = first.data.track.title;
        });

        const scorerIndex = state.currentTurnIndex;
        state.participants[scorerIndex].score++;
        state.pairsFound++;
        state.flippedCards = [];
        state.lockBoard = false;

        updateTopStats();
        renderScoreboard(scorerIndex);
        broadcastState();

        if (state.pairsFound === 10) {
          setTimeout(() => finishGame(), 700);
        }
      } else {
        playFeedbackSound(false);
        [first.element, second.element].forEach((el) => {
          el.classList.remove('selected', 'playing');
          el.querySelector('.card-icon').textContent = '🎵';
          el.querySelector('.card-label').textContent = 'Escuchar';
        });

        state.currentTurnIndex = (state.currentTurnIndex + 1) % state.participants.length;
        state.flippedCards = [];
        state.lockBoard = false;

        updateTopStats();
        renderScoreboard();
        broadcastState();
      }
    }, 1900);
  }

  document.getElementById('btn-stop-audio').addEventListener('click', stopCurrentAudio);

  document.getElementById('btn-abort-game').addEventListener('click', () => {
    clearInterval(state.timerInterval);
    stopCurrentAudio();
    showScreen('setup');
  });

  function finishGame() {
    clearInterval(state.timerInterval);
    stopCurrentAudio();
    launchConfetti(180);
    triggerDiscoPartyBoost(4500);

    const sorted = [...state.participants].sort((a, b) => b.score - a.score);
    const topScore = sorted[0].score;
    const winners = sorted.filter((p) => p.score === topScore);

    const winnerSubtitle = document.getElementById('winner-subtitle');
    if (winners.length > 1) {
      winnerSubtitle.textContent = `🤝 ¡Empate en la cima entre ${winners.map((w) => `${w.avatar} ${w.name}`).join(' y ')} con ${topScore} parejas!`;
    } else {
      winnerSubtitle.textContent = `🎉 ¡Campeón: ${winners[0].avatar} ${winners[0].name} con ${topScore} parejas!`;
    }

    const podiumContainer = document.getElementById('podium-container');
    podiumContainer.innerHTML = '';

    const podiumOrder = [];
    if (sorted[1]) podiumOrder.push({ player: sorted[1], place: 2, medal: '🥈' });
    if (sorted[0]) podiumOrder.push({ player: sorted[0], place: 1, medal: '🥇' });
    if (sorted[2]) podiumOrder.push({ player: sorted[2], place: 3, medal: '🥉' });

    podiumOrder.forEach(({ player, place, medal }) => {
      const membersLine = state.mode === 'team' ? `${player.members[0]} y ${player.members[1]}` : '';
      const crownHtml = place === 1 ? '<div class="podium-crown">👑</div>' : '';
      const slot = document.createElement('div');
      slot.className = `podium-slot place-${place}`;
      slot.innerHTML = `
        ${crownHtml}
        <div class="podium-avatar">${player.avatar}</div>
        <div class="podium-name">${player.name}</div>
        <div class="podium-members">${membersLine}</div>
        <div class="podium-step">
          <span class="podium-medal">${medal}</span>
          <span class="podium-pts">${player.score} pts</span>
        </div>
      `;
      podiumContainer.appendChild(slot);
    });

    document.getElementById('final-time').textContent = formatTime(state.secondsElapsed);
    document.getElementById('final-attempts').textContent = state.attempts;

    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '';
    sorted.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = `ranking-item ${idx === 0 ? 'first' : ''}`;
      const membersText = state.mode === 'team' ? ` (${p.members[0]} y ${p.members[1]})` : '';
      item.innerHTML = `
        <span><strong>#${idx + 1} ${p.avatar} ${p.name}</strong>${membersText}</span>
        <strong>${p.score} pts</strong>
      `;
      rankingList.appendChild(item);
    });

    showScreen('results');
  }

  document.getElementById('btn-rematch').addEventListener('click', () => initGame());
  document.getElementById('btn-new-setup').addEventListener('click', () => showScreen('setup'));

  renderParticipants();
}

// ============================================================================
// PARTE B: LÓGICA DEL CELULAR (MANDO REMOTO POR QR)
// ============================================================================
function initClientMode(roomId) {
  let selectedAvatar = '🎸';
  let selectedTeamIdx = 0;
  let joined = false;
  let hostConn = null;

  document.getElementById('client-room-label').textContent = `Sala: ${roomId}`;

  // Pintar selector de avatares en el teléfono
  const avatarContainer = document.getElementById('client-avatar-options');
  AVATAR_OPTIONS.forEach((av) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `avatar-option ${av === selectedAvatar ? 'selected' : ''}`;
    btn.textContent = av;
    btn.onclick = () => {
      selectedAvatar = av;
      avatarContainer.querySelectorAll('.avatar-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    avatarContainer.appendChild(btn);
  });

  // Botones de selección de equipo
  document.querySelectorAll('#client-team-buttons .mode-btn').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('#client-team-buttons .mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTeamIdx = parseInt(btn.dataset.team, 10);
    };
  });

  const peer = new Peer();
  peer.on('open', () => {
    hostConn = peer.connect(roomId);

    hostConn.on('open', () => {
      document.getElementById('client-conn-msg').textContent = '🟢 Conectado con la pantalla principal';
      document.getElementById('btn-client-join').disabled = false;
    });

    hostConn.on('data', (msg) => {
      if (msg.type === 'ERROR') {
        document.getElementById('client-join-error').textContent = `⚠️ ${msg.message}`;
        return;
      }
      if (msg.type === 'SYNC') {
        handleSyncFromHost(msg);
      }
    });

    hostConn.on('close', () => {
      document.getElementById('client-room-label').textContent = '🔴 Desconectado de la sala';
    });
  });

  document.getElementById('btn-client-join').onclick = () => {
    const name = document.getElementById('client-name-input').value.trim();
    if (!name) {
      document.getElementById('client-join-error').textContent = '⚠️ Escribe tu nombre para continuar.';
      return;
    }
    document.getElementById('client-join-error').textContent = '';

    hostConn.send({
      type: 'JOIN',
      name,
      avatar: selectedAvatar,
      teamIndex: selectedTeamIdx,
      teamName: document.getElementById('client-team-name-input').value.trim()
    });

    joined = true;
    document.getElementById('client-ready-avatar').textContent = selectedAvatar;
    document.getElementById('client-ready-name').textContent = `¡Hola, ${name}!`;
    showClientScreen('client-wait-screen');
  };

  function showClientScreen(screenId) {
    document.querySelectorAll('#client-app .screen').forEach((s) => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  function handleSyncFromHost(sync) {
    // Actualizar visibilidad del selector de equipos si aún no entra
    const teamSelector = document.getElementById('client-team-selector');
    if (teamSelector) {
      teamSelector.style.display = sync.mode === 'team' ? 'block' : 'none';
    }

    if (!joined) return;

    if (sync.phase === 'setup' || sync.phase === 'music') {
      showClientScreen('client-wait-screen');
      return;
    }

    if (sync.phase === 'game') {
      showClientScreen('client-pad-screen');
      renderClientPad(sync);
      return;
    }

    if (sync.phase === 'results') {
      showClientScreen('client-end-screen');
      renderClientResults(sync);
    }
  }

  function renderClientPad(sync) {
    const myPlayer = sync.participants[sync.slotIndex];
    const activePlayer = sync.participants[sync.currentTurnIndex];
    const isMyTurn = sync.slotIndex !== -1 && sync.slotIndex === sync.currentTurnIndex && !sync.lockBoard;

    const indicator = document.getElementById('client-turn-indicator');
    if (isMyTurn) {
      indicator.className = 'client-turn-box my-turn';
      indicator.textContent = '🔥 ¡ES TU TURNO! Toca un cuadro';
    } else if (activePlayer) {
      indicator.className = 'client-turn-box waiting';
      indicator.textContent = `⏳ Turno de ${activePlayer.avatar} ${activePlayer.name}`;
    }

    if (myPlayer) {
      document.getElementById('client-my-badge').textContent = `${myPlayer.avatar} ${myPlayer.name}`;
      document.getElementById('client-my-score').textContent = myPlayer.score;
    }

    const grid = document.getElementById('client-pad-grid');
    grid.innerHTML = '';

    sync.cards.forEach((card, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pad-btn';
      if (isMyTurn && !card.matched) btn.classList.add('active-turn-btn');
      if (card.selected) btn.classList.add('selected');
      if (card.matched) btn.classList.add('matched');

      btn.disabled = !isMyTurn || card.matched;
      btn.innerHTML = `
        <span>${idx + 1}</span>
        <small>${card.matched ? '✅' : card.selected ? '🔊' : '🎵'}</small>
      `;

      btn.onclick = () => {
        if (!isMyTurn || card.matched) return;
        hostConn.send({ type: 'PICK_CARD', index: idx });
      };

      grid.appendChild(btn);
    });
  }

  function renderClientResults(sync) {
    const myPlayer = sync.participants[sync.slotIndex];
    if (!myPlayer) return;

    const sorted = [...sync.participants].sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex((p) => p.name === myPlayer.name && p.avatar === myPlayer.avatar) + 1;
    const medals = ['🥇', '🥈', '🥉', '🎖️'];

    document.getElementById('client-end-medal').textContent = medals[rank - 1] || '🏆';
    document.getElementById('client-end-title').textContent = rank === 1 ? '¡GANASTE!' : `Puesto #${rank}`;
    document.getElementById('client-end-summary').textContent = `${myPlayer.avatar} ${myPlayer.name}: ${myPlayer.score} parejas`;
  }
}