import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../src/game/World.js';
import { Mob, PigMob } from '../src/game/Mobs.js';
import { BlockType } from '../src/game/BlockTypes.js';
import { CONFIG } from '../src/config.js';

describe('Mobs', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.generateEmpty();
  });

  /** Build a flat stone ground at the given Y. */
  function buildGround(surfaceY: number): void {
    for (let x = 0; x < 30; x++) {
      for (let z = 0; z < 30; z++) {
        for (let y = 0; y <= surfaceY; y++) {
          world.setBlock(x, y, z, BlockType.Stone);
        }
      }
    }
  }

  it('a pig on the ground stays on the ground (gravity + collision)', () => {
    buildGround(10);
    const pig = new PigMob(world, 10, 11.5, 10); // Spawn just above ground

    // Run several ticks with no horizontal movement
    for (let i = 0; i < 100; i++) {
      pig.updateAI(1 / 20);
    }

    // Pig should be on the ground (y ≈ 11, which is surfaceY + 1)
    expect(pig.state.onGround).toBe(true);
    // Position should be near the surface
    expect(pig.state.position.y).toBeGreaterThan(10);
    expect(pig.state.position.y).toBeLessThanOrEqual(12);
  });

  it('a pig walks (position changes over ticks)', () => {
    buildGround(10);
    const pig = new PigMob(world, 10, 11.5, 10);

    // Force a direction
    pig['moveDir'].set(1, 0, 0);

    const startX = pig.state.position.x;

    for (let i = 0; i < 60; i++) {
      pig.updateAI(1 / 20);
    }

    // Position should have changed (pig walked)
    expect(pig.state.position.x).not.toBe(startX);
  });

  it('a pig stops when hitting a wall', () => {
    buildGround(10);
    // Build a wall at x=15
    for (let y = 0; y < 20; y++) {
      for (let z = 0; z < 30; z++) {
        world.setBlock(15, y, z, BlockType.Stone);
      }
    }

    const pig = new PigMob(world, 12, 12, 10);
    const initialX = pig.state.position.x;

    // Drive with a fixed +x direction (deterministic; avoids the random AI
    // in updateAI changing direction mid-test).
    for (let i = 0; i < 100; i++) {
      pig.update(1 / 20, 1.0, 0);
    }

    // Pig should not have passed through the wall
    expect(pig.state.position.x).toBeLessThan(15);
    // But should have moved from start
    expect(pig.state.position.x).toBeGreaterThan(initialX);
  });

  it('Mob.update applies gravity correctly', () => {
    // No ground — mob falls
    const mob = new Mob(world, 10, 30, 10);

    const startY = mob.state.position.y;
    mob.update(1 / 20, 0, 0);

    // Should have fallen
    expect(mob.state.position.y).toBeLessThan(startY);
    // Velocity should be negative (falling)
    expect(mob.state.velocity.y).toBeLessThan(0);
  });

  it('Mob lands on solid ground', () => {
    buildGround(10);
    const mob = new Mob(world, 10, 15, 10);

    for (let i = 0; i < 100; i++) {
      mob.update(1 / 20, 0, 0);
    }

    expect(mob.state.onGround).toBe(true);
    expect(mob.state.velocity.y).toBe(0);
  });

  it('PigMob has correct default color', () => {
    buildGround(10);
    const pig = new PigMob(world, 10, 12, 10);
    expect(pig.color).toBe(0xf4a0a0); // Pinkish
  });

  it('PigMob createMesh returns a group', () => {
    buildGround(10);
    const pig = new PigMob(world, 10, 12, 10);
    const mesh = pig.createMesh();
    expect(mesh).toBeDefined();
    expect(mesh.type).toBe('Group');
  });
});
