import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { initRenderer, SecondaryBox, initDefaultBasicLight, onWindowResize, InfoBox } from "../libs/util/util.js";
import { criaCenario } from './ambiente.js';
import { criarAviao } from './aviao.js';
import { SistemaInimigos } from './inimigos.js';
import { SistemaTiros } from './tiros.js';
import GUI from '../libs/util/dat.gui.module.js';

// --- 1. SETUP DA CENA ---
const scene = new THREE.Scene();
const clock = new THREE.Clock();
const renderer = initRenderer();
renderer.setClearColor("pink");

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.0, 0.0, 0.0);
camera.up.set(0, 1, 0);
window.addEventListener('resize', function() { onWindowResize(camera, renderer) }, false);

const cameraBox = new THREE.Object3D();
cameraBox.add(camera);
scene.add(cameraBox);

// initDefaultBasicLight(scene, true);
scene.fog = new THREE.Fog(new THREE.Color("pink"), 0.1, 600);

const stats = new Stats();
const container = document.getElementById('container');
if (container) container.appendChild(stats.dom);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const planoInvisivel = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 60),
    new THREE.MeshBasicMaterial({ visible: false })
);
planoInvisivel.position.set(0, 0, -35);
cameraBox.add(planoInvisivel);

const mira = new THREE.Object3D();
const miraMat = new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide, depthTest: false });
const miraMesh1 = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 16), miraMat); miraMesh1.renderOrder = 1;
const miraMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), miraMat); miraMesh2.renderOrder = 1; miraMesh2.position.set(0, 0.45, 0);
const miraMesh3 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), miraMat); miraMesh3.renderOrder = 1; miraMesh3.position.set(0, -0.45, 0);
const miraMesh4 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), miraMat); miraMesh4.renderOrder = 1; miraMesh4.position.set(0.45, 0, 0);
const miraMesh5 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), miraMat); miraMesh5.renderOrder = 1; miraMesh5.position.set(-0.45, 0, 0);
mira.add(miraMesh1, miraMesh2, miraMesh3, miraMesh4, miraMesh5);
mira.position.set(0, 0, -35);
cameraBox.add(mira);

// --- 2. PERLIN NOISE & TERRENO ---
const Perlin = new function() {
    this.p = new Uint8Array(512); const p = new Uint8Array(256);
    for(let i=0; i<256; i++) p[i] = i; for(let i=255; i>0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
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

function getAltura(x, z) {
    let nx = x * 0.005, nz = z * 0.005;
    let h = (Perlin.noise(nx, nz) * 40) + (Perlin.noise(nx*3, nz*3) * 12) + (Perlin.noise(nx*8, nz*8) * 4);
    return h + 30;
}

const largura = 1000, profundidade = 1000, divisoes = 150;
const geoTerreno = new THREE.PlaneGeometry(largura, profundidade, divisoes, divisoes);
geoTerreno.rotateX(-Math.PI / 2);
geoTerreno.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geoTerreno.attributes.position.count * 3), 3));

const matTerreno = new THREE.MeshStandardMaterial({
    vertexColors: true,
    wireframe: false,
    side: THREE.DoubleSide,
    flatShading: true
});
const terreno = new THREE.Mesh(geoTerreno, matTerreno);
terreno.position.y = -50;
scene.add(terreno);

let listaArvores = [];
for(let i = 0; i < 80; i++) {
    let dados = criaCenario(0, 0, 0, 'verao');
    let arvore = dados.ambiente.children[1];
    if(arvore) {
        scene.add(arvore);
        // Ativar sombras para a árvore (inclui todos os meshes filhos)
        arvore.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        arvore.position.x = (Math.random() - 0.5) * 800;
        arvore.position.z = -Math.random() * 800;
        arvore.position.y = getAltura(arvore.position.x, arvore.position.z) - 50;
        listaArvores.push(arvore);
    }
}

// --- 3. AVIÃO, INIMIGOS E TIROS ---
const aviao = criarAviao();
const aviaoContainer = new THREE.Object3D();
aviaoContainer.add(aviao);
aviao.position.set(0, 0, -25);
aviao.rotateY(Math.PI / 2);
cameraBox.add(aviaoContainer);

aviao.traverse((child) => {
  if (child.isMesh) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
});

const sistemaInimigos = new SistemaInimigos(scene, cameraBox);
const sistemaTiros = new SistemaTiros(scene, camera);

sistemaInimigos.inicializar().catch(erro => console.error('Erro nos inimigos:', erro));

const caixaJogador = new THREE.Box3();
const tamanhoHitboxJogador = new THREE.Vector3(8, 3, 8);
const posicaoAviaoMundo = new THREE.Vector3();
const posicaoMiraMundo = new THREE.Vector3();
const posicaoJogadorParaInimigos = new THREE.Vector3();
const centroHitboxJogador = new THREE.Vector3();

const luzDirecional = new THREE.DirectionalLight(new THREE.Color("white"), 3.5);
luzDirecional.castShadow = true;

luzDirecional.shadow.mapSize.width = 2048;
luzDirecional.shadow.mapSize.height = 2048;

luzDirecional.shadow.camera.near = 0.1;
luzDirecional.shadow.camera.far = 600; // Far alto para cobrir a diagonal da luz até o chão distante

luzDirecional.shadow.camera.left = -300;
luzDirecional.shadow.camera.right = 300;

luzDirecional.shadow.camera.top = 300;
luzDirecional.shadow.camera.bottom = -150;

luzDirecional.shadow.camera.updateProjectionMatrix();
// luzDirecional.shadow.bias = -0.0005; 
// luzDirecional.shadow.normalBias = 0.05;

scene.add(luzDirecional);

const luzTarget = new THREE.Object3D(); // objeto para ser o alvo fixo da luz
scene.add(luzTarget);
luzDirecional.target = luzTarget;

// Luz ambiente para suavizar as áreas sem sol direto
const luzAmbiente = new THREE.AmbientLight(new THREE.Color("white"), 0.3);
scene.add(luzAmbiente);

// --- 4. CONTROLES E VARIÁVEIS GERAIS ---
const target = new THREE.Vector3(0, 0, 0);
let simulaPausada = false;

const anguloMaxRotacao = 0.5;
const limiarParadaRotacao = 1;
const velocidadeInclinacao = 0.3;

const speedProfiles = {
    1: { name: 'lento', cameraZSpeed: 0.12, movimentoXYFactor: 0.015, movimentoXYMultiplier: 0.5, tiroVelMultiplier: 0.45 },
    2: { name: 'normal', cameraZSpeed: 0.5, movimentoXYFactor: 0.05, movimentoXYMultiplier: 1.0, tiroVelMultiplier: 1.0 },
    3: { name: 'rapido', cameraZSpeed: 1.6, movimentoXYFactor: 0.12, movimentoXYMultiplier: 2.0, tiroVelMultiplier: 2.0 },
};
let modoVelocidade = 2;
let cameraZSpeed = speedProfiles[modoVelocidade].cameraZSpeed;
let movimentoXYFactor = speedProfiles[modoVelocidade].movimentoXYFactor;

function aplicarModoVelocidade(modo) {
    if (!speedProfiles[modo]) return;
    modoVelocidade = modo;
    const p = speedProfiles[modo];
    cameraZSpeed = p.cameraZSpeed;
    movimentoXYFactor = p.movimentoXYFactor;
    sistemaTiros.setSpeedProfile({ tiroVelMultiplier: p.tiroVelMultiplier });
    sistemaInimigos.setSpeedProfile({ movimentoXYMultiplier: p.movimentoXYMultiplier });
}
aplicarModoVelocidade(modoVelocidade);

window.addEventListener('mousemove', (event) => {
    if (simulaPausada) return;
    renderer.domElement.style.cursor = 'none';
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function pausarSimulacao() {
    simulaPausada = true;
    sistemaTiros.definirDisparoContinuoAtivo(false);
    renderer.domElement.style.cursor = 'default';
    mira.visible = false;
}

function retomarSimulacao() {
    simulaPausada = false;
    renderer.domElement.style.cursor = 'none';
    mira.visible = true;
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') pausarSimulacao();
    if (['1', '2', '3'].includes(event.key)) aplicarModoVelocidade(Number(event.key));
});

renderer.domElement.addEventListener('click', () => retomarSimulacao());

renderer.domElement.addEventListener('mousedown', (evento) => {
    if (evento.button !== 0) return;
    retomarSimulacao();
    sistemaTiros.definirDisparoContinuoAtivo(true);
});

window.addEventListener('mouseup', (evento) => {
    if (evento.button !== 0) return;
    sistemaTiros.definirDisparoContinuoAtivo(false);
});

window.addEventListener('blur', () => sistemaTiros.definirDisparoContinuoAtivo(false));

const infoBox = new SecondaryBox("");
const controls = new InfoBox();
controls.add("Controle com o mouse");
controls.add("Pressione ESC para pausar, clique para voltar.");
controls.show();

const gui = new GUI();
gui.add(scene.fog, 'far', 100, 750).name("Neblina (Fog)");

const corRocha = new THREE.Color(0x654321);
const corGrama = new THREE.Color(0x2D5A27);
const corVale = new THREE.Color(0x203B15);
const corAgua = new THREE.Color(0x0077BE);
const corTemp = new THREE.Color();

// --- 5. LOOP DE RENDERIZAÇÃO ---
function render() {
    stats.update();
    if (simulaPausada) {
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        return;
    }

    const deltaSegundos = clock.getDelta();
    const tempoAtualMs = performance.now();

    cameraBox.position.z -= cameraZSpeed;

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

    aviaoContainer.position.x += (target.x - aviaoContainer.position.x) * movimentoXYFactor;
    aviaoContainer.position.y += (target.y - aviaoContainer.position.y) * movimentoXYFactor;
    aviaoContainer.rotation.z += (anguloDesejado - aviaoContainer.rotation.z) * velocidadeInclinacao;

    camera.position.x += (aviaoContainer.position.x * 0.4 - camera.position.x) * 0.05;
    camera.position.y += (aviaoContainer.position.y * 0.4 - camera.position.y) * 0.05;

    // Atualização do Terreno Procedural
    terreno.position.z = cameraBox.position.z - 250;

    const pos = terreno.geometry.attributes.position;
    const col = terreno.geometry.attributes.color;

    for (let i = 0; i < pos.count; i++) {
        let xGlobal = pos.getX(i) + terreno.position.x;
        let zGlobal = pos.getZ(i) + terreno.position.z;

        let h = getAltura(xGlobal, zGlobal);
        pos.setY(i, h);

        if (h > 60) {
            corTemp.copy(corRocha);
        } else if (h > 45) {
            corTemp.lerpColors(corGrama, corRocha, (h - 45) / 15);
        } else if (h > 20) {
            corTemp.copy(corGrama);
        } else if (h > 10) {
            corTemp.lerpColors(corAgua, corGrama, (h - 10) / 10);
        } else {
            corTemp.copy(corAgua);
        }

        col.setXYZ(i, corTemp.r, corTemp.g, corTemp.b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    terreno.geometry.computeVertexNormals();
    terreno.receiveShadow = true;

    listaArvores.forEach(a => {
        a.position.y = getAltura(a.position.x, a.position.z) - 50;
        if (a.position.z > cameraBox.position.z + 50) {
            a.position.z = cameraBox.position.z - 600 - Math.random() * 200;
            a.position.x = cameraBox.position.x + (Math.random() - 0.5) * 800;
        }
    });

    // Atualização da Hitbox
    aviaoContainer.getWorldPosition(posicaoAviaoMundo);
    centroHitboxJogador.copy(posicaoAviaoMundo);
    centroHitboxJogador.y += 0.8;
    caixaJogador.setFromCenterAndSize(centroHitboxJogador, tamanhoHitboxJogador);
    mira.getWorldPosition(posicaoMiraMundo);

    // Atualização dos Inimigos e Tiros
    sistemaInimigos.atualizar(
        deltaSegundos,
        tempoAtualMs,
        () => aviaoContainer.getWorldPosition(posicaoJogadorParaInimigos).clone().add(new THREE.Vector3(0, 0.8, 0)),
        (origemMundo, alvoMundo, idInimigoOrigem) => {
            sistemaTiros.criarTiroInimigo(origemMundo, alvoMundo, idInimigoOrigem);
        }
    );

    sistemaTiros.atualizar({
        deltaSegundos,
        tempoAtualMs,
        posicaoAviaoMundo,
        posicaoMiraMundo,
        boxJogador: caixaJogador,
        inimigosColisiveis: sistemaInimigos.obterInimigosColisiveis(),
        aoAtingirInimigo: (idInimigo) => sistemaInimigos.marcarComoAtingido(idInimigo),
    });

    if (scene.fog && luzDirecional.castShadow) {// volume de visualização adaptativo ao fog    
    // Multiplicando por 1.2 e 0.6 para cobrir o horizonte antes dele surgir na neblina
    luzDirecional.shadow.camera.top = scene.fog.far * 1.2;
    luzDirecional.shadow.camera.bottom = -scene.fog.far * 0.6;
    luzDirecional.shadow.camera.updateProjectionMatrix();
    
    let alcanceVisaoZ = scene.fog.far * 0.4; // centraliza target na região média visível
    // coloca target um pouco para a direita para cobrir árvores laterais
    luzTarget.position.set(cameraBox.position.x + 50, cameraBox.position.y - 30, cameraBox.position.z - alcanceVisaoZ);

    luzDirecional.position.set(luzTarget.position.x + 150, cameraBox.position.y + 180, luzTarget.position.z + 100);
  }

    camera.lookAt(cameraBox.position.x, cameraBox.position.y, cameraBox.position.z - 30);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

render();