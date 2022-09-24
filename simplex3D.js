const alea = require('alea');
const SimplexNoise = require('simplex-noise');

const canvas = document.getElementById('thecanvas');
const context = canvas.getContext('2d');

const prng = alea('12345');
const simplexState = SimplexNoise.createNoise3D(prng);

const bigNumber = 1000 * 1000;
const infinitessimal = 1 / bigNumber;

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

// Helper function. The square of the simplex field.
function SimplexSquared(v) {
  const s = Simplex(v);
  return s * s;
}

// Return the numerical derivative (gradient) of the 3D function f at the
// 3D point v.
function Gradient(f, v) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  const h = f(v);
  const dx = f([x + infinitessimal, y, z]) - h;
  const dy = f([x, y + infinitessimal, z]) - h;
  const dz = f([x, y, z + infinitessimal]) - h;
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

// Uses gradient descent to find the nearest isosurface or local minimum.
//
// Use NewtonRaphson instead if you know that the nearest isosurface is very
// close by. Use GradientDescent if you don't have any such guarantee. It's
// slower, but safer. GradientDescent converges no matter what. If v starts off
// in a basin, the local minimum will be returned.
function GradientDescent(v) {
  let x = VectorCopy(v);
  const speedLimit = 0.01;
  const speedMultiplier = 0.05;
  let step = 1;
  while (true) {
    const gradient = Gradient(SimplexSquared, x);
    const slope = Length(gradient);
    const speed = Math.min(speedMultiplier * slope, speedLimit);
    const direction = Normalize(ScalarMultiply(gradient, -1));
    const dx = ScalarMultiply(direction, speed);
    x = VectorAdd(x, dx);
    console.log(step, speed.toFixed(8));
    if (Math.abs(speed) < infinitessimal) {
      break;
    }
    step++;
  }
  return x;
}

// Finds the point on the isosurface that is "downhill" from an arbitrary point
// in 3D space.
//
// Uses a speed-limited Newton-Raphson method to descend the gradient. This
// method is fast but might fail to converge if v starts off in a basin with
// a local minimum. Only use this method if you know the isosurface is nearby.
// If you don't have any such guarantee, then use the slower but safer
// GradientDescent.
function NewtonRaphson(v) {
  let x = VectorCopy(v);
  const speedLimit = 0.01;
  let step = 1;
  while (true) {
    const value = Simplex(x);
    const gradient = Gradient(Simplex, x);
    const slope = Length(gradient);
    const newtonsMethod = value / slope;
    const speed = Math.min(newtonsMethod, speedLimit);
    const direction = Normalize(ScalarMultiply(gradient, -1));
    const dx = ScalarMultiply(direction, speed);
    x = VectorAdd(x, dx);
    console.log(step, value.toFixed(8), speed.toFixed(8));
    if (Math.abs(value) < infinitessimal && Math.abs(speed) < infinitessimal) {
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

const origin = [0, 0, 0];
const a = GradientDescent(origin);
const b = NewtonRaphson(a);
console.log(a, b);
