import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * Target: counts hits (stub - no projectiles yet).
 */
export class Target extends RedstoneComponent {
  readonly type = RedstoneComponentType.Target;

  tick(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Stub: no projectile detection yet
  }

  interact(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cannot interact
  }

  getTextureKey(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return 'target';
  }
}
