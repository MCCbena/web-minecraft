import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx, DIR_DELTAS, oppositeDir } from '../RedstoneTypes.js';

/**
 * Piston: extends when powered, retracts when unpowered.
 * Can push up to 12 blocks. StickyPiston also pulls back.
 *
 * Facing: direction the piston faces (and pushes toward).
 * The "back" of the piston is where it gets powered from.
 */
export abstract class PistonBase extends RedstoneComponent {
  /** Whether this is a sticky piston. */
  protected readonly _isSticky: boolean;
  readonly type: RedstoneComponentType;

  constructor(isSticky: boolean) {
    super();
    this._isSticky = isSticky;
    this.type = isSticky ? RedstoneComponentType.StickyPiston : RedstoneComponentType.Piston;
  }

  get isSticky(): boolean {
    return this._isSticky;
  }

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Check power from the back face (opposite of facing direction)
    const backDir = oppositeDir(state.facing);
    const [bdx, bdy, bdz] = DIR_DELTAS[backDir];
    const powered = ctx.power.isPowered(x + bdx, y + bdy, z + bdz);

    if (powered && !state.extended) {
      this.extend(state, ctx, x, y, z);
    } else if (!powered && state.extended) {
      this.retract(state, ctx, x, y, z);
    }
  }

  protected extend(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    const [dx, dy, dz] = DIR_DELTAS[state.facing];
    const maxPush = 12;

    // Check if we can push
    for (let i = 1; i <= maxPush; i++) {
      const tx = x + dx * i;
      const ty = y + dy * i;
      const tz = z + dz * i;

      const block = ctx.world.getBlock(tx, ty, tz);
      if (block === 11) return; // Bedrock - unpushable
    }

    // Push blocks one by one from the farthest to the piston.
    // The piston head extends to position 1 (directly in front).
    // Blocks at distance >= 2 get pushed forward by 1 (to distance+1).
    for (let i = maxPush; i >= 1; i--) {
      const srcX = x + dx * i;
      const srcY = y + dy * i;
      const srcZ = z + dz * i;
      // Push forward: destination is one step further in facing direction
      const dstX = x + dx * (i + 1);
      const dstY = y + dy * (i + 1);
      const dstZ = z + dz * (i + 1);

      const block = ctx.world.getBlock(srcX, srcY, srcZ);
      if (block === 11) return; // Bedrock

      if (block !== 0) { // Air
        ctx.world.setBlock(dstX, dstY, dstZ, block);
        ctx.world.setBlock(srcX, srcY, srcZ, 0); // Air
        ctx.scheduleRemesh(srcX, srcY, srcZ);
        ctx.scheduleRemesh(dstX, dstY, dstZ);
      }
    }

    state.extended = true;
  }

  protected retract(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    const [dx, dy, dz] = DIR_DELTAS[state.facing];
    const maxPush = 12;

    // Pull blocks back (sticky only)
    if (this._isSticky) {
      for (let i = maxPush; i >= 2; i--) {
        const srcX = x + dx * i;
        const srcY = y + dy * i;
        const srcZ = z + dz * i;
        const dstX = x + dx * (i - 1);
        const dstY = y + dy * (i - 1);
        const dstZ = z + dz * (i - 1);

        const block = ctx.world.getBlock(srcX, srcY, srcZ);
        if (block === 11) break; // Bedrock

        if (block !== 0) {
          ctx.world.setBlock(dstX, dstY, dstZ, block);
          ctx.world.setBlock(srcX, srcY, srcZ, 0); // Air
          ctx.scheduleRemesh(srcX, srcY, srcZ);
          ctx.scheduleRemesh(dstX, dstY, dstZ);
        }
      }
    }

    state.extended = false;
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    state.facing = (state.facing + 1) % 6;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    const dirName = ['east', 'west', 'up', 'down', 'north', 'south'][state.facing] || 'east';
    return state.extended ? `piston_extended_${dirName}` : `piston_retracted_${dirName}`;
  }
}

export class Piston extends PistonBase {
  constructor() {
    super(false);
  }
}

export class StickyPiston extends PistonBase {
  constructor() {
    super(true);
  }
}
