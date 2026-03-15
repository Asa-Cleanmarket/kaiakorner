import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 3001;

// Room storage
const rooms = new Map(); // code -> { players: Map<id, {ws, name}>, blocks: Map<"x,y,z", type> }

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function generateRoomCode() {
  const words = ['CAKE','GUMM','PINK','STAR','MOON','PLUM','FIZZ','MINT','RUBY','LIME',
    'SNOW','FAWN','PUFF','SILK','JAZZ','GLOW','FOAM','IRIS','DUSK','PINE',
    'YARN','HAZE','FERN','REEF','DAWN','ECHO','DUNE','LAVA','TACO','WISH'];
  let code;
  do {
    code = words[Math.floor(Math.random() * words.length)];
  } while (rooms.has(code));
  return code;
}

function broadcast(room, senderId, msg) {
  const data = JSON.stringify(msg);
  for (const [id, player] of room.players) {
    if (id !== senderId && player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

function broadcastAll(room, msg) {
  const data = JSON.stringify(msg);
  for (const [, player] of room.players) {
    if (player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

function removePlayer(playerId, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.delete(playerId);
  broadcast(room, playerId, { t: 'left', id: playerId });

  // Clean up empty rooms after a delay
  if (room.players.size === 0) {
    room.cleanupTimer = setTimeout(() => {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
    }, 5 * 60 * 1000); // 5 minutes
  }
}

// HTTP server for health checks
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Cotton Candy Cove Multiplayer Server');
  }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let playerId = generateId();
  let playerRoom = null;
  let playerName = 'Player';

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.t) {
      case 'create': {
        // Create a new room
        const code = generateRoomCode();
        playerName = (msg.name || 'Player').slice(0, 12);
        const room = { players: new Map(), blocks: new Map(), host: playerId };
        room.players.set(playerId, { ws, name: playerName });
        rooms.set(code, room);
        playerRoom = code;

        ws.send(JSON.stringify({ t: 'room', code, id: playerId }));
        console.log(`Room ${code} created by ${playerName}`);
        break;
      }

      case 'join': {
        const code = (msg.code || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ t: 'err', m: 'Room not found' }));
          return;
        }
        if (room.players.size >= 4) {
          ws.send(JSON.stringify({ t: 'err', m: 'Room is full (max 4)' }));
          return;
        }

        // Cancel cleanup timer if room was about to be deleted
        if (room.cleanupTimer) {
          clearTimeout(room.cleanupTimer);
          room.cleanupTimer = null;
        }

        playerName = (msg.name || 'Player').slice(0, 12);
        room.players.set(playerId, { ws, name: playerName });
        playerRoom = code;

        // Send room state to joining player
        const players = [];
        for (const [id, p] of room.players) {
          if (id !== playerId) players.push({ id, name: p.name });
        }
        const blocks = Array.from(room.blocks.entries());
        ws.send(JSON.stringify({ t: 'sync', id: playerId, code, players, blocks }));

        // Tell existing players about new player
        broadcast(room, playerId, { t: 'joined', id: playerId, name: playerName });
        console.log(`${playerName} joined room ${code} (${room.players.size}/4)`);
        break;
      }

      case 'pos': {
        // Relay player position to others
        if (!playerRoom) return;
        const room = rooms.get(playerRoom);
        if (!room) return;
        broadcast(room, playerId, {
          t: 'pos', id: playerId,
          x: msg.x, y: msg.y, z: msg.z,
          yaw: msg.yaw, pitch: msg.pitch,
          hp: msg.hp, w: msg.w, atk: msg.atk
        });
        break;
      }

      case 'blk': {
        // Block edit — store and relay
        if (!playerRoom) return;
        const room = rooms.get(playerRoom);
        if (!room) return;
        const key = `${msg.x},${msg.y},${msg.z}`;
        if (msg.b === null) {
          room.blocks.set(key, null);
        } else {
          room.blocks.set(key, msg.b);
        }
        broadcast(room, playerId, { t: 'blk', x: msg.x, y: msg.y, z: msg.z, b: msg.b });
        break;
      }

      case 'chat': {
        if (!playerRoom) return;
        const room = rooms.get(playerRoom);
        if (!room) return;
        const text = (msg.m || '').slice(0, 100);
        broadcast(room, playerId, { t: 'chat', id: playerId, name: playerName, m: text });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (playerRoom) {
      removePlayer(playerId, playerRoom);
      console.log(`${playerName} disconnected from room ${playerRoom}`);
    }
  });

  ws.on('error', () => {
    if (playerRoom) {
      removePlayer(playerId, playerRoom);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Cotton Candy Cove server running on port ${PORT}`);
});
