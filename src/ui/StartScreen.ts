/**
 * Start screen overlay with title and controls in Japanese.
 */
export class StartScreen {
  private container: HTMLElement;
  private overlay!: HTMLElement;
  private button!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createElements();
  }

  private createElements(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'start-screen';

    const title = document.createElement('h1');
    title.textContent = 'Web Minecraft';
    title.className = 'title';

    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.innerHTML = `
      <h2>操作方法</h2>
      <ul>
        <li>WASD — 移動</li>
        <li>マウス — 視点操作</li>
        <li>左クリック — ブロック破壊</li>
        <li>右クリック — ブロック設置</li>
        <li>スペース — ジャンプ / フライト切替</li>
        <li>1〜9 — ホットバー選択</li>
        <li>マウスホイール — ホットバー切替</li>
        <li>ESC — ヘルプ表示</li>
      </ul>
    `;

    this.button = document.createElement('div');
    this.button.className = 'play-button';
    this.button.textContent = 'クリックしてプレイ';

    this.overlay.appendChild(title);
    this.overlay.appendChild(controls);
    this.overlay.appendChild(this.button);
    this.container.appendChild(this.overlay);
  }

  /** Show start screen. */
  show(): void {
    this.overlay.style.display = 'flex';
  }

  /** Hide start screen. */
  hide(): void {
    this.overlay.style.display = 'none';
  }

  /** Get the click target. */
  getButton(): HTMLElement {
    return this.button;
  }

  /** Get the overlay element. */
  getOverlay(): HTMLElement {
    return this.overlay;
  }
}
