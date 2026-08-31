import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * RedstoneLamp: lights up when powered.
 */
export class RedstoneLamp extends RedstoneComponent {
  readonly type = RedstoneComponentType.RedstoneLamp;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    const wasLit = state.prevLit;
    const powered = ctx.power.isPowered(x, y, z) ||
      ctx.power.hasPoweredDustNeighbor(x, y, z) ||
      ctx.power.hasPoweredDustOnTop(x, y, z);
    const shouldBeLit = powered;

    if (wasLit !== shouldBeLit) {
      state.prevLit = shouldBeLit;
      state.on = shouldBeLit;
      ctx.scheduleRemesh(x, y, z);
    }
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cannot interact with lamp directly
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return state.on ? 'redstone_lamp_on' : 'redstone_lamp_off';
  }
}
