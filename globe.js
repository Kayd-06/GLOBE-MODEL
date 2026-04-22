// Scene Setup

const canvas    = document.getElementById('c');
const container = document.getElementById('container');
const tooltip   = document.getElementById('tooltip');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 2.8);

function resize() {
  const W = container.clientWidth;
  const H = container.clientHeight;
  renderer.setSize(W, H);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);


// Lighting

scene.add(new THREE.AmbientLight(0x334466, 1.2));

const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(5, 3, 5);
scene.add(sun);


// Globe

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshPhongMaterial({
    color: 0x0d2a5e,
    emissive: 0x071428,
    shininess: 40,
  })
);
scene.add(globe);

// Wireframe overlay
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1.001, 24, 24),
  new THREE.MeshBasicMaterial({
    color: 0x1a4a9e,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  })
));

// Atmosphere glow
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1.04, 32, 32),
  new THREE.MeshPhongMaterial({
    color: 0x1a6fff,
    transparent: true,
    opacity: 0.07,
    side: THREE.FrontSide,
  })
));


// Starfield

const starVerts = [];
for (let i = 0; i < 2000; i++) {
  starVerts.push(
    (Math.random() - 0.5) * 80,
    (Math.random() - 0.5) * 80,
    (Math.random() - 0.5) * 80
  );
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
scene.add(new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.6 })
));


// Helpers

/**
 * Converts latitude/longitude to a 3D cartesian position on a sphere of radius r.
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} r   - Sphere radius
 * @returns {THREE.Vector3}
 */
function latLonToXYZ(lat, lon, r) {
  const phi   = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}


// Model Pin Data
// Replace these with real 3DMR model entries

const models = [
  { lat:  48.8584, lon:   2.2945, label: 'Eiffel Tower, Paris',      color: 0xff6b35 },
  { lat:  40.6892, lon: -74.0445, label: 'Statue of Liberty, NYC',   color: 0x35ff9f },
  { lat:  51.1789, lon:  -1.8262, label: 'Stonehenge, UK',           color: 0xffcc35 },
  { lat:  27.1751, lon:  78.0421, label: 'Taj Mahal, India',         color: 0xff35cc },
  { lat:  35.6586, lon: 139.7454, label: 'Tokyo Tower, Japan',       color: 0x35ccff },
  { lat:  12.9716, lon:  77.5946, label: 'Bangalore, India',         color: 0xffffff },
  { lat: -33.8568, lon: 151.2153, label: 'Sydney Opera House',       color: 0xffaa00 },
  { lat:  41.8902, lon:  12.4922, label: 'Colosseum, Rome',          color: 0xaa88ff },
];


// Build Pins

const pinGroup = new THREE.Group();
scene.add(pinGroup);
const pins = [];

models.forEach(m => {
  const surfacePos = latLonToXYZ(m.lat, m.lon, 1.0);
  const tipPos     = latLonToXYZ(m.lat, m.lon, 1.025);
  const midPos     = latLonToXYZ(m.lat, m.lon, 1.033);

  // Glowing dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 10),
    new THREE.MeshBasicMaterial({ color: m.color })
  );
  dot.position.copy(tipPos);
  dot.userData.label = m.label;
  pinGroup.add(dot);
  pins.push(dot);

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.055, 6),
    new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.55 })
  );
  pole.position.copy(midPos);
  pole.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    midPos.clone().normalize()
  );
  pinGroup.add(pole);

  // Ground ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.038, 20),
    new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  );
  ring.position.copy(surfacePos);
  ring.lookAt(surfacePos.clone().multiplyScalar(2));
  pinGroup.add(ring);
});


// Mouse / Touch Interaction

let isDragging = false;
let prevX = 0, prevY = 0;
let rotX = 0.3, rotY = 0;
let velX = 0, velY = 0;

container.addEventListener('mousedown', e => {
  isDragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
  velX = velY = 0;
});
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  velX = (e.clientY - prevY) * 0.005;
  velY = (e.clientX - prevX) * 0.005;
  rotX += velX;
  rotY += velY;
  prevX = e.clientX;
  prevY = e.clientY;
});

container.addEventListener('wheel', e => {
  camera.position.z = Math.min(5, Math.max(1.4, camera.position.z + e.deltaY * 0.005));
  e.preventDefault();
}, { passive: false });

container.addEventListener('touchstart', e => {
  isDragging = true;
  prevX = e.touches[0].clientX;
  prevY = e.touches[0].clientY;
});
container.addEventListener('touchend', () => { isDragging = false; });
container.addEventListener('touchmove', e => {
  if (!isDragging) return;
  velX = (e.touches[0].clientY - prevY) * 0.005;
  velY = (e.touches[0].clientX - prevX) * 0.005;
  rotX += velX;
  rotY += velY;
  prevX = e.touches[0].clientX;
  prevY = e.touches[0].clientY;
});


// Tooltip Raycasting

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

container.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(pins);

  if (hits.length > 0) {
    tooltip.style.display = 'block';
    tooltip.style.left    = (e.clientX - rect.left + 14) + 'px';
    tooltip.style.top     = (e.clientY - rect.top  - 10) + 'px';
    tooltip.textContent   = hits[0].object.userData.label;
    canvas.style.cursor   = 'pointer';
  } else {
    tooltip.style.display = 'none';
    canvas.style.cursor   = isDragging ? 'grabbing' : 'grab';
  }
});


// Render Loop 

let t = 0;

function animate() {
  requestAnimationFrame(animate);
  t += 0.01;

  if (!isDragging) {
    velX *= 0.94;
    velY *= 0.94;
    rotX += velX;
    rotY += velY;
    rotY += 0.0015; // slow auto-rotate
  }

  globe.rotation.x    = rotX;
  globe.rotation.y    = rotY;
  pinGroup.rotation.x = rotX;
  pinGroup.rotation.y = rotY;

  // Pulse animation on pins
  pins.forEach((p, i) => {
    p.scale.setScalar(1 + 0.15 * Math.sin(t * 2 + i));
  });

  renderer.render(scene, camera);
}

animate();
