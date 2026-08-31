import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../src/game/World.js';
import { Fluids } from '../src/game/Fluids.js';
import { BlockType } from '../src/game/BlockTypes.js';
import { CONFIG, WORLD_SIZE_Y } from '../src/config.js';

describe('Fluids', () => {
  let world: World;
  let fluids: Fluids;

  beforeEach(() => {
    world = new World();
    world.generateEmpty();
    fluids = new Fluids(world);
  });

  /**
   * Helper: build a column of blocks from y=0 to y=height-1,
   * with the top block being the given type.
   */
  function buildPlatform(startY: number, size: number, type: BlockType = BlockType.Stone): void {
    for (let x = 5; x < 5 + size; x++) {
      for (let z = 5; z < 5 + size; z++) {
        for (let y = startY; y < startY + 3; y++) {
          world.setBlock(x, y, z, BlockType.Stone);
        }
        world.setBlock(x, startY + 3, z, type);
      }
    }
  }

  it('fluid water flows down into air', () => {
    // Place a water block at y=20, with air below it
    world.setBlock(8, 20, 8, BlockType.Water);
    // Stone below to stop flow
    world.setBlock(8, 19, 8, BlockType.Stone);

    const initialCount = countFluid(BlockType.Water);
    fluids.tick(0); // Water flows every tick

    // Water should have flowed down to y=19... but y=19 is stone, so it stays
    // Actually let's test: water at y=20, air at y=19
    world.setBlock(8, 19, 8, BlockType.Air);
    fluids.tick(0);

    // Water should have flowed down
    expect(world.getBlock(8, 19, 8)).toBe(BlockType.Water);
  });

  it('fluid lava flows slower than water', () => {
    // Water at y=20, air below
    world.setBlock(8, 20, 8, BlockType.Water);
    world.setBlock(8, 19, 8, BlockType.Air);
    world.setBlock(8, 18, 8, BlockType.Stone);

    // Lava at y=20, air below
    world.setBlock(9, 20, 8, BlockType.Lava);
    world.setBlock(9, 19, 8, BlockType.Air);
    world.setBlock(9, 18, 8, BlockType.Stone);

    // Water should flow immediately (every tick)
    fluids.tick(0);
    expect(world.getBlock(8, 19, 8)).toBe(BlockType.Water); // Water flowed

    // Lava should NOT flow on tick 0 (flows every 3 ticks)
    // tickCount 0: 0 % 3 === 0, so lava also flows. Let's use tick 1.
    // Reset
    world.setBlock(8, 19, 8, BlockType.Air);
    world.setBlock(9, 19, 8, BlockType.Air);

    fluids.tick(1); // Lava: 1 % 3 !== 0, so lava doesn't flow; water does
    expect(world.getBlock(8, 19, 8)).toBe(BlockType.Water); // Water flowed
    expect(world.getBlock(9, 19, 8)).toBe(BlockType.Air); // Lava did NOT flow
  });

  it('fluid count cap is respected', () => {
    // Fill a large area with water source blocks
    for (let x = 5; x < 20; x++) {
      for (let z = 5; z < 20; z++) {
        world.setBlock(x, 20, z, BlockType.Water);
        world.setBlock(x, 19, z, BlockType.Stone);
      }
    }

    const beforeCount = countFluid(BlockType.Water);

    // Tick with a very low cap
    fluids.tick(0, 10);

    const afterCount = countFluid(BlockType.Water);
    const added = afterCount - beforeCount;
    expect(added).toBeLessThanOrEqual(10);
  });

  it('fluids do not overwrite solid blocks', () => {
    // Water source above a solid block
    world.setBlock(8, 20, 8, BlockType.Water);
    world.setBlock(8, 19, 8, BlockType.Grass); // Solid
    world.setBlock(8, 18, 8, BlockType.Stone);

    fluids.tick(0);

    // Water should not flow into the grass block
    expect(world.getBlock(8, 19, 8)).toBe(BlockType.Grass);
  });

  it('fluids do not overwrite other fluid types', () => {
    // Water next to lava
    world.setBlock(8, 20, 8, BlockType.Water);
    world.setBlock(9, 20, 8, BlockType.Lava);
    world.setBlock(8, 19, 8, BlockType.Air);
    world.setBlock(9, 19, 8, BlockType.Air);

    fluids.tick(0);

    // Water should flow down but not overwrite lava
    expect(world.getBlock(8, 19, 8)).toBe(BlockType.Water);
    expect(world.getBlock(9, 20, 8)).toBe(BlockType.Lava);
  });

  it('isFluid static method works', () => {
    world.setBlock(8, 20, 8, BlockType.Water);
    world.setBlock(9, 20, 8, BlockType.Lava);
    world.setBlock(10, 20, 8, BlockType.Stone);

    expect(Fluids.isFluid(world, 8, 20, 8)).toBe(true);
    expect(Fluids.isFluid(world, 9, 20, 8)).toBe(true);
    expect(Fluids.isFluid(world, 10, 20, 8)).toBe(false);
  });

  it('water flows horizontally into air', () => {
    // Water at (8, 20, 8), stone below, air to the side
    world.setBlock(8, 20, 8, BlockType.Water);
    world.setBlock(8, 19, 8, BlockType.Stone);
    world.setBlock(9, 20, 8, BlockType.Air);
    world.setBlock(10, 20, 8, BlockType.Air);

    fluids.tick(0);

    // Water should flow horizontally
    expect(world.getBlock(9, 20, 8)).toBe(BlockType.Water);
  });

  function countFluid(type: BlockType): number {
    let count = 0;
    for (const chunk of world.getAllChunks()) {
      for (let y = 0; y < WORLD_SIZE_Y; y++) {
        for (let z = 0; z < CONFIG.chunk.sizeZ; z++) {
          for (let x = 0; x < CONFIG.chunk.sizeX; x++) {
            if (chunk.getLocal(x, y, z) === type) {
              count++;
            }
          }
        }
      }
    }
    return count;
  }
});
