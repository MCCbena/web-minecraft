import { BlockType, getBlockNameJp } from './BlockTypes.js';

/**
 * 9-slot hotbar inventory.
 */
export class Inventory {
  /** Block types in each slot. */
  public slots: BlockType[];
  /** Currently selected slot index (0-8). */
  public selected: number;

  constructor() {
    this.slots = [
      BlockType.Grass,
      BlockType.Stone,
      BlockType.Planks,
      BlockType.RedstoneDust,
      BlockType.RedstoneTorch,
      BlockType.RedstoneLamp,
      BlockType.RedstoneBlock,
      BlockType.Lever,
      BlockType.Repeater,
    ];
    this.selected = 0;
  }

  /** Set the hotbar slots (called when adding redstone blocks). */
  setSlots(slots: BlockType[]): void {
    for (let i = 0; i < Math.min(slots.length, 9); i++) {
      this.slots[i] = slots[i];
    }
  }

  getSelectedBlockType(): BlockType {
    return this.slots[this.selected];
  }

  getSelectedBlockNameJp(): string {
    return getBlockNameJp(this.slots[this.selected]);
  }

  selectSlot(index: number): void {
    this.selected = ((index % 9) + 9) % 9;
  }

  nextSlot(): void {
    this.selectSlot(this.selected + 1);
  }

  prevSlot(): void {
    this.selectSlot(this.selected - 1);
  }
}
