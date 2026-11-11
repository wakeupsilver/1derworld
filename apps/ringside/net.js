// RINGSIDE online play. Two browsers talk directly (WebRTC via PeerJS); the free public PeerJS server
// only introduces them. The host owns the match settings and the random seed; both screens apply the
// same moves in the same order, so the boards (and every ring event) stay identical.
window.RingNet = (() => {
  const P = new URLSearchParams(location.search);
  const api = {
    online: P.get('mode') === 'online' && !!P.get('room'),
    role: P.get('role') || 'host',
    room: P.get('room'),
    game: P.get('g') || '',
    connected: false,
    conn: null,
    peer: null,
  };

  // seeded random (mulberry32): both players roll the same ring events
  api.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // the invite always points at the public site, so a friend anywhere can open it
  const PUBLIC = 'https://wakeupsilver.github.io/1derworld/apps/ringside/';
  api.base = () => (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? PUBLIC : location.href.replace(/[^/]*([?#].*)?$/, ''));
  api.inviteLink = (room = api.room, game = api.game) => `${api.base()}?join=${room}&g=${game}`;

  // ---- a little status pill in the corner ----
  let pill;
  api.say = (msg, withLink = false) => {
    if (!pill) {
      pill = document.createElement('div');
      pill.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99;background:rgba(18,8,36,.92);color:#f1ecff;border:1px solid #ffd23f;border-radius:999px;padding:8px 14px;font:600 13px system-ui,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 6px 30px -8px #000;max-width:calc(100vw - 24px)';
      document.body.appendChild(pill);
    }
    pill.innerHTML = '';
    const t = document.createElement('span'); t.textContent = '🌐 ' + msg; pill.appendChild(t);
    if (withLink) {
      const b = document.createElement('button');
      b.textContent = 'copy invite link';
      b.style.cssText = 'background:#ffd23f;color:#1a0838;border:0;border-radius:999px;padding:5px 10px;font:700 12px system-ui;cursor:pointer';
      b.onclick = async () => { try { await navigator.clipboard.writeText(api.inviteLink()); b.textContent = 'copied ✓'; } catch { prompt('Send this link:', api.inviteLink()); } };
      pill.appendChild(b);
    }
    pill.style.display = msg ? 'flex' : 'none';
  };

  api.send = d => { if (api.conn && api.conn.open) api.conn.send(d); };
  api.leave = () => { try { api.conn && api.conn.close(); api.peer && api.peer.destroy(); } catch { /* fine */ } };

  // opts: { makeHello(), onHello(hello), onAct(action), onRematch() }
  api.start = opts => {
    if (!window.Peer) { api.say('online play needs a connection (PeerJS did not load)'); return; }
    const id = 'ringside-' + api.room;
    const wire = c => {
      api.conn = c;
      c.on('data', d => {
        if (!d || typeof d !== 'object') return;
        if (d.t === 'hello') { api.connected = true; api.say(''); opts.onHello(d); }
        else if (d.t === 'act') opts.onAct(d);
        else if (d.t === 'rematch') opts.onRematch && opts.onRematch(d);
      });
      c.on('close', () => { api.connected = false; api.say('your opponent left the ring'); });
      c.on('error', () => api.say('lost the connection'));
    };
    if (api.role === 'host') {
      api.peer = new Peer(id);
      api.peer.on('open', () => api.say('waiting for your opponent to open the link…', true));
      api.peer.on('connection', c => {
        if (api.conn && api.conn.open) { c.on('open', () => c.close()); return; } // one opponent at a time
        wire(c);
        c.on('open', () => { const h = opts.makeHello(); api.send({ t: 'hello', ...h }); api.connected = true; api.say(''); opts.onHello(h); });
      });
    } else {
      api.peer = new Peer();
      // the host may not have rung the bell yet: keep knocking for a couple of minutes
      api.tries = 0;
      api.knock = () => { if (api.connected) return; api.tries++; wire(api.peer.connect(id, { reliable: true })); };
      api.peer.on('open', () => { api.say('stepping into the ring…'); api.knock(); });
    }
    api.peer.on('error', e => {
      const t = e && e.type;
      if (t === 'peer-unavailable' && api.role !== 'host' && api.tries < 40) { api.say('waiting for your challenger to step into the ring…'); setTimeout(api.knock, 3000); return; }
      api.say(t === 'unavailable-id' ? 'that invite is already in use: make a new one from the menu'
        : t === 'peer-unavailable' ? 'that match is not open right now: ask for a fresh link'
        : t === 'network' || t === 'server-error' ? 'cannot reach the matchmaking server right now'
        : 'connection problem (' + t + ')');
    });
  };
  return api;
})();
