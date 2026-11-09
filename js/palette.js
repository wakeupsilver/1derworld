// JOYWAVE: the 1derworld palette.
// Pulled from the sites: GameBender red #e8112d and deep purples #480e9e / #340678 / #25258c,
// GameBender-web lime #a6ee70, magenta #c442dc, pink #ff6caf, amber #ffbf00, and JoyLabz red #ea363e.
// Code streams run plum -> magenta -> pink with amber heads: matrix-inspired, never black and green.
import * as THREE from 'three';

export const HEX = {
  void: '#0d0420', night: '#1a0838', plum: '#340678', violet: '#480e9e', indigo: '#25258c',
  red: '#e8112d', joy: '#ea363e', magenta: '#c442dc', pink: '#ff6caf', lime: '#a6ee70',
  green: '#67da5e', amber: '#ffbf00', orange: '#ff8000', blue: '#4c97ff', cream: '#fff3e0',
  aqua: '#3fd0c9', deep: '#06123d', sea: '#0b3a7a', ink: '#120626',
};
export const C = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, new THREE.Color(v)]));
export const NEON = ['red', 'magenta', 'pink', 'lime', 'amber', 'orange', 'blue'].map(k => HEX[k]);
export const col = h => new THREE.Color(h);
