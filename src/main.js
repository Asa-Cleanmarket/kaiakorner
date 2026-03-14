import * as THREE from 'three';
import { Game } from './engine/Game.js';

const game = new Game();

document.getElementById('start-screen').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  // Show tutorial screen
  const tutorial = document.getElementById('tutorial-screen');
  tutorial.style.display = 'flex';
  tutorial.addEventListener('click', () => {
    tutorial.style.display = 'none';
    game.start();
  }, { once: true });
});
