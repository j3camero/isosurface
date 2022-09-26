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
  const levelCurve = 0.2;
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
  const speedMultiplier = 0.1;
  const maxSteps = 100;
  let step = 1;
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
    if (step > maxSteps) {
      break;
    }
    step++;
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

// Returns a 3D point that is nearby the given point p.
//
// p is not modified. A new point is returned. The new point is displaced by a
// distance of approximately speedLimit in a random direction orthogonal to
// the gradient at p. ie: displaced along the curved surface.
function RandomlyDisplaceParticleAlongSurface(p) {
  const gradient = Gradient(Simplex, p);
  const r = GenerateRandomUnitVectorOrthogonalToNormalVector(gradient);
  const v = ScalarMultiply(r, speedLimit);
  const q = VectorAdd(p, v);
  const s = NewtonRaphson(q);
  return s;
}

// The particles used in the simulation.
const particles = [];

// Add one new particle to the simulation.
//
// The core problem to be solved here is that the new point has to be guaranteed
// to be on the same isosurface as all the others. We don't want to "hop" too
// far from the existing points or else we risk ending up sticking to a
// different isosurface, effectively "escaping" the targeted shape. The strategy
// to solve this is to stay very close to one of the existing points. We place
// the new particle very close to one of the existing points, chosen at random.
//
// We depend entirely on the elctrostatic repulsion force between the particles
// to floodfill the isosurface. As the particles multiply and repel each other,
// they should fill the whole isosurface.
//
// We don't rely on creating particles in random locations to discover the
// regions of the isosurface to be filled. The reason is this risks hopping to
// disconnected isosurfaces that tend to exist around the targeted one. The
// extent and shape of the targeted isosurface is unknown to the algorithm at
// the beginning, and we rely entirely on the particles pushing each other along
// to flood the entire isosurface.
function AddOneNewParticle() {
  const n = particles.length;
  const r = Math.floor(Math.random() * n);
  const p = particles[r];
  const newParticle = RandomlyDisplaceParticleAlongSurface(p);
  particles.push(newParticle);
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

// Given a list of 2D points like [(x, y), ...] returns a point [cx, cy] that
// can "see" all the points pointing in the forward direction (0, 1).
function CalculateCameraPosition2D(points, aspectRatio) {
  const margin = 1.0;
  const slope = margin / aspectRatio;
  let minA;
  let minB;
  for (const [x, y] of points) {
    const a = y + slope * x;
    const b = y - slope * x;
    if (!minA || a < minA) {
      minA = a;
    }
    if (!minB || b < minB) {
      minB = b;
    }
  }
  const cx = (minA - minB) / (2 * slope);
  const cy = (minA + minB) / 2;
  return [cx, cy];
}

function TranslatePointsInFrontOfCamera(points) {
  const xz = [];
  const yz = [];
  for (const [x, y, z] of points) {
    xz.push([x, z]);
    yz.push([y, z]);
  }
  const wh = Math.min(canvas.width, canvas.height);
  const aspectRatioX = canvas.width / wh;
  const aspectRatioY = canvas.height / wh;
  const [cameraX, cameraZ1] = CalculateCameraPosition2D(xz, aspectRatioX);
  const [cameraY, cameraZ2] = CalculateCameraPosition2D(yz, aspectRatioY);
  const cameraZ = Math.min(cameraZ1, cameraZ2) - 0.1;
  const translated = [];
  for (const [x, y, z] of points) {
    translated.push([x - cameraX, y - cameraY, z - cameraZ]);
  }
  return translated;
}

function GradientColor(gradient, brightness) {
  gradient = Normalize(gradient);
  const r = Math.floor(255 * brightness * Math.abs(gradient[0]));
  const g = Math.floor(255 * brightness * Math.abs(gradient[1]));
  const b = Math.floor(255 * brightness * Math.abs(gradient[2]));
  return `rgb(${r},${g},${b})`;
}

function DrawPoint3D(p, gradient) {
  const [x, y, z] = p;
  if (z < infinitessimal) {
    return;
  }
  const screenX = canvas.width * (x / z + 1) / 2;
  const screenY = canvas.height * (y / z + 1) / 2;
  if (screenX < 0 || screenX > canvas.width ||
      screenY < 0 || screenY > canvas.height) {
    return;
  }
  const d2 = SquaredLength(p);
  const brightnessMultiplier = 25;
  const brightness = brightnessMultiplier / d2;
  const minRadius = 1;
  const brightnessThreshold = Math.PI * minRadius * minRadius;
  if (brightness > brightnessThreshold) {
    const radius = Math.sqrt(brightness / Math.PI);
    context.fillStyle = GradientColor(gradient, 1);
    context.beginPath();
    context.arc(screenX, screenY, radius, 0, 2 * Math.PI);
    context.fill();
  } else {
    context.fillStyle = GradientColor(gradient, brightness / brightnessThreshold);
    context.beginPath();
    context.arc(screenX, screenY, minRadius, 0, 2 * Math.PI);
    context.fill();
  }
}

function RotatePoints(points, angle) {
  const rotated = [];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (const [x, y, z] of points) {
    rotated.push([
      x * c - z * s,
      y,
      z * c + x * s,
    ]);
  }
  return rotated;
}

function TranslatePoints(points, offset) {
  const translated = [];
  for (const p of points) {
    translated.push(VectorAdd(p, offset));
  }
  return translated;
}

let cameraRotation = 0;

function Draw() {
  context.fillStyle = 'rgb(0, 0, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradients = [];
  for (const p of particles) {
    gradients.push(Gradient(Simplex, p));
  }
  const rotated = RotatePoints(particles, cameraRotation);
  const translated = TranslatePoints(rotated, [0, 0, 3]);
  //const vertices = TranslatePointsInFrontOfCamera(rotated);
  const n = particles.length;
  for (let i = 0; i < n; i++) {
    const v = translated[i];
    const g = gradients[i];
    DrawPoint3D(v, g);
  }
}

// Standard Normal variate using Box-Muller transform.
function RandomGaussian(mean, stdev) {
    const u = 1 - Math.random();  // Converting [0,1) to (0,1)
    const v = Math.random();
    const n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return n * stdev + mean;
}

let lastFrameEndTime = new Date().getTime();

function DoOneFrame() {
  const startTime = new Date().getTime();
  Draw();
  const endTime = new Date().getTime();
  const timeBetweenFrames = lastFrameEndTime - endTime;
  cameraRotation += 0.00005 * timeBetweenFrames;
  lastFrameEndTime = endTime;
  const elapsed = endTime - startTime;
  const targetFrameDuration = 10;
  const timeUntilNextFrame = Math.max(targetFrameDuration - elapsed, 0);
  console.log('sleep', timeUntilNextFrame);
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
  //particles.push(firstParticle);
  //const secondParticle = RandomlyDisplaceParticleAlongSurface(firstParticle);
  //console.log(firstParticle, secondParticle);
  for (let i = 0; i < 25 * 1000; i++) {
    // const stdev = 5;
    // const r = [
    //   RandomGaussian(0, stdev),
    //   RandomGaussian(0, stdev),
    //   RandomGaussian(0, stdev),
    // ];
    const scale = 1.5;
    const r = [
      scale * (Math.random() * 2 - 1),
      scale * (Math.random() * 2 - 1),
      scale * (Math.random() * 2 - 1),
    ];
    const s = GradientDescent(r);
    particles.push(s);
  }
  DoOneFrame();
}

Start();
