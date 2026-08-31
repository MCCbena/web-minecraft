import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * RedstoneDust: propagates signal, brightness scales with level.
 */
export class RedstoneDust extends RedstoneComponent {
  readonly type = RedstoneComponentType.RedstoneDust;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Dust level is computed by PowerGrid, no per-tick logic needed
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Dust has no interaction
  }

  getTextureKey(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return 'redstone_dust';
  }
}
