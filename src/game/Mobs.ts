import * as THREE from 'three';
import { World } from './World.js';
import { BlockType, isSolid } from './BlockTypes.js';
import { Vec3 } from '../utils/Vec3.js';
import { CONFIG } from '../config.js';

const GRAVITY = CONFIG.physics.gravity;
const MOB_WALK_SPEED = 1.0; // Slow walk speed
const MOB_WIDTH = 0.6;
const MOB_HEIGHT = 0.9; // Pig height

/**
 * Simple mob state (AABB entity).
 */
export interface MobState {
  position: Vec3;
  velocity: Vec3;
  onGround: boolean;
  width: number;
  height: number;
}

/**
 * Base mob class with physics (gravity + AABB collision).
 * Reuses collision logic pattern from Physics.ts.
 */
export class Mob {
  public state: MobState;
  public world: World;
  public mesh: THREE.Group | null = null;

  constructor(world: World, x: number, y: number, z: number) {
    this.world = world;
    this.state = {
      position: new Vec3(x, y, z),
      velocity: new Vec3(0, 0, 0),
      onGround: false,
      width: MOB_WIDTH,
      height: MOB_HEIGHT,
    };
  }

  /**
   * Apply gravity and collision for one fixed timestep.
   * @param dt - Time step in seconds.
   * @param moveX - Horizontal X movement (blocks/sec).
   * @param moveZ - Horizontal Z movement (blocks/sec).
   */
  update(dt: number, moveX: number, moveZ: number): void {
    // Apply gravity
    this.state.velocity.y -= GRAVITY * dt;

    // Set horizontal velocity
    this.state.velocity.x = moveX;
    this.state.velocity.z = moveZ;

    // Apply velocity with AABB collision (axis-separated, single step)
    this.moveAxis('x', this.state.velocity.x * dt);
    this.moveAxis('y', this.state.velocity.y * dt);
    this.moveAxis('z', this.state.velocity.z * dt);

    // If falling and on ground, zero vy
    if (this.state.onGround && this.state.velocity.y < 0) {
      this.state.velocity.y = 0;
    }
  }

  private moveAxis(axis: 'x' | 'y' | 'z', delta: number): void {
    if (axis === 'x') {
      this.state.position.x += delta;
      if (this.collides()) {
        this.state.position.x -= delta;
        this.state.velocity.x = 0;
      }
    } else if (axis === 'y') {
      this.state.position.y += delta;
      if (this.collides()) {
        if (delta < 0) {
          this.state.onGround = true;
        }
        this.state.position.y -= delta;
        this.state.velocity.y = 0;
      } else {
        this.state.onGround = false;
      }
    } else if (axis === 'z') {
      this.state.position.z += delta;
      if (this.collides()) {
        this.state.position.z -= delta;
        this.state.velocity.z = 0;
      }
    }
  }

  /** Check AABB collision against solid blocks. */
  private collides(): boolean {
    const hx = this.state.width / 2;
    const hy = this.state.height;
    const px = this.state.position.x;
    const py = this.state.position.y;
    const pz = this.state.position.z;

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
}

/**
 * Passive pig mob with simple AI.
 * Picks a random direction every 1-2 seconds, walks slowly,
 * turns around at walls.
 */
export class PigMob extends Mob {
  public color: number = 0xf4a0a0; // Pinkish

  private dirTimer: number = 0;
  private dirInterval: number = 1.5; // Seconds between direction changes
  private moveDir: Vec3 = new Vec3(0, 0, 0);

  constructor(world: World, x: number, y: number, z: number) {
    super(world, x, y, z);
  }

  /**
   * Update pig AI and physics.
   * @param dt - Time step in seconds.
   */
  updateAI(dt: number): void {
    // Pick new direction periodically
    this.dirTimer += dt;
    if (this.dirTimer >= this.dirInterval) {
      this.dirTimer = 0;
      this.dirInterval = 1.0 + Math.random() * 1.5; // 1-2.5 seconds
      this.pickRandomDirection();
    }

    // Update physics
    this.update(dt, this.moveDir.x * MOB_WALK_SPEED, this.moveDir.z * MOB_WALK_SPEED);

    // If we hit a wall, turn around
    if (this.moveDir.x !== 0 || this.moveDir.z !== 0) {
      // Check if we're blocked
      const checkX = this.state.position.x + Math.sign(this.moveDir.x || 0.001) * 0.8;
      const checkZ = this.state.position.z + Math.sign(this.moveDir.z || 0.001) * 0.8;
      const checkY = Math.floor(this.state.position.y + 0.5);
      if (
        isSolid(this.world.getBlock(Math.floor(checkX), checkY, Math.floor(this.state.position.z))) ||
        isSolid(this.world.getBlock(Math.floor(this.state.position.x), checkY, Math.floor(checkZ)))
      ) {
        this.pickRandomDirection();
      }
    }
  }

  private pickRandomDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    this.moveDir.set(Math.cos(angle), 0, Math.sin(angle));
  }

  /** Create the Three.js mesh for this pig. */
  createMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 0.9);
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const headMat = new THREE.MeshLambertMaterial({ color: this.color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.55, 0.45);
    group.add(head);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.15, 0.12, 0.15);
    const snoutMat = new THREE.MeshLambertMaterial({ color: 0xd48080 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 0.48, 0.62);
    group.add(snout);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.12, 0.3, 0.12);
    const legMat = new THREE.MeshLambertMaterial({ color: this.color });
    const legPositions = [
      [-0.2, 0.15, 0.3],
      [0.2, 0.15, 0.3],
      [-0.2, 0.15, -0.3],
      [0.2, 0.15, -0.3],
    ];
    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, ly, lz);
      group.add(leg);
    }

    // Tail
    const tailGeo = new THREE.BoxGeometry(0.08, 0.08, 0.2);
    const tailMat = new THREE.MeshLambertMaterial({ color: this.color });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 0.5, -0.5);
    group.add(tail);

    group.position.set(this.state.position.x, this.state.position.y, this.state.position.z);
    return group;
  }

  /** Update mesh position to match state. */
  syncMesh(): void {
    if (this.mesh) {
      this.mesh.position.set(
        this.state.position.x,
        this.state.position.y,
        this.state.position.z,
      );
      // Face movement direction
      if (this.moveDir.x !== 0 || this.moveDir.z !== 0) {
        this.mesh.rotation.y = Math.atan2(this.moveDir.x, this.moveDir.z);
      }
    }
  }
}

/**
 * Manages all mobs in the world.
 */
export class MobManager {
  private mobs: PigMob[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Spawn pigs at random surface positions. */
  spawnPigs(world: World, count: number = 4): void {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * (CONFIG.world.chunksX * CONFIG.chunk.sizeX));
      const z = Math.floor(Math.random() * (CONFIG.world.chunksZ * CONFIG.chunk.sizeZ));

      // Find surface Y
      let surfaceY = -1;
      for (let y = CONFIG.chunk.sizeY - 1; y >= 0; y--) {
        const block = world.getBlock(x, y, z);
        if (block !== BlockType.Air && block !== BlockType.Water) {
          surfaceY = y + 1;
          break;
        }
      }

      if (surfaceY > 0) {
        const pig = new PigMob(world, x + 0.5, surfaceY, z + 0.5);
        pig.mesh = pig.createMesh();
        this.scene.add(pig.mesh);
        this.mobs.push(pig);
      }
    }
  }

  /** Update all mobs. */
  update(dt: number): void {
    for (const mob of this.mobs) {
      mob.updateAI(dt);
      mob.syncMesh();
    }
  }

  /** Get all mobs. */
  getMobs(): PigMob[] {
    return this.mobs;
  }

  /** Remove all mobs and their meshes. */
  dispose(): void {
    for (const mob of this.mobs) {
      if (mob.mesh) {
        this.scene.remove(mob.mesh);
        mob.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              for (const m of child.material) m.dispose();
            } else {
              child.material.dispose();
            }
          }
        });
      }
    }
    this.mobs = [];
  }
}
