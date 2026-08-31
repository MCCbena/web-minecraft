import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';
import { CONFIG } from '../../config.js';

/**
 * TNT: ignites when powered, explodes after fuse ticks.
 * Explodes in an irregular radius ~4-5 blocks, destroys breakable blocks,
 * chains to other TNT in range. Bedrock survives.
 */
export class TNTComponent extends RedstoneComponent {
  readonly type = RedstoneComponentType.TNT;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    const powered = ctx.power.isPowered(x, y, z);

    if (powered && state.fuse === 0 && !state.on) {
      // Ignite
      state.on = true;
      state.fuse = CONFIG.redstone.tntFuseTicks;
    }

    if (!powered && state.on && state.fuse > 0) {
      // Extinguish if power removed before fuse ends
      state.on = false;
      state.fuse = 0;
    }

    if (state.fuse > 0) {
      state.fuse--;
      if (state.fuse === 0) {
        // Explode!
        this.explode(state, ctx, x, y, z);
      }
    }
  }

  private explode(_state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    const radius = CONFIG.redstone.tntRadius;

    // Play explosion sound
    ctx.playSound('explosion');

    // Irregular explosion radius using simple noise
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          // Irregular: vary radius slightly
          const irregularRadius = radius + ((dx * 7 + dy * 13 + dz * 19) % 3) - 1;
          if (dist <= irregularRadius) {
            const bx = x + dx;
            const by = y + dy;
            const bz = z + dz;

            const block = ctx.world.getBlock(bx, by, bz);
            // Don't destroy bedrock (11)
            if (block === 11) continue;
            // Don't destroy air
            if (block === 0) continue;

            ctx.world.setBlock(bx, by, bz, 0); // Air
            ctx.scheduleRemesh(bx, by, bz);
          }
        }
      }
    }
  }

  interact(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cannot interact with TNT
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return state.on ? 'tnt_lit' : 'tnt_unlit';
  }
}
