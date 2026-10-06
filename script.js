import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

/* =====================================================
   EDIT YOUR DETAILS HERE (only place you need to touch)
   ===================================================== */
const CONFIG = {
  regNo: 'IU2441230804',
  email: 'mailto:mahiniravshah@gmail.com',
  github: 'https://github.com/mahishah-git',
  instagram: 'https://instagram.com/mahi_shah44',
  avatarFile: 'avatar.vrm',
  projects: [
    { name: 'CLASSIC PHOTOBOOTH',   url: 'https://mahishah-git.github.io/ClassicPhotoBooth/' },
    { name: 'TELESCOPE FROM PVC',        url: 'https://mahishah-git.github.io/TelescopePVC/' },
    { name: 'FIGMA',            url: 'https://www.figma.com/proto/965KPMTAZHQzrnWSoN61ae/Shringar-Indian-Jewelry-App?node-id=1-2&t=XCQKbtB0dhM03mux-1' },
    { name: "WHO'S THAT POKÉMON?",  url: 'https://mahishah-git.github.io/who-is-that-pokemon/' },
    { name: 'WINTER BREATH',              url: 'https://mahishah-git.github.io/Winter-Breath/' },
    { name: 'PERCEPTION',           url: 'https://mahishah-git.github.io/Perception/', wip: true }
  ]
};

/* ---------- Fill in text + links ---------- */
document.querySelectorAll('[data-fill="regNo"]').forEach(el => (el.textContent = CONFIG.regNo));
document.querySelectorAll('[data-link]').forEach(a => (a.href = CONFIG[a.dataset.link]));
 
/* ---------- Toast ---------- */
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 2500);
}
 
/* ---------- Pokéball project list ---------- */
const ballList = document.getElementById('ball-list');
CONFIG.projects.forEach((p, i) => {
  const num = String(i + 1).padStart(2, '0');
  const li = document.createElement('li');
  const isPlaceholder = p.url.startsWith('URL_PLACEHOLDER');
  li.innerHTML = `
    <a class="ball-link" href="${isPlaceholder ? '#' : p.url}" aria-label="Project ${num}: ${p.name}">
      <span class="pokeball"><span class="ball-num">${num}</span></span>
      <span class="ball-text"><b>${num}</b>${p.name}${p.wip ? '<br><span class="wip">WORK IN PROGRESS</span>' : ''}</span>
    </a>`;
  const link = li.firstElementChild;
  if (isPlaceholder) {
    link.addEventListener('click', e => {
      e.preventDefault();
      showToast(`PROJECT ${num} URL NOT SET YET`);
    });
  }
  ballList.appendChild(li);
});
 
/* ---------- Pokédex panel ---------- */
const dex = document.getElementById('dex');
const tabs = [...document.querySelectorAll('.dex-tabs button')];
const pages = [...document.querySelectorAll('[data-page]')];
let tabIndex = 0;
 
function showTab(i) {
  tabIndex = (i + tabs.length) % tabs.length;
  tabs.forEach((t, n) => t.classList.toggle('active', n === tabIndex));
  pages.forEach(p => (p.hidden = p.dataset.page !== tabs[tabIndex].dataset.tab));
}
function openDex() { dex.hidden = false; showTab(0); document.getElementById('close-dex').focus(); }
function closeDex() { dex.hidden = true; document.getElementById('open-dex').focus(); }
 
document.getElementById('open-dex').addEventListener('click', openDex);
document.getElementById('close-dex').addEventListener('click', closeDex);
dex.addEventListener('click', e => { if (e.target === dex) closeDex(); });
tabs.forEach((t, i) => t.addEventListener('click', () => showTab(i)));
 
/* ---------- Keypad + keyboard ---------- */
function goTo(id) {
  const el = document.getElementById(id);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash');
  void el.offsetWidth; // restart animation
  el.classList.add('flash');
}
 
function handleKey(key) {
  if (!dex.hidden) {
    if (key === 'Escape' || key === '0') closeDex();
    else if (key === 'ArrowRight') showTab(tabIndex + 1);
    else if (key === 'ArrowLeft') showTab(tabIndex - 1);
    return;
  }
  switch (key) {
    case '1': goTo('sec-trainer'); break;
    case '2': openDex(); break;
    case '3': goTo('sec-badges'); break;
    case '4': goTo('sec-projects'); ballList.querySelector('a').focus({ preventScroll: true }); break;
    case '0':
    case 'Escape': goHome(); break;
  }
}
 
// Back / Home: scroll to top, clear any highlight, and show a message so you can see it worked
function goHome() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  document.querySelectorAll('.panel.flash').forEach(p => p.classList.remove('flash'));
  showToast('BACK TO HOME');
}
 
document.querySelectorAll('.keypad button').forEach(b =>
  b.addEventListener('click', () => handleKey(b.dataset.key))
);
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // Enter opens Pokédex only when nothing else is focused
  if (e.key === 'Enter' && document.activeElement === document.body && dex.hidden) return openDex();
  handleKey(e.key);
});
 
/* =====================================================
   3D AVATAR (VRM) – slow 360° rotation around Y axis
   ===================================================== */
const canvas = document.getElementById('avatar-canvas');
const msg = document.getElementById('avatar-msg');
 
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
 
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 1, 4);
 
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(1, 2, 3);
scene.add(sun);
 
const pivot = new THREE.Group(); // this group spins
scene.add(pivot);
 
let vrm = null;
 
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitCamera();
}
new ResizeObserver(resize).observe(canvas);
 
// Frame the whole character so it never overflows the screen
const FILL = 0.87; // character height as a fraction of the display height (was 0.75; ~16% closer)
 
function fitCamera() {
  if (!vrm) return;
  // Measure the model at rotation 0 so the framing never changes while it spins
  const savedRot = pivot.rotation.y;
  pivot.rotation.y = 0;
  pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene);
  pivot.rotation.y = savedRot;
  pivot.updateMatrixWorld(true);
 
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
 
  const distH = (size.y / 2) / t / FILL;                                  // fills ~75% of height
  const widest = Math.max(size.x, size.z);                                // widest the model gets while spinning
  const distW = (widest / 2) / (t * camera.aspect) / 0.9;                 // never wider than the display
  const dist = Math.max(distH, distW) + size.z / 2;
 
  camera.position.set(0, center.y, dist);
  camera.lookAt(0, center.y, 0);
}
 
const loader = new GLTFLoader();
loader.register(parser => new VRMLoaderPlugin(parser));
loader.load(
  CONFIG.avatarFile,
  gltf => {
    vrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(vrm); // make VRM0 models face the camera
    // Lower the arms from T-pose to a relaxed stance
    const l = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const r = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (l) l.rotation.z = -1.2;
    if (r) r.rotation.z = 1.2;
    pivot.add(vrm.scene);
    msg.hidden = true;
    resize();
  },
  undefined,
  () => { msg.textContent = 'AVATAR NOT FOUND (avatar.vrm)'; }
);
 
/* ---------- Manual rotation (mouse drag / touch swipe) ---------- */
const SECONDS_PER_TURN = 18;   // one full 360° turn every 18 seconds
const RESUME_DELAY = 3000;     // ms of no interaction before auto-rotation resumes
const DRAG_SENSITIVITY = 0.008; // radians per pixel of horizontal drag
 
let dragging = false;
let lastX = 0;
let lastInteraction = -Infinity;
let autoFactor = 1;            // 0 = stopped, 1 = full speed (eases back in after a drag)
 
canvas.style.cursor = 'grab';
canvas.style.touchAction = 'pan-y'; // vertical swipes still scroll the page; horizontal swipes rotate
 
canvas.addEventListener('pointerdown', e => {
  dragging = true;
  lastX = e.clientX;
  autoFactor = 0;
  lastInteraction = performance.now();
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
});
 
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  pivot.rotation.y += (e.clientX - lastX) * DRAG_SENSITIVITY; // only horizontal movement is used
  lastX = e.clientX;
  lastInteraction = performance.now();
});
 
function endDrag() {
  if (!dragging) return;
  dragging = false;
  lastInteraction = performance.now();
  canvas.style.cursor = 'grab';
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
 
/* ---------- Animation loop ---------- */
const clock = new THREE.Clock();
 
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
 
  const idle = !dragging && performance.now() - lastInteraction > RESUME_DELAY;
  autoFactor = idle ? Math.min(1, autoFactor + dt / 2) : 0; // ease back to full speed over ~2s
  pivot.rotation.y += (Math.PI * 2 / SECONDS_PER_TURN) * autoFactor * dt;
 
  if (vrm) vrm.update(dt);
  renderer.render(scene, camera);
}
resize();
animate();