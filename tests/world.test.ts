import { describe, it, expect } from 'vitest';
import { World } from '../src/game/World.js';
import { BlockType } from '../src/game/BlockTypes.js';
import { CONFIG, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z } from '../src/config.js';

describe('World', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.generateEmpty();
  });

  it('W-01: set/get — 設定したブロックが読み出せる', () => {
    world.setBlock(10, 20, 30, BlockType.Stone);
    expect(world.getBlock(10, 20, 30)).toBe(BlockType.Stone);
  });

  it('W-02: 境界外 — 境界外 get は AIR、set は無視', () => {
    // Out of bounds get
    expect(world.getBlock(-1, 0, 0)).toBe(BlockType.Air);
    expect(world.getBlock(0, -1, 0)).toBe(BlockType.Air);
    expect(world.getBlock(0, 0, -1)).toBe(BlockType.Air);
    expect(world.getBlock(WORLD_SIZE_X, 0, 0)).toBe(BlockType.Air);
    expect(world.getBlock(0, WORLD_SIZE_Y, 0)).toBe(BlockType.Air);
    expect(world.getBlock(0, 0, WORLD_SIZE_Z)).toBe(BlockType.Air);

    // Out of bounds set should fail
    expect(world.setBlock(-1, 0, 0, BlockType.Stone)).toBe(false);
    expect(world.setBlock(WORLD_SIZE_X, 0, 0, BlockType.Stone)).toBe(false);
  });

  it('W-03: インデックス — 世界座標 ↔ チャンクローカル座標の変換が正しい', () => {
    // Test chunk boundary
    const chunkSize = CONFIG.chunk.sizeX;
    // Block at local (0, 0, 0) of chunk 1,1 should be world (16, 0, 16)
    world.setBlock(16, 5, 16, BlockType.Grass);
    expect(world.getBlock(16, 5, 16)).toBe(BlockType.Grass);

    // Block at local (15, 63, 15) of chunk 0,0 should be world (15, 63, 15)
    world.setBlock(15, 63, 15, BlockType.Dirt);
    expect(world.getBlock(15, 63, 15)).toBe(BlockType.Dirt);
  });

  it('W-04: 破壊不可 — Bedrock は set(Air) で無効', () => {
    // Set bedrock
    world.setBlock(10, 0, 10, BlockType.Bedrock);
    expect(world.getBlock(10, 0, 10)).toBe(BlockType.Bedrock);

    // Try to break it
    const result = world.setBlock(10, 0, 10, BlockType.Air);
    expect(result).toBe(false);
    // Should still be bedrock
    expect(world.getBlock(10, 0, 10)).toBe(BlockType.Bedrock);
  });

  it('W-05: チャンク境界を跨ぐアクセスが正しく動作する', () => {
    // Set a block at the boundary between chunk 0 and chunk 1
    world.setBlock(15, 10, 15, BlockType.Stone);
    expect(world.getBlock(15, 10, 15)).toBe(BlockType.Stone);

    world.setBlock(16, 10, 16, BlockType.Dirt);
    expect(world.getBlock(16, 10, 16)).toBe(BlockType.Dirt);

    // They should be independent
    expect(world.getBlock(15, 10, 15)).toBe(BlockType.Stone);
    expect(world.getBlock(16, 10, 16)).toBe(BlockType.Dirt);
  });

  it('W-06: 複数のブロック設定と読み出し', () => {
    const blocks: [number, number, number, BlockType][] = [
      [0, 0, 0, BlockType.Bedrock],
      [10, 10, 10, BlockType.Grass],
      [50, 30, 50, BlockType.Stone],
      [100, 50, 100, BlockType.OakLog],
    ];
    for (const [x, y, z, type] of blocks) {
      world.setBlock(x, y, z, type);
    }
    for (const [x, y, z, type] of blocks) {
      expect(world.getBlock(x, y, z)).toBe(type);
    }
  });
});
