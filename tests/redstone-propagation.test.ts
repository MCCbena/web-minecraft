import { describe, it, expect, beforeEach } from 'vitest';
import { PowerGrid } from '../src/redstone/PowerGrid.js';
import { RedstoneStateStore } from '../src/redstone/RedstoneTypes.js';

/** Default redstone state */
function defaultState(): any {
  return {
    facing: 0, delay: 1, mode: 0, on: false, pressedTicks: 0,
    fuse: 0, extended: false, lockedLevel: -1, lastObserved: '',
    cooldown: 0, note: 0, inputLevel: 0, inputChanged: false,
    prevOutput: 0, powered: false, prevLit: false, inverted: false, _delayCounter: 0,
  };
}

/**
 * Helper: create a mock world with a simple flat terrain.
 */
function createMockWorld(): {
  getBlock: (x: number, y: number, z: number) => number;
  setBlock: (x: number, y: number, z: number, type: number) => void;
} {
  const blocks = new Map<string, number>();

  // Generate a flat world at y=10
  for (let x = -20; x <= 20; x++) {
    for (let z = -20; z <= 20; z++) {
      blocks.set(`${x},10,${z}`, 3); // Stone
      blocks.set(`${x},9,${z}`, 3); // Stone
    }
  }

  return {
    getBlock(x, y, z) {
      return blocks.get(`${x},${y},${z}`) ?? 0; // 0 = Air
    },
    setBlock(x, y, z, type) {
      blocks.set(`${x},${y},${z}`, type);
    },
  };
}

describe('Redstone Propagation', () => {
  let powerGrid: PowerGrid;
  let stateStore: RedstoneStateStore;
  let world: ReturnType<typeof createMockWorld>;

  beforeEach(() => {
    powerGrid = new PowerGrid();
    stateStore = new RedstoneStateStore();
    world = createMockWorld();
  });

  it('R-01: 減衰 — 強い電源(15)からdustが14,13,...,1で伝播', () => {
    // Place a RedstoneBlock (type 18) at x=0, and dust from x=1 to x=14
    world.setBlock(0, 10, 0, 18); // RedstoneBlock
    stateStore.set(0, 10, 0, defaultState());

    for (let i = 1; i <= 14; i++) {
      world.setBlock(i, 10, 0, 13); // RedstoneDust
      stateStore.set(i, 10, 0, defaultState());
    }

    powerGrid.recompute(world.getBlock, stateStore);

    // Dust at distance i gets level 15-i
    for (let i = 1; i <= 14; i++) {
      expect(powerGrid.getDustLevel(i, 10, 0)).toBe(15 - i);
    }
  });

  it('R-02: 範囲制限 — 15ブロック目は電力0', () => {
    world.setBlock(0, 10, 0, 18); // RedstoneBlock
    stateStore.set(0, 10, 0, defaultState());

    for (let i = 1; i <= 15; i++) {
      world.setBlock(i, 10, 0, 13); // RedstoneDust
      stateStore.set(i, 10, 0, defaultState());
    }

    powerGrid.recompute(world.getBlock, stateStore);

    // Dust at distance 14 has level 1, dust at distance 15 has level 0 (signal stopped)
    expect(powerGrid.getDustLevel(14, 10, 0)).toBe(1);
    expect(powerGrid.getDustLevel(15, 10, 0)).toBe(0);
  });

  it('R-03: 強い電源 — レッドストーンブロックが隣接dustを駆動', () => {
    world.setBlock(0, 10, 0, 18); // RedstoneBlock
    stateStore.set(0, 10, 0, defaultState());

    world.setBlock(1, 10, 0, 13); // RedstoneDust adjacent
    stateStore.set(1, 10, 0, defaultState());

    powerGrid.recompute(world.getBlock, stateStore);

    expect(powerGrid.getDustLevel(1, 10, 0)).toBe(14); // 15 - 1 = 14
  });

  it('R-04: 火把反転 — 支持ブロック無電力→火把ON(15)、有電力→火把OFF(0)', () => {
    // Scenario 1: Torch on unpowered block
    world.setBlock(0, 10, 0, 3); // Stone (unpowered)
    world.setBlock(0, 11, 0, 14); // RedstoneTorch on top
    const torchState = defaultState();
    torchState.on = true; // Torch is lit
    stateStore.set(0, 11, 0, torchState);

    powerGrid.recompute(world.getBlock, stateStore);

    // Torch should be a strong source (lit)
    expect(powerGrid.isStronglyPowered(0, 11, 0)).toBe(true);

    // Scenario 2: Powered dust next to torch support
    const stateStore2 = new RedstoneStateStore();
    world.setBlock(0, 10, 0, 3); // Stone
    world.setBlock(-1, 10, 0, 18); // RedstoneBlock (powers the stone)
    stateStore2.set(-1, 10, 0, defaultState());

    world.setBlock(0, 11, 0, 14); // RedstoneTorch on top of powered stone
    const torchState2 = defaultState();
    torchState2.on = true; // Torch starts lit
    stateStore2.set(0, 11, 0, torchState2);

    powerGrid.recompute(world.getBlock, stateStore2);

    // Torch should NOT be a strong source (support is powered)
    expect(powerGrid.isStronglyPowered(0, 11, 0)).toBe(false);
  });

  it('R-05: 分岐 — 電源から分岐したdustが両方駆動', () => {
    world.setBlock(0, 10, 0, 18); // RedstoneBlock
    stateStore.set(0, 10, 0, defaultState());

    // Branch 1: +X direction
    world.setBlock(1, 10, 0, 13);
    world.setBlock(2, 10, 0, 13);
    // Branch 2: -X direction
    world.setBlock(-1, 10, 0, 13);
    world.setBlock(-2, 10, 0, 13);

    for (const x of [1, 2, -1, -2]) {
      stateStore.set(x, 10, 0, defaultState());
    }

    powerGrid.recompute(world.getBlock, stateStore);

    expect(powerGrid.getDustLevel(1, 10, 0)).toBe(14);
    expect(powerGrid.getDustLevel(2, 10, 0)).toBe(13);
    expect(powerGrid.getDustLevel(-1, 10, 0)).toBe(14);
    expect(powerGrid.getDustLevel(-2, 10, 0)).toBe(13);
  });
});
