import { Game } from './game/Game.js';

const container = document.getElementById('game-container') as HTMLElement;
const game = new Game(container);

// Debug hook for automated verification (Playwright screenshots).
(window as unknown as { game: Game }).game = game;

// Debug: expose game instance globally for E2E testing
(window as any).game = game;

// Start on click of start screen
game.startScreen.getButton().addEventListener('click', () => {
  game.start();
});

// Also start when clicking the overlay
game.startScreen.getOverlay().addEventListener('click', (e) => {
  if ((e.target as HTMLElement).id === 'start-screen') {
    game.start();
  }
});

// Wire up save/load buttons
game.hud.onSave = () => {
  if (game.saveGame()) {
    console.log('Game saved.');
  } else {
    console.log('Save failed.');
  }
};
game.hud.onLoad = () => {
  if (game.loadGame()) {
    console.log('Game loaded.');
  } else {
    console.log('No save data found.');
  }
};

// CSS for UI elements
const style = document.createElement('style');
style.textContent = `
  #crosshair {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 20px;
    font-weight: bold;
    pointer-events: none;
    z-index: 100;
    text-shadow: 1px 1px 2px black;
    display: none;
  }

  #hotbar {
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
    z-index: 100;
    display: none;
  }

  .hotbar-slot {
    width: 50px;
    height: 50px;
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid #555;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 9px;
    text-align: center;
    user-select: none;
    line-height: 1.1;
    padding: 2px;
  }

  .hotbar-slot.selected {
    border-color: white;
    background: rgba(100, 100, 100, 0.7);
  }

  #coords {
    position: fixed;
    top: 10px;
    left: 10px;
    color: white;
    font-size: 14px;
    z-index: 100;
    text-shadow: 1px 1px 2px black;
    display: none;
    font-family: monospace;
  }

  #fps {
    position: fixed;
    top: 30px;
    left: 10px;
    color: white;
    font-size: 14px;
    z-index: 100;
    text-shadow: 1px 1px 2px black;
    display: none;
    font-family: monospace;
  }

  #block-name {
    position: fixed;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 14px;
    z-index: 100;
    text-shadow: 1px 1px 2px black;
    display: none;
  }

  #save-btn, #load-btn {
    position: fixed;
    top: 10px;
    right: 10px;
    color: white;
    font-size: 14px;
    z-index: 100;
    text-shadow: 1px 1px 2px black;
    display: none;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #888;
    border-radius: 4px;
    padding: 6px 14px;
    cursor: pointer;
    font-family: 'Segoe UI', sans-serif;
    margin-left: 6px;
    user-select: none;
  }
  #save-btn {
    right: 92px;
  }

  #save-btn:hover, #load-btn:hover {
    background: rgba(60, 60, 60, 0.7);
    border-color: white;
  }

  #start-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 200;
    color: white;
    font-family: 'Segoe UI', sans-serif;
    cursor: pointer;
  }

  #start-screen .title {
    font-size: 48px;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px black;
  }

  #start-screen .controls {
    background: rgba(50, 50, 50, 0.8);
    padding: 20px 40px;
    border-radius: 8px;
    margin-bottom: 30px;
    text-align: left;
  }

  #start-screen .controls h2 {
    margin-bottom: 10px;
    font-size: 20px;
  }

  #start-screen .controls ul {
    list-style: none;
    padding: 0;
  }

  #start-screen .controls li {
    margin: 5px 0;
    font-size: 14px;
  }

  .play-button {
    background: #4a8c2a;
    color: white;
    padding: 15px 40px;
    font-size: 22px;
    border: 3px solid #2d6b1e;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Segoe UI', sans-serif;
    transition: background 0.2s;
  }

  .play-button:hover {
    background: #5a9c3a;
  }

  #help-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 150;
    color: white;
    font-family: 'Segoe UI', sans-serif;
  }

  .help-content {
    background: rgba(40, 40, 40, 0.95);
    padding: 30px 50px;
    border-radius: 8px;
    max-width: 500px;
  }

  .help-content h2 {
    margin-bottom: 15px;
    font-size: 24px;
  }

  .help-content ul {
    list-style: none;
    padding: 0;
  }

  .help-content li {
    margin: 8px 0;
    font-size: 15px;
  }

  .help-content .tip {
    margin-top: 15px;
    font-size: 12px;
    color: #aaa;
    text-align: center;
  }
`;
document.head.appendChild(style);
