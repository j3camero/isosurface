const alea = require('alea');
const SimplexNoise = require('simplex-noise');

const canvas = document.getElementById('thecanvas');
const context = canvas.getContext('2d');

const prng = alea('123');
const simplexState = SimplexNoise.createNoise3D(prng);

// Return a field. The desired level curve is defined by f(x, y, z) = 0.
function Simplex(v) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  const s = simplexState(x, y, z);
  const p = 0.5 * (s + 1);
  const levelCurve = 0.3;
  return p - levelCurve;
}

function Gradient(v) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  const bigNumber = 1000000;
  const infinitessimal = 1 / bigNumber;
  const h = Simplex(v);
  const dx = Simplex([x + infinitessimal, y, z]) - h;
  const dy = Simplex([x, y + infinitessimal, z]) - h;
  const dz = Simplex([x, y, z + infinitessimal]) - h;
  return [dx * bigNumber, dy * bigNumber, dz * bigNumber];
}

function SquaredLength(v) {
  let sum = 0;
  for (const value of v) {
    sum += value * value;
  }
  return sum;
}

function Length(v) {
  const d = SquaredLength(v);
  return Math.sqrt(d);
}

function Normalize(v) {
  const result = [];
  const len = Length(v);
  const inv = 1 / len;
  for (const value of v) {
    result.push(value * inv);
  }
  return result;
}

function VectorCopy(v) {
  const n = v.length;
  const c = [];
  for (let i = 0; i < n; i++) {
    const value = v[i];
    c.push(value);
  }
  return c;
}

function VectorAdd(a, b) {
  if (a.length !== b.length) {
    throw 'Vectors must have same length';
  }
  const n = a.length;
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(a[i] + b[i]);
  }
  return result;
}

function VectorSubtract(a, b) {
  if (a.length !== b.length) {
    throw 'Vectors must have same length';
  }
  const n = a.length;
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(a[i] - b[i]);
  }
  return result;
}

function ScalarMultiply(v, scalar) {
  const result = [];
  for (const value of v) {
    result.push(value * scalar);
  }
  return result;
}

function VectorDistance(a, b) {
  const diff = VectorSubtract(a, b);
  return Length(diff);
}

function Midpoint(a, b) {
  const sum = VectorAdd(a, b);
  const midpoint = ScalarMultiply(sum, 0.5);
  return midpoint;
}

// Finds the point on the isosurface that is "downhill" from an arbitrary point
// in 3D space.
//
// Uses gradient descent to descend to the surface while following the gradient.
function Descend(v) {
  let x = VectorCopy(v);
  const speedLimit = 0.01;
  let step = 1;
  while (true) {
    const value = Simplex(x);
    const gradient = Gradient(x);
    const slope = Length(gradient);
    const newtonsMethod = value / slope;
    const speed = Math.min(newtonsMethod, speedLimit);
    const direction = Normalize(ScalarMultiply(gradient, -1));
    const dx = ScalarMultiply(direction, speed);
    x = VectorAdd(x, dx);
    console.log(step, value.toFixed(8), speed.toFixed(8));
    const threshold = 0.0000001;
    if (Math.abs(value) < threshold && Math.abs(speed) < threshold) {
      break;
    }
    step++;
  }
  return x;
}

function Draw(points, triangles) {

}

function DoOneFrame() {
  const startTime = new Date().getTime();
  Draw();
  const endTime = new Date().getTime();
  const elapsed = endTime - startTime;
  const targetFrameDuration = 30;
  const timeUntilNextFrame = Math.max(targetFrameDuration - elapsed, 0);
  setTimeout(DoOneFrame, timeUntilNextFrame);
}

function OnResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  Draw();
}

window.addEventListener('resize', OnResize, false);
OnResize();
DoOneFrame();

const r = [Math.random(), Math.random(), Math.random()];
const p = Descend(r);
console.log(p);
