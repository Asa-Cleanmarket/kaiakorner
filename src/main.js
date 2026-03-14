import * as THREE from 'three';
import { Game } from './engine/Game.js';

const game = new Game();

const startGame = () => {
  document.getElementById('start-screen').style.display = 'none';
  const tutorial = document.getElementById('tutorial-screen');
  tutorial.style.display = 'flex';
  const launchGame = () => {
    tutorial.style.display = 'none';
    game.start();
  };
  tutorial.addEventListener('click', launchGame, { once: true });
  tutorial.addEventListener('touchend', launchGame, { once: true });
};

document.getElementById('start-screen').addEventListener('click', startGame);
document.getElementById('start-screen').addEventListener('touchend', startGame);
