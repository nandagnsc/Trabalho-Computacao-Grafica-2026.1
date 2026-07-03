import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { initRenderer, SecondaryBox, initDefaultBasicLight, onWindowResize, InfoBox } from "../libs/util/util.js";
import { criaCenario } from './ambiente.js';
import { criarAviao } from './aviao.js';
import { SistemaInimigos } from './inimigos.js';
import { SistemaTiros } from './tiros.js';
import { SistemaInvencibilidade } from './sistemas-extras.js';
import { TelaCarregamento } from './sistemas-extras.js';
import {SistemaHealthPacks} from './sistemas-extras.js';
import GUI from '../libs/util/dat.gui.module.js';
import { Water } from '../build/jsm/objects/Water.js';

const scene = new THREE.Scene(); 
const clock = new THREE.Clock(); 
const renderer = initRenderer(); 

// ==========================================
// CÉU E NEBLINA (SKYBOX) - MUDADO PARA ROSA
// ==========================================
const corHorizonte = new THREE.Color("pink"); // Cor rosa para o horizonte
renderer.setClearColor(corHorizonte); 

// === REMOVIDO: Carregamento do céu azul anterior ===
/*
const carregadorCeu = new THREE.TextureLoader();
const texturaCeu = carregadorCeu.load('../assets/textures/ceu.jpg'); 
texturaCeu.mapping = THREE.EquirectangularReflectionMapping;
texturaCeu.colorSpace = THREE.SRGBColorSpace; 
scene.background = texturaCeu; 
*/

// Mantém a neblina rosa para casar com o céu
scene.fog = new THREE.Fog(corHorizonte, 0.1, 600); 
// ==========================================

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); 
camera.position.set(0.0, 0.0, 0.0); 
camera.up.set(0, 1, 0); 
window.addEventListener('resize', function() { onWindowResize(camera, renderer) }, false); 

const cameraBox = new THREE.Object3D();
cameraBox.add(camera); 
scene.add(cameraBox); 

// --- INÍCIO DOS CÓdigOS NOVOS ---
let simulaPausada = true; 

const telaCarregamento = new TelaCarregamento(() => {
    simulaPausada = false;
    retomarSimulacao();
});

const sistemaHP = new SistemaHealthPacks(scene, cameraBox);
const invencibilidade = new SistemaInvencibilidade();
// --- FIM DOS CÓdigOS NOVOS ---

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
    let h = (Perlin.noise(nx, nz) * 70) + (Perlin.noise(nx*3, nz*3) * 35) + (Perlin.noise(nx*8, nz*8) * 15); 
    return h + 60; // Gera alturas de 30 até ~86
}

// ==========================================================
// 1. SISTEMA DE TERRENO EM ESTEIRA COM TEXTURAS REALISTAS
// ==========================================================

const largura = 1000, profundidade = 1000, divisoes = 150; 
const textureLoader = new THREE.TextureLoader(); 

// Caminhos corretos acessando a pasta assets!
const texturaGrama = textureLoader.load("../T3/grama.jpg");
const texturaRocha = textureLoader.load("../T3/rocha.jpg"); 
const texturaAreia = textureLoader.load("../T3/areia.jpg");
const texturaNeve = textureLoader.load("../T3/neve.jpg"); 

const texturaTronco = textureLoader.load("../assets/textures/wood.jpg");
const texturaFolhas = textureLoader.load("../assets/textures/folha3.jpg"); 

// Repetir a textura das folhas para não ficar esticada
texturaFolhas.wrapS = texturaFolhas.wrapT = THREE.RepeatWrapping;
texturaFolhas.repeat.set(2, 2);
 
[texturaGrama, texturaRocha, texturaAreia, texturaNeve].forEach(t => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4; 
});

const uniformsTerreno = THREE.UniformsUtils.merge([
    THREE.UniformsLib["fog"]
]);

uniformsTerreno.grassTexture = { value: texturaGrama };
uniformsTerreno.rockTexture = { value: texturaRocha };
uniformsTerreno.sandTexture = { value: texturaAreia };
uniformsTerreno.snowTexture = { value: texturaNeve };

// === MATERIAL DO TERRENO COM LIMITES AJUSTADOS PARA UNIFICAR ===
const matTerreno = new THREE.ShaderMaterial({  
    uniforms: uniformsTerreno,

    vertexShader: `
        #include <fog_pars_vertex>
        
        varying vec2 vUv;
        varying float vHeight;

        void main(){
            vUv = uv * 60.0; 
            vHeight = position.y; 

            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vec4 mvPosition = viewMatrix * worldPosition; 
            
            gl_Position = projectionMatrix * mvPosition;
            
            #include <fog_vertex>
        }
    `,

    fragmentShader: `
        uniform sampler2D grassTexture;
        uniform sampler2D rockTexture;
        uniform sampler2D sandTexture;
        uniform sampler2D snowTexture;

        varying vec2 vUv;
        varying float vHeight;
        
        #include <fog_pars_fragment>

        void main(){
            vec4 grass = texture2D(grassTexture, vUv);
            vec4 rock = texture2D(rockTexture, vUv);
            vec4 sand = texture2D(sandTexture, vUv);
            vec4 snow = texture2D(snowTexture, vUv);

            vec4 color;

         // === LIMITES CORRIGIDOS PARA PRAIA FINA E MUITA GRAMA ===
            
            if(vHeight < 43.0){ 
                // A água bate perto do 35. Então do fundo até o 36 será areia pura (praia fina)
                color = sand; 
            }
            else if(vHeight < 55.0){ 
                // Do 36 ao 40, a areia se mistura rapidamente com a grama
                // ATENÇÃO: Os valores do smoothstep devem ser os mesmos do IF anterior e deste IF!
                float t = smoothstep(43.0, 55.0, vHeight);
                color = mix(sand, grass, t); 
            }
            else if(vHeight < 70.0){ 
                // A Grama domina completamente toda a planície e as subidas (do 40 ao 65)
                color = grass; 
            }
            else if(vHeight < 90.0){ 
                // Grama sumindo e virando rocha perto do topo
                float t = smoothstep(70.0, 90.0, vHeight);
                color = mix(grass, rock, t); 
            }
            else if(vHeight < 100.0){ 
                // Rocha recebendo um pouco de neve no cume
                float t = smoothstep(90.0, 100.0, vHeight);
                color = mix(rock, snow, t); 
            }
            else{
                color = snow; // Ponta extrema nevada (acima de 80)
            }

            gl_FragColor = color;
            
            #include <fog_fragment>
        }
    `,
    side: THREE.DoubleSide,
    fog: true 
});
// ==========================================================

function atualizarGeometriaPlano(plano){
    const pos = plano.geometry.attributes.position;
    for(let i = 0; i < pos.count; i++){
        let xGlobal = pos.getX(i) + plano.position.x;
        let zGlobal = pos.getZ(i) + plano.position.z;
        let h = getAltura(xGlobal, zGlobal);
        pos.setY(i, h);
    }
    pos.needsUpdate = true;
    plano.geometry.computeVertexNormals();
}

const planosTerreno = [];
for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(largura, profundidade, divisoes, divisoes);
    geo.rotateX(-Math.PI / 2);
    
    const plano = new THREE.Mesh(geo, matTerreno);
    plano.position.set(0, -115, -i * profundidade); 
    plano.receiveShadow = true;
    
    atualizarGeometriaPlano(plano);
    scene.add(plano);
    planosTerreno.push(plano);
}

/*
let listaArvores = []; 
for(let i = 0; i < 80; i++) {
    let dados = criaCenario(0, 0, 0, 'verao');
    let arvore = dados.ambiente.children[1];
    if(arvore) {
        scene.add(arvore);
        arvore.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // === NOVA LÓGICA DE POSICIONAMENTO ===
        let posX, posZ, alturaLocal;
        
        // Sorteia posições repetidamente ATÉ achar um local com altura maior que 45 (terra/grama)
        do {
            posX = (Math.random() - 0.5) * 800;
            posZ = -Math.random() * 800;
            alturaLocal = getAltura(posX, posZ);
        } while (alturaLocal < 45); // Se for menor que 45 (água ou areia), ele sorteia de novo!

        arvore.position.x = posX;
        arvore.position.z = posZ;
        arvore.position.y = alturaLocal - 80;
        // =====================================

        listaArvores.push(arvore);
    }
}
*/

// ==========================================================
// CRIAÇÃO E TEXTURIZAÇÃO DAS ÁRVORES
// ==========================================================
let listaArvores = []; 
let desiredTreeCount = 100;

for(let i = 0; i < desiredTreeCount; i++) {
    let dados = criaCenario(0, 0, 0, 'verao');
    let arvore = dados.ambiente.children[1];
    
    if(arvore) {
        let posX, posZ, alturaLocal;
        
        // Sorteia posições repetidamente ATÉ achar um local em terra firme (grama)
        do {
            posX = (Math.random() - 0.5) * 800;
            posZ = -Math.random() * 800;
            alturaLocal = getAltura(posX, posZ);
        } while (alturaLocal < 45); 

        scene.add(arvore);

        // A MÁGICA DAS TEXTURAS ACONTECE AQUI:
        arvore.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Verifica qual é o formato (geometria) do pedaço da árvore
            if (child.geometry && child.geometry.type === 'CylinderGeometry') {
                // Se for um Cilindro, é o tronco! Aplicamos a madeira.
                child.material = new THREE.MeshStandardMaterial({ 
                    map: texturaTronco 
                });
            } else {
                // Se for outra coisa (Cone, Esfera), é a copa! Aplicamos as folhas.
                child.material = new THREE.MeshStandardMaterial({ 
                    map: texturaFolhas,
                    // Misturamos um tom de verde caso a imagem da textura seja muito clara
                    color: new THREE.Color(0x3a5f2b) 
                });
            }
          }
        });

        arvore.position.x = posX;
        arvore.position.z = posZ;
        arvore.position.y = alturaLocal - 115;
        listaArvores.push(arvore);
    }
}
// ==========================================================

const aviaoContainer = criarAviao(); 
aviaoContainer.position.set(0, 0, -25); 
cameraBox.add(aviaoContainer);

// SONS:
const listener = new THREE.AudioListener(); 
camera.add(listener); 

const musicaFundo = new THREE.Audio(listener); 
const loader = new THREE.AudioLoader(); 
loader.load('./musicaFundo.mp4', (buffer) => { 
    musicaFundo.setBuffer(buffer);
    musicaFundo.setLoop(true); 
    musicaFundo.setVolume(0.2); 
    musicaFundo.play(); 
});

const sistemaInimigos = new SistemaInimigos(scene, cameraBox); 
const sistemaTiros = new SistemaTiros(scene, camera, listener); 

sistemaInimigos.inicializar().catch(erro => console.error('Erro nos inimigos:', erro)); 

const caixaJogador = new THREE.Box3(); 
const tamanhoHitboxJogador = new THREE.Vector3(8, 3, 8); 
const posicaoAviaoMundo = new THREE.Vector3(); 
const posicaoMiraMundo = new THREE.Vector3(); 
const posicaoJogadorParaInimigos = new THREE.Vector3(); 
const centroHitboxJogador = new THREE.Vector3(); 

const luzDirecional = new THREE.DirectionalLight(new THREE.Color("white"), 3.5); 
luzDirecional.castShadow = true;
luzDirecional.shadow.mapSize.width = 512; 
luzDirecional.shadow.mapSize.height = 512; 
luzDirecional.shadow.camera.near = 0.1; 
luzDirecional.shadow.camera.far = 600; 
luzDirecional.shadow.camera.left = -300;
luzDirecional.shadow.camera.right = 300; 
luzDirecional.shadow.camera.top = 300;
luzDirecional.shadow.camera.bottom = -150; 
luzDirecional.shadow.camera.updateProjectionMatrix();
scene.add(luzDirecional);

const luzTarget = new THREE.Object3D(); 
scene.add(luzTarget); 
luzDirecional.target = luzTarget; 

const luzAmbiente = new THREE.AmbientLight(new THREE.Color("white"), 0.3);
scene.add(luzAmbiente);

const target = new THREE.Vector3(0, 0, 0); 

const anguloMaxRotacao = 0.5; 
const limiarParadaRotacao = 1; 
const velocidadeInclinacao = 0.3; 
const anguloMaxRotacaoX = 0.2; 
const limiarParadaRotacaoX = 1; 
const velocidadeInclinacaoX = 0.3; 

const speedProfiles = {
    1: { name: 'lenta', cameraZSpeed: 0.2, movimentoXYFactor: 0.025, movimentoXYMultiplier: 0.45, tiroVelMultiplier: 0.5 },
    2: { name: 'normal', cameraZSpeed: 0.5, movimentoXYFactor: 0.05, movimentoXYMultiplier: 1.0, tiroVelMultiplier: 1.0 },
    3: { name: 'rapida', cameraZSpeed: 1.6, movimentoXYFactor: 0.12, movimentoXYMultiplier: 2.0, tiroVelMultiplier: 2.0 },
};

function criarIndicadorVelocidade() {
    let indicador = document.getElementById('indicador-velocidade');
    if (indicador) return indicador;

    indicador = document.createElement('div');
    indicador.id = 'indicador-velocidade';
    indicador.style.position = 'fixed';
    indicador.style.top = '5px';
    indicador.style.left = '320px';
    indicador.style.padding = '10px 14px';
    indicador.style.border = '2px solid #ffffff';
    indicador.style.borderRadius = '8px';
    indicador.style.background = 'rgba(0, 0, 0, 0.45)';
    indicador.style.color = '#ffffff';
    indicador.style.fontFamily = 'Verdana, sans-serif';
    indicador.style.fontSize = '14px';
    indicador.style.fontWeight = 'bold';
    indicador.style.zIndex = '20';

    document.body.appendChild(indicador);
    return indicador;
}

const indicadorVelocidade = criarIndicadorVelocidade();

function atualizarIndicadorVelocidade() {
    const perfil = speedProfiles[modoVelocidade]; 
    indicadorVelocidade.textContent = `Velocidade: ${modoVelocidade} ${perfil.name}`; 
}

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
    atualizarIndicadorVelocidade(); 
}
aplicarModoVelocidade(modoVelocidade);

window.addEventListener('mousemove', (event) => {
    if (simulaPausada) return; 
    renderer.domElement.style.cursor = 'none';
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; 
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; 
    
    mouse.x = THREE.MathUtils.clamp(mouse.x, -0.80, 0.80);
    mouse.y = THREE.MathUtils.clamp(mouse.y, -0.80, 0.80);
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
    if(event.key.toLowerCase() === 's'){
        if(musicaFundo.isPlaying) musicaFundo.pause();
        else musicaFundo.play();
    }
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
controls.add("Teclas 1, 2 e 3 para mudar a velocidade do jogo."); 
controls.add("Tecla S para pausar/retomar a música de fundo."); 
controls.show();

const gui = new GUI();
gui.add(scene.fog, 'far', 300, 750).name("Neblina (Fog)");

//AGUA:
function criarAgua() {
    const waterGeometry = new THREE.PlaneGeometry(3000, 3000); 
    const water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('../assets/textures/NormalMapping/waternormals.jpg', (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        sunDirection: new THREE.Vector3(1, 1, 1).normalize(), 
        sunColor: 0xffffff,
        waterColor: 0x0077BE,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    });

    water.rotation.x = -Math.PI / 2;
    water.position.y = -70; // Água nos vales
    scene.add(water);

    return water;
}
const agua = criarAgua(); 

function render() { 
    stats.update();
    if (sistemaTiros.jogoTerminado) {
        // Apenas renderize a cena estática atual sem mover a câmera ou os inimigos!
        renderer.render(scene, camera);
        return; 
    }

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
        mira.position.x = pontoLocal.x; 
        mira.position.y = pontoLocal.y; 
        target.x = pontoLocal.x; 
        target.y = pontoLocal.y; 
    }

    let diferencaX = target.x - aviaoContainer.position.x; 
    let anguloDesejado = (Math.abs(diferencaX) > limiarParadaRotacao) ? ((diferencaX > 0) ? -anguloMaxRotacao : anguloMaxRotacao) : 0; 
    
    let diferencaY = target.y - aviaoContainer.position.y; 
    let anguloDesejadoX = (Math.abs(diferencaY) > limiarParadaRotacaoX) ? ((diferencaY > 0) ? anguloMaxRotacaoX : -anguloMaxRotacaoX) : 0; 

    aviaoContainer.position.x += (target.x - aviaoContainer.position.x) * movimentoXYFactor; 
    aviaoContainer.position.y += (target.y - aviaoContainer.position.y) * movimentoXYFactor; 
    aviaoContainer.rotation.z += (anguloDesejado - aviaoContainer.rotation.z) * velocidadeInclinacao; 
    aviaoContainer.rotation.x += (anguloDesejadoX - aviaoContainer.rotation.x) * velocidadeInclinacaoX; 

    aviaoContainer.getWorldPosition(posicaoAviaoMundo); 
    
    // 2. COLISÃO COM MONTANHAS:
    // Calculamos a altura matemática do terreno exatamente embaixo do avião
    // Subtraímos 115 porque seus planos da esteira estão rebaixados em -115 na cena
    let alturaMontanhaAqui = getAltura(posicaoAviaoMundo.x, posicaoAviaoMundo.z) - 115;
    
    let margemColisaoTerreno = 2.0; // Distância do "chassi" do avião
    
    if (posicaoAviaoMundo.y < alturaMontanhaAqui + margemColisaoTerreno) {
        // O avião tentou entrar na montanha!
        // Forçamos ele para cima para "deslizar/raspar" sobre a terra
        let quantoPassou = (alturaMontanhaAqui + margemColisaoTerreno) - posicaoAviaoMundo.y;
        aviaoContainer.position.y += quantoPassou; 
        
        // Atualiza a variável global novamente para os próximos testes
        aviaoContainer.getWorldPosition(posicaoAviaoMundo);
        
        // NOTA: Quando criarmos a barra de vida, você vai colocar o código de DANO aqui!
    }

    // 3. COLISÃO COM ÁRVORES:
    for (let i = 0; i < listaArvores.length; i++) {
        let arvore = listaArvores[i];
        
        // Mede a distância horizontal (eixos X e Z) entre o avião e a árvore
        let distX = Math.abs(posicaoAviaoMundo.x - arvore.position.x);
        let distZ = Math.abs(posicaoAviaoMundo.z - arvore.position.z);
        
        // Se estiver num raio de 4 unidades da árvore...
        if (distX < 4.0 && distZ < 4.0) {
            
            // Verifica se o avião está baixo o suficiente para bater na copa (árvore tem ~20 de altura)
            let alturaCopa = arvore.position.y + 20.0;
            if (posicaoAviaoMundo.y < alturaCopa) {
                // O avião bateu na árvore!
                // Rebate o avião um pouco para o lado/cima
                aviaoContainer.position.y += 0.5;
                aviaoContainer.position.x += (posicaoAviaoMundo.x > arvore.position.x ? 1.0 : -1.0);
                
                // Atualiza a variável global novamente
                aviaoContainer.getWorldPosition(posicaoAviaoMundo);
                
                // NOTA: Aqui também entrará o dano da barra de vida depois!
            }
        }
    }

    cameraBox.position.x += (aviaoContainer.position.x * 2 - cameraBox.position.x) * 0.2; 
    cameraBox.position.y += (aviaoContainer.position.y * 0.7 - cameraBox.position.y) * 0.2; 

    let alturaTerrenoNaCamera = getAltura(cameraBox.position.x, cameraBox.position.z) - 115;
    
    // 2. Definimos uma margem de segurança (ex: 5 unidades) para manter a lente da câmera 
    // sempre voando acima do relevo alto, impedindo o clipping visual (ver o lado oco)
    let alturaMinimaCamera = alturaTerrenoNaCamera + 5.0;
    
    if (cameraBox.position.y < alturaMinimaCamera) {
        // Se a câmera tentar afundar na montanha, nós cravamos ela na altura segura por cima do morro
        cameraBox.position.y = alturaMinimaCamera;
    }    
    
    let zMaisDistante = Math.min(...planosTerreno.map(p => p.position.z));

    planosTerreno.forEach(plano => {
        if (plano.position.z > cameraBox.position.z + profundidade / 2) {
            plano.position.z = zMaisDistante - profundidade;
            zMaisDistante = plano.position.z; 
            atualizarGeometriaPlano(plano);
        }
    });

    agua.position.z = cameraBox.position.z - 250;

    listaArvores.forEach(a => { 
        a.position.y = getAltura(a.position.x, a.position.z) - 115.5; 
        
        // Se a árvore ficou para trás da câmera...
        if (a.position.z > cameraBox.position.z + 50) { 
            
            let novoX, novoZ, novaAltura;
            
            // ...Sorteia um novo lugar lá na frente, mas SÓ em terra firme!
            do {
                novoX = cameraBox.position.x + (Math.random() - 0.5) * 800; 
                novoZ = cameraBox.position.z - 600 - Math.random() * 200; 
                novaAltura = getAltura(novoX, novoZ);
            } while (novaAltura < 45); // Garante que a reciclagem também fuja da água

            a.position.x = novoX;
            a.position.z = novoZ;
        }
    });

    aviaoContainer.getWorldPosition(posicaoAviaoMundo); 
    centroHitboxJogador.copy(posicaoAviaoMundo); 
    centroHitboxJogador.y += 0.8; 
    caixaJogador.setFromCenterAndSize(centroHitboxJogador, tamanhoHitboxJogador); 
    mira.getWorldPosition(posicaoMiraMundo); 

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
        aoAtingirInimigo: (idInimigo) => {
            sistemaInimigos.marcarComoAtingido(idInimigo);
            sistemaHP.registrarAbate(); 
        }, 
        isinvencivel: invencibilidade.estaInvencivel(), 
    });

    if (scene.fog && luzDirecional.castShadow) {    
      luzDirecional.shadow.camera.far = scene.fog.far * 1.5; 
      luzDirecional.shadow.camera.near = -scene.fog.far * 0.6;
      luzDirecional.shadow.camera.left = -scene.fog.far * 0.6;
      luzDirecional.shadow.camera.right = scene.fog.far * 0.6;
      luzDirecional.shadow.camera.updateProjectionMatrix();
      
      let alcanceVisaoZ = scene.fog.far * 0.4; 
      luzTarget.position.set(cameraBox.position.x + 50, cameraBox.position.y - 30, cameraBox.position.z - alcanceVisaoZ); 
      luzDirecional.position.set(luzTarget.position.x + 150, cameraBox.position.y + 180, luzTarget.position.z + 100); 
    }

    agua.material.uniforms['time'].value += 1/60; 

    sistemaHP.atualizar(deltaSegundos, posicaoAviaoMundo);

    renderer.render(scene, camera); 
    requestAnimationFrame(render); 
}

render();