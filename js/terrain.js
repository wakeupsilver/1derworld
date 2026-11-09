// Tiny collision world: boxes (floors you stand on, walls you bump), height functions (ramps, halfpipes, hills).
// sample(x,z,y) -> the highest walkable surface at or a little above y.  blocked(x,z,y,r) -> is there wall here.
export const STEP = 0.55;

export class Terrain {
  constructor({ base, ceiling = () => 999, extraBlock } = {}) {
    this.boxes = [];
    this.fns = [];
    this.base = base || (() => ({ h: 0, kind: 'floor' }));
    this.ceilingFn = ceiling;
    this.extraBlock = extraBlock;
  }

  box(minX, maxX, minZ, maxZ, top, o = {}) {
    const b = { minX, maxX, minZ, maxZ, top, bottom: o.bottom ?? 0, kind: o.kind || 'floor', data: o.data, active: o.active ?? true, wallOnly: !!o.wallOnly };
    this.boxes.push(b);
    return b;
  }

  // wall: a box you cannot stand on (top far above)
  wall(minX, maxX, minZ, maxZ, top = 40, o = {}) { return this.box(minX, maxX, minZ, maxZ, top, { ...o, wallOnly: true }); }

  fn(minX, maxX, minZ, maxZ, h, o = {}) {
    const f = { minX, maxX, minZ, maxZ, h, kind: o.kind || 'floor', data: o.data, active: o.active ?? true };
    this.fns.push(f);
    return f;
  }

  sample(x, z, y) {
    let best = this.base(x, z, y);
    if (best.h > y + STEP) best = { h: -999, kind: 'void' };
    for (const b of this.boxes) {
      if (!b.active || b.wallOnly || x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (b.top <= y + STEP && b.top > best.h) best = { h: b.top, kind: b.kind, data: b.data };
    }
    for (const f of this.fns) {
      if (!f.active || x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
      const h = f.h(x, z);
      if (h <= y + STEP && h >= best.h) best = { h, kind: f.kind, data: f.data }; // >= so a ramp's flat part still counts as ramp (skate glide)
    }
    return best;
  }

  blocked(x, z, y, r = 0.3) {
    if (this.extraBlock && this.extraBlock(x, z, y)) return true;
    for (const b of this.boxes) {
      if (!b.active) continue;
      if (x < b.minX - r || x > b.maxX + r || z < b.minZ - r || z > b.maxZ + r) continue;
      if (b.top > y + STEP && b.bottom < y + 1.75) return true;
    }
    for (const f of this.fns) {
      if (!f.active || x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
      if (f.h(x, z) > y + STEP) return true;
    }
    return false;
  }

  ceiling(x, z, y = 0) {
    let c = this.ceilingFn(x, z, y);
    for (const b of this.boxes) {
      if (!b.active || x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (b.bottom > y + 1 && b.bottom < c) c = b.bottom;
    }
    return c;
  }
}
