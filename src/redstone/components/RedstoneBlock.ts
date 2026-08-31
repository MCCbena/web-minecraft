import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * RedstoneBlock: always a strong source (15).
 */
export class RedstoneBlock extends RedstoneComponent {
  readonly type = RedstoneComponentType.RedstoneBlock;

  tick(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Always on
  }

  interact(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cannot interact
  }

  getTextureKey(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return 'redstone_block';
  }
}
