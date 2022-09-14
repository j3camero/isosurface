// Spherical isosurface.
// Tile the sphere with triangles and output the triangles.
const AlphaShape = require('alpha-shape');

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

// Generates a random unit vector distributed equally around the surface of the sphere.
function GenerateRandomUnitVector() {
  const x = Math.random() * 2 - 1;
  const y = Math.random() * 2 - 1;
  const z = Math.random() * 2 - 1;
  const v = [x, y, z];
  if (SquaredLength(v) > 1) {
    return GenerateRandomUnitVector();
  }
  return Normalize(v);
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

const canvas = document.getElementById('thecanvas');
const context = canvas.getContext('2d');
const cameraPosition = [0, 0, -2];

function Project3DPointOnto2DScreen(v) {
  const x3D = v[0] - cameraPosition[0];
  const y3D = v[1] - cameraPosition[1];
  const z3D = v[2] - cameraPosition[2];
  const frustum = 0.1;
  if (z3D < frustum) {
    return null;
  }
  const x2D = x3D / z3D;
  const y2D = y3D / z3D;
  const wh = Math.min(canvas.width, canvas.height);
  const screenX = (canvas.width + x2D * wh) / 2;
  const screenY = (canvas.height + y2D * wh) / 2;
  return [screenX, screenY];
}

function DrawLine3D(from3D, to3D) {
  const from2D = Project3DPointOnto2DScreen(from3D);
  const x1 = from2D[0];
  const y1 = from2D[1];
  const d1 = VectorDistance(from3D, cameraPosition);
  const b1 = Math.min(1 / (d1 * d1) * 255, 255);
  const to2D = Project3DPointOnto2DScreen(to3D);
  const x2 = to2D[0];
  const y2 = to2D[1];
  const d2 = VectorDistance(to3D, cameraPosition);
  const b2 = Math.min(1 / (d2 * d2) * 255, 255);
  const gradient = context.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, `rgb(0, ${b1}, 0)`);
  gradient.addColorStop(1, `rgb(0, ${b2}, 0)`);
  context.strokeStyle = gradient;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function Draw(points, triangles) {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const lines = [];
  for (const [i, j, k] of triangles) {
    const a = points[i];
    const b = points[j];
    const c = points[k];
    lines.push({ from: a, to: b });
    lines.push({ from: b, to: c });
    lines.push({ from: c, to: a });
  }
  lines.sort((a, b) => {
    const m1 = Midpoint(a.from, a.to);
    const m2 = Midpoint(b.from, b.to);
    const z1 = m1[2];
    const z2 = m2[2];
    if (z1 < z2) {
      return 1;
    }
    if (z1 > z2) {
      return -1;
    }
    return 0;
  });
  for (const line of lines) {
    DrawLine3D(line.from, line.to);
  }
}

function DoOneFrame() {
  const numPoints = 256;
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const p = GenerateRandomUnitVector();
    points.push(p);
  }
  const startTime = new Date().getTime();
  const alpha = 0;
  const triangles = AlphaShape(alpha, points);
  Draw(points, triangles);
  const endTime = new Date().getTime();
  const elapsed = endTime - startTime;
  const targetFrameDuration = 1000;
  const timeUntilNextFrame = Math.max(targetFrameDuration - elapsed, 0);
  console.log('frame', timeUntilNextFrame);
  setTimeout(DoOneFrame, timeUntilNextFrame);
}

function OnResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', OnResize, false);
OnResize();
DoOneFrame();
