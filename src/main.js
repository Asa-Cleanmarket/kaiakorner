import * as THREE from 'three';
import { Game } from './engine/Game.js';

const game = new Game();

document.getElementById('start-screen').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  game.start();
});
