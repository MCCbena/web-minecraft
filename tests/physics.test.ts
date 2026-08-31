import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../src/game/World.js';
import { Physics } from '../src/game/Physics.js';
import { Player } from '../src/game/Player.js';
import { Vec3 } from '../src/utils/Vec3.js';
import { BlockType } from '../src/game/BlockTypes.js';
import * as THREE from 'three';

/**
 * Physics tests.
 * We test the Physics class with a mock Player that has controlled input.
 */

// Create a minimal mock for testing physics without DOM
class TestPlayer {
  state: {
    position: Vec3;
    velocity: Vec3;
    onGround: boolean;
    flying: boolean;
    width: number;
    height: number;
    eyeHeight: number;
    yaw: number;
    pitch: number;
  };
  private moveDir: Vec3 = new Vec3(0, 0, 0);
  private jumpPressed: boolean = false;

  constructor(x: number, y: number, z: number) {
    this.state = {
      position: new Vec3(x, y, z),
      velocity: new Vec3(0, 0, 0),
      onGround: false,
      flying: false,
      width: 0.3,
      height: 1.8,
      eyeHeight: 1.62,
      yaw: 0,
      pitch: 0,
    };
  }

  isPointerLocked(): boolean { return true; }
  isJumpPressed(): boolean { return this.jumpPressed; }
  getMovementDirection(): Vec3 { return this.moveDir; }
  lock(): void {}
  unlock(): void {}

  setMovement(x: number, y: number, z: number): void {
    this.moveDir = new Vec3(x, y, z);
  }

  setJump(pressed: boolean): void {
    this.jumpPressed = pressed;
  }

  setFlying(flying: boolean): void {
    this.state.flying = flying;
  }
}

describe('Physics', () => {
  let world: World;
  let physics: Physics;

  beforeEach(() => {
    world = new World();
    world.generateEmpty();
    physics = new Physics(world);

    // Build a flat ground at y=10
    for (let x = 0; x < 20; x++) {
      for (let z = 0; z < 20; z++) {
        world.setBlock(x, 9, z, BlockType.Stone);
        world.setBlock(x, 8, z, BlockType.Stone);
        world.setBlock(x, 7, z, BlockType.Stone);
      }
    }
  });

  it('P-01: 重力 — 浮遊時 vy が毎 tick 減少', () => {
    const player = new TestPlayer(10, 30, 10);
    // No ground beneath — player falls
    physics.step(player, 1 / 20);
    expect(player.state.velocity.y).toBeLessThan(0);
  });

  it('P-02: 着地 — 地面に到達で onGround=true、vy=0', () => {
    const player = new TestPlayer(10, 15, 10);
    // Fall down to ground
    for (let i = 0; i < 100; i++) {
      physics.step(player, 1 / 20);
    }
    expect(player.state.onGround).toBe(true);
    expect(player.state.velocity.y).toBe(0);
  });

  it('P-03: ジャンプ — 地上でスペース → vy > 0', () => {
    const player = new TestPlayer(10, 10.1, 10);
    player.state.onGround = true;
    player.setJump(true);
    physics.step(player, 1 / 20);
    expect(player.state.velocity.y).toBeGreaterThan(0);
    expect(player.state.onGround).toBe(false);
  });

  it('P-04: 衝突 — 壁に衝突で x 移動が止まる', () => {
    // Build a wall at x=15
    for (let y = 0; y < 20; y++) {
      for (let z = 0; z < 20; z++) {
        world.setBlock(15, y, z, BlockType.Stone);
      }
    }

    const player = new TestPlayer(14, 10, 10);
    player.setMovement(1, 0, 0); // Move right toward wall
    physics.step(player, 1 / 20);
    // Player should not have passed through the wall
    expect(player.state.position.x).toBeLessThan(15);
  });

  it('P-05: フライト — フライト中は重力無効、スペースで上昇', () => {
    const player = new TestPlayer(10, 30, 10);
    player.setFlying(true);
    // Simulate space pressed in fly mode: y movement = +1
    player.setMovement(0, 1, 0);
    physics.step(player, 1 / 20);
    // In fly mode, position.y should increase
    expect(player.state.position.y).toBeGreaterThan(30);
  });
});
