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

/*
container.appendChild( stats.dom );
*/

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

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 1. Criar o Plano Invisível à frente
// Ele fica dentro do cameraBox para acompanhar a câmera no eixo Z
const planoInvisivelGeo = new THREE.PlaneGeometry(80, 60); // Tamanho da área de movimento
const planoInvisivelMat = new THREE.MeshBasicMaterial({ visible: false }); // Fica invisível
const planoInvisivel = new THREE.Mesh(planoInvisivelGeo, planoInvisivelMat);
// Posicionado em Z = -35 (um pouco à frente do avião que está em Z = -25)
planoInvisivel.position.set(0, 0, -35); 
cameraBox.add(planoInvisivel);

// 2. Criar o Objeto da Mira (Target)
// Vamos criar um anel simples em formato de mira usando RingGeometry
const mira = new THREE.Object3D(); // Cria um objeto vazio para conter a mira, permitindo que a mira seja controlada como um grupo, facilitando a aplicação de transformações como movimento e rotação à mira como um todo, sem afetar diretamente a posição ou rotação individual dos componentes da mira.
const miraMat = new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide, depthTest: false });
const miraGeo1 = new THREE.RingGeometry(0.3, 0.4, 16);
const miraMesh1 = new THREE.Mesh(miraGeo1, miraMat);
miraMesh1.renderOrder = 1; // Garante que a mira seja renderizada por cima de outros objetos, evitando que ela seja ocultada por outros elementos da cena, especialmente quando a mira estiver muito próxima de outros objetos ou do plano invisível. Isso é importante para manter a visibilidade da mira e garantir que ela seja claramente visível para o usuário durante a interação com a cena.

const miraGeo2 = new THREE.PlaneGeometry(0.1, 0.3);
const miraMesh2 = new THREE.Mesh(miraGeo2, miraMat);
miraMesh2.renderOrder = 1; // Garante que o segundo anel da mira seja renderizado por cima de outros objetos
miraMesh2.position.set(0, 0.45, 0); // Posiciona o segundo anel da mira um pouco acima do primeiro para criar um formato de mira mais completo
const miraMesh3 = new THREE.Mesh(miraGeo2, miraMat);
miraMesh3.renderOrder = 1; // Garante que o terceiro anel da mira seja renderizado por cima de outros objetos
miraMesh3.position.set(0, -0.45, 0); // Posiciona o terceiro anel da mira um pouco abaixo do primeiro para criar um formato de mira mais completo

const miraGeo4 = new THREE.PlaneGeometry(0.3, 0.1);
const miraMesh4 = new THREE.Mesh(miraGeo4, miraMat);
miraMesh4.renderOrder = 1; // Garante que o quarto anel da mira seja renderizado por cima de outros objetos
miraMesh4.position.set(0.45, 0, 0); // Posiciona o quarto anel da mira um pouco à direita do primeiro para criar um formato de mira mais completo
const miraMesh5 = new THREE.Mesh(miraGeo4, miraMat);
miraMesh5.renderOrder = 1; // Garante que o quinto anel da mira seja renderizado por cima de outros objetos
miraMesh5.position.set(-0.45, 0, 0); // Posiciona o quinto anel da mira um pouco à esquerda do primeiro para criar um formato de mira mais completo


mira.add(miraMesh1); // Adiciona o primeiro anel da mira ao objeto da mira
mira.add(miraMesh2); // Adiciona o segundo anel da mira ao objeto da mira
mira.add(miraMesh3); // Adiciona o terceiro anel da mira ao objeto da mira
mira.add(miraMesh4); // Adiciona o quarto anel da mira ao objeto da mira
mira.add(miraMesh5); // Adiciona o quinto anel da mira ao objeto da mira
// A mira precisa ter a mesma coordenada Z do plano invisível
mira.position.set(0, 0, -35);
cameraBox.add(mira);

/*let cenarios = []; // Cria um array para armazenar os cenários, embora neste código específico ele não seja utilizado posteriormente
const estacoes = ['verao', 'outono', 'inverno', 'primavera']; // Define um array com os nomes das estações do ano, que podem ser usados para criar diferentes tipos de cenários usando a função criaCenario, embora neste código específico eles não sejam utilizados posteriormente
for (let i = 0; i < 4; i++) {
  let c = criaCenario(0, -30, (i * -100) - 100, estacoes[i]); // Cria um cenário usando a função criaCenario, posicionando-o em diferentes locais ao longo do eixo Z para criar uma sensação de profundidade e variedade na cena. O tipo de cenário é definido como 'primavera', mas poderia ser alterado para outros tipos, como 'verão', 'outono' ou 'inverno', dependendo da implementação da função criaCenario.
  cenarios.push(c); // Adiciona o cenário criado ao array de cenários, embora neste código específico o array não seja utilizado posteriormente. Isso pode ser útil para futuras manipulações ou para manter uma referência aos cenários criados.
  scene.add(c); // Adiciona o cenário à cena para que ele seja renderizado e visível na visualização final. Cada cenário é posicionado em um local diferente ao longo do eixo Z, criando uma sensação de profundidade e variedade na cena, e o tipo de cenário é definido como 'primavera', mas poderia ser alterado para outros tipos, como 'verão', 'outono' ou 'inverno', dependendo da implementação da função criaCenario.
} */

let dadosCenario = criaCenario(0, -30, -150, 'verao'); // cria o cenário
let cenarioObjeto = dadosCenario.ambiente; // cria um container com o cenário e as árvoes
let terrenoMesh = dadosCenario.terrenoMesh; // pega a malha geométrica do chão do cenário
scene.add(cenarioObjeto);

let listaArvores = []; // separa as árvores em um array para facilitar o controle
cenarioObjeto.children.forEach((child) => {
  if (child !== terrenoMesh && child.type === "Object3D") { // se não for o chão e for do tipo "Object3D", ou seja, for uma árvore, adiciona à lista de árvores
    listaArvores.push(child); // Adiciona o objeto filho à lista de árvores, desde que ele seja do tipo "Object3D" e não seja o terrenoMesh. Isso pode ser útil para futuras manipulações ou para manter uma referência às árvores criadas no cenário.
  }
});

let deslocamentoZ = 0; // controla o deslocamento do cenário proceduralmente

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
aviao.rotateY(Math.PI/2); // Gira o avião para que ele ltado para a direção correta (para frente)
cameraBox.add(aviaoContainer); // Adiciona o avião à cena

scene.fog = new THREE.Fog(new THREE.Color("pink"), 0.1, 200); // Adiciona neblina à cena para criar um efeito de profundidade, usando a mesma cor do fundo para que os objetos desapareçam gradualmente à medida que se afastam da câmera

var target = new THREE.Vector3(0, 0, 0); // Variável para armazenar a posição alvo para a câmera, que será atualizada com base na posição do mouse
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

  // Normaliza as coordenadas do mouse para o Raycaster
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function pausarSimulacao() { // Função para pausar a simulação, que pode ser chamada quando o usuário aperta esc 
  simulaPausada = true; //indica que esta pausada
  sistemaTiros.definirDisparoContinuoAtivo(false);
  renderer.domElement.style.cursor = 'default'; //como esta pausada, mostrar o cursor para o usuario
  mira.visible = false; // Esconde a mira quando a simulação estiver pausada, para evitar que ela fique visível enquanto o usuário interage com a cena ou visualiza a cena congelada. Isso pode ajudar a melhorar a experiência do usuário e evitar distrações visuais durante a pausa da simulação.
}

function retomarSimulacao() {
  if (!simulaPausada) { // Verifica se a simulação já está em execução para evitar retomar desnecessariamente
    return; // Se a simulação já estiver em execução, a função retorna sem fazer nada
  }

  simulaPausada = false; // Indica que a simulação foi retomada
  renderer.domElement.style.cursor = 'none'; // Esconde o cursor novamente
  mira.visible = true; // Mostra a mira quando a simulação estiver em execução
}

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
 
  raycaster.setFromCamera(mouse, camera); // Atualiza raycaster com a posição do mouse e a câmera para calcular as interseções com o plano invisível, permitindo que a posição alvo da câmera seja atualizada com base na posição do mouse na cena. Isso é essencial para criar a interação entre o movimento do mouse e o controle da câmera, permitindo que o usuário mova a câmera de forma intuitiva usando o mouse.
    
  const intersecoes = raycaster.intersectObject(planoInvisivel); // Calcula as interseções com o plano invisível
  
  const limiteX = 22; // Limite para esquerda (-) e direita (+)
  const limiteY = 12;  // Limite para cima

  if (intersecoes.length > 0) {    
    let pontoIntersecao = intersecoes[0].point; // Ponto onde o mouse está tocando no plano invisível
    
    let pontoLocal = cameraBox.worldToLocal(pontoIntersecao.clone()); // Converte o ponto global para o espaço local do cameraBox

    // Trava os valores de X e Y dentro dos limites estabelecidos
    let xTravado = THREE.MathUtils.clamp(pontoLocal.x, - limiteX, limiteX);
    let yTravado = THREE.MathUtils.clamp(pontoLocal.y, - limiteY, limiteY);

    // A mira (target) segue exatamente a posição do mouse no plano invisível
    mira.position.x = xTravado;
    mira.position.y = yTravado;

    // Atualizamos a variável target antiga para o avião seguir a mira suavemente
    target.x = xTravado;
    target.y = yTravado;
  }
  
  let limite = 50; // Define um limite para o movimento da câmera, para evitar que ela se mova muito longe do centro da cena  
  let tamanho = 100; // Define o tamanho do plano de movimento da câmera, que pode ser usado para calcular os limites do movimento com base na posição do mouse

  let diferencaX = target.x - aviaoContainer.position.x; // Calcula a diferença entre a posição alvo da câmera no eixo X e a posição atual do avião no eixo X, o que pode ser usado para determinar a direção e a intensidade do movimento do avião
  let anguloDesejado = 0; // Inicializa a variável para armazenar o ângulo desejado de rotação do avião, que será calculado com base na diferença entre a posição alvo da câmera e a posição atual do avião

  if(Math.abs(diferencaX) > limiarParadaRotacao){ // Verifica se a diferença no eixo X é maior que o limiar de parada para rotação, o que pode ser usado para evitar que o avião gire desnecessariamente quando a posição alvo da câmera estiver muito próxima da posição atual do avião
    anguloDesejado = (diferencaX > 0) ? -anguloMaxRotacao : anguloMaxRotacao; // Define o ângulo desejado de rotação do avião com base na direção da diferença no eixo X, usando o ângulo máximo de rotação para limitar a inclinação do avião
  } else {
    anguloDesejado = 0; // Se a diferença no eixo X for menor que o limiar de parada, define o ângulo desejado como 0 para que o avião fique nivelado
  }

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

  /*
  for (let i = 0; i < atributoPosicao.count; i++) { // Itera sobre os vértices do terreno para atualizar suas posições com base no deslocamento e na função de altura
    let x = atributoPosicao.getX(i);  
    let z = atributoPosicao.getZ(i);
    let novaAltura = obterAlturaMontanha(x, z - deslocamentoZ);
    atributoPosicao.setZ(i, novaAltura); // Atualiza a posição Y do vértice com a nova altura calculada, criando um efeito de movimento do terreno à medida que o avião avança
  }

  atributoPosicao.needsUpdate = true; // Indica que o atributo de posição foi atualizado e precisa ser reprocessado pelo renderizador para refletir as mudanças na cena
  geoTerreno.computeVertexNormals(); // Recalcula as normais dos vértices do terreno para garantir que a iluminação e as sombras sejam renderizadas corretamente com base nas novas posições dos vértices, mantendo a aparência visual do terreno consistente à medida que ele se move e se deforma
*/

  listaArvores.forEach((arvore) => { // Itera sobre a lista de árvores para atualizar suas posições com base no deslocamento, criando um efeito de movimento das árvores junto com o terreno
    
   // let xGlobal = arvore.position.x + cenarioObjeto.position.x; // Calcula a posição global da árvore no eixo X, somando a posição local da árvore com a posição do cenário para obter a posição correta em relação ao terreno
   // let zGlobal = arvore.position.z + cenarioObjeto.position.z; // Calcula a posição global da árvore no eixo Z, somando a posição local da árvore com a posição do cenário para obter a posição correta em relação ao terreno

    let alturaNoChao = obterAlturaMontanha(arvore.position.x, arvore.position.z + deslocamentoZ); // Calcula a altura do terreno no ponto onde a árvore está localizada para ajustar a posição Y da árvore de acordo com o terreno
    arvore.position.y = alturaNoChao; // Atualiza a posição Y da árvore para que ela fique alinhada com o terreno, criando um efeito de imersão das árvores no cenário à medida que o avião avança
  });

  //if (cameraBox.position.z < cenarioObjeto.position.z - 100) { // Verifica se a câmera ultrapassou um certo ponto em relação ao cenário, e se sim, reposiciona o cenário para criar um efeito de loop contínuo, garantindo que o cenário continue aparecendo à medida que a câmera avança
  //  cenarioObjeto.position.z = cameraBox.position - 150; // Reposiciona o cenário para a frente da cena, usando um valor fixo de 200 para garantir que ele apareça à frente da câmera e continue o ciclo de movimento do cenário1
  //}

  renderer.render(scene, camera); // Renderiza a cena usando a câmera, atualizando o que é exibido na tela com base nas mudanças feitas na cena e na posição da câmera
}