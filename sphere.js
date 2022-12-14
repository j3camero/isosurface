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

function DrawDual(points, triangles) {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const dualPoints = [];
  const edges = {};

  function AddEdge(pointIndexA, pointIndexB, triangleIndex) {
    const mini = Math.min(pointIndexA, pointIndexB);
    const maxi = Math.max(pointIndexA, pointIndexB);
    if (!(mini in edges)) {
      edges[mini] = {};
    }
    if (maxi in edges[mini]) {
      edges[mini][maxi].push(triangleIndex);
    } else {
      edges[mini][maxi] = [triangleIndex];
    }
  }

  let triangleIndex = 0;
  for (const [i, j, k] of triangles) {
    const a = points[i];
    const b = points[j];
    const c = points[k];
    const sum = VectorAdd(a, VectorAdd(b, c));
    const centroid = Normalize(ScalarMultiply(sum, 1 / 3));
    dualPoints.push(centroid);
    AddEdge(i, j, triangleIndex);
    AddEdge(j, k, triangleIndex);
    AddEdge(i, k, triangleIndex);
    triangleIndex++;
  }
  const lines = [];
  for (const i in edges) {
    for (const j in edges[i]) {
      const e = edges[i][j];
      const a = e[0];
      const b = e[1];
      lines.push({
        from: dualPoints[a],
        to: dualPoints[b],
      });
    }
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

const numPoints = 372;
const points = [];
for (let i = 0; i < numPoints; i++) {
  const p = GenerateRandomUnitVector();
  points.push(p);
}

function CalculateElectrostaticPotential() {
  let potential = 0;
  for (let i = 0; i < numPoints; i++) {
    for (let j = i + 1; j < numPoints; j++) {
      const d = Length(VectorSubtract(points[i], points[j]));
      potential += 1 / d;
    }
  }
  return potential;
}

let forceStrength = 0.1;
let oldPoints = [];

function RepelPoints() {
  const forces = [];
  for (let i = 0; i < numPoints; i++) {
    let force = [0, 0, 0];
    for (let j = 0; j < numPoints; j++) {
      if (i === j) {
        continue;
      }
      const diff = VectorSubtract(points[i], points[j]);
      const sq = SquaredLength(diff);
      const inv = 1.0 / sq;
      const dir = Normalize(diff);
      const f = ScalarMultiply(dir, forceStrength * inv);
      force = VectorAdd(force, f);
    }
    forces.push(force);
  }
  oldPoints = [];
  for (let i = 0; i < numPoints; i++) {
    oldPoints.push(points[i]);
    points[i] = Normalize(VectorAdd(points[i], forces[i]));
  }
}

function RevertPoints() {
  for (let i = 0; i < numPoints; i++) {
    points[i] = oldPoints[i];
  }
}

let oldPotential;

function DoOneFrame() {
  const startTime = new Date().getTime();
  const alpha = 0;
  const triangles = AlphaShape(alpha, points);
  //Draw(points, triangles);
  DrawDual(points, triangles);
  RepelPoints();
  const potential = CalculateElectrostaticPotential();
  if (oldPotential && potential > oldPotential) {
    // Revert the points and also don't update oldPotential.
    RevertPoints();
    forceStrength *= 0.1;
    console.log('LOSS!');
  } else {
    oldPotential = potential;
    forceStrength *= 1.1;
  }
  const endTime = new Date().getTime();
  const elapsed = endTime - startTime;
  console.log('potential', potential.toFixed(8), 'force', forceStrength.toFixed(8), 'elapsed', elapsed);
  const targetFrameDuration = 30;
  const timeUntilNextFrame = Math.max(targetFrameDuration - elapsed, 0);
  setTimeout(DoOneFrame, timeUntilNextFrame);
}

function OnResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', OnResize, false);
OnResize();
DoOneFrame();
