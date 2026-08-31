import * as THREE from 'three';
import { Vec3 } from '../utils/Vec3.js';
import { clamp } from '../utils/MathUtils.js';
import { CONFIG } from '../config.js';

const MOUSE_SENSITIVITY = 0.002;
const PITCH_MIN = -Math.PI / 2 + 0.01;
const PITCH_MAX = Math.PI / 2 - 0.01;

export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  onGround: boolean;
  flying: boolean;
  /** Half-width for AABB. */
  width: number;
  /** Player eye height. */
  eyeHeight: number;
  /** Total player height. */
  height: number;
}

/**
 * Player state and input handling.
 * Does NOT depend on Three.js for state — camera is set externally.
 */
export class Player {
  public state: PlayerState;
  public camera: THREE.PerspectiveCamera;

  private keys: Set<string> = new Set();
  private isLocked: boolean = false;
  private element: HTMLElement;

  constructor(camera: THREE.PerspectiveCamera, element: HTMLElement) {
    this.camera = camera;
    this.element = element;
    this.state = {
      position: new Vec3(64, 40, 64),
      velocity: new Vec3(0, 0, 0),
      yaw: 0,
      pitch: 0,
      onGround: false,
      flying: false,
      width: 0.3,
      eyeHeight: 1.62,
      height: 1.8,
    };
    this.setupInput();
  }

  private setupInput(): void {
    // Pointer lock
    this.element.addEventListener('click', () => {
      if (!this.isLocked) {
        this.element.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.element;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.state.yaw -= e.movementX * MOUSE_SENSITIVITY;
      this.state.pitch -= e.movementY * MOUSE_SENSITIVITY;
      this.state.pitch = clamp(this.state.pitch, PITCH_MIN, PITCH_MAX);
    });

    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      // Double-space toggle for fly mode
      if (e.code === 'Space') {
        this.toggleFly();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  private toggleFly(): void {
    this.state.flying = !this.state.flying;
  }

  /** Update camera from player state. */
  updateCamera(): void {
    this.camera.position.set(
      this.state.position.x,
      this.state.position.y + this.state.eyeHeight,
      this.state.position.z,
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.state.yaw;
    this.camera.rotation.x = this.state.pitch;
  }

  /** Get the movement direction based on keys and camera yaw. */
  getMovementDirection(): Vec3 {
    const dir = new Vec3(0, 0, 0);
    const cos = Math.cos(this.state.yaw);
    const sin = Math.sin(this.state.yaw);

    if (this.keys.has('KeyW')) {
      dir.x -= sin;
      dir.z -= cos;
    }
    if (this.keys.has('KeyS')) {
      dir.x += sin;
      dir.z -= cos;
    }
    if (this.keys.has('KeyA')) {
      dir.x -= cos;
      dir.z += sin;
    }
    if (this.keys.has('KeyD')) {
      dir.x += cos;
      dir.z += sin;
    }

    if (this.state.flying) {
      if (this.keys.has('Space')) dir.y += 1;
      if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) dir.y -= 1;
    }

    // Normalize horizontal
    const hLen = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    if (hLen > 0) {
      dir.x /= hLen;
      dir.z /= hLen;
    }

    return dir;
  }

  isPointerLocked(): boolean {
    return this.isLocked;
  }

  lock(): void {
    this.element.requestPointerLock?.();
  }

  unlock(): void {
    document.exitPointerLock?.();
  }

  isJumpPressed(): boolean {
    return this.keys.has('Space');
  }
}
