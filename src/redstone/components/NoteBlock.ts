import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * NoteBlock: plays a note when powered.
 * Note pitch determined by block below (simplified).
 */
export class NoteBlock extends RedstoneComponent {
  readonly type = RedstoneComponentType.NoteBlock;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    const powered = ctx.power.isPowered(x, y, z);

    if (powered && !state.prevLit) {
      // Just became powered - play note
      ctx.playSound('note');
    }

    state.prevLit = powered;
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cycle note pitch
    state.note = (state.note + 1) % 25;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return 'note_block';
  }
}
