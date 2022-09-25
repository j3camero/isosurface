const alea = require('alea');
const SimplexNoise = require('simplex-noise');

const canvas = document.getElementById('thecanvas');
const context = canvas.getContext('2d');

const prng = alea('12345');
const simplexState = SimplexNoise.createNoise3D(prng);

// A big number used to define the infinitessimal.
const bigNumber = 1000 * 1000;
// A tiny number that is re-used throughout the code as a threshold for
// "close enough" to zero.
const infinitessimal = 1 / bigNumber;
// A moderately small but not tiny distance. The code presumes that the simplex
// field is approximately linear at this scale. The gradient should not change
// quickly at this scale. The code uses this as a safe distance to move points
// without any drastic changes or errors.
const speedLimit = 0.01;
// Global multiplier for electrostatic repulsion forces between the particles.
let forceStrength = 0.01;

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
  const speedMultiplier = 0.05;
  while (true) {
    const gradient = Gradient(SimplexSquared, x);
    const slope = Length(gradient);
    if (Math.abs(slope) < infinitessimal) {
      break;
    }
    const speed = Math.min(speedMultiplier * slope, speedLimit);
    const direction = Normalize(ScalarMultiply(gradient, -1));
    const dx = ScalarMultiply(direction, speed);
    x = VectorAdd(x, dx);
  }
  const value = SimplexSquared(x);
  // If we're close enough to the isosurface, finish it off with NewtonRaphson.
  if (value < infinitessimal) {
    x = NewtonRaphson(x);
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
  while (true) {
    const value = Simplex(x);
    const gradient = Gradient(Simplex, x);
    const slope = Length(gradient);
    const newtonsMethod = value / slope;
    const speed = Math.min(newtonsMethod, speedLimit);
    const direction = Normalize(ScalarMultiply(gradient, -1));
    const dx = ScalarMultiply(direction, speed);
    x = VectorAdd(x, dx);
    if (Math.abs(value) < infinitessimal && Math.abs(speed) < infinitessimal) {
      break;
    }
  }
  return x;
}

function DotProduct(a, b) {
  if (a.length !== b.length) {
    throw 'Vectors must have same length.';
  }
  const n = a.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function CrossProduct3D(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

// Generates a uniformly distributed random point inside a sphere of radius 1.
function GenerateRandomPointInsideUnitSphere() {
  const x = Math.random() * 2 - 1;
  const y = Math.random() * 2 - 1;
  const z = Math.random() * 2 - 1;
  const v = [x, y, z];
  if (SquaredLength(v) > 1) {
    return GenerateRandomPointInsideUnitSphere();
  }
  return v;
}

function GenerateRandomUnitVectorOrthogonalToNormalVector(n) {
  n = Normalize(n);
  const a = Normalize([n[1], -n[0], 0]);
  const b = CrossProduct3D(n, a);
  const angle = Math.random() * 2 * Math.PI;
  const u = Math.cos(angle);
  const v = Math.sin(angle);
  const ua = ScalarMultiply(a, u);
  const vb = ScalarMultiply(b, v);
  return VectorAdd(ua, vb);
}

function RandomlyDisplaceParticleAlongSurface(p) {
  const gradient = Gradient(Simplex, p);
  const r = GenerateRandomUnitVectorOrthogonalToNormalVector(gradient);
  const v = ScalarMultiply(r, speedLimit);
  const q = VectorAdd(p, v);
  const s = NewtonRaphson(q);
  return s;
}

// Projects a 3D vector onto a plane defined by a normal vector.
// v is a vector in 3D space that is to be projected onto a plane orthogonal to n.
// n is a normal vector that defines the plane.
function ProjectVectorOntoPlane(v, n) {
  n = Normalize(n);
  const mag = DotProduct(v, n);
  const dv = ScalarMultiply(n, mag);
  return VectorSubtract(v, dv);
}

const particles = [];

function RepelPoints() {
  const n = particles.length;
  // Calculate 3D electrostatic forces between pairs of particles.
  const forces = [];
  for (let i = 0; i < n; i++) {
    forces.push([0, 0, 0]);
    for (let j = 0; j < n; j++) {
      if (i === j) {
        continue;
      }
      const diff = VectorSubtract(particles[i], particles[j]);
      const sq = SquaredLength(diff);
      const inv = 1.0 / sq;
      const dir = Normalize(diff);
      const f = ScalarMultiply(dir, forceStrength * inv);
      forces[i] = VectorAdd(forces[i], f);
    }
  }
  // Project the 3D forces onto 2D planes aligned with the surface.
  let maxMagnitude = 0;
  for (let i = 0; i < n; i++) {
    const gradient = Gradient(Simplex, particles[i]);
    forces[i] = ProjectVectorOntoPlane(forces[i], gradient);
    const mag = Length(forces[i]);
    maxMagnitude = Math.max(mag, maxMagnitude);
  }
  // Impose speed limit.
  if (maxMagnitude > speedLimit) {
    const drag = speedLimit / maxMagnitude;
    for (let i = 0; i < n; i++) {
      forces[i] = ScalarMultiply(forces[i], drag);
    }
  }
  // Move the particles.
  for (let i = 0; i < n; i++) {
    particles[i] = NewtonRaphson(VectorAdd(particles[i], forces[i]));
  }
  return maxMagnitude;
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

function Start() {
  OnResize();
  const origin = [0, 0, 0];
  const firstParticle = GradientDescent(origin);
  if (SimplexSquared(firstParticle) > infinitessimal) {
    throw 'This seed does not generate a valid shape. Converged to local minimum.';
  }
  particles.push(firstParticle);
  const secondParticle = RandomlyDisplaceParticleAlongSurface(firstParticle);
  console.log(firstParticle, secondParticle);
  DoOneFrame();
}

Start();