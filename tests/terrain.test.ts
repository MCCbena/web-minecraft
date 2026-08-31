import { describe, it, expect } from 'vitest';
import { World } from '../src/game/World.js';
import { TerrainGen } from '../src/game/TerrainGen.js';
import { BlockType } from '../src/game/BlockTypes.js';
import { CONFIG, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z, WATER_LEVEL } from '../src/config.js';

describe('TerrainGen', () => {
  const seed = 1337;
  let world: World;

  beforeAll(() => {
    world = new World();
    world.generateEmpty();
    const gen = new TerrainGen(seed);
    gen.generate(world);
  });

  /** Find surface Y for a column (highest non-air, non-water block). */
  function surfaceY(x: number, z: number): number {
    for (let y = WORLD_SIZE_Y - 1; y >= 0; y--) {
      const b = world.getBlock(x, y, z);
      if (b !== BlockType.Air && b !== BlockType.Water) return y;
    }
    return -1;
  }

  it('T-01: 高さmap の範囲 — サンプル列で 0 < h < 64', () => {
    const step = 2;
    for (let x = 0; x < WORLD_SIZE_X; x += step) {
      for (let z = 0; z < WORLD_SIZE_Z; z += step) {
        const h = surfaceY(x, z);
        if (h >= 0) {
          expect(h).toBeGreaterThan(0);
          expect(h).toBeLessThan(WORLD_SIZE_Y);
        }
      }
    }
  });

  it('T-02: ベッドロック — y=0..2 が Bedrock (サンプル)', () => {
    const step = 4;
    for (let x = 0; x < WORLD_SIZE_X; x += step) {
      for (let z = 0; z < WORLD_SIZE_Z; z += step) {
        for (let y = 0; y <= 2; y++) {
          expect(world.getBlock(x, y, z)).toBe(BlockType.Bedrock);
        }
      }
    }
  });

  it('T-03: 決定論 — 同一シードで 2 回生成し、全ブロック一致', () => {
    const w2 = new World();
    w2.generateEmpty();
    const gen = new TerrainGen(seed);
    gen.generate(w2);
    // Sample
    const step = 4;
    for (let x = 0; x < WORLD_SIZE_X; x += step) {
      for (let y = 0; y < WORLD_SIZE_Y; y += 4) {
        for (let z = 0; z < WORLD_SIZE_Z; z += step) {
          expect(world.getBlock(x, y, z)).toBe(w2.getBlock(x, y, z));
        }
      }
    }
  });

  it('T-04: 群系 — 草原と砂漠が存在', () => {
    let hasGrass = false;
    let hasSand = false;
    const step = 2;
    outer: for (let x = 0; x < WORLD_SIZE_X; x += step) {
      for (let z = 0; z < WORLD_SIZE_Z; z += step) {
        const sy = surfaceY(x, z);
        if (sy >= 0) {
          const b = world.getBlock(x, sy, z);
          if (b === BlockType.Grass) hasGrass = true;
          if (b === BlockType.Sand) hasSand = true;
        }
        if (hasGrass && hasSand) break outer;
      }
    }
    expect(hasGrass).toBe(true);
    expect(hasSand).toBe(true);
  });

  it('T-05: 木 — 原木 + 葉が少なくとも 1 本生成', () => {
    // Search first quarter of world (should contain trees based on generation)
    let hasLog = false;
    let hasLeaves = false;
    const limit = Math.floor(WORLD_SIZE_X / 2);
    for (let x = 0; x < limit && !hasLog; x++) {
      for (let y = 0; y < WORLD_SIZE_Y && !hasLog; y++) {
        for (let z = 0; z < limit && !hasLog; z++) {
          const b = world.getBlock(x, y, z);
          if (b === BlockType.OakLog) hasLog = true;
          if (b === BlockType.OakLeaves) hasLeaves = true;
        }
      }
    }
    expect(hasLog).toBe(true);
    expect(hasLeaves).toBe(true);
  });

  it('T-06: 水 — 低地に Water が存在', () => {
    let hasWater = false;
    const step = 4;
    outer: for (let x = 0; x < WORLD_SIZE_X; x += step) {
      for (let y = 10; y <= WATER_LEVEL; y += 3) {
        for (let z = 0; z < WORLD_SIZE_Z; z += step) {
          if (world.getBlock(x, y, z) === BlockType.Water) {
            hasWater = true;
            break outer;
          }
        }
      }
    }
    expect(hasWater).toBe(true);
  });

  it('T-07: 洞窟 — 地下に AIR の空洞が生成される', () => {
    let airCount = 0;
    const step = 4;
    for (let x = 0; x < WORLD_SIZE_X; x += step) {
      for (let y = 5; y < 30; y += 3) {
        for (let z = 0; z < WORLD_SIZE_Z; z += step) {
          if (world.getBlock(x, y, z) === BlockType.Air) {
            airCount++;
          }
        }
      }
    }
    expect(airCount).toBeGreaterThan(5);
  });
});
