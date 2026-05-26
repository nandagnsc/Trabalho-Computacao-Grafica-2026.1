import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { initRenderer, SecondaryBox, initDefaultBasicLight, onWindowResize, InfoBox } from "../libs/util/util.js";
import { criaCenario } from './ambiente.js';
import { criarAviao } from './aviao.js';
import { SistemaInimigos } from './inimigos.js';
import { SistemaTiros } from './tiros.js';
import GUI from '../libs/util/dat.gui.module.js';

const scene = new THREE.Scene(); // T1: Cria a cena principal
const clock = new THREE.Clock(); // T1: Cria um relógio para controlar o tempo entre os frames
const renderer = initRenderer(); // T1: Função de visualização em util/utils
renderer.setClearColor("pink"); // T1: Define a cor de fundo do renderizador

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // T1: Cria a câmera
camera.position.set(0.0, 0.0, 0.0); // T1: Define a posição inicial da câmera
camera.up.set(0, 1, 0); // T1: Define a direção "para cima" da câmera
window.addEventListener('resize', function() { onWindowResize(camera, renderer) }, false); // T1: Escuta as mudanças no tamanho da janela para ajustar a câmera e o renderizador

const cameraBox = new THREE.Object3D();
cameraBox.add(camera); // T1: Adiciona a câmera a um objeto vazio (cameraBox) para facilitar o controle do movimento da câmera
scene.add(cameraBox); // T1: Adiciona o cameraBox à cena

scene.fog = new THREE.Fog(new THREE.Color("pink"), 0.1, 600); // T1: Adiciona neblina à cena para criar um efeito de profundidade, usando a mesma cor do fundo para que os objetos desapareçam gradualmente à medida que se afastam da câmera

const stats = new Stats(); // T1: Cria um objeto de estatísticas para monitorar o desempenho do jogo, como frames por segundo (FPS), tempo de renderização e uso de memória, que pode ser útil para otimizar o jogo e garantir uma experiência suave para o jogador.
const container = document.getElementById('container');
if (container) container.appendChild(stats.dom);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const planoInvisivel = new THREE.Mesh( // Cria um plano invisível para detectar os cliques do mouse, que é posicionado à frente da câmera para que possa ser usado como um alvo para o raycaster, permitindo que o jogador clique em qualquer lugar da tela para disparar tiros na direção do clique, melhorando a interatividade e a experiência de jogo.
    new THREE.PlaneGeometry(80, 60),
    new THREE.MeshBasicMaterial({ visible: false })
);
planoInvisivel.position.set(0, 0, -35);
cameraBox.add(planoInvisivel);

const mira = new THREE.Object3D(); // T1: Cria um objeto para a mira do jogador, que será composta por vários meshes para formar uma mira visualmente clara e distinta, permitindo que o jogador tenha um ponto de referência visual para onde os tiros serão disparados, melhorando a precisão e a experiência de jogo. A mira é posicionada à frente da câmera para que esteja sempre visível e alinhada com a direção de disparo do jogador.
const miraMat = new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide, depthTest: false }); // Material básico para a mira, usando a cor vermelha para garantir que seja facilmente visível contra o fundo e os objetos do jogo, e configurado para renderizar dos dois lados e ignorar o teste de profundidade para que a mira seja sempre visível, mesmo quando estiver sobreposta a outros objetos na cena.
const miraMesh1 = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 16), miraMat); miraMesh1.renderOrder = 1; // Cria o primeiro mesh da mira, que é um anel circular, usando uma geometria de anel para criar um ponto de referência visual claro para o centro da mira, e define a ordem de renderização para garantir que ele seja desenhado por cima de outros objetos, mantendo a mira sempre visível para o jogador.
const miraMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), miraMat); miraMesh2.renderOrder = 1; miraMesh2.position.set(0, 0.45, 0);
const miraMesh3 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), miraMat); miraMesh3.renderOrder = 1; miraMesh3.position.set(0, -0.45, 0);
const miraMesh4 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), miraMat); miraMesh4.renderOrder = 1; miraMesh4.position.set(0.45, 0, 0);
const miraMesh5 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), miraMat); miraMesh5.renderOrder = 1; miraMesh5.position.set(-0.45, 0, 0);
mira.add(miraMesh1, miraMesh2, miraMesh3, miraMesh4, miraMesh5); // Adiciona os meshes da mira ao objeto da mira, formando uma mira composta por um anel central e linhas que se estendem para fora, criando um ponto de referência visual claro para o jogador, que indica onde os tiros serão disparados, melhorando a precisão e a experiência de jogo. A posição da mira é definida para estar à frente da câmera, garantindo que esteja sempre visível e alinhada com a direção de disparo do jogador.
mira.position.set(0, 0, -35); // Posiciona a mira à frente da câmera para que esteja sempre visível e alinhada com a direção de disparo do jogador, permitindo que o jogador tenha um ponto de referência visual claro para onde os tiros serão disparados, melhorando a precisão e a experiência de jogo.
cameraBox.add(mira); // Adiciona a mira ao cameraBox para que ela se mova junto com a câmera, garantindo que a mira esteja sempre alinhada com a direção de disparo do jogador, permitindo que o jogador tenha um ponto de referência visual claro para onde os tiros serão disparados, melhorando a precisão e a experiência de jogo.

const Perlin = new function() { // Implementação de Perlin Noise para gerar o terreno procedural, que é uma técnica de geração de ruído que cria variações suaves e naturais, ideal para criar terrenos realistas em jogos. Esta implementação inclui funções para gerar o ruído, bem como um gradiente de permutação para garantir que o ruído seja consistente e sem padrões repetitivos óbvios.
    this.p = new Uint8Array(512); const p = new Uint8Array(256); // Gera um array de permutação aleatória para o Perlin Noise, que é usado para criar variações suaves e naturais no terreno procedural, garantindo que o ruído seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
    for(let i=0; i<256; i++) p[i] = i; for(let i=255; i>0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } // Embaralha o array de permutação usando o algoritmo de Fisher-Yates para garantir que o Perlin Noise seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
    for(let i=0; i<512; i++) this.p[i] = p[i & 255]; // Duplica o array de permutação para evitar overflow, garantindo que o Perlin Noise seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
    this.fade = t => t * t * t * (t * (t * 6 - 15) + 10); // Função de
    this.lerp = (t, a, b) => a + t * (b - a); // Função de interpolação linear usada
    this.grad = (hash, x, y) => { const h = hash & 15; const u = h < 8 ? x : y; const v = h < 4 ? y : h === 12 || h === 14 ? x : 0; return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v); }; // Função de gradiente que calcula a contribuição do gradiente para o Perlin Noise com base no hash e nas coordenadas x e y, criando variações suaves e naturais no terreno procedural, garantindo que o ruído seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
    this.noise = (x, y) => { // Função principal de geração de Perlin Noise que calcula o valor do ruído para as coordenadas x e y, usando a função de fade, interpolação linear e gradiente para criar variações suaves e naturais no terreno procedural, garantindo que o ruído seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y); // Calcula as coordenadas relativas dentro da grade unitária e aplica a função de fade
        const u = this.fade(x), v = this.fade(y); // Calcula os hashes para os quatro cantos da grade unitária e obtém as contribuições do gradiente para cada canto, depois interpola entre eles usando a função de fade para criar variações suaves e naturais no terreno procedural, garantindo que o ruído seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
        const a = this.p[X] + Y, aa = this.p[a], ab = this.p[a + 1], b = this.p[X + 1] + Y, ba = this.p[b], bb = this.p[b + 1]; // Interpola entre as contribuições do gradiente para os quatro cantos da grade unitária usando a função de fade para criar variações suaves e naturais no terreno procedural, garantindo que o ruído seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
        return this.lerp(v, this.lerp(u, this.grad(this.p[aa], x, y), this.grad(this.p[ba], x - 1, y)), this.lerp(u, this.grad(this.p[ab], x, y - 1), this.grad(this.p[bb], x - 1, y - 1))); // Retorna o valor final do Perlin Noise para as coordenadas x e y, que é usado para criar variações suaves e naturais no terreno procedural, garantindo que o ruído seja consistente e sem padrões repetitivos óbvios, o que é essencial para criar um ambiente visualmente interessante e realista à medida que a câmera avança.
    };
};


function getAltura(x, z) { // Função para calcular a altura do terreno usando Perlin Noise, que gera um valor de altura baseado na posição global do vértice, permitindo que o terreno tenha variações naturais e realistas à medida que a câmera avança.
    let nx = x * 0.005, nz = z * 0.005;
    let h = (Perlin.noise(nx, nz) * 40) + (Perlin.noise(nx*3, nz*3) * 12) + (Perlin.noise(nx*8, nz*8) * 4);
    return h + 30;
}

const largura = 2000, profundidade = 1000, divisoes = 150; // Define as dimensões e a resolução do terreno, onde largura e profundidade controlam o tamanho total do plano do terreno, e divisoes controla quantos segmentos o plano terá, afetando a suavidade das variações de altura e o desempenho do jogo.
const geoTerreno = new THREE.PlaneGeometry(largura, profundidade, divisoes, divisoes);
geoTerreno.rotateX(-Math.PI / 2);
geoTerreno.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geoTerreno.attributes.position.count * 3), 3));

const matTerreno = new THREE.MeshStandardMaterial({ // Material do terreno, usando as cores dos vértices para criar um efeito de gradiente que varia com a altura, dando uma aparência mais natural e variada ao solo, onde áreas mais altas podem parecer rochosas e áreas mais baixas podem parecer gramadas ou aquáticas.
    vertexColors: true,
    wireframe: false,
    side: THREE.DoubleSide,
    flatShading: true
});
const terreno = new THREE.Mesh(geoTerreno, matTerreno); // Cria o mesh do terreno usando a geometria e o material definidos, que será adicionado à cena para formar o chão do ambiente de jogo, permitindo que a câmera e os objetos interajam com ele, e que as variações de altura e cor sejam visíveis durante a renderização.
terreno.position.y = -50;
scene.add(terreno);

let listaArvores = []; // Lista para armazenar as árvores adicionadas ao cenário, permitindo que elas sejam gerenciadas e renderizadas corretamente, e que possam ser acessadas posteriormente para possíveis interações ou efeitos visuais relacionados às árvores no ambiente de jogo.
for(let i = 0; i < 150; i++) {
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

const aviao = criarAviao();
const aviaoContainer = new THREE.Object3D(); // T1: Cria um objeto vazio (aviaoContainer) para conter o avião, permitindo que o avião seja controlado como um grupo, facilitando a aplicação de transformações como movimento e rotação ao avião como um todo, sem afetar diretamente a posição ou rotação individual do modelo do avião.
aviaoContainer.add(aviao); // T1: Adiciona o avião a um objeto vazio (aviaoContainer) para facilitar o controle do movimento do avião
aviaoContainer.position.set(0, 0, -25); // T1: Define a posição inicial do avião dentro da cena, um pouco à frente da câmera para que ele seja visível desde o início do jogo
aviao.rotateY(Math.PI / 2); // T1: Gira o avião para que ele ltado para a direção correta (para frente)
cameraBox.add(aviaoContainer); // T1: Adiciona o avião à cena

aviao.traverse((child) => { // Ativa sombras para o avião (inclui todos os meshes filhos)
  if (child.isMesh) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
});


const sistemaInimigos = new SistemaInimigos(scene, cameraBox); // Cria o sistema responsável por spawn, movimento e disparo dos inimigos.
const sistemaTiros = new SistemaTiros(scene, camera); // Cria o sistema que controla tiros do jogador e tiros dos inimigos.

sistemaInimigos.inicializar().catch(erro => console.error('Erro nos inimigos:', erro)); // Carrega modelo dos inimigos e prepara a lista inicial; se falhar, mostra no console.

const caixaJogador = new THREE.Box3(); // Caixa de colisão final do jogador (hitbox usada para detectar tiro inimigo).
const tamanhoHitboxJogador = new THREE.Vector3(8, 3, 8); // Tamanho da hitbox: largura, altura e profundidade.
const posicaoAviaoMundo = new THREE.Vector3(); // Guarda a posição global do avião para usar na lógica de tiro e colisão.
const posicaoMiraMundo = new THREE.Vector3(); // Guarda a posição global da mira para orientar o disparo do jogador.
const posicaoJogadorParaInimigos = new THREE.Vector3(); // Vetor auxiliar com a posição que os inimigos usam para mirar no jogador.
const centroHitboxJogador = new THREE.Vector3(); // Vetor auxiliar para montar o centro da hitbox do jogador em cada frame.

const luzDirecional = new THREE.DirectionalLight(new THREE.Color("white"), 3.5); // Luz direcional para simular a luz do sol, que é a principal fonte de iluminação na cena
luzDirecional.castShadow = true;

luzDirecional.shadow.mapSize.width = 2048; // Aumenta a resolução do mapa de sombras para melhorar a qualidade das sombras projetadas pela luz direcional, tornando-as mais nítidas 
luzDirecional.shadow.mapSize.height = 2048; 

luzDirecional.shadow.camera.near = 0.1; // Define a distância mínima para o mapa de sombras da luz direcional, garantindo que objetos muito próximos à luz sejam renderizados corretamente nas sombras, evitando artefatos visuais e melhorando a qualidade geral das sombras projetadas pela luz direcional.
luzDirecional.shadow.camera.far = 600; // Far alto para cobrir a diagonal da luz até o chão distante

luzDirecional.shadow.camera.left = -300;
luzDirecional.shadow.camera.right = 300; // Define os limites esquerdo e direito do mapa de sombras da luz direcional, garantindo que a área iluminada pela luz seja coberta adequadamente pelo mapa de sombras, o que é essencial para criar sombras realistas e evitar que objetos importantes fiquem sem sombra ou com sombras cortadas.

luzDirecional.shadow.camera.top = 300;
luzDirecional.shadow.camera.bottom = -150; // Define os limites superior e inferior do mapa de sombras da luz direcional, garantindo que a área iluminada pela luz seja coberta adequadamente pelo mapa de sombras, o que é essencial para criar sombras realistas e evitar que objetos importantes fiquem sem sombra ou com sombras cortadas. O limite inferior é menor para evitar que o céu distante receba sombras, o que pode causar artefatos visuais indesejados.

luzDirecional.shadow.camera.updateProjectionMatrix();// Atualiza a matriz de projeção da câmera de sombras para garantir que as alterações nos parâmetros do mapa de sombras sejam aplicadas corretamente, o que é essencial para criar sombras realistas e evitar artefatos visuais causados por uma configuração incorreta do mapa de sombras.
// luzDirecional.shadow.bias = -0.0005; 
// luzDirecional.shadow.normalBias = 0.05;

scene.add(luzDirecional);

const luzTarget = new THREE.Object3D(); // objeto para ser o alvo fixo da luz
scene.add(luzTarget);
luzDirecional.target = luzTarget;

// Luz ambiente para suavizar as áreas sem sol direto
const luzAmbiente = new THREE.AmbientLight(new THREE.Color("white"), 0.3);
scene.add(luzAmbiente);

const target = new THREE.Vector3(0, 0, 0); // T1: Variável para armazenar a posição alvo para a câmera, que será atualizada com base na posição do mouse
let simulaPausada = false;

const anguloMaxRotacao = 0.5; // T1: Define o ângulo máximo de rotação do avião em radianos, limitando a inclinação do avião para evitar que ele gire excessivamente quando a posição alvo da câmera estiver muito distante da posição atual do avião. O valor de 0.6 radianos é +- 34/35 graus.
const limiarParadaRotacao = 1; // T1: Define o limiar de parada para a rotação do avião, que é a distância mínima entre a posição alvo da câmera e a posição atual do avião no eixo X para que o avião comece a girar. Se a diferença no eixo X for menor que esse limiar, o avião permanecerá nivelado, evitando que ele gire desnecessariamente quando a posição alvo da câmera estiver muito próxima da posição atual do avião.
const velocidadeInclinacao = 0.3; // T1: Define a velocidade de inclinação do avião,  para controlar a intensidade do efeito de inclinação do avião com base na posição do mouse. Um valor mais alto resultará em uma inclinação mais rápida e intensa, enquanto um valor mais baixo resultará em uma inclinação mais suave e lenta.

const anguloMaxRotacaoX = 0.2; // T2: Define o ângulo máximo de rotação do avião em radianos, limitando a inclinação do avião para evitar que ele gire excessivamente quando a posição alvo da câmera estiver muito distante da posição atual do avião. O valor de 0.6 radianos é +- 34/35 graus.
const limiarParadaRotacaoX = 1; // T2: Define o limiar de parada para a rotação do avião, que é a distância mínima entre a posição alvo da câmera e a posição atual do avião no eixo X para que o avião comece a girar. Se a diferença no eixo X for menor que esse limiar, o avião permanecerá nivelado, evitando que ele gire desnecessariamente quando a posição alvo da câmera estiver muito próxima da posição atual do avião.
const velocidadeInclinacaoX = 0.3; // T2: Define a velocidade de inclinação do avião,  para controlar a intensidade do efeito de inclinação do avião com base na posição do mouse. Um valor mais alto resultará em uma inclinação mais rápida e intensa, enquanto um valor mais baixo resultará em uma inclinação mais suave e lenta.

const speedProfiles = {
    // Cada perfil define o ritmo geral do jogo: avanço da câmera, resposta do avião, velocidade dos inimigos e velocidade dos tiros.
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
    const perfil = speedProfiles[modoVelocidade]; // pega o perfil atual (1, 2 ou 3)
    indicadorVelocidade.textContent = `Velocidade: ${modoVelocidade} ${perfil.name}`; // atualiza com modo atual
}

let modoVelocidade = 2; // Inicia o jogo no perfil normal
let cameraZSpeed = speedProfiles[modoVelocidade].cameraZSpeed; // Velocidade com que o jogo avança no eixo Z 
let movimentoXYFactor = speedProfiles[modoVelocidade].movimentoXYFactor; // Fator de suavização da resposta do avião no eixo X/Y.

function aplicarModoVelocidade(modo) {
    if (!speedProfiles[modo]) return; // Evita aplicar modos inválidos caso outra tecla seja pressionada.
    modoVelocidade = modo; // Salva o modo escolhido (1, 2 ou 3) para o restante da lógica usar.
    const p = speedProfiles[modo]; // Pega os parâmetros completos do perfil selecionado.
    cameraZSpeed = p.cameraZSpeed; // Ajusta a velocidade de avanço do jogo/câmera.
    movimentoXYFactor = p.movimentoXYFactor; // Ajusta o quão rápido o avião acompanha o alvo do mouse.
    sistemaTiros.setSpeedProfile({ tiroVelMultiplier: p.tiroVelMultiplier }); // Atualiza a velocidade dos tiros no sistema de tiros.
    sistemaInimigos.setSpeedProfile({ movimentoXYMultiplier: p.movimentoXYMultiplier }); // Atualiza a velocidade horizontal dos inimigos.
    atualizarIndicadorVelocidade(); // Atualiza a caixinha  para o jogador ver qual modo está ativo.
}
aplicarModoVelocidade(modoVelocidade);

window.addEventListener('mousemove', (event) => {
    if (simulaPausada) return; // sem atualizar alvo/mira durante pausa
    renderer.domElement.style.cursor = 'none';
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // T1: Normaliza a posição do mouse no eixo X para o intervalo [-1, 1]
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // T1: Normaliza a posição do mouse no eixo Y para o intervalo [-1, 1]
});

function pausarSimulacao() {
    simulaPausada = true; // Ativa o estado de pausa para interromper atualizações 
    sistemaTiros.definirDisparoContinuoAtivo(false); // Desliga o disparo contínuo para não continuar atirando durante a pausa.
    renderer.domElement.style.cursor = 'default'; // Mostra o cursor normal para facilitar interação fora do combate.
    mira.visible = false; // Esconde a mira para sinalizar que o jogo está pausado.
}

function retomarSimulacao() {
    simulaPausada = false; // Remove o estado de pausa e permite que o loop volte a atualizar tudo.
    renderer.domElement.style.cursor = 'none'; // Oculta o cursor para voltar ao modo de mira com mouse.
    mira.visible = true; // exibe novamente a mira para retomar o combate.
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') pausarSimulacao(); //ESC pausa o game
    if (['1', '2', '3'].includes(event.key)) aplicarModoVelocidade(Number(event.key)); // troca modo de velocidade por tecla
});

renderer.domElement.addEventListener('click', () => retomarSimulacao());

renderer.domElement.addEventListener('mousedown', (evento) => {
    if (evento.button !== 0) return; // Só considera botão esquerdo para o disparo principal.
    retomarSimulacao(); // Se estiver pausado, o clique no canvas já retoma o jogo.
    sistemaTiros.definirDisparoContinuoAtivo(true); // Ativa o modo de tiro contínuo enquanto o botão estiver pressionado.
});

window.addEventListener('mouseup', (evento) => {
    if (evento.button !== 0) return; // Ignora botões diferentes do esquerdo.
    sistemaTiros.definirDisparoContinuoAtivo(false); // Ao soltar o botão, encerra o disparo contínuo.
});

window.addEventListener('blur', () => sistemaTiros.definirDisparoContinuoAtivo(false)); //se perder foco da janela, para disparo

const infoBox = new SecondaryBox(""); // T1: Cria uma caixa de informações para exibir instruções ou detalhes sobre o controle
const controls = new InfoBox();
controls.add("Controle com o mouse"); // T1: Adiciona uma linha de texto à caixa de informações
controls.add("Pressione ESC para pausar, clique para voltar."); // dica da pausa via ESC e clique, so informa o usuario
controls.show();

const gui = new GUI();
gui.add(scene.fog, 'far', 100, 750).name("Neblina (Fog)");

const corRocha = new THREE.Color(0x654321); // cor base para rochas, usada para criar um gradiente de cor no terreno que varia com a altura, dando uma aparência mais natural e variada ao solo, onde áreas mais altas podem parecer rochosas e áreas mais baixas podem parecer gramadas ou aquáticas.
const corGrama = new THREE.Color(0x2D5A27);
const corVale = new THREE.Color(0x203B15);
const corAgua = new THREE.Color(0x0077BE);
const corTemp = new THREE.Color(); // cor auxiliar para calcular as cores do terreno sem criar objetos extras, usada para interpolar entre as cores base (rocha, grama, água) com base na altura do terreno, permitindo que cada vértice do terreno tenha uma cor que corresponda à sua elevação, criando um efeito visual mais rico e realista.


function render() { // T1: Função de renderização que é chamada a cada frame para atualizar a cena
    stats.update();
    if (simulaPausada) { // Se a simulação estiver pausada, apenas renderiza a cena sem atualizar a lógica do jogo, permitindo que o jogador veja o estado atual do jogo enquanto está pausado, mas sem que nada se mova ou mude até que ele retome a simulação
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        return;
    }

    const deltaSegundos = clock.getDelta(); // Calcula o tempo em segundos desde o último frame, que é usado para atualizar os sistemas de inimigos e tiros 
    const tempoAtualMs = performance.now(); // Obtém o tempo atual em milissegundos para usar na lógica de spawn e comportamento dos inimigos

    cameraBox.position.z -= cameraZSpeed; // Avança a cena no eixo Z usando a velocidade do modo atual (lenta, normal ou rápida).

    raycaster.setFromCamera(mouse, camera);
    const intersecoes = raycaster.intersectObject(planoInvisivel);

    if (intersecoes.length > 0) { // Se houver interseção com o plano invisível, atualiza a posição da mira e o alvo da câmera para seguir o mouse, permitindo que o jogador controle a direção do avião e onde os tiros serão disparados. A posição do mouse é convertida para as coordenadas locais do plano invisível para garantir que a mira e o alvo da câmera se movam corretamente em relação à posição do avião.
        let pontoLocal = cameraBox.worldToLocal(intersecoes[0].point.clone()); // Converte a posição global do ponto de interseção para as coordenadas locais do cameraBox, o que é necessário para atualizar a posição da mira e o alvo da câmera de forma correta em relação ao avião, garantindo que eles se movam de acordo com a posição do mouse dentro do espaço do jogo.
        let xTravado = THREE.MathUtils.clamp(pontoLocal.x, -22, 22);
        let yTravado = THREE.MathUtils.clamp(pontoLocal.y, -10, 10);
        mira.position.x = xTravado; mira.position.y = yTravado; // Atualiza a posição da mira para seguir o mouse, mas com limites para que ela não se mova muito longe do avião, garantindo que o jogador tenha controle sobre a direção do avião e onde os tiros serão disparados, mas sem permitir que a mira se desloque para posições que não façam sentido em relação ao avião.
        target.x = xTravado; target.y = yTravado; // Atualiza o alvo da câmera para seguir o mouse, usando os mesmos valores travados para garantir que a câmera siga o avião de forma suave e controlad, onde a câmera se ajusta à posição do mouse sem ficar rígida ou descontrolada.
    }

    let diferencaX = target.x - aviaoContainer.position.x; // T1: Calcula a diferença entre a posição alvo da câmera no eixo X e a posição atual do avião no eixo X, o que pode ser usado para determinar a direção e a intensidade do movimento do avião
    let anguloDesejado = (Math.abs(diferencaX) > limiarParadaRotacao) ? ((diferencaX > 0) ? -anguloMaxRotacao : anguloMaxRotacao) : 0; // T1: Define o ângulo desejado de rotação do avião com base na direção da diferença no eixo X, usando o ângulo máximo de rotação para limitar a inclinação do avião
    
    let diferencaY = target.y - aviaoContainer.position.y; // T2: Calcula a diferença entre a posição alvo da câmera no eixo Y e a posição atual do avião no eixo Y, o que pode ser usado para determinar a direção e a intensidade do movimento do avião
    let anguloDesejadoX = (Math.abs(diferencaY) > limiarParadaRotacaoX) ? ((diferencaY > 0) ? anguloMaxRotacaoX : -anguloMaxRotacaoX) : 0; // T2: Define o ângulo desejado de rotação do avião com base na direção da diferença no eixo Y, usando o ângulo máximo de rotação para limitar a inclinação do avião

    aviaoContainer.position.x += (target.x - aviaoContainer.position.x) * movimentoXYFactor; // Move o avião no eixo X com suavização definida pelo perfil de velocidade.
    aviaoContainer.position.y += (target.y - aviaoContainer.position.y) * movimentoXYFactor; // Move o avião no eixo Y com o mesmo fator para manter resposta consistente.
    aviaoContainer.rotation.z += (anguloDesejado - aviaoContainer.rotation.z) * velocidadeInclinacao; // T1: Atualiza a rotação do avião no eixo Z para criar um efeito de inclinação com base na posição do mouse, multiplicando pela velocidade de inclinação para controlar a intensidade do efeito
    aviaoContainer.rotation.x += (anguloDesejadoX - aviaoContainer.rotation.x) * velocidadeInclinacaoX; // T2: Atualiza a rotação do avião no eixo X para criar um efeito de inclinação com base na posição do mouse, multiplicando pela velocidade de inclinação para controlar a intensidade do efeito

    camera.position.x += (aviaoContainer.position.x * 0.4 - camera.position.x) * 0.05; // Move a câmera suavemente para seguir o avião no eixo X, usando um fator de 0.4 para que a câmera siga o avião parcialmente, criando um efeito de "arrasto" onde a câmera não fica exatamente na posição do avião, mas se move em direção a ela de forma suave.
    camera.position.y += (aviaoContainer.position.y * 0.4 - camera.position.y) * 0.05; // Move a câmera suavemente para seguir o avião no eixo Y, usando o mesmo fator de 0.4 para manter a consistência do efeito de arrasto, permitindo que a câmera se ajuste à posição do avião sem ficar rígida, o que contribui para uma sensação de movimento mais fluida e natural.

    // Atualização do Terreno Procedural
    terreno.position.z = cameraBox.position.z - 250; // Move o terreno para sempre ficar à frente da câmera, criando a ilusão de um mundo infinito que se estende à medida que a câmera avança, garantindo que o jogador tenha sempre um terreno para interagir e que as variações de altura e cor sejam visíveis durante a renderização.

    const pos = terreno.geometry.attributes.position; // Acessa os atributos de posição do terreno para modificar a altura dos vértices com base na função de Perlin Noise, criando um terreno que se ajusta dinamicamente à medida que a câmera avança, dando a impressão de um mundo infinito e variado.
    const col = terreno.geometry.attributes.color; // Acessa os atributos de cor do terreno para modificar as cores dos vértices com base na altura, criando um gradiente de cor que varia com a elevação do terreno, onde áreas mais altas podem parecer rochosas e áreas mais baixas podem parecer gramadas ou aquáticas, aumentando a riqueza visual do ambiente.

    for (let i = 0; i < pos.count; i++) { // Itera sobre cada vértice do terreno para atualizar sua altura e cor com base na função de Perlin Noise, criando um terreno que se ajusta dinamicamente à medida que a câmera avança, dando a impressão de um mundo infinito e variado.
        let xGlobal = pos.getX(i) + terreno.position.x;
        let zGlobal = pos.getZ(i) + terreno.position.z;

        let h = getAltura(xGlobal, zGlobal); // Calcula a altura do terreno para as coordenadas globais do vértice usando a função de Perlin Noise, que gera um valor de altura baseado na posição global do vértice, permitindo que o terreno tenha variações naturais e realistas à medida que a câmera avança.
        pos.setY(i, h);

        if (h > 60) { // Define a cor do vértice com base na altura, criando um gradiente de cor que varia com a elevação do terreno, onde áreas mais altas podem parecer rochosas e áreas mais baixas podem parecer gramadas ou aquáticas, aumentando a riqueza visual do ambiente.
            corTemp.copy(corRocha); // Se a altura for maior que 60, o vértice é considerado parte de uma rocha e recebe a cor de rocha.
        } else if (h > 45) {
            corTemp.lerpColors(corGrama, corRocha, (h - 35) / 10); 
        } else if (h > 20) {
            corTemp.copy(corGrama);
        } else if (h > 10) {
            corTemp.lerpColors(corAgua, corGrama, (h - 10) / 10);
        } else {
            corTemp.copy(corAgua);
        }

        col.setXYZ(i, corTemp.r, corTemp.g, corTemp.b); // Define a cor do vértice com base na altura, criando um gradiente de cor que varia com a elevação do terreno, onde áreas mais altas podem parecer rochosas e áreas mais baixas podem parecer gramadas ou aquáticas, aumentando a riqueza visual do ambiente.
    }

    pos.needsUpdate = true; // Informa ao Three.js que os atributos de posição foram modificados e precisam ser atualizados no buffer da GPU para refletir as mudanças na geometria do terreno, garantindo que as alterações de altura sejam visíveis na renderização.
    col.needsUpdate = true; // Informa ao Three.js que os atributos de cor foram modificados e precisam ser atualizados no buffer da GPU para refletir as mudanças nas cores dos vértices do terreno, garantindo que as alterações de cor sejam visíveis na renderização.
    terreno.geometry.computeVertexNormals(); // Recalcula as normais da geometria do terreno após modificar as alturas dos vértices, garantindo que a iluminação e as sombras sejam calculadas corretamente com base na nova topografia do terreno, o que é essencial para manter a aparência visual realista à medida que o terreno se ajusta dinamicamente.
    terreno.receiveShadow = true; // Permite que o terreno receba sombras, o que é importante para criar um ambiente visualmente rico e realista, especialmente com a iluminação direcional configurada para lançar sombras, garantindo que as sombras dos objetos, como árvores e inimigos, sejam projetadas corretamente no terreno.

    listaArvores.forEach(a => { // Atualiza a posição das árvores para que se ajustem à altura do terreno, garantindo que as árvores estejam sempre posicionadas corretamente em relação à topografia do terreno, criando um ambiente mais coeso e realista à medida que a câmera avança.
        a.position.y = getAltura(a.position.x, a.position.z) - 50; // Ajusta a posição Y da árvore com base na altura do terreno para garantir que ela esteja "plantada" no solo, usando a função de Perlin Noise para obter a altura do terreno nas coordenadas X e Z da árvore, e subtraindo 50 para alinhar a base da árvore com o terreno.
        if (a.position.z > cameraBox.position.z + 50) { // Se a árvore estiver muito próxima da câmera (atrás dela), reposiciona a árvore para um local mais distante à frente da câmera, criando a ilusão de um ambiente infinito onde as árvores continuam aparecendo à medida que a câmera avança, garantindo que o jogador tenha sempre um cenário visual interessante e variado para interagir.
            a.position.z = cameraBox.position.z - 600 - Math.random() * 200; // Reposiciona a árvore para um local mais distante à frente da câmera, criando a ilusão de um ambiente infinito onde as árvores continuam aparecendo à medida que a câmera avança, garantindo que o jogador tenha sempre um cenário visual interessante e variado para interagir.
            a.position.x = cameraBox.position.x + (Math.random() - 0.5) * 800; //
        }
    });

    // Atualização da hitbox do jogador e das posições usadas pelos tiros.
    aviaoContainer.getWorldPosition(posicaoAviaoMundo); // Captura a posição real do avião no mundo para origem dos tiros do jogador.
    centroHitboxJogador.copy(posicaoAviaoMundo); // Usa a posição do avião como base do centro da hitbox.
    centroHitboxJogador.y += 0.8; // Ajusta levemente a altura para encaixar melhor a hitbox no corpo do avião.
    caixaJogador.setFromCenterAndSize(centroHitboxJogador, tamanhoHitboxJogador); // Recalcula a caixa de colisão do jogador para este frame.
    mira.getWorldPosition(posicaoMiraMundo); // Captura a posição global da mira para direcionar os disparos do jogador.

    // Atualização dos inimigos: movimentação, lógica de disparo e estado de vida/destruição.
    sistemaInimigos.atualizar(
        deltaSegundos, // Delta time para manter movimento consistente independentemente do FPS.
        tempoAtualMs, // Tempo atual usado para controlar cadência de tiro dos inimigos.
        () => aviaoContainer.getWorldPosition(posicaoJogadorParaInimigos).clone().add(new THREE.Vector3(0, 0.8, 0)), // Função que devolve a posição alvo do jogador para os inimigos mirarem.
        (origemMundo, alvoMundo, idInimigoOrigem) => {
            sistemaTiros.criarTiroInimigo(origemMundo, alvoMundo, idInimigoOrigem); // Callback chamado pelo sistema de inimigos para realmente criar o projétil.
        }
    );

    // Atualização do sistema de tiros: cria tiros do jogador, move projéteis e resolve colisões.
    sistemaTiros.atualizar({
        deltaSegundos, // Usado para deslocar projéteis com base no tempo entre frames.
        tempoAtualMs, // Usado para respeitar intervalo entre tiros contínuos do jogador.
        posicaoAviaoMundo, // Origem do tiro do jogador (posição do avião no mundo).
        posicaoMiraMundo, // Alvo de direção do tiro do jogador (posição da mira no mundo).
        boxJogador: caixaJogador, // Hitbox do jogador para detectar quando um tiro inimigo acerta.
        inimigosColisiveis: sistemaInimigos.obterInimigosColisiveis(), // Lista de hitboxes dos inimigos para teste de impacto dos tiros do jogador.
        aoAtingirInimigo: (idInimigo) => sistemaInimigos.marcarComoAtingido(idInimigo), // Quando um tiro acerta, avisa o sistema de inimigos para iniciar a animação de destruição.
    });

    if (scene.fog && luzDirecional.castShadow) {// volume de visualização adaptativo ao fog    
      // Multiplicando por 1.2 e 0.6 para cobrir o horizonte antes dele surgir na neblina
      luzDirecional.shadow.camera.top = scene.fog.far * 1.2;
      luzDirecional.shadow.camera.bottom = -scene.fog.far * 0.6;
      luzDirecional.shadow.camera.updateProjectionMatrix();
      
      let alcanceVisaoZ = scene.fog.far * 0.4; // centraliza target na região média visível
      // coloca target um pouco para a direita para cobrir árvores laterais
      luzTarget.position.set(cameraBox.position.x + 50, cameraBox.position.y - 30, cameraBox.position.z - alcanceVisaoZ); // Posiciona o alvo da luz direcional para que a luz ilumine a área à frente da câmera, garantindo que os objetos próximos à câmera sejam iluminados corretamente, e que as sombras sejam projetadas de forma realista com base na posição da câmera e na direção da luz, criando um ambiente visualmente rico e imersivo.
      
      luzDirecional.position.set(luzTarget.position.x + 150, cameraBox.position.y + 180, luzTarget.position.z + 100); // Posiciona a luz direcional em relação ao alvo para criar um ângulo de iluminação que simula a luz do sol, garantindo que os objetos sejam iluminados de forma consistente e que as sombras sejam projetadas corretamente, contribuindo para a atmosfera visual do jogo, especialmente com a neblina que pode limitar a visibilidade à distância.
    }
    
    camera.lookAt(cameraBox.position.x, cameraBox.position.y, cameraBox.position.z - 30); // T1: Faz a câmera olhar para um ponto à frente dela, ajustando a posição de destino para que a câmera olhe para um ponto 30 unidades à frente no eixo Z, mantendo a mesma posição no eixo X e Y
    renderer.render(scene, camera); // T1: Renderiza a cena usando a câmera, atualizando o que é exibido na tela com base nas mudanças feitas na cena e na posição da câmera
    requestAnimationFrame(render); // T1: Solicita que a função de renderização seja chamada novamente no próximo frame, criando um loop de animação contínuo
    
}

render();