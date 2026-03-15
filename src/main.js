import { Game } from './engine/Game.js';
import { MultiplayerClient } from './multiplayer/MultiplayerClient.js';

const game = new Game();

// Multiplayer lobby state
let mpMode = null; // 'create' or 'join'
let mpClient = null;

const $ = (id) => document.getElementById(id);

const showTutorialAndStart = () => {
  $('mp-screen').style.display = 'none';
  const tutorial = $('tutorial-screen');
  tutorial.style.display = 'flex';
  const launchGame = () => {
    tutorial.style.display = 'none';
    game.start();
  };
  tutorial.addEventListener('click', launchGame, { once: true });
  tutorial.addEventListener('touchend', launchGame, { once: true });
};

const startGame = () => {
  $('start-screen').style.display = 'none';
  // Show multiplayer choice screen
  $('mp-screen').style.display = 'flex';
};

// Start screen -> MP choice
$('start-screen').addEventListener('click', startGame);
$('start-screen').addEventListener('touchend', startGame);

// SOLO button
$('mp-solo').addEventListener('click', () => {
  showTutorialAndStart();
});

// CREATE ROOM
$('mp-create').addEventListener('click', () => {
  mpMode = 'create';
  $('mp-menu').style.display = 'none';
  $('mp-name-form').style.display = 'block';
  $('mp-go').style.display = 'inline-block';
  $('mp-back').style.display = 'inline-block';
  $('mp-name').focus();
});

// JOIN ROOM
$('mp-join').addEventListener('click', () => {
  mpMode = 'join';
  $('mp-menu').style.display = 'none';
  $('mp-name-form').style.display = 'block';
  $('mp-code-form').style.display = 'block';
  $('mp-go').style.display = 'inline-block';
  $('mp-back').style.display = 'inline-block';
  $('mp-name').focus();
});

// BACK button
$('mp-back').addEventListener('click', () => {
  mpMode = null;
  if (mpClient) { mpClient.disconnect(); mpClient = null; }
  $('mp-menu').style.display = 'flex';
  $('mp-name-form').style.display = 'none';
  $('mp-code-form').style.display = 'none';
  $('mp-go').style.display = 'none';
  $('mp-back').style.display = 'none';
  $('mp-status').style.display = 'none';
  $('mp-room-info').style.display = 'none';
});

// GO button
$('mp-go').addEventListener('click', async () => {
  const name = $('mp-name').value.trim() || 'Player';
  const status = $('mp-status');
  status.style.display = 'block';

  mpClient = new MultiplayerClient();

  if (mpMode === 'create') {
    status.textContent = 'Creating room...';
    try {
      // Set up callbacks before connecting
      const playerNames = new Map();

      mpClient.onConnected((code) => {
        $('mp-go').style.display = 'none';
        $('mp-name-form').style.display = 'none';
        status.style.display = 'none';
        $('mp-room-info').style.display = 'block';
        $('mp-room-code').textContent = code;
        $('mp-players').textContent = `Players: ${name} (you)`;
        playerNames.set(mpClient.playerId, name);
      });

      mpClient.onPlayerJoined((id, pName) => {
        playerNames.set(id, pName);
        const names = Array.from(playerNames.values()).join(', ');
        $('mp-players').textContent = `Players: ${names}`;
      });

      mpClient.onPlayerLeft((id) => {
        playerNames.delete(id);
        const names = Array.from(playerNames.values()).join(', ');
        $('mp-players').textContent = `Players: ${names}`;
      });

      mpClient.onError((msg) => {
        status.style.display = 'block';
        status.textContent = `Error: ${msg}`;
        status.style.color = '#ff4444';
      });

      await mpClient.createRoom(name);
    } catch (e) {
      status.textContent = 'Could not connect to server. Try again!';
      status.style.color = '#ff4444';
      return;
    }
  } else {
    // Join
    const code = $('mp-code').value.trim().toUpperCase();
    if (!code || code.length < 3) {
      status.textContent = 'Enter a room code!';
      status.style.color = '#ff4444';
      return;
    }
    status.textContent = 'Joining room...';
    try {
      mpClient.onSync((players, blocks) => {
        // Room joined! Apply block edits and start
        game.initMultiplayer(mpClient, name, players, blocks);
        showTutorialAndStart();
      });

      mpClient.onError((msg) => {
        status.textContent = `Error: ${msg}`;
        status.style.color = '#ff4444';
      });

      await mpClient.joinRoom(code, name);
    } catch (e) {
      status.textContent = 'Could not connect to server. Try again!';
      status.style.color = '#ff4444';
      return;
    }
  }
});

// START GAME (host)
$('mp-start').addEventListener('click', () => {
  const name = $('mp-name').value.trim() || 'Player';
  game.initMultiplayer(mpClient, name, [], []);
  showTutorialAndStart();
});

// Enter key triggers GO
$('mp-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('mp-go').click();
});
$('mp-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('mp-go').click();
});
