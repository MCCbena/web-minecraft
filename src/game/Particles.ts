import * as THREE from 'three';
import { BlockType, getBlockMeta } from './BlockTypes.js';

/**
 * A single particle.
 */
export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: number;
  life: number;      // Remaining life in seconds
  maxLife: number;   // Total life in seconds
  size: number;
}

/**
 * Block-break particle system.
 * Renders particles as small colored boxes in the scene.
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private scene: THREE.Scene;
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshBasicMaterial;
  private mesh: THREE.InstancedMesh | null = null;

  private readonly MAX_PARTICLES = 200;
  private readonly PARTICLE_LIFE = 0.8; // seconds
  private readonly PARTICLE_COUNT = 12; // particles per block break
  private readonly GRAVITY = 8.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.material = new THREE.MeshBasicMaterial({});

    // Create instanced mesh for efficient rendering
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.scene.add(this.mesh);
  }

  /**
   * Spawn particles at a block position.
   * @param wx - World X
   * @param wy - World Y
   * @param wz - World Z
   * @param blockType - The block type being broken (for color)
   */
  spawn(wx: number, wy: number, wz: number, blockType: BlockType): void {
    const meta = getBlockMeta(blockType);
    // Derive a color from the block type name (deterministic)
    const color = this.getBlockColor(blockType);

    for (let i = 0; i < this.PARTICLE_COUNT && this.particles.length < this.MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(
          wx + Math.random(),
          wy + Math.random(),
          wz + Math.random(),
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 3 + 1, // Upward bias
          (Math.random() - 0.5) * 3,
        ),
        color,
        life: this.PARTICLE_LIFE * (0.7 + Math.random() * 0.3),
        maxLife: this.PARTICLE_LIFE,
        size: 0.06 + Math.random() * 0.06,
      });
    }
  }

  /**
   * Update particles: apply gravity, move, fade.
   * @param dt - Delta time in seconds.
   */
  update(dt: number): void {
    // Remove dead particles
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      return p.life > 0;
    });

    // Apply gravity and movement
    for (const p of this.particles) {
      p.velocity.y -= this.GRAVITY * dt;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
    }

    // Update instanced mesh
    this.updateInstances();
  }

  private updateInstances(): void {
    if (!this.mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const lifeRatio = p.life / p.maxLife;

        dummy.position.copy(p.position);
        const s = p.size * lifeRatio;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        this.mesh.setMatrixAt(i, dummy.matrix);

        color.setHex(p.color);
        color.multiplyScalar(lifeRatio); // Fade out
        this.mesh.setColorAt(i, color);
      } else {
        // Hide unused instances by setting scale to 0
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.mesh.setMatrixAt(i, dummy.matrix);
      }
    }

    this.mesh.count = Math.max(this.particles.length, 1);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Get a deterministic color for a block type. */
  private getBlockColor(blockType: BlockType): number {
    const colors: Record<number, number> = {
      1: 0x5a8c2a, // Grass
      2: 0x8b6914, // Dirt
      3: 0x7a7a7a, // Stone
      4: 0xe8d68c, // Sand
      5: 0x6a6a6a, // Gravel
      6: 0x6b4400, // OakLog
      7: 0x2d6b1e, // OakLeaves
      8: 0x9e7c4a, // Planks
      9: 0x2244aa, // Water
      10: 0x5a5a5a, // Cobblestone
      11: 0x1a1a1a, // Bedrock
      12: 0xcc4400, // Lava
    };
    return colors[blockType] ?? 0xffffff;
  }

  /** Clear all particles. */
  clear(): void {
    this.particles = [];
    if (this.mesh) {
      this.mesh.count = 0;
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Dispose resources. */
  dispose(): void {
    this.clear();
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.geometry.dispose();
      this.material.dispose();
    }
  }
}
