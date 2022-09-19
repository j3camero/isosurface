const alea = require('alea');
const SimplexNoise = require('simplex-noise');

const prng = alea(999);
const simplex = SimplexNoise.createNoise3D(prng);

const canvas = document.getElementById('thecanvas');
const context = canvas.getContext('2d');

function Draw(points, triangles) {
  const zoom = 128;
  for (let i = 0; i < canvas.width; i++) {
    for (let j = 0; j < canvas.height; j++) {
      const x = i / zoom;
      const y = j / zoom;
      const h = simplex(x, y, 0);
      const p = 0.5 * (h + 1);
      if (p < 0.3) {
        context.fillStyle = '#105C8C';
      } else if (p < 0.55) {
        context.fillStyle = '#188BD3';
      } else if (p < 0.6) {
        context.fillStyle = '#1ECDCB';
      } else if (p < 0.7) {
        context.fillStyle = '#ECE3C5';
      } else if (p < 0.9) {
        context.fillStyle = '#D7C0AE';
      } else {
        context.fillStyle = '#D5B899';
      }
      context.fillRect(i, j, 1, 1);
    }
  }
  context.strokeStyle = 'rgba(196,196,196,0.2)';
  for (let i = zoom; i < canvas.width; i += zoom) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, canvas.height);
    context.stroke();
  }
  for (let j = zoom; j < canvas.height; j += zoom) {
    context.beginPath();
    context.moveTo(0, j);
    context.lineTo(canvas.width, j);
    context.stroke();
  }
}

function OnResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  Draw();
}

window.addEventListener('resize', OnResize, false);
OnResize();
