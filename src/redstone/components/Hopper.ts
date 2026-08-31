import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * Hopper: transfers items between containers.
 * When powered, disabled (no transfer).
 * Transfer logic is minimal/stubbed.
 */
export class Hopper extends RedstoneComponent {
  readonly type = RedstoneComponentType.Hopper;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Powered = disabled
    state.powered = ctx.power.isPowered(x, y, z);
    // Transfer logic is stubbed
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cannot interact
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return 'hopper';
  }
}
