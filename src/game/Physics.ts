import { World } from './World.js';
import { Player, PlayerState } from './Player.js';
import { Vec3 } from '../utils/Vec3.js';
import { CONFIG } from '../config.js';
import { BlockType, isSolid } from './BlockTypes.js';

const GRAVITY = CONFIG.physics.gravity;
const JUMP_SPEED = CONFIG.physics.jumpSpeed;
const WALK_SPEED = CONFIG.physics.walkSpeed;
const FLY_SPEED = CONFIG.physics.flySpeed;
const FLUID_SPEED_MULTIPLIER = 0.5; // Horizontal speed in fluid

/**
 * Physics simulation: gravity, jump, AABB collision.
 * Pure logic — does not depend on Three.js.
 */
export class Physics {
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Step player physics by dt seconds.
   * Modifies player state in place.
   */
  step(player: Player, dt: number): void {
    const state = player.state;

    if (state.flying) {
      this.stepFlying(player, dt);
      return;
    }

    // Apply gravity
    state.velocity.y -= GRAVITY * dt;

    // Jump
    if (player.isPointerLocked() && state.onGround && player.isJumpPressed()) {
      state.velocity.y = JUMP_SPEED;
      state.onGround = false;
    }

    // Calculate movement
    const moveDir = player.getMovementDirection();
    const speed = this.isInFluid(state) ? WALK_SPEED * FLUID_SPEED_MULTIPLIER : WALK_SPEED;
    state.velocity.x = moveDir.x * speed;
    state.velocity.z = moveDir.z * speed;

    // Apply velocity with AABB collision (axis-separated)
    this.moveAxis(player, 'x', state.velocity.x * dt);
    this.moveAxis(player, 'y', state.velocity.y * dt);
    this.moveAxis(player, 'z', state.velocity.z * dt);

    // If falling and on ground, zero vy
    if (state.onGround && state.velocity.y < 0) {
      state.velocity.y = 0;
    }
  }

  private stepFlying(player: Player, dt: number): void {
    const state = player.state;
    const moveDir = player.getMovementDirection();
    const speed = FLY_SPEED;
    state.velocity.x = moveDir.x * speed;
    state.velocity.y = moveDir.y * speed;
    state.velocity.z = moveDir.z * speed;

    // Simple collision in flying (optional, can fly through blocks)
    state.position.x += state.velocity.x * dt;
    state.position.y += state.velocity.y * dt;
    state.position.z += state.velocity.z * dt;

    // Keep within world bounds
    state.position.y = Math.max(0, Math.min(CONFIG.chunk.sizeY, state.position.y));
    state.onGround = false;
  }

  private moveAxis(player: Player, axis: 'x' | 'y' | 'z', delta: number): void {
    const state = player.state;
    const halfW = state.width;

    if (axis === 'x') {
      state.position.x += delta;
      if (this.collides(state)) {
        state.position.x -= delta;
        state.velocity.x = 0;
      }
    } else if (axis === 'y') {
      state.position.y += delta;
      if (this.collides(state)) {
        if (delta < 0) {
          // Falling — landed
          state.onGround = true;
        }
        state.position.y -= delta;
        state.velocity.y = 0;
      } else {
        state.onGround = false;
      }
    } else if (axis === 'z') {
      state.position.z += delta;
      if (this.collides(state)) {
        state.position.z -= delta;
        state.velocity.z = 0;
      }
    }
  }

  /** Check AABB collision against solid blocks. */
  private collides(state: PlayerState): boolean {
    const hx = state.width;
    const hy = state.height;
    const px = state.position.x;
    const py = state.position.y;
    const pz = state.position.z;

    // Check all blocks in the player's AABB
    const minX = Math.floor(px - hx);
    const maxX = Math.floor(px + hx);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + hy);
    const minZ = Math.floor(pz - hx);
    const maxZ = Math.floor(pz + hx);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const block = this.world.getBlock(bx, by, bz);
          if (isSolid(block)) {
            // Check if player AABB overlaps this block
            if (
              px + hx > bx && px - hx < bx + 1 &&
              py + hy > by && py < by + 1 &&
              pz + hx > bz && pz - hx < bz + 1
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  /** Check if the player is standing on the ground. */
  isOnGround(state: PlayerState): boolean {
    return state.onGround;
  }

  /** Check if any part of the player's body is in a fluid block. */
  private isInFluid(state: PlayerState): boolean {
    const hx = state.width;
    const hy = state.height;
    const px = state.position.x;
    const py = state.position.y;
    const pz = state.position.z;

    const minX = Math.floor(px - hx);
    const maxX = Math.floor(px + hx);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + hy);
    const minZ = Math.floor(pz - hx);
    const maxZ = Math.floor(pz + hx);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const block = this.world.getBlock(bx, by, bz);
          if (block === BlockType.Water || block === BlockType.Lava) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
