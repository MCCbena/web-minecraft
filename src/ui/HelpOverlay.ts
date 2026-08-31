/**
 * Help overlay showing controls in Japanese.
 */
export class HelpOverlay {
  private container: HTMLElement;
  private overlay!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createElements();
  }

  private createElements(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'help-overlay';
    this.overlay.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'help-content';
    content.innerHTML = `
      <h2>操作方法</h2>
      <ul>
        <li><strong>WASD</strong> — 移動</li>
        <li><strong>マウス</strong> — 視点操作</li>
        <li><strong>左クリック</strong> — ブロック破壊</li>
        <li><strong>右クリック</strong> — ブロック設置</li>
        <li><strong>スペース</strong> — ジャンプ / フライト切替</li>
        <li><strong>1〜9</strong> — ホットバー選択</li>
        <li><strong>マウスホイール</strong> — ホットバー切替</li>
        <li><strong>ESC</strong> — ポインタ解放 / ヘルプ</li>
      </ul>
      <p class="tip">ESCを再度押して閉じます</p>
    `;

    this.overlay.appendChild(content);
    this.container.appendChild(this.overlay);
  }

  show(): void {
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  getOverlay(): HTMLElement {
    return this.overlay;
  }
}
