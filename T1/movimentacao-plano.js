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

var scene = new THREE.Scene();   // Cria a cena principal
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
  renderer.domElement.style.cursor = 'none';
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // Cria a câmera
  camera.position.set(0.0, 0.0, 0.0); // Define a posição inicial da câmera
  camera.up.set( 0, 1, 0 ); // Define a direção "para cima" da câmera

window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false ); // Escuta as mudanças no tamanho da janela para ajustar a câmera e o renderizador

let cameraBox = new THREE.Object3D();
cameraBox.add(camera); // Adiciona a câmera a um objeto vazio (cameraBox) para facilitar o controle do movimento da câmera
scene.add(cameraBox); // Adiciona o cameraBox à cena

let cenarios = []; // Cria um array para armazenar os cenários, embora neste código específico ele não seja utilizado posteriormente
const estacoes = ['verao', 'outono', 'inverno', 'primavera']; // Define um array com os nomes das estações do ano, que podem ser usados para criar diferentes tipos de cenários usando a função criaCenario, embora neste código específico eles não sejam utilizados posteriormente
for (let i = 0; i < 4; i++) {
  let c = criaCenario(0, -30, (i * -100) - 100, estacoes[i]); // Cria um cenário usando a função criaCenario, posicionando-o em diferentes locais ao longo do eixo Z para criar uma sensação de profundidade e variedade na cena. O tipo de cenário é definido como 'primavera', mas poderia ser alterado para outros tipos, como 'verão', 'outono' ou 'inverno', dependendo da implementação da função criaCenario.
  cenarios.push(c); // Adiciona o cenário criado ao array de cenários, embora neste código específico o array não seja utilizado posteriormente. Isso pode ser útil para futuras manipulações ou para manter uma referência aos cenários criados.
  scene.add(c); // Adiciona o cenário à cena para que ele seja renderizado e visível na visualização final. Cada cenário é posicionado em um local diferente ao longo do eixo Z, criando uma sensação de profundidade e variedade na cena, e o tipo de cenário é definido como 'primavera', mas poderia ser alterado para outros tipos, como 'verão', 'outono' ou 'inverno', dependendo da implementação da função criaCenario.
}

const aviao = criarAviao();
const aviaoContainer = new THREE.Object3D(); // Cria um objeto vazio (aviaoContainer) para conter o avião, permitindo que o avião seja controlado como um grupo, facilitando a aplicação de transformações como movimento e rotação ao avião como um todo, sem afetar diretamente a posição ou rotação individual do modelo do avião.
aviaoContainer.add(aviao); // Adiciona o avião a um objeto vazio (aviaoContainer) para facilitar o controle do movimento do avião

const anguloMaxRotacao = 0.5; // Define o ângulo máximo de rotação do avião em radianos, limitando a inclinação do avião para evitar que ele gire excessivamente quando a posição alvo da câmera estiver muito distante da posição atual do avião. O valor de 0.6 radianos é +- 34/35 graus.
const limiarParadaRotacao= 1; // Define o limiar de parada para a rotação do avião, que é a distância mínima entre a posição alvo da câmera e a posição atual do avião no eixo X para que o avião comece a girar. Se a diferença no eixo X for menor que esse limiar, o avião permanecerá nivelado, evitando que ele gire desnecessariamente quando a posição alvo da câmera estiver muito próxima da posição atual do avião.  
const velocidadeInclinacao = 0.3; // Define a velocidade de inclinação do avião,  para controlar a intensidade do efeito de inclinação do avião com base na posição do mouse. Um valor mais alto resultará em uma inclinação mais rápida e intensa, enquanto um valor mais baixo resultará em uma inclinação mais suave e lenta.


aviao.position.set(0, 0, -25);
aviao.rotateY(Math.PI/2); // Gira o avião para que ele ltado para a direção correta (para frente)
cameraBox.add(aviaoContainer); // Adiciona o avião à cena

scene.fog = new THREE.Fog(new THREE.Color("pink"), 0.1, 200); // Adiciona neblina à cena para criar um efeito de profundidade, usando a mesma cor do fundo para que os objetos desapareçam gradualmente à medida que se afastam da câmera

var target = new THREE.Vector3(0, 0, 0); // Variável para armazenar a posição alvo para a câmera, que será atualizada com base na posição do mouse
let simulaPausada = false;

window.addEventListener('mousemove', (event) => { // Executa o movimento do mouse para atualizar a posição alvo da câmera
  if (simulaPausada) { //ve se a simulação ta pausada, e se estiver, a função retorna sem atualizar a posição alvo da câmera, permitindo que o usuário veja a cena congelada enquanto a simulação está pausada.
    return;
  }
  let x = (event.clientX / window.innerWidth) * 2 - 1; // Normaliza a posição do mouse no eixo X para o intervalo [-1, 1]
  let y = (event.clientY / window.innerHeight) * 2 - 1; // Normaliza a posição do mouse no eixo Y para o intervalo [-1, 1]

  target.x = x * 20; // Atualiza a posição alvo da câmera no eixo X com base na posição do mouse, multiplicando por 20 para ampliar o movimento
  target.y = -y * 10; // Atualiza a posição alvo da câmera no eixo Y  com base na posição do mouse, multiplicando por -20 para ampliar o movimento e inverter a direção
});

function pausarSimulacao() { // Função para pausar a simulação, que pode ser chamada quando o usuário aperta esc 
  simulaPausada = true; //indica que esta pausada
  renderer.domElement.style.cursor = 'default'; //como esta pausada, mostrar o cursor para o usuario
}

function retomarSimulacao() {
  if (!simulaPausada) { // Verifica se a simulação já está em execução para evitar retomar desnecessariamente
    return; // Se a simulação já estiver em execução, a função retorna sem fazer nada
  }

  simulaPausada = false; // Indica que a simulação foi retomada
  renderer.domElement.style.cursor = 'none'; // Esconde o cursor novamente
}

window.addEventListener('keydown', (event) => { //ao pressionar a tecla esc, pausa a simulação
  if (event.key === 'Escape') {
    pausarSimulacao();
  }
});

renderer.domElement.addEventListener('click', () => { //ao clicar, retorna a simulação
  retomarSimulacao();
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

  if (simulaPausada) { // Verifica se a simulação está pausada, e se estiver, renderiza a cena atual sem atualizar as posições ou movimentos dos objetos, permitindo que o usuário veja a cena congelada enquanto a simulação está pausada.
    renderer.render(scene, camera); 
    requestAnimationFrame(render);
    return;
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

  cenarios.forEach((c)=>{
    if (c.position.z > cameraBox.position.z + limite) { // Verifica se o cenário está dentro do limite de movimento da câmera, comparando a posição do cenário com a posição da câmera e o limite definido
      // let menorZ = Math.min(...cenarios.map(obj => obj.position.z)); // Encontra a menor posição Z entre os cenários para determinar onde reposicionar o cenário que saiu do limite}
      c.position.z -= tamanho * cenarios.length; // Reposiciona o cenário para a frente da cena, usando o menor Z encontrado e o tamanho do plano de movimento para garantir que ele apareça à frente dos outros cenários
    }
  });

  aviaoContainer.position.x += (target.x - aviaoContainer.position.x) * 0.05; // Atualiza a posição da câmera no eixo X para se aproximar da posição alvo, usando uma interpolação suave multiplicada por 0.05 para controlar a velocidade do movimento
  cameraBox.position.z -= 0.5; // Atualiza a posição da câmera no eixo Z para se aproximar da posição alvo, usando uma interpolação suave multiplicada por 0.05 para controlar a velocidade do movimento
  aviaoContainer.position.y += (target.y - aviaoContainer.position.y) * 0.05; // Mantém a posição da câmera no eixo Y constante em 15, para que a câmera se mova apenas no plano XZ
  
  
  aviaoContainer.rotation.z += (anguloDesejado - aviaoContainer.rotation.z) * velocidadeInclinacao;  // Atualiza a rotação do avião no eixo Z para criar um efeito de inclinação com base na posição do mouse, multiplicando pela velocidade de inclinação para controlar a intensidade do efeito
  
  cameraBox.translateX((target.x - aviaoContainer.position.x)/15);
  camera.lookAt(cameraBox.position.x, cameraBox.position.y, cameraBox.position.z - 30); // Faz a câmera olhar para um ponto à frente dela, ajustando a posição de destino para que a câmera olhe para um ponto 30 unidades à frente no eixo Z, mantendo a mesma posição no eixo X e Y

  requestAnimationFrame(render); // Solicita que a função de renderização seja chamada novamente no próximo frame, criando um loop de animação contínuo
  renderer.render(scene, camera); // Renderiza a cena usando a câmera, atualizando o que é exibido na tela com base nas mudanças feitas na cena e na posição da câmera
}