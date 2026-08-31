# Web Minecraft — 設計書 (Design Document)

> 対象: Web 上で動作する Minecraft 1.0 スタイル ボクセルゲーム
> 前提: 本文は英語。ゲーム内 UI / HUD は日本語。
> 依存: `docs/requirements.md`（要件定義書）

---

## 1. アーキテクチャ概要 (Architecture Overview)

```
┌─────────────────────────────────────────────────────────────┐
│                        Game (main loop)                       │
│  - requestAnimationFrame → render (Three.js)                 │
│  - fixed timestep accumulator → physics + redstone @ 20 TPS  │
└──────────────┬──────────────────────────────┬────────────────┘
               │                              │
   ┌───────────▼───────────┐      ┌───────────▼───────────┐
   │      World / Chunks    │      │      RedstoneSystem    │
   │ - block storage        │      │ - component registry   │
   │ - terrain generation   │◄────►│ - power propagation    │
   │ - block get/set        │      │ - tick (20 TPS)        │
   │ - raycast              │      │ - effects (piston/TNT) │
   └───────────┬───────────┘      └─────────────────────────┘
               │
   ┌───────────▼───────────┐      ┌─────────────────────────┐
   │   MeshBuilder / Render │      │   Player / Physics       │
   │ - chunk meshes         │      │ - AABB collision         │
   │ - texture atlas        │      │ - gravity / fly          │
   │ - day/night lighting   │      │ - input / camera         │
   └────────────────────────┘      └─────────────────────────┘
               │
   ┌───────────▼───────────┐
   │   UI / HUD (Japanese)  │
   │ - hotbar, crosshair,   │
   │ - coords, FPS, menus   │
   └────────────────────────┘
```

### 1.1 主要な設計原則
- **チャンク単位のメッシュ**: 各チャンクは露出面のみをマージした 1 つの Three.js Mesh として描画（面カリング）。ブロック変更時は該当チャンクのみ再メッシュ。
- **固定タイムステップ**: 物理・レッドストーンは 20 TPS の固定ステップ。レンダリングは rAF。accumulator パターンで同期。
- **自己完結**: 外部アセットなし。テクスチャは Canvas で手続き生成し TextureAtlas にまとめる。
- **型安全**: 全モジュール TypeScript strict。

## 2. ファイル構成 (File Structure)

```
candidate/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ src/
│  ├─ main.ts                     # エントリ、Game 生成
│  ├─ config.ts                   # 定数（ワールドサイズ、物理、レッドストーン）
│  ├─ game/
│  │  ├─ Game.ts                  # メインループ、各システム統合
│  │  ├─ World.ts                 # ブロックストレージ、get/set、チャンク管理
│  │  ├─ Chunk.ts                 # 単一チャンクのデータ + メッシュ
│  │  ├─ BlockTypes.ts            # ブロック ID 列挙、メタデータ
│  │  ├─ TerrainGen.ts            # 手続き地形生成
│  │  ├─ MeshBuilder.ts           # チャンクメッシュ生成（面カリング）
│  │  ├─ TextureAtlas.ts          # 手続きテクスチャ生成
│  │  ├─ Player.ts                # プレイヤー状態、入力、カメラ
│  │  ├─ Physics.ts               # 重力、AABB 衝突
│  │  ├─ Raycast.ts               # ブロック選択レイキャスト
│  │  ├─ Inventory.ts             # ホットバー
│  │  ├─ DayNight.ts              # 昼夜サイクル
│  │  ├─ Particles.ts             # 破壊パーティクル
│  │  ├─ Mobs.ts                  # 簡易モブ
│  │  └─ Fluids.ts                # 水/溶岩簡易流動
│  ├─ redstone/
│  │  ├─ RedstoneSystem.ts        # 全体制御、tick
│  │  ├─ PowerGrid.ts             # 電力伝播（BFS）
│  │  ├─ RedstoneTypes.ts         # コンポーネント ID、状態型
│  │  └─ components/
│  │     ├─ Component.ts          # 基底クラス
│  │     ├─ RedstoneDust.ts
│  │     ├─ RedstoneTorch.ts
│  │     ├─ RedstoneLamp.ts
│  │     ├─ Lever.ts
│  │     ├─ Button.ts
│  │     ├─ RedstoneBlock.ts
│  │     ├─ Repeater.ts
│  │     ├─ Comparator.ts
│  │     ├─ Observer.ts
│  │     ├─ Piston.ts
│  │     ├─ StickyPiston.ts
│  │     ├─ TNT.ts
│  │     ├─ DaylightDetector.ts
│  │     ├─ NoteBlock.ts
│  │     ├─ Hopper.ts
│  │     ├─ RedstoneOre.ts
│  │     └─ Target.ts
│  ├─ ui/
│  │  ├─ HUD.ts                   # クロスヘア、ホットバー、座標、FPS
│  │  ├─ StartScreen.ts           # 開始画面
│  │  └─ HelpOverlay.ts           # ヘルプ
│  ├─ audio/
│  │  └─ SoundManager.ts          # WebAudio 手続きサウンド
│  └─ utils/
│     ├─ SimplexNoise.ts
│     ├─ MathUtils.ts
│     └─ Vec3.ts
├─ tests/
│  ├─ terrain.test.ts
│  ├─ physics.test.ts
│  ├─ redstone-propagation.test.ts
│  ├─ redstone-components.test.ts
│  └─ world.test.ts
└─ e2e/
   └─ ui.spec.ts                  # Playwright
```

## 3. 世界 & 地形 (World & Terrain)

### 3.1 ブロックストレージ
- 各チャンクは `Uint8Array(16 * 64 * 16)` でブロック ID を保持。
- インデックス: `idx = (y * 16 + z) * 16 + x`（チャンク内ローカル座標）。
- 世界座標 → チャンク: `cx = floor(wx / 16)`, `cz = floor(wz / 16)`。
- `World.getBlock(wx,wy,wz)`, `World.setBlock(wx,wy,wz,id)`。境界外は AIR。
- レッドストーン状態（方向、電力、遅延など）は `World` に平行な `Map<PosKey, RedstoneState>` で管理（ブロック ID と分離）。

### 3.2 ブロック ID (BlockTypes)
```ts
enum Block {
  Air = 0, Grass, Dirt, Stone, Sand, Gravel,
  OakLog, OakLeaves, Planks, Water, Cobblestone,
  Bedrock,
  // redstone
  RedstoneDust, RedstoneTorch, RedstoneLamp, RedstoneBlock,
  Lever, Button, Repeater, Comparator, Observer,
  Piston, StickyPiston, TNT, DaylightDetector,
  NoteBlock, Hopper, RedstoneOre, Target,
}
```
- メタデータ: `{ solid: boolean, opaque: boolean, breakable: boolean, lightEmission: number, nameJp: string, texture: {top,bottom,side} }`
- `nameJp` は HUD 表示用の日本語名（例: 「草ブロック」「レッドストーン灯籠」）。

### 3.3 地形生成 (TerrainGen)
1. **高さmap**: 2D Simplex Noise（オクターブ合成）→ 各 (x,z) の地表高さ `h`。
2. **列の埋め込み**: y=0..h-1 をブロックで埋める。
   - 最下層 (y=0..2): Bedrock
   - 地表 (y=h): 群系に応じたブロック（草原=Grass、砂漠=Sand）
   - 地表下 3 ブロック: Dirt
   - それ以下: Stone
3. **群系**: 2D Noise（別シード）で決定。草原 / 砂漠 / 水辺。
4. **水**: 地表高さ < 水面高さ（例: y=30）の場所を Water で満たす（地表を Sand に）。
5. **洞窟**: 3D Simplex Noise。`noise(x,y,z) > threshold` の位置を AIR で掘削（Bedrock は除外）。
6. **木**: 草原群系で稀に生成。オーク原木 4–6 ブロック + 葉の塊（3×3×2 + 上面 1）。

### 3.4 決定論
- 地形はシードで決定論的（セーブ/ロード・テストのため）。`SimplexNoise(seed)`。

## 4. レンダリング (Rendering)

### 4.1 シーン
- `Scene`, `PerspectiveCamera` (FOV 70), `WebGLRenderer`。
- 空: 背景色 + フォグ（昼夜で変化）。
- 太陽/月: 方向光源 `DirectionalLight` + 環境光 `AmbientLight`。位置は時刻で更新。

### 4.2 チャンクメッシュ (MeshBuilder)
- 各チャンクについて、各ブロックの 6 面を走査。
- **面カリング**: 隣接ブロックが不透明で同じ高さならその面は出力しない。
- 半透明（葉、水）は別メッシュ（`transparent: true`, `depthWrite: false`）。
- 頂点データ: position, normal, uv（TextureAtlas 内座標）、color（簡易 AO / 面シェーディング）。
- 面シェーディング: 上面 1.0、側面 0.8/0.6、下面 0.5（Minecraft 風）。
- ブロック変更時: 該当チャンク（境界跨ぎなら隣チャンクも）を再メッシュ。

### 4.3 テクスチャアトラス (TextureAtlas)
- Canvas（例: 256×256）に各ブロックの 16×16 テクスチャを手続き生成で描画。
- `TextureLoader` ではなく `CanvasTexture`。
- 各ブロックの各面（top/bottom/side）がアトラス内の UV 矩形を指す。
- レッドストーンコンポーネントは方向・状態に応じたテクスチャ（例: 火把 ON/OFF、リピータ方向、ピストン頭）。

### 4.4 ブロックハイライト
- レイキャストで選択中のブロックを特定し、黒枠の `LineSegments`（Box3Helper 相当）を描画。

## 5. プレイヤー & 物理 (Player & Physics)

### 5.1 状態
```ts
{
  position: Vec3,   // 中心 (feet)
  velocity: Vec3,
  yaw, pitch,       // 視点
  onGround: boolean,
  flying: boolean,
  height: 1.8, width: 0.6,  // AABB
}
```

### 5.2 入力 (Player/Input)
- Pointer Lock API でマウス視点。`yaw -= dx*sens`, `pitch -= dy*sens`（pitch は ±90° 制限）。
- キーボード状態を保持し、毎フレーム移動ベクトルを計算。
- 左クリック=破壊、右クリック=設置（レイキャストで対象ブロック + 法線から設置位置）。
- ホイール/数字キーでホットバー選択。

### 5.3 物理 (Physics)
- 重力: `vy -= g*dt`（g ≈ 32 ブロック/s²、Minecraft 風）。
- ジャンプ: 地上で `vy = jumpSpeed`（≈ 8）。
- フライト: 重力無効、スペース=上昇、Shift=下降。
- **AABB 衝突**: 軸ごとに移動し、ワールドブロックと衝突判定。衝突時はその軸の速度を 0 にし、位置を調整。
- 落下ダメージは範囲外（簡易）。

### 5.4 レイキャスト (Raycast)
- DDA（Amanatides & Woo）アルゴリズムでカメラから最大距離（例: 6 ブロック）までブロック走査。
- 戻り値: `{ hit: boolean, blockPos, prevPos (設置位置), normal }`。

## 6. インベントリ & HUD (Inventory & HUD)

### 6.1 インベントリ
- ホットバー 9 スロット。各スロットはブロック ID（初期: 主要ブロックを配置）。
- 選択スロットインデックス（0–8）。
- 設置時は選択ブロックを `setBlock` に使用。

### 6.2 HUD（日本語）
- DOM 要素（Three.js 上にオーバーレイ）:
  - クロスヘア（中央 +）
  - ホットバー（9 枠、選択枠ハイライト、ブロック名日本語ツールチップ）
  - 左上: 座標 (x, y, z)、FPS
  - 選択ブロック名（日本語）
- `requestAnimationFrame` で FPS 更新（1 秒毎）。

### 6.3 メニュー
- **開始画面**: タイトル「Web Minecraft」、操作説明（日本語）、「クリックしてプレイ」。クリックで Pointer Lock。
- **ヘルプオーバーレイ**: ESC で表示。操作一覧（日本語）。

## 7. 昼夜サイクル (Day/Night)

- 時刻 `timeOfDay` ∈ [0, 1)。1 日 = 600 秒（10 分）。
- 太陽方位角 = `timeOfDay * 2π`。
- 空色: 昼（明るい青）→ 夜（暗い青黒）を補間。フォグも同期。
- 方向光源の強度・位置を更新。
- `DaylightDetector` に時刻を供給。

## 8. レッドストーンシステム (Redstone System) — 詳細設計

### 8.1 全体構造
```ts
class RedstoneSystem {
  components: Map<PosKey, RedstoneComponent>;
  tick(): void;   // 20 TPS で Game から呼ばれる
}
```
- `World.setBlock` でレッドストーン系ブロックが置かれると、`RedstoneSystem` にコンポーネントを登録。
- 削除されると解除。
- 各コンポーネントは `tick(state, ctx)` を持つ。`ctx` は電力クエリ・ブロック変更・イベント発行の接口。

### 8.2 電力モデル (PowerGrid)
- **強い電源**（strong power, level 15）: レッドストーンブロック、レッドストーン鉱石、点灯中の火把、ON のレバー、押下中のボタン、日中検知器（出力）、リピータ/コンパレータ出力、オブザーバ出力、ピストン（電力中）、TNT（着火中）。
- **伝播アルゴリズム**（各 tick）:
  1. 全強い電源をキューに投入（level 15）。
  2. BFS: 隣接 6 方向のレッドストーン（dust）に `min(15, currentLevel - 1)` を伝播（既に高い値があれば更新しない）。
  3. 火把の支持ブロックが電力を受けると火把は消灯（反転）。火把の電力状態は「支持ブロックの電力」で決定。
  4. 結果: 各 dust の電力レベル（0–15）を格納。
- **電力クエリ API**:
  - `isPowered(pos)`: 該ブロックが強い/弱い電力を受けているか。
  - `getDustLevel(pos)`: dust の電力レベル。
  - `isStronglyPowered(pos)`: 強い電力か。
- **火把の特殊性**: 火把は「支持ブロック（下のブロック or 壁のブロック）が電力を受けるか」で ON/OFF。ON 時は自身を強い電源として扱う。

### 8.3 コンポーネント詳細

#### RedstoneDust
- 状態: 電力レベル（PowerGrid が計算）。
- 描画: 電力レベルに応じた明るさ（0=暗い、15=明るい）。

#### RedstoneTorch
- 状態: on/off。
- ロジック: `support = 下のブロック（壁なら壁のブロック）`。`powered = isPowered(support)`。`on = !powered`。
- ON 時は強い電源（15）として隣接 dust を駆動。

#### RedstoneLamp
- 状態: lit/unlit。
- ロジック: `lit = isPowered(pos) || 隣接 dust の電力 > 0`。
- 描画: lit 時は発光テクスチャ + 点光源（簡易: 発光テクスチャのみ）。

#### Lever
- 状態: on/off（トグル）。
- 操作: 右クリックで切替。ON 時は強い電源（15）。

#### Button
- 状態: pressed, pressTime。
- 操作: 右クリックで押下。押下から **10 秒**（200 tick）後に解放。
- 押下中は強い電源（15）。

#### RedstoneBlock
- 常時強い電源（15）。

#### Repeater
- 状態: `facing`（出力方向）、`delay`（1–4 tick）、`locked`（コンパレータロック用）、`inputLevel`。
- 操作: 右クリックで facing 切替（4 方向）。Shift+右クリックで delay 切替（1→2→3→4→1）。
- ロジック（各 tick）:
  - `input = getInputLevel()`（入力面の電力）。
  - `locked && input < lockedLevel` → 出力 0。
  - それ以外: `input > 0` なら `delay` tick 後に出力 15、`input == 0` なら `delay` tick 後に出力 0（遅延バッファ）。
- 出力は `facing` 方向の隣接 dust を駆動。

#### Comparator
- 状態: `facing`、`mode`（subtract / compare）、`locked`（リピータロック用）。
- 操作: 右クリックで facing、Shift+右クリックで mode 切替。
- ロジック:
  - `input`（背面）、`side1`, `side2`（側面の電力、簡易: 隣接 dust）。
  - subtract: `out = max(0, input - max(side1, side2))`。
  - compare: `out = (input > max(side1,side2)) ? input : 0`。
  - 隣接リピータをロック: `lockedLevel = out`。

#### Observer
- 状態: `facing`（観察方向）、`lastObservedState`、`cooldown`。
- ロジック:
  - 各 tick、`facing` 方向のブロックの状態（ID + レッドストーン状態）を記録。
  - 前_tick と異なったら、`cooldown`（1 tick）後に出力 15（1 tick パルス）。
  - 出力は背面（観察方向の反対）の隣接 dust を駆動。

#### Piston / StickyPiston
- 状態: `facing`、`extended`。
- ロジック:
  - `powered = isPowered(pos)`。
  - `powered && !extended` → 伸長（`extended = true`）。伸長先（`facing` 方向）の最大 12 ブロックを `facing` 方向に 1 ブロック移動。
    - 不可動ブロック（Bedrock 等）やプレイヤー/モブと衝突すれば伸長しない。
    - StickyPiston: 伸長時に頭部のブロックを「保持」。
  - `!powered && extended` → 縮退（`extended = false`）。頭部を戻す。StickyPiston は保持ブロックも引き戻す。
  - 伸長中は強い電源（15）。
  - ブロック移動は `World.setBlock` 経由 + オブザーバ検知トリガー。

#### TNT
- 状態: `fuse`（着火後のカウントダウン）、`lit`。
- ロジック:
  - `powered && !lit` → `lit = true`, `fuse = 36 tick`（1.8s）。
  - `!powered && lit` → `lit = false`（消火）。
  - `fuse` が 0 → 爆発: 半径 ~4–5 ブロックの範囲（乱数で不均一）の破壊可能ブロックを AIR に。Bedrock は除外。他の TNT を連鎖着火。
  - 着火中は強い電源（15）。

#### DaylightDetector
- 状態: `inverted`。
- ロジック:
  - `sunLevel = f(timeOfDay)`（太陽高度に基づく 0–15。昼 15、夜 0、それ以外補間）。
  - `out = inverted ? (15 - sunLevel) : sunLevel`。
  - 出力は上の dust を駆動（強い電源）。

#### NoteBlock
- 状態: `note`（0–14）。
- ロジック: `powered` 時に `note` に対応する音程を再生（SoundManager）。音程は下部ブロックの ID で決定（簡易: 固定 or 下部ブロックで変化）。

#### Hopper
- 状態: `disabled`。
- ロジック: `powered` 时无効化（移送停止）。移送は簡易（隣接コンテナ間、範囲外ならスキップ）。

#### RedstoneOre
- 常時強い電源（15）。

#### Target
- 状態: 撃ち抜かれ回数（簡易）。弾丸検知は範囲外ならスキップ。

### 8.4 tick 順序（重要）
```
RedstoneSystem.tick():
  1. timeOfDay を DaylightDetector に供給
  2. 入力更新: Button の pressTime 進行/解放、Lever は外部トグル
  3. PowerGrid.recompute():
     - 強い電源を収集
     - BFS で dust 電力を計算
     - 火把の on/off を支持ブロック電力で確定
  4. コンポーネント更新（電力クエリを使用）:
     - Repeater / Comparator: 遅延バッファ進行、出力確定
     - Observer: 観察ブロックの変化検知 → パルス発行
     - Lamp: lit 確定
     - Piston/StickyPiston: 伸縮判定 → ブロック移動（World.setBlock + Observer トリガー）
     - TNT: fuse 進行 → 爆発
     - NoteBlock: 音再生
  5. ブロック変化の適用（ピストン推進、TNT 爆発）→ 変更ブロックを Observer に通知
```
- **注意**: ピストン/TNT によるブロック変更は同じ tick 内で Observer に反映されるよう、変更キューを保持し末尾で処理。

### 8.5 描画との連携
- 各コンポーネントは `getMeshState()` で現在の描画状態（方向、ON/OFF、電力レベル）を返す。
- MeshBuilder はブロック ID + レッドストーン状態を見て適切なテクスチャ UV を選択。
- 状態変化（火把消灯、灯籠点灯、リピータ方向、ピストン伸長）時は該当チャンクを再メッシュ。

## 9. Phase 2 機能

### 9.1 水/溶岩 (Fluids)
- Water/Lava は非固体。プレイヤーは減速（水中 0.5×）。
- 簡易流動: 毎 tick、隣接が AIR なら拡散（速度制限）。複雑な流体は範囲外。

### 9.2 簡易モブ (Mobs)
- 受動モブ 1 種（豚）。AABB、重力、衝突。
- 単純 AI: 無作為移動、落下回避。プレイヤーに追従しない。

### 9.3 パーティクル & サウンド
- ブロック破壊時に該ブロック色的小粒子を発生（数秒で消滅）。
- SoundManager: WebAudio で破壊音・設置音・音符・爆発音を手続き生成（OscillatorNode + 包絡）。

### 9.4 セーブ/ロード
- `localStorage` にブロックデータ（チャンク単位、base64 or 圧縮）+ レッドストーン状態 + プレイヤー位置 + 時刻を保存。
- 「セーブ」「ロード」ボタン（日本語）。

## 10. パフォーマンス (Performance)

- **面カリング**: 露出面のみメッシュ化。
- **チャンク再メッシュ**: 変更チャンクのみ。
- **電力伝播**: 強い電源からの BFS。全ワールド走査しない（active set）。
- **Frustum culling**: Three.js 標準。
- 目標: 128×128×64 で 60 FPS。

## 11. テスト戦略 (Testing Strategy)

- **Vitest**（ユニット）:
  - `terrain.test.ts`: 高さmap の範囲、Bedrock 存在、決定論（同一シードで同一結果）、木/水生成。
  - `world.test.ts`: get/set、境界外、チャンクインデックス。
  - `physics.test.ts`: 重力、AABB 衝突、ジャンプ。
  - `redstone-propagation.test.ts`: dust 伝播の減衰（15→14→...→1、15 ブロックで停止）、強い電源。
  - `redstone-components.test.ts`: 火把反転、リピータ遅延、コンパレータ減算/比較、オブザーバ検知、ピストン伸縮、TNT 爆発範囲、日中検知器出力。
- **Playwright**（E2E/UI）:
  - 開始画面表示、クリックでワールド遷移、HUD（日本語）表示、ブロック設置/破壊。
  - スクリーンショットで UI 品質確認。

## 12. 設定 (config.ts)

```ts
export const CONFIG = {
  chunk: { sizeX: 16, sizeY: 64, sizeZ: 16 },
  world: { chunksX: 8, chunksZ: 8 },   // 128 x 128
  physics: { gravity: 32, jumpSpeed: 8, walkSpeed: 4.3, flySpeed: 10, reach: 6 },
  dayNight: { dayLengthSec: 600 },
  redstone: { tps: 20, maxReach: 15, buttonHoldTicks: 200, tntFuseTicks: 36, tntRadius: 5 },
  seed: 1337,
};
```
