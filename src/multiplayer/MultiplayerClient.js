const PROD_URL = 'wss://cotton-candy-cove-server.onrender.com';
const DEV_URL = 'ws://localhost:3001';

export class MultiplayerClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.roomCode = null;

    // Callbacks
    this._onPlayerJoined = null;
    this._onPlayerLeft = null;
    this._onPlayerUpdate = null;
    this._onBlockEdit = null;
    this._onChatMessage = null;
    this._onError = null;
    this._onConnected = null;
    this._onSync = null;

    // Throttle position updates to 10Hz
    this._lastPosSend = 0;
    this._posInterval = 100; // ms
  }

  _getUrl() {
    return location.hostname === 'localhost' ? DEV_URL : PROD_URL;
  }

  _connect() {
    return new Promise((resolve, reject) => {
      const url = this._getUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        resolve();
      };

      this.ws.onerror = () => {
        reject(new Error('Connection failed'));
      };

      this.ws.onclose = () => {
        this.connected = false;
      };

      this.ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        this._handleMessage(msg);
      };
    });
  }

  _handleMessage(msg) {
    switch (msg.t) {
      case 'room':
        this.playerId = msg.id;
        this.roomCode = msg.code;
        if (this._onConnected) this._onConnected(msg.code, msg.id);
        break;

      case 'sync':
        this.playerId = msg.id;
        this.roomCode = msg.code;
        if (this._onSync) this._onSync(msg.players, msg.blocks);
        break;

      case 'joined':
        if (this._onPlayerJoined) this._onPlayerJoined(msg.id, msg.name);
        break;

      case 'left':
        if (this._onPlayerLeft) this._onPlayerLeft(msg.id);
        break;

      case 'pos':
        if (this._onPlayerUpdate) this._onPlayerUpdate(msg);
        break;

      case 'blk':
        if (this._onBlockEdit) this._onBlockEdit(msg.x, msg.y, msg.z, msg.b);
        break;

      case 'chat':
        if (this._onChatMessage) this._onChatMessage(msg.id, msg.name, msg.m);
        break;

      case 'err':
        if (this._onError) this._onError(msg.m);
        break;
    }
  }

  async createRoom(playerName) {
    await this._connect();
    this._send({ t: 'create', name: playerName });
  }

  async joinRoom(roomCode, playerName) {
    await this._connect();
    this._send({ t: 'join', code: roomCode.toUpperCase(), name: playerName });
  }

  sendPlayerUpdate(pos, yaw, pitch, health, weapon, attacking) {
    const now = performance.now();
    if (now - this._lastPosSend < this._posInterval) return;
    this._lastPosSend = now;

    this._send({
      t: 'pos',
      x: Math.round(pos.x * 100) / 100,
      y: Math.round(pos.y * 100) / 100,
      z: Math.round(pos.z * 100) / 100,
      yaw: Math.round(yaw * 100) / 100,
      pitch: Math.round(pitch * 100) / 100,
      hp: Math.round(health),
      w: weapon || null,
      atk: !!attacking
    });
  }

  sendBlockEdit(x, y, z, type) {
    this._send({ t: 'blk', x, y, z, b: type });
  }

  sendChat(text) {
    this._send({ t: 'chat', m: text.slice(0, 100) });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.playerId = null;
    this.roomCode = null;
  }

  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // Callback setters
  onPlayerJoined(cb) { this._onPlayerJoined = cb; }
  onPlayerLeft(cb) { this._onPlayerLeft = cb; }
  onPlayerUpdate(cb) { this._onPlayerUpdate = cb; }
  onBlockEdit(cb) { this._onBlockEdit = cb; }
  onChatMessage(cb) { this._onChatMessage = cb; }
  onError(cb) { this._onError = cb; }
  onConnected(cb) { this._onConnected = cb; }
  onSync(cb) { this._onSync = cb; }
}
