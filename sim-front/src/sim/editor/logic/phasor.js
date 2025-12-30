export const PHASE_ANGLES_RAD = {
  R: 0,
  Y: -2 * Math.PI / 3,
  B: 2 * Math.PI / 3,
};

export function phasorFromPolar(magnitude, angleRad) {
  return { re: magnitude * Math.cos(angleRad), im: magnitude * Math.sin(angleRad) };
}

export function phasorForPhaseLN(phase, magnitude) {
  const angle = PHASE_ANGLES_RAD[phase] ?? 0;
  return phasorFromPolar(magnitude, angle);
}

export function phasorSub(a, b) {
  return { re: (a?.re || 0) - (b?.re || 0), im: (a?.im || 0) - (b?.im || 0) };
}

export function phasorMag(p) {
  return Math.sqrt((p?.re || 0) ** 2 + (p?.im || 0) ** 2);
}

export function phasorZero() {
  return { re: 0, im: 0 };
}

