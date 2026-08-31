import { RedstoneComponentType, RedstoneState } from '../RedstoneTypes.js';
import { RedstoneDust } from './RedstoneDust.js';
import { RedstoneTorch } from './RedstoneTorch.js';
import { RedstoneLamp } from './RedstoneLamp.js';
import { Lever } from './Lever.js';
import { Button } from './Button.js';
import { RedstoneBlock } from './RedstoneBlock.js';
import { RedstoneOre } from './RedstoneOre.js';
import { Repeater } from './Repeater.js';
import { Comparator } from './Comparator.js';
import { Observer } from './Observer.js';
import { Piston, StickyPiston } from './Piston.js';
import { TNTComponent } from './TNT.js';
import { DaylightDetector } from './DaylightDetector.js';
import { NoteBlock } from './NoteBlock.js';
import { Hopper } from './Hopper.js';
import { Target } from './Target.js';

/**
 * Registry mapping block types to component instances.
 */
export class ComponentRegistry {
  private components: Map<RedstoneComponentType, {
    create: () => { tick: (s: RedstoneState, ctx: any) => void; interact: (s: RedstoneState, ctx: any) => void; getTextureKey: (s: RedstoneState, ctx: any) => string };
  }> = new Map();

  constructor() {
    this.register(RedstoneComponentType.RedstoneDust, new RedstoneDust());
    this.register(RedstoneComponentType.RedstoneTorch, new RedstoneTorch());
    this.register(RedstoneComponentType.RedstoneLamp, new RedstoneLamp());
    this.register(RedstoneComponentType.Lever, new Lever());
    this.register(RedstoneComponentType.Button, new Button());
    this.register(RedstoneComponentType.RedstoneBlock, new RedstoneBlock());
    this.register(RedstoneComponentType.RedstoneOre, new RedstoneOre());
    this.register(RedstoneComponentType.Repeater, new Repeater());
    this.register(RedstoneComponentType.Comparator, new Comparator());
    this.register(RedstoneComponentType.Observer, new Observer());
    this.register(RedstoneComponentType.Piston, new Piston());
    this.register(RedstoneComponentType.StickyPiston, new StickyPiston());
    this.register(RedstoneComponentType.TNT, new TNTComponent());
    this.register(RedstoneComponentType.DaylightDetector, new DaylightDetector());
    this.register(RedstoneComponentType.NoteBlock, new NoteBlock());
    this.register(RedstoneComponentType.Hopper, new Hopper());
    this.register(RedstoneComponentType.Target, new Target());
  }

  private register(type: RedstoneComponentType, component: any): void {
    this.components.set(type, { create: () => component });
  }

  get(type: RedstoneComponentType): any | undefined {
    return this.components.get(type)?.create();
  }
}
