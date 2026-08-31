import { Inventory } from '../game/Inventory.js';
import { BlockType, getBlockNameJp } from '../game/BlockTypes.js';

/**
 * HUD overlay: crosshair, hotbar, coordinates, FPS — all in Japanese.
 */
export class HUD {
  private container: HTMLElement;
  private inventory: Inventory;

  private crosshairEl!: HTMLElement;
  private hotbarEl!: HTMLElement;
  private coordsEl!: HTMLElement;
  private fpsEl!: HTMLElement;
  private blockNameEl!: HTMLElement;
  private saveBtn!: HTMLElement;
  private loadBtn!: HTMLElement;

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  /** Callbacks for save/load buttons. */
  public onSave: (() => void) | null = null;
  public onLoad: (() => void) | null = null;

  constructor(container: HTMLElement, inventory: Inventory) {
    this.container = container;
    this.inventory = inventory;
    this.createElements();
  }

  private createElements(): void {
    // Crosshair
    this.crosshairEl = document.createElement('div');
    this.crosshairEl.id = 'crosshair';
    this.crosshairEl.textContent = '+';
    this.container.appendChild(this.crosshairEl);

    // Hotbar
    this.hotbarEl = document.createElement('div');
    this.hotbarEl.id = 'hotbar';
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.index = String(i);
      this.hotbarEl.appendChild(slot);
    }
    this.container.appendChild(this.hotbarEl);

    // Coords
    this.coordsEl = document.createElement('div');
    this.coordsEl.id = 'coords';
    this.container.appendChild(this.coordsEl);

    // FPS
    this.fpsEl = document.createElement('div');
    this.fpsEl.id = 'fps';
    this.container.appendChild(this.fpsEl);

    // Block name
    this.blockNameEl = document.createElement('div');
    this.blockNameEl.id = 'block-name';
    this.container.appendChild(this.blockNameEl);

    // Save/Load buttons
    this.saveBtn = document.createElement('div');
    this.saveBtn.id = 'save-btn';
    this.saveBtn.textContent = 'セーブ';
    this.saveBtn.addEventListener('click', () => this.onSave?.());
    this.container.appendChild(this.saveBtn);

    this.loadBtn = document.createElement('div');
    this.loadBtn.id = 'load-btn';
    this.loadBtn.textContent = 'ロード';
    this.loadBtn.addEventListener('click', () => this.onLoad?.());
    this.container.appendChild(this.loadBtn);
  }

  /** Update HUD display. Call each frame. */
  update(position: { x: number; y: number; z: number }, fps: number): void {
    // FPS counter
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate > 500) {
      this.currentFps = Math.round(this.frameCount / ((now - this.lastFpsUpdate) / 1000));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.coordsEl.textContent = `X: ${position.x.toFixed(1)} Y: ${position.y.toFixed(1)} Z: ${position.z.toFixed(1)}`;
    this.fpsEl.textContent = `FPS: ${fps}`;
    this.blockNameEl.textContent = this.inventory.getSelectedBlockNameJp();
    this.updateHotbar();
  }

  private updateHotbar(): void {
    const slots = this.hotbarEl.querySelectorAll('.hotbar-slot');
    slots.forEach((slot, i) => {
      const el = slot as HTMLElement;
      if (i === this.inventory.selected) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
      const blockType = this.inventory.slots[i];
      el.textContent = getBlockNameJp(blockType);
      el.title = getBlockNameJp(blockType);
    });
  }

  /** Show the HUD. */
  show(): void {
    this.crosshairEl.style.display = 'block';
    this.hotbarEl.style.display = 'flex';
    this.coordsEl.style.display = 'block';
    this.fpsEl.style.display = 'block';
    this.blockNameEl.style.display = 'block';
    this.saveBtn.style.display = 'block';
    this.loadBtn.style.display = 'block';
  }

  /** Hide the HUD. */
  hide(): void {
    this.crosshairEl.style.display = 'none';
    this.hotbarEl.style.display = 'none';
    this.coordsEl.style.display = 'none';
    this.fpsEl.style.display = 'none';
    this.blockNameEl.style.display = 'none';
    this.saveBtn.style.display = 'none';
    this.loadBtn.style.display = 'none';
  }
}
