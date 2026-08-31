import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Day/night cycle system.
 * Controls sky color, fog, and lighting based on time of day.
 */
export class DayNight {
  /** Time of day: 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight. */
  public timeOfDay: number = 0.25;

  private dayLengthSec: number;

  constructor(dayLengthSec: number = CONFIG.dayNight.dayLengthSec) {
    this.dayLengthSec = dayLengthSec;
  }

  /** Update time by dt seconds. */
  update(dt: number): void {
    this.timeOfDay += dt / this.dayLengthSec;
    if (this.timeOfDay >= 1) this.timeOfDay -= 1;
  }

  /** Get sun direction vector based on time of day. */
  getSunDirection(): THREE.Vector3 {
    const angle = this.timeOfDay * Math.PI * 2;
    return new THREE.Vector3(
      Math.cos(angle),
      Math.sin(angle),
      0.3,
    ).normalize();
  }

  /** Get ambient light intensity (0 at night, 1 at noon). */
  getAmbientIntensity(): number {
    const sunHeight = Math.sin(this.timeOfDay * Math.PI * 2);
    return Math.max(0.05, Math.min(1, sunHeight * 0.8 + 0.2));
  }

  /** Get directional light intensity. */
  getDirectionalIntensity(): number {
    const sunHeight = Math.sin(this.timeOfDay * Math.PI * 2);
    return Math.max(0, sunHeight) * 1.2;
  }

  /** Get sky color based on time of day. */
  getSkyColor(): THREE.Color {
    const sunHeight = Math.sin(this.timeOfDay * Math.PI * 2);
    // Day: light blue, Night: dark blue-black, Sunset: orange tint
    if (sunHeight > 0.2) {
      return new THREE.Color(0x87CEEB); // Day sky
    } else if (sunHeight > -0.1) {
      // Sunset/sunrise transition
      const t = (sunHeight + 0.1) / 0.3;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x1a1a3a),
        new THREE.Color(0xff8844),
        t,
      );
    } else {
      return new THREE.Color(0x0a0a1a); // Night sky
    }
  }

  /** Get fog color (same as sky). */
  getFogColor(): THREE.Color {
    return this.getSkyColor();
  }

  /** Get fog density. */
  getFogDensity(): number {
    const sunHeight = Math.sin(this.timeOfDay * Math.PI * 2);
    if (sunHeight > 0.2) return 0.008;
    if (sunHeight > -0.1) return 0.015;
    return 0.02;
  }
}
