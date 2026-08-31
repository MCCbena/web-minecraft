/**
 * 2D/3D Simplex Noise implementation.
 * Deterministic by seed. Based on Stefan Gustavson's public domain code.
 */
export class SimplexNoise {
  private perm: Uint8Array;
  /** 12 2D gradient vectors stored as [gx0,gy0, gx1,gy1, ...] */
  private grad2: Float32Array;
  /** 12 3D gradient vectors stored as [gx0,gy0,gz0, gx1,gy1,gz1, ...] */
  private grad3: Float32Array;

  constructor(seed: number = 0) {
    const p = this.buildPermutation(seed);
    this.perm = p;
    this.grad2 = new Float32Array([
       1,  1,  -1,  1,   1, -1,  -1, -1,
       1,  0,  -1,  0,   1,  0,  -1,  0,
       0,  1,   0, -1,   0,  1,   0, -1,
    ]);
    this.grad3 = new Float32Array([
       1,  1,  0,  -1,  1,  0,   1, -1,  0,  -1, -1,  0,
       1,  0,  1,  -1,  0,  1,   1,  0, -1,  -1,  0, -1,
       0,  1,  1,   0, -1,  1,   0,  1, -1,   0, -1, -1,
    ]);
  }

  private buildPermutation(seed: number): Uint8Array {
    const p = new Uint8Array(512);
    const arr = new Array(256);
    for (let i = 0; i < 256; i++) arr[i] = i;
    let s = seed;
    const rng = () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 4294967296;
    };
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = arr[i & 255];
    return p;
  }

  private getGrad2(gi: number): { x: number; y: number } {
    const i = gi % 12;
    return { x: this.grad2[i * 2], y: this.grad2[i * 2 + 1] };
  }

  private getGrad3(gi: number): { x: number; y: number; z: number } {
    const i = gi % 12;
    return { x: this.grad3[i * 3], y: this.grad3[i * 3 + 1], z: this.grad3[i * 3 + 2] };
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    const g0 = this.getGrad2(gi0);
    const g1 = this.getGrad2(gi1);
    const g2 = this.getGrad2(gi2);

    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (g0.x * x0 + g0.y * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (g1.x * x1 + g1.y * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (g2.x * x2 + g2.y * y2);
    }
    return 70 * (n0 + n1 + n2);
  }

  noise3D(xin: number, yin: number, zin: number): number {
    const F3 = 1 / 3;
    const G3 = 1 / 6;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;
    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

    const g0 = this.getGrad3(gi0);
    const g1 = this.getGrad3(gi1);
    const g2 = this.getGrad3(gi2);
    const g3 = this.getGrad3(gi3);

    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (g0.x * x0 + g0.y * y0 + g0.z * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (g1.x * x1 + g1.y * y1 + g1.z * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (g2.x * x2 + g2.y * y2 + g2.z * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3 * t3 * (g3.x * x3 + g3.y * y3 + g3.z * z3);
    }
    return 32 * (n0 + n1 + n2 + n3);
  }
}
