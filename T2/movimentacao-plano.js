import * as THREE from 'three';
//import { FlyControls } from '../build/jsm/controls/FlyControls.js';
import Stats from '../build/jsm/libs/stats.module.js';
import {initRenderer, 
        SecondaryBox,
        initDefaultBasicLight,
        onWindowResize, 
        InfoBox,
        createGroundPlaneWired} from "../libs/util/util.js";
//import { Color } from '../build/three.core.js';
import { criaCenarioVerao, criaCenarioInverno, criaCenarioOutono, criaCenarioPrimavera, criaCenario } from './ambiente.js';
import { criarAviao } from './aviao.js';
import GUI from '../libs/util/dat.gui.module.js';

const Perlin = new function()  {
    this.p = new Uint8Array(512);
    const p = new Uint8Array(256);
    for(let i=0; i<256; i++) p[i] = i;
    for(let i=255; i>0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for(let i=0; i<512; i++) this.p[i] = p[i & 255];
    this.fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    this.lerp = (t, a, b) => a + t * (b - a);
    this.grad = (hash, x, y) => { const h = hash & 15; const u = h < 8 ? x : y; const v = h < 4 ? y : h === 12 || h === 14 ? x : 0; return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v); };
    this.noise = (x, y) => {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
        const u = this.fade(x), v = this.fade(y);
        const a = this.p[X] + Y, aa = this.p[a], ab = this.p[a + 1], b = this.p[X + 1] + Y, ba = this.p[b], bb = this.p[b + 1];
        return this.lerp(v, this.lerp(u, this.grad(this.p[aa], x, y), this.grad(this.p[ba], x - 1, y)), this.lerp(u, this.grad(this.p[ab], x, y - 1), this.grad(this.p[bb], x - 1, y - 1)));
    };
};

const scene = new THREE.Scene();
const renderer = initRenderer();
renderer.setClearColor("pink");

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.0, 0.0, 0.0);
camera.up.set(0, 1, 0);

window.addEventListener('resize', function() { onWindowResize(camera, renderer) }, false);

const cameraBox = new THREE.Object3D();
cameraBox.add(camera);
scene.add(cameraBox);

initDefaultBasicLight(scene, true);
scene.fog = new THREE.Fog(new THREE.Color("pink"), 0.1, 400);

const stats = new Stats();
const container = document.getElementById('container');
if (container) { container.appendChild(stats.dom); }

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const planoInvisivelGeo = new THREE.PlaneGeometry(80, 60);
const planoInvisivelMat = new THREE.MeshBasicMaterial({ visible: false });
const planoInvisivel = new THREE.Mesh(planoInvisivelGeo, planoInvisivelMat);
planoInvisivel.position.set(0, 0, -35);
cameraBox.add(planoInvisivel);

const mira = new THREE.Object3D();
const miraMat = new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide, depthTest: false });

// Construção da Mira
const miraMesh1 = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 16), miraMat); miraMesh1.renderOrder = 1;
const miraMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), miraMat); miraMesh2.renderOrder = 1; miraMesh2.position.set(0, 0.45, 0);
const miraMesh3 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), miraMat); miraMesh3.renderOrder = 1; miraMesh3.position.set(0, -0.45, 0);
const miraMesh4 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), miraMat); miraMesh4.renderOrder = 1; miraMesh4.position.set(0.45, 0, 0);
const miraMesh5 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), miraMat); miraMesh5.renderOrder = 1; miraMesh5.position.set(-0.45, 0, 0);
mira.add(miraMesh1, miraMesh2, miraMesh3, miraMesh4, miraMesh5);
mira.position.set(0, 0, -35);
cameraBox.add(mira);

const largura = 1000, profundidade = 1500, divisoes = 150; 
const geoTerreno = new THREE.PlaneGeometry(largura, profundidade, divisoes, divisoes);
geoTerreno.rotateX(-Math.PI / 2); 

const matTerreno = new THREE.MeshStandardMaterial({ 
    color: new THREE.Color("green"), 
    wireframe: false, 
    side: THREE.DoubleSide,
    flatShading: true 
});
const terreno = new THREE.Mesh(geoTerreno, matTerreno);
terreno.position.y = -50; 
scene.add(terreno);

function getAltura(x, z) {
    let nx = x * 0.005, nz = z * 0.005;
    // O algoritmo de Perlin Noise atende ao requisito procedural do trabalho
    let h = (Perlin.noise(nx, nz) * 20 + Perlin.noise(nx*2, nz*2) * 10);
    return h + 30; 
}

let listaArvores = [];
for(let i = 0; i < 80; i++) {
    let dados = criaCenario(0, 0, 0, 'verao');
    let arvore = dados.ambiente.children[1]; 
    if(arvore) {
        scene.add(arvore);
        arvore.position.x = (Math.random() - 0.5) * 800;
        arvore.position.z = -Math.random() * 800;
        arvore.position.y = getAltura(arvore.position.x, arvore.position.z) - 50;
        listaArvores.push(arvore);
    }
}

const aviao = criarAviao();
const aviaoContainer = new THREE.Object3D();
aviaoContainer.add(aviao);
aviao.position.set(0, 0, -25);
aviao.rotateY(Math.PI / 2); 
cameraBox.add(aviaoContainer);

const anguloMaxRotacao = 0.5;
const limiarParadaRotacao = 1;
const velocidadeInclinacao = 0.3;
const target = new THREE.Vector3(0, 0, 0);
let simulaPausada = false;

window.addEventListener('mousemove', (event) => {
  if (simulaPausada) return;
  renderer.domElement.style.cursor = 'none';
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { simulaPausada = true; renderer.domElement.style.cursor = 'default'; mira.visible = false; } });
renderer.domElement.addEventListener('click', () => { simulaPausada = false; renderer.domElement.style.cursor = 'none'; mira.visible = true; });

const infoBox = new SecondaryBox("");
const controls = new InfoBox();
controls.add("Controle com o mouse");
controls.add("Pressione ESC para pausar, clique para voltar.");
controls.show();

const gui = new GUI();
gui.add(scene.fog, 'far', 100, 500).name("Neblina (Fog)");

function render() {
  stats.update();
  if (simulaPausada) { renderer.render(scene, camera); requestAnimationFrame(render); return; }
 
  cameraBox.position.z -= 0.6;

  raycaster.setFromCamera(mouse, camera);
  const intersecoes = raycaster.intersectObject(planoInvisivel);
  
  if (intersecoes.length > 0) {    
    let pontoLocal = cameraBox.worldToLocal(intersecoes[0].point.clone());
    let xTravado = THREE.MathUtils.clamp(pontoLocal.x, -22, 22);
    let yTravado = THREE.MathUtils.clamp(pontoLocal.y, -22, 22);
    mira.position.x = xTravado; mira.position.y = yTravado;
    target.x = xTravado; target.y = yTravado;
  }
  
  let diferencaX = target.x - aviaoContainer.position.x;
  let anguloDesejado = (Math.abs(diferencaX) > limiarParadaRotacao) ? ((diferencaX > 0) ? -anguloMaxRotacao : anguloMaxRotacao) : 0;

  aviaoContainer.position.x += (target.x - aviaoContainer.position.x) * 0.05;
  aviaoContainer.position.y += (target.y - aviaoContainer.position.y) * 0.05;
  aviaoContainer.rotation.z += (anguloDesejado - aviaoContainer.rotation.z) * velocidadeInclinacao;
  
  camera.position.x += (aviaoContainer.position.x * 0.4 - camera.position.x) * 0.05;
  camera.position.y += (aviaoContainer.position.y * 0.4 - camera.position.y) * 0.05;
  
  terreno.position.z = cameraBox.position.z - 250; 
  
  const pos = terreno.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
      let xGlobal = pos.getX(i) + terreno.position.x;
      let zGlobal = pos.getZ(i) + terreno.position.z;
      pos.setY(i, getAltura(xGlobal, zGlobal));
  }
  pos.needsUpdate = true;
  terreno.geometry.computeVertexNormals();

  listaArvores.forEach(a => {
      a.position.y = getAltura(a.position.x, a.position.z) - 50; 
      if (a.position.z > cameraBox.position.z + 50) {
          a.position.z = cameraBox.position.z - 600 - Math.random() * 200; 
          a.position.x = cameraBox.position.x + (Math.random() - 0.5) * 800; 
      }
  });

  camera.lookAt(cameraBox.position.x, cameraBox.position.y, cameraBox.position.z - 30);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();