import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../src/game/World.js';
import { SaveSystem } from '../src/game/SaveSystem.js';
import { BlockType } from '../src/game/BlockTypes.js';
import { CONFIG, WORLD_SIZE_Y } from '../src/config.js';

describe('SaveSystem', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.generateEmpty();
  });

  it('save->load round-trip preserves blocks exactly', () => {
    // Set some blocks
    world.setBlock(5, 10, 5, BlockType.Grass);
    world.setBlock(10, 20, 10, BlockType.Stone);
    world.setBlock(20, 5, 20, BlockType.Dirt);
    world.setBlock(0, 0, 0, BlockType.Bedrock);

    const json = SaveSystem.serialize(world, { x: 64, y: 32, z: 64 }, 0.25);
    expect(json).toBeTruthy();

    const loaded = SaveSystem.deserialize(json);
    expect(loaded).not.toBeNull();
    expect(loaded!.chunks.length).toBe(CONFIG.world.chunksX * CONFIG.world.chunksZ);

    // Verify all chunks are restored
    const origChunks = world.getAllChunks();
    for (let i = 0; i < origChunks.length; i++) {
      expect(Array.from(origChunks[i].data)).toEqual(Array.from(loaded!.chunks[i]));
    }
  });

  it('save->load round-trip preserves player position exactly', () => {
    world.setBlock(10, 10, 10, BlockType.Stone);

    const playerPos = { x: 42.5, y: 25.3, z: 78.9 };
    const json = SaveSystem.serialize(world, playerPos, 0.5);
    const loaded = SaveSystem.deserialize(json);

    expect(loaded).not.toBeNull();
    expect(loaded!.player.x).toBe(42.5);
    expect(loaded!.player.y).toBe(25.3);
    expect(loaded!.player.z).toBe(78.9);
  });

  it('save->load round-trip preserves timeOfDay exactly', () => {
    world.setBlock(10, 10, 10, BlockType.Stone);

    const json = SaveSystem.serialize(world, { x: 0, y: 0, z: 0 }, 0.75);
    const loaded = SaveSystem.deserialize(json);

    expect(loaded).not.toBeNull();
    expect(loaded!.timeOfDay).toBe(0.75);
  });

  it('deserialize returns null for invalid JSON', () => {
    expect(SaveSystem.deserialize('not json')).toBeNull();
    expect(SaveSystem.deserialize('')).toBeNull();
    expect(SaveSystem.deserialize(null as any)).toBeNull();
  });

  it('deserialize returns null for malformed data', () => {
    expect(SaveSystem.deserialize(JSON.stringify({ chunks: 'invalid-base64!!!' }))).toBeNull();
  });

  it('serialize produces deterministic output', () => {
    world.setBlock(5, 10, 5, BlockType.Grass);
    world.setBlock(10, 20, 10, BlockType.Stone);

    const json1 = SaveSystem.serialize(world, { x: 1, y: 2, z: 3 }, 0.1);
    const json2 = SaveSystem.serialize(world, { x: 1, y: 2, z: 3 }, 0.1);

    expect(json1).toBe(json2);
  });

  it('empty world serializes and deserializes correctly', () => {
    const json = SaveSystem.serialize(world, { x: 0, y: 0, z: 0 }, 0);
    const loaded = SaveSystem.deserialize(json);

    expect(loaded).not.toBeNull();
    // All chunks should be all zeros (Air)
    for (const chunk of loaded!.chunks) {
      for (let i = 0; i < chunk.length; i++) {
        expect(chunk[i]).toBe(0); // BlockType.Air = 0
      }
    }
  });
});
