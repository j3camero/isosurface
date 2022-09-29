const alea = require('alea');
const d3 = require('d3-octree');
const SimplexNoise = require('simplex-noise');

const canvas = document.getElementById('thecanvas');
const context = canvas.getContext('2d');

const seed = '1111111111111111111111111111';  // Looks like a person.
//const seed = '2222';
const prng = alea(seed);
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
let forceStrength = 0.00001;
// Overall brightness modified to adjust the brightness of 3D shapes and points.
const brightnessMultiplier = 25;
const targetTriangleEdgeLength = 0.05;
let maxRepulsionRadius = 2.5 * targetTriangleEdgeLength;
const levelCurve = 0.2;

// Return a field. The desired level curve is defined by f(x, y, z) = 0.
function Simplex(v) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  const s = simplexState(x, y, z);
  const p = 0.5 * (s + 1);
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
  //const maxSteps = 100;
  //let step = 1;
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
    //if (step > maxSteps) {
    //  break;
    //}
    //step++;
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
function AddOneNewParticle(indexToCopy) {
  //const n = particles.length;
  //const r = Math.floor(n * Math.random());
  //const p = particles[mostRecentlyMovedParticleIndex];
  const p = particles[indexToCopy];
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

function GetParticlesWithinSphere(octree, cx, cy, cz, radius) {
  const neighbors = [];
  const xmin = cx - radius;
  const ymin = cy - radius;
  const zmin = cz - radius;
  const xmax = cx + radius;
  const ymax = cy + radius;
  const zmax = cz + radius;
  const r2 = radius * radius;
  octree.visit((node, x1, y1, z1, x2, y2, z2) => {
    if (!node.length) {
      do {
        const [px, py, pz] = node.data;
        if (px >= xmin && px < xmax &&
            py >= ymin && py < ymax &&
            pz >= zmin && pz < zmax) {
          const dx = px - cx;
          const dy = py - cy;
          const dz = pz - cz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < r2 && d2 > 0) {
            neighbors.push([px, py, pz]);
          }
        }
      } while (node = node.next);
    }
    return x1 >= xmax || y1 >= ymax || z1 >= zmax || x2 < xmin || y2 < ymin || z2 < zmin;
  });
  return neighbors;
}

function Median(v) {
  const n = v.length;
  if (n === 0){
    return null;
  }
  const i = Math.floor(n / 2);
  v.sort();
  if (n % 2 === 0) {
    return (v[i - 1] + v[i]) / 2;
  } else {
    return v[i];
  }
}

let mostRecentlyMovedParticleIndex = 0;

function RepelParticles() {
  const n = particles.length;
  // Calculate 3D electrostatic forces between pairs of particles.
  const forces = [];
  let neighborCount = 0;
  let maxMinSq;
  let mostIsolatedIndex = 0;
  const minSqList = [];
  // Use an octree to efficiently locate each particle's neighbors.
  const tree = d3.octree().addAll(particles);
  for (let i = 0; i < n; i++) {
    let totalForce = [0, 0, 0];
    const p = particles[i];
    const [x, y, z] = p;
    const neighbors = GetParticlesWithinSphere(tree, x, y, z, maxRepulsionRadius);
    neighborCount += neighbors.length;
    let minSq = 1;
    for (const neighbor of neighbors) {
      const diff = VectorSubtract(p, neighbor);
      const sq = SquaredLength(diff);
      minSq = Math.min(sq, minSq);
      const inv = 1.0 / sq;
      const dir = Normalize(diff);
      const force = ScalarMultiply(dir, forceStrength * inv);
      totalForce = VectorAdd(totalForce, force);
    }
    forces.push(totalForce);
    if (!maxMinSq || minSq > maxMinSq) {
      maxMinSq = minSq;
      mostIsolatedIndex = i;
    }
    minSqList.push(minSq);
  }
  const averageNeighbors = neighborCount / n;
  const mostIsolatedDistance = Math.sqrt(maxMinSq);
  const medianMinSq = Median(minSqList);
  const medianSeparation = Math.sqrt(medianMinSq);
  // Project the 3D forces onto 2D planes aligned with the surface.
  let maxMagnitude = -1;
  for (let i = 0; i < n; i++) {
    const gradient = Gradient(Simplex, particles[i]);
    forces[i] = ProjectVectorOntoPlane(forces[i], gradient);
    const mag = Length(forces[i]);
    maxMagnitude = Math.max(mag, maxMagnitude);
    if (mag > maxMagnitude) {
      maxMagnitude = mag;
      mostRecentlyMovedParticleIndex = i;
    }
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
  return [mostIsolatedIndex, mostIsolatedDistance, medianSeparation, averageNeighbors];
}

// Given a list of 2D points like [(x, y), ...] returns a point [cx, cy] that
// can "see" all the points pointing in the forward direction (0, 1).
function CalculateCameraPosition2D(points, aspectRatio) {
  const margin = 1.05;
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
  const cameraZ = Math.min(cameraZ1, cameraZ2) - 0.5;
  const translated = [];
  for (const [x, y, z] of points) {
    translated.push([x - cameraX, y - cameraY, z - cameraZ]);
  }
  return translated;
}

function Centroid(points) {
  let sum = [0, 0, 0];
  for (const p of points) {
    sum = VectorAdd(p, sum);
  }
  const n = points.length;
  const centroid = ScalarMultiply(sum, 1 / n);
  return centroid;
}

function GradientColor(gradient, brightness) {
  const [x, y, z] = Normalize(gradient);
  //const r = Math.floor(255 * brightness * Math.abs(gradient[0]));
  //const g = Math.floor(255 * brightness * Math.abs(gradient[1]));
  //const b = Math.floor(255 * brightness * Math.abs(gradient[2]));
  let color = [0, 0, 0];
  if (x > 0) {
    color = VectorAdd(color, ScalarMultiply([1, 0, 0], x));
  }
  if (y > 0) {
    color = VectorAdd(color, ScalarMultiply([0, 0, 1], y));
  }
  if (z > 0) {
    color = VectorAdd(color, ScalarMultiply([1, 0.5, 0], z));
  }
  if (x < 0) {
    color = VectorAdd(color, ScalarMultiply([0, 1, 0], -x));
  }
  if (y < 0) {
    color = VectorAdd(color, ScalarMultiply([1, 1, 0], -y));
  }
  if (z < 0) {
    color = VectorAdd(color, ScalarMultiply([1, 0, 1], -z));
  }
  const m = Math.max(color[0], color[1], color[2]);
  const r = Math.floor(255 * color[0] / m);
  const g = Math.floor(255 * color[1] / m);
  const b = Math.floor(255 * color[2] / m);
  return `rgb(${r},${g},${b})`;
}

function DrawPoint3D(p, gradient) {
  const [x, y, z] = p;
  if (z < infinitessimal) {
    return;
  }
  const wh = Math.min(canvas.width, canvas.height);
  const screenX = 0.5 * (canvas.width + wh * x / z);
  const screenY = 0.5 * (canvas.height + wh * y / z);
  if (screenX < 0 || screenX > canvas.width ||
      screenY < 0 || screenY > canvas.height) {
    return;
  }
  const d2 = SquaredLength(p);
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

function MaxMagnitude(points) {
  let max;
  for (const p of points) {
    const mag = Length(p);
    if (!max || mag > max) {
      max = mag;
    }
  }
  return max;
}

let cameraDistance = 1;
let cameraRotation = 0;

function Draw() {
  context.fillStyle = 'rgb(0, 0, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradients = [];
  for (const p of particles) {
    gradients.push(Gradient(Simplex, p));
  }
  const centroid = Centroid(particles);
  const negative = ScalarMultiply(centroid, -1);
  const centered = TranslatePoints(particles, negative);
  const radius = MaxMagnitude(centered);
  const newCameraDistance = radius * Math.sqrt(2);
  const alpha = 0.01;
  if (!cameraDistance) {
    cameraDistance = 1;
  }
  cameraDistance = alpha * newCameraDistance + (1 - alpha) * cameraDistance;
  const rotated = RotatePoints(centered, cameraRotation);
  const translated = TranslatePoints(rotated, [0, 0, cameraDistance]);
  const n = particles.length;
  const zBuffer = [];
  for (let i = 0; i < n; i++) {
    const v = translated[i];
    const g = gradients[i];
    zBuffer.push({ v, g });
  }
  zBuffer.sort((a, b) => {
    if (a.v[2] < b.v[2]) {
      return 1;
    }
    if (a.v[2] > b.v[2]) {
      return -1;
    }
    return 0;
  });
  for (const b of zBuffer) {
    DrawPoint3D(b.v, b.g);
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
  const log = {};
  const startTime = new Date().getTime();
  if (forceStrength > infinitessimal * infinitessimal) {
    const [mostIsolatedIndex, mostIsolatedDistance, medianSeparation, averageNeighbors] = RepelParticles();
    if (medianSeparation > targetTriangleEdgeLength) {
      AddOneNewParticle(mostIsolatedIndex);
      forceStrength = 0.001;
    }
    const halfLifeInFrames = 50;
    const decayRate = Math.pow(0.5, 1 / halfLifeInFrames);
    forceStrength *= decayRate;
    log['averageNeighbors'] = averageNeighbors.toFixed(2);
    log['medianSeparation'] = medianSeparation.toFixed(3);
  }
  Draw();
  const endTime = new Date().getTime();
  const timeBetweenFrames = lastFrameEndTime - endTime;
  cameraRotation += 0.0001 * timeBetweenFrames;
  lastFrameEndTime = endTime;
  const elapsed = endTime - startTime;
  log['particles'] = particles.length;
  log['forceStrength'] = forceStrength.toExponential(2);
  log['elapsed'] = elapsed;
  console.log(log);
  setTimeout(DoOneFrame, 0);
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
  //const secondParticle = RandomlyDisplaceParticleAlongSurface(firstParticle);
  //console.log(firstParticle, secondParticle);
  DoOneFrame();
}

Start();
