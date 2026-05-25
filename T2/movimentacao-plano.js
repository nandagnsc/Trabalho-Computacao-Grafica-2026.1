import * as THREE from 'three';
//import { FlyControls } from '../build/jsm/controls/FlyControls.js';
import Stats from '../build/jsm/libs/stats.module.js';
import {initRenderer, 
        SecondaryBox,
        initDefaultBasicLight,
        onWindowResize, 
        InfoBox,
        createGroundPlaneWired} from "../libs/util/util.js";
import { criaCenarioVerao, criaCenarioInverno, criaCenarioOutono, criaCenarioPrimavera, criaCenario } from './ambiente.js';
import { criarAviao } from './aviao.js';
import { SistemaInimigos } from './inimigos.js';
import { SistemaTiros } from './tiros.js';
import GUI from '../libs/util/dat.gui.module.js';

// cena principal do trabalho
var scene = new THREE.Scene();   // Cria a cena principal
// relogio usado para animacoes por delta time
const clock = new THREE.Clock(); // Cria um relógio para controlar o tempo entre os frames
initDefaultBasicLight(scene, true);    // Use a iluminação padrão

const stats = new Stats();

const container = document.getElementById( 'container' );

if (container) {
  container.appendChild(stats.dom);
} else{
  console.warn("Container não encontrado!");
}


var renderer = initRenderer();   // Função de visualização em util/utils
  renderer.setClearColor("pink"); // Define a cor de fundo do renderizador
  // renderer.domElement.style.cursor = 'none';
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // Cria a câmera
  camera.position.set(0.0, 0.0, 0.0); // Define a posição inicial da câmera
  camera.up.set( 0, 1, 0 ); // Define a direção "para cima" da câmera

window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false ); // Escuta as mudanças no tamanho da janela para ajustar a câmera e o renderizador

let cameraBox = new THREE.Object3D();
// agrupa a camera para movimentar tudo junto
cameraBox.add(camera); // Adiciona a câmera a um objeto vazio (cameraBox) para facilitar o controle do movimento da câmera
scene.add(cameraBox); // Adiciona o cameraBox à cena
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
scene.fog = new THREE.Fog(new THREE.Color("pink"), 0.1, 400);


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
// grupo que recebe o modelo do avião do jogador
const aviaoContainer = new THREE.Object3D(); // Cria um objeto vazio (aviaoContainer) para conter o avião, permitindo que o avião seja controlado como um grupo, facilitando a aplicação de transformações como movimento e rotação ao avião como um todo, sem afetar diretamente a posição ou rotação individual do modelo do avião.
aviaoContainer.add(aviao); // Adiciona o avião a um objeto vazio (aviaoContainer) para facilitar o controle do movimento do avião

// sistema que controla inimigos e tiros
const sistemaInimigos = new SistemaInimigos(scene, cameraBox);
const sistemaTiros = new SistemaTiros(scene, camera);

// carrega os inimigos antes de iniciar a interação completa
sistemaInimigos.inicializar().catch((erro) => {
  console.error('Nao foi possivel carregar inimigos:', erro);
});

// bounding box manual do jogador para colisao mais justa
const caixaJogador = new THREE.Box3();
const tamanhoHitboxJogador = new THREE.Vector3(8, 3, 8);
const posicaoAviaoMundo = new THREE.Vector3();
const posicaoMiraMundo = new THREE.Vector3();
const posicaoJogadorParaInimigos = new THREE.Vector3();
const centroHitboxJogador = new THREE.Vector3();

const anguloMaxRotacao = 0.5; // Define o ângulo máximo de rotação do avião em radianos, limitando a inclinação do avião para evitar que ele gire excessivamente quando a posição alvo da câmera estiver muito distante da posição atual do avião. O valor de 0.6 radianos é +- 34/35 graus.
const limiarParadaRotacao= 1; // Define o limiar de parada para a rotação do avião, que é a distância mínima entre a posição alvo da câmera e a posição atual do avião no eixo X para que o avião comece a girar. Se a diferença no eixo X for menor que esse limiar, o avião permanecerá nivelado, evitando que ele gire desnecessariamente quando a posição alvo da câmera estiver muito próxima da posição atual do avião.  
const velocidadeInclinacao = 0.3; // Define a velocidade de inclinação do avião,  para controlar a intensidade do efeito de inclinação do avião com base na posição do mouse. Um valor mais alto resultará em uma inclinação mais rápida e intensa, enquanto um valor mais baixo resultará em uma inclinação mais suave e lenta.


aviao.position.set(0, 0, -25);
aviao.rotateY(Math.PI / 2); 
cameraBox.add(aviaoContainer);

const anguloMaxRotacao = 0.5;
const limiarParadaRotacao = 1;
const velocidadeInclinacao = 0.3;
const target = new THREE.Vector3(0, 0, 0);
let simulaPausada = false;

// perfis de velocidade: 1=lento, 2=normal, 3=rapido
const speedProfiles = {
  1: { name: 'lento', cameraZSpeed: 0.12, movimentoXYFactor: 0.015, movimentoXYMultiplier: 0.5, tiroVelMultiplier: 0.45 },
  2: { name: 'normal', cameraZSpeed: 0.5, movimentoXYFactor: 0.05, movimentoXYMultiplier: 1.0, tiroVelMultiplier: 1.0 },
  3: { name: 'rapido', cameraZSpeed: 1.6, movimentoXYFactor: 0.12, movimentoXYMultiplier: 2.0, tiroVelMultiplier: 2.0 },
};

let modoVelocidade = 2;
let cameraZSpeed = speedProfiles[modoVelocidade].cameraZSpeed;
let movimentoXYFactor = speedProfiles[modoVelocidade].movimentoXYFactor;

function criarIndicadorModo() {
  let el = document.getElementById('modo-velocidade');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'modo-velocidade';
  el.style.position = 'fixed';
  el.style.left = '280px';
  el.style.top = '8px';
  el.style.padding = '8px 10px';
  el.style.background = 'rgba(0,0,0,0.45)';
  el.style.color = '#fff';
  el.style.border = '2px solid #fff';
  el.style.borderRadius = '6px';
  el.style.fontFamily = 'Verdana, sans-serif';
  el.style.zIndex = '30';
  document.body.appendChild(el);
  return el;
}

const indicadorModo = criarIndicadorModo();
function atualizarElementoModo() {
  indicadorModo.textContent = `modo ${modoVelocidade} — ${speedProfiles[modoVelocidade].name}`;
}

function aplicarModoVelocidade(modo) {
  if (!speedProfiles[modo]) return;
  modoVelocidade = modo;
  const p = speedProfiles[modo];
  cameraZSpeed = p.cameraZSpeed;
  movimentoXYFactor = p.movimentoXYFactor;
  // atualiza sistemas que dependem de velocidade
  sistemaTiros.setSpeedProfile({ tiroVelMultiplier: p.tiroVelMultiplier });
  sistemaInimigos.setSpeedProfile({ movimentoXYMultiplier: p.movimentoXYMultiplier });
  atualizarElementoModo();
}

// aplica modo inicial
aplicarModoVelocidade(modoVelocidade);

window.addEventListener('mousemove', (event) => { // Executa o movimento do mouse para atualizar a posição alvo da câmera
  if (simulaPausada) { //ve se a simulação ta pausada, e se estiver, a função retorna sem atualizar a posição alvo da câmera, permitindo que o usuário veja a cena congelada enquanto a simulação está pausada.
    return;
  }
  
  // Garante que o cursor do mouse permaneça oculto durante o jogo
  renderer.domElement.style.cursor = 'none';
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function pausarSimulacao() { // Função para pausar a simulação, que pode ser chamada quando o usuário aperta esc 
  simulaPausada = true; //indica que esta pausada
  sistemaTiros.definirDisparoContinuoAtivo(false);
  renderer.domElement.style.cursor = 'default'; //como esta pausada, mostrar o cursor para o usuario
  mira.visible = false; // Esconde a mira quando a simulação estiver pausada, para evitar que ela fique visível enquanto o usuário interage com a cena ou visualiza a cena congelada. Isso pode ajudar a melhorar a experiência do usuário e evitar distrações visuais durante a pausa da simulação.
}
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { simulaPausada = true; renderer.domElement.style.cursor = 'default'; mira.visible = false; } });
renderer.domElement.addEventListener('click', () => { simulaPausada = false; renderer.domElement.style.cursor = 'none'; mira.visible = true; });

const infoBox = new SecondaryBox("");
const controls = new InfoBox();
controls.add("Controle com o mouse");
controls.add("Pressione ESC para pausar, clique para voltar.");
controls.show();

const gui = new GUI();
gui.add(scene.fog, 'far', 100, 500).name("Neblina (Fog)");

window.addEventListener('keydown', (event) => { //ao pressionar a tecla esc, pausa a simulação
  if (event.key === 'Escape') {
    pausarSimulacao();
    return;
  }

  // teclas 1,2,3 trocam o modo de velocidade
  if (event.key === '1' || event.key === '2' || event.key === '3') {
    aplicarModoVelocidade(Number(event.key));
  }
});

renderer.domElement.addEventListener('click', () => { //ao clicar, retorna a simulação
  retomarSimulacao();
});

renderer.domElement.addEventListener('mousedown', (evento) => {
  // ao segurar o botao esquerdo, liga o disparo continuo
  if (evento.button !== 0) return;
  retomarSimulacao();
  sistemaTiros.definirDisparoContinuoAtivo(true);
});

window.addEventListener('mouseup', (evento) => {
  // ao soltar o botao esquerdo, para o disparo continuo
  if (evento.button !== 0) return;
  sistemaTiros.definirDisparoContinuoAtivo(false);
});

window.addEventListener('blur', () => {
  // evita tiro travado se a janela perder o foco
  sistemaTiros.definirDisparoContinuoAtivo(false);
});

var infoBox = new SecondaryBox(""); // Cria uma caixa de informações para exibir instruções ou detalhes sobre o controle

function showInformation(){ // Função para mostrar as informações na caixa de informações
  var controls = new InfoBox(); // Cria um objeto InfoBox para exibir as informações
  controls.add("Controle com maouse"); // Adiciona uma linha de texto à caixa de informações
  controls.add("Movimento no plano"); // Adiciona outra linha de texto à caixa de informações
  controls.show(); // 
}

buildInterface(); // Chama a função para construir a interface do usuário, que pode incluir controles ou opções para interagir com a cena
render(); // Inicia o loop de renderização para atualizar a cena continuamente

function buildInterface() {
  var gui = new GUI();
  gui.add(scene.fog, 'far', 60, 300)
    .name("Fog Far");
}

function render() // Função de renderização que é chamada a cada frame para atualizar a cena
{
  stats.update();
  // calcula o tempo desde o quadro anterior
  const deltaSegundos = clock.getDelta();
  // tempo absoluto usado nas cadencias
  const tempoAtualMs = performance.now();

  if (simulaPausada) { // Verifica se a simulação está pausada, e se estiver, renderiza a cena atual sem atualizar as posições ou movimentos dos objetos, permitindo que o usuário veja a cena congelada enquanto a simulação está pausada.
    renderer.render(scene, camera); 
    requestAnimationFrame(render);
    return;
  }
 
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

  /*cenarios.forEach((c)=>{
    if (c.position.z > cameraBox.position.z + limite) { // Verifica se o cenário está dentro do limite de movimento da câmera, comparando a posição do cenário com a posição da câmera e o limite definido
      // let menorZ = Math.min(...cenarios.map(obj => obj.position.z)); // Encontra a menor posição Z entre os cenários para determinar onde reposicionar o cenário que saiu do limite}
      c.position.z -= tamanho * cenarios.length; // Reposiciona o cenário para a frente da cena, usando o menor Z encontrado e o tamanho do plano de movimento para garantir que ele apareça à frente dos outros cenários
    }
  });*/

  aviaoContainer.position.x += (target.x - aviaoContainer.position.x) * movimentoXYFactor; // atualiza posição X do avião com fator dinamico
  cameraBox.position.z -= cameraZSpeed; // velocidade Z da camera controlada pelo perfil
  aviaoContainer.position.y += (target.y - aviaoContainer.position.y) * movimentoXYFactor; // atualiza posição Y do avião com fator dinamico
  
  
  aviaoContainer.rotation.z += (anguloDesejado - aviaoContainer.rotation.z) * velocidadeInclinacao;  // Atualiza a rotação do avião no eixo Z para criar um efeito de inclinação com base na posição do mouse, multiplicando pela velocidade de inclinação para controlar a intensidade do efeito
  
  cameraBox.translateX((target.x - aviaoContainer.position.x)/15);
  camera.lookAt(cameraBox.position.x, cameraBox.position.y, cameraBox.position.z - 30); // Faz a câmera olhar para um ponto à frente dela, ajustando a posição de destino para que a câmera olhe para um ponto 30 unidades à frente no eixo Z, mantendo a mesma posição no eixo X e Y

  aviaoContainer.getWorldPosition(posicaoAviaoMundo);
  // centraliza a hitbox perto da fuselagem do avião
  centroHitboxJogador.copy(posicaoAviaoMundo);
  centroHitboxJogador.y += 0.8;
  caixaJogador.setFromCenterAndSize(centroHitboxJogador, tamanhoHitboxJogador);
  mira.getWorldPosition(posicaoMiraMundo);

  // atualiza movimento, tiros e colisoes dos inimigos
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

  // agenda o proximo frame
  requestAnimationFrame(render); // agenda o proximo frame
  
  deslocamentoZ += cameraZSpeed; // atualiza deslocamento do cenario usando velocidade Z atual
  /*const geoTerreno = terrenoMesh.geometry; // Acessa a geometria do terreno para atualizar os vértices com base no deslocamento
  const atributoPosicao = geoTerreno.attributes.position; // Acessa o atributo de posição da geometria do terreno para modificar os vértices
  */

  function obterAlturaMontanha(x, z) { // Função para calcular a altura da montanha com base nas coordenadas x e z, usando uma função de ruído ou outra fórmula para criar variações na altura do terreno
    let camada1 = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 35;
    let camada2 = Math.cos(x * 0.02 + z * 0.02)  * 8;
    return camada1 + camada2; // Retorna a altura calculada para o ponto (x, z) com base na combinação das camadas de ruído
  }

  cenarioObjeto.children.forEach((meshFilho) => {
    if (meshFilho.geometry && meshFilho.type === "Mesh") { // Verifica se o filho do cenário é uma malha (Mesh) com geometria, para aplicar as transformações de movimento e deformação apenas aos objetos que são malhas, evitando modificar outros tipos de objetos que possam estar presentes no cenário
      const geo = meshFilho.geometry; // Acessa a geometria do filho do cenário para atualizar os vértices com base no deslocamento
      const atributoPosicao = geo.attributes.position; // Acessa o atributo de posição da geometria do filho do cenário para modificar os vértices

      for (let i = 0; i < atributoPosicao.count; i++) { // Itera sobre os vértices do filho do cenário para atualizar suas posições com base no deslocamento e na função de altura
      /*let x = atributoPosicao.getX(i);
        let z = atributoPosicao.getZ(i);
        let novaAltura = obterAlturaMontanha(x, z - deslocamentoZ);
      
      let xGlobal = atributoPosicao.getX(i) + cenarioObjeto.position.x;
      let zGlobal = atributoPosicao.getZ(i) + cenarioObjeto.position.z;
      let alturaCalculada = obterAlturaMontanha(xGlobal, zGlobal);
    */

      let x = atributoPosicao.getX(i); // Calcula a posição global do vértice no eixo X, somando a posição local do vértice com a posição do cenário para obter a posição correta em relação ao terreno
      let z = atributoPosicao.getZ(i); // Calcula a posição global do vértice no eixo Z, somando a posição local do vértice com a posição do cenário para obter a posição correta em relação ao terreno
      let alturaCalculada = obterAlturaMontanha(x, z - deslocamentoZ); // Calcula a nova altura para o vértice com base na função de altura e no deslocamento

      atributoPosicao.setZ(i, alturaCalculada); // Atualiza a posição Y do vértice com a nova altura calculada, criando um efeito de movimento do terreno à medida que o avião avança
      }

      atributoPosicao.needsUpdate = true; // Indica que o atributo de posição foi atualizado e precisa ser reprocessado pelo renderizador para refletir as mudanças na cena
      geo.computeVertexNormals(); // Recalcula as normais dos vértices do filho do cenário para garantir que a iluminação e as sombras sejam renderizadas corretamente com base nas novas posições dos vértices, mantendo a aparência visual do terreno consistente à medida que ele se move e se deforma
      geo.computeBoundingBox(); // Recalcula a caixa delimitadora da geometria do filho do cenário para garantir que as colisões e outras interações baseadas na caixa delimitadora sejam precisas com base nas novas posições dos vértices, mantendo a funcionalidade de detecção de colisões e outras interações que dependem da caixa delimitadora do terreno à medida que ele se move e se deforma
      geo.computeBoundingSphere(); // Recalcula a esfera delimitadora da geometria do filho do cenário para garantir que as colisões e outras interações baseadas na esfera delimitadora sejam precisas com base nas novas posições dos vértices, mantendo a funcionalidade de detecção de colisões e outras interações que dependem da esfera delimitadora do terreno à medida que ele se move e se deforma    
    }
  });

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
