import * as THREE from  'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
        InfoBox,
        onWindowResize,
        createGroundPlaneXZ,
        createGroundPlaneWired} from "../libs/util/util.js";

function criaArvoreRedonda(x, z, tipo = 'normal', corFolhas = 'forestgreen', corTronco = 'sienna') // arvore redonda
{
  let arvore = new THREE.Object3D();

  const altura = (Math.random() * (7.0 - 5.0) + 5.0); // varia altura entre 5.0 e 7.0
  
  let materialTronco = setDefaultMaterial(corTronco);
  let troncoGeometry = new THREE.CylinderGeometry(0.9, 0.9, altura, 10);
  let tronco = new THREE.Mesh(troncoGeometry, materialTronco);
  tronco.position.set(0.0, altura / 2, 0.0);
  arvore.add(tronco);

  for (let i = 0; i < 5; i++) // cria varias folhas redondas com posicoes e tamanhos variados
  {
    let raio = (Math.random() * (2.6 - 1.3) + 1.3); // varia o raio entre 1.3 e 2.6
    let x = (Math.random() * 2 - 1) * 2;            // varia x entre -2 e 2
    let y = (Math.random() * 2 - 1) * 2 + altura;   // varia y entre -2 e 2 na altura da arvore
    let z = (Math.random() * 2 - 1) * 2;            // varia z entre -2 e 2

    let folha;
    if (tipo === 'normal'){
      folha = criaFolhasRedondas(raio, x, y, z, corFolhas);
    } else if (tipo === 'frutos') {
      folha = criaFolhasRedondasFrutos(raio, x, y, z, corFolhas);
    } else if (tipo === 'neve') {
      folha = criaFolhasRedondasNeve(raio, x, y, z);
    }
    arvore.add(folha);
  }

  arvore.position.set(x, 0.0, z);

  return arvore;
}

function criaFolhasRedondas(raio, x, y, z, corFolhas = 'forestgreen')
{
  let materialFolhas = setDefaultMaterial(corFolhas);
  let folhaGeometry = new THREE.SphereGeometry(raio, 20, 20);
  let folha = new THREE.Mesh(folhaGeometry, materialFolhas);
  folha.position.set(x, y, z);
  return folha;
}

function criaFolhasRedondasFrutos(raio, x, y, z, corFrutos = 'firebrick')
{
  let folha = criaFolhasRedondas(raio, x, y, z, 'forestgreen');
  // folha.add(posicionaFrutos(-(raio/2 + 0.15), -(raio/2 + 0.15), (raio/2 + 0.15), corFrutos)); // posiciona nas bordas das folhas
  folha.add(posicionaFrutos((raio/2 + 0.15), (raio/2 + 0.15), (raio/2 + 0.15), corFrutos));
  
  return folha;
}

function criaFolhasRedondasNeve(raio, x, y, z)
{
  let folha = criaFolhasRedondas(raio, x, y, z, 'darkgreen');
  let materialNeve = setDefaultMaterial('snow');
  let neveGeometry = new THREE.SphereGeometry(raio, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.4); // cria a parte de cima da folha com neve (metade da esfera)
  let neve = new THREE.Mesh(neveGeometry, materialNeve);
  neve.position.set(0, 0.1, 0); // posiciona a neve na parte de cima da folha
  folha.add(neve);
  return folha;
}

function criaArvoreTriangular(x, z, corFolhas = 'forestgreen', corTronco = 'sienna') // arvore triangular
{
  let arvore = new THREE.Object3D(); // objeto para juntar os elementos da arvore
  
  let materialTronco = setDefaultMaterial(corTronco); // cria tronco
  let troncoGeometry = new THREE.CylinderGeometry(0.9, 0.9, 3, 3);
  let tronco = new THREE.Mesh(troncoGeometry, materialTronco);
  tronco.position.set(0.0, 1.5, 0.0);
  arvore.add(tronco);
  
  let materialFolhas = setDefaultMaterial(corFolhas);
  let folhasTopoGeometry = new THREE.ConeGeometry(1.5, 2.5, 10); // cria folhas do topo
  let folhasTopo = new THREE.Mesh(folhasTopoGeometry, materialFolhas);
  folhasTopo.position.set(0.0, 6.5, 0.0);
  arvore.add(folhasTopo);
  let folhasMeioGeometry = new THREE.ConeGeometry(2, 3.5, 10); // cria folhas do meio
  let folhasMeio = new THREE.Mesh(folhasMeioGeometry, materialFolhas);
  folhasMeio.position.set(0.0, 5.5, 0.0);
  arvore.add(folhasMeio);
  let folhasBaseGeometry = new THREE.ConeGeometry(2.5, 4.5, 10); // cria folhas de baixo
  let folhasBase = new THREE.Mesh(folhasBaseGeometry, materialFolhas);
  folhasBase.position.set(0.0, 4.25, 0.0);
  arvore.add(folhasBase);
  
  arvore.position.set(x, 0.0, z); // escolhe a posicao no plano mas deixa no "chão"

  const altura = (Math.random() * (1.6 - 1.0) + 1.0); // varia altura entre 1.0x e 1.6x
  const largura = (Math.random() * (1.3 - 1.0) + 1.0); // varia largura entre 1.0x e 1.3x
  arvore.scale.set(largura, altura, largura); 

  return arvore; // retorna a arvore pronta
}

function posicionaFrutos(x, y, z, corFruto) // ajuda a posicionar os frutos na arvore
{
  let materialFrutos = setDefaultMaterial(corFruto);
  let frutosGeometry = new THREE.SphereGeometry(0.3, 3, 3);
  let fruto = new THREE.Mesh(frutosGeometry, materialFrutos);
  fruto.position.set(x, y, z);
  return fruto; // retorna o fruto pronto p ser adicionado
}

function criaArvoreTriangularFrutos(x, z, corFruto) // cria arvore de frutos, escolhendo a cor do fruto
{
  let arvore = criaArvoreTriangular(x, z); // cria a arvore base
  
  arvore.add(posicionaFrutos(0.7, 6, 0.7, corFruto)); // usa a funcao para escolher a posicao dos frutos
  arvore.add(posicionaFrutos(-1, 4.7, 1, corFruto)); // e os adiciona a arvore criada (objeto 3D)
  arvore.add(posicionaFrutos(1.25, 3.2, 1.25, corFruto));
  
  return arvore;
}

function criaArvoreTriangularNeve(x, z) // cria arvore com neve
{
  let arvore = criaArvoreTriangular(x, z, 'darkgreen'); // arvore base com verde mais escuro
  let materialNeve = setDefaultMaterial('snow');

  let nevePontaGeometry = new THREE.ConeGeometry(0.6, 1, 10); // pontinha da arvore com neve
  let nevePonta = new THREE.Mesh(nevePontaGeometry, materialNeve);
  nevePonta.position.set(0.0, 7.26, 0.0);
  arvore.add(nevePonta);
  let neveTopoGeometry = new THREE.CylinderGeometry(1.2, 1.5, 0.5, 10); // neve da borda das folhas de cima
  let neveTopo = new THREE.Mesh(neveTopoGeometry, materialNeve);
  neveTopo.position.set(0.0, 5.51, 0.0); // 0.01 mais p cima p nao bugar
  arvore.add(neveTopo);
  let neveMeioGeometry = new THREE.CylinderGeometry(1.71, 2, 0.5, 10); // neve da borda das folhas do meio
  let neveMeio = new THREE.Mesh(neveMeioGeometry, materialNeve);
  neveMeio.position.set(0.0, 4.01, 0.0);
  arvore.add(neveMeio);
  let neveBaseGeometry = new THREE.CylinderGeometry(2.22, 2.5, 0.5, 10); // neve da borda das folhas de baixo
  let neveBase = new THREE.Mesh(neveBaseGeometry, materialNeve);
  neveBase.position.set(0.0, 2.26, 0.0);
  arvore.add(neveBase); // adiciona as neves na arvore base

  return arvore;
}

function criaArvoreTriangularOutono(x, z) { return criaArvoreTriangular(x, z, 'darkgoldenrod', 'saddlebrown'); } // cria arvore com as cores de outono

function criaArvoreTriangularVerao(x, z) { return criaArvoreTriangular(x, z); } // cria arvore base para o verao

function criaArvoreTriangularInverno(x, z) { return criaArvoreTriangularNeve(x, z); } // cria arvore com neve para o inverno

function criaArvoreTriangularMaca(x, z) { return criaArvoreTriangularFrutos(x, z, 'firebrick'); } // cria arvore de maça

function criaArvoreTriangularLaranja(x, z) { return criaArvoreTriangularFrutos(x, z, 'chocolate'); } // cria arvore de laranja

function criaArvoreRedondaOutono(x, z) { return criaArvoreRedonda(x, z, 'normal', 'darkgoldenrod', 'saddlebrown'); } // cria arvore redonda de outono

function criaArvoreRedondaVerao(x, z) { return criaArvoreRedonda(x, z); } // cria arvore redonda normal (verao)

function criaArvoreRedondaInverno(x, z) { return criaArvoreRedonda(x, z, 'neve', 'snow', 'saddlebrown'); } // cria arvore redonda com neve

function criaArvoreRedondaMaca(x, z) { return criaArvoreRedonda(x, z, 'frutos', 'firebrick'); } // cria arvore redonda de maça

function criaArvoreRedondaLaranja(x, z) { return criaArvoreRedonda(x, z, 'frutos', 'chocolate'); } // cria arvore redonda de laranja

function iniciaPosicoes() {    
  const posicoesX = [
    -165, -140, -125, -95, -70, -60, -35, -30, 5, 30, 50, 55, 80, 110, 140, 155, 
    -155, -115, -105, -80, -45, -15, -10, 10, 25, 45, 65, 95, 100, 120, 165
  ];
  const posicoesZ = [
    -30, -10, -45, -25, -45, -10, -10, -40, -20, -30, -5, -40, -20, -25, -35, -5,
    30, 10, 40, 20, 30, 35, 10, 45, 15, 30, 20, 5, 40, 10, 30
  ];

  return { posicoesX, posicoesZ };
}

export function criaCenarioVerao(x, y, z)
{
  let ambiente = new THREE.Object3D();
  let plane = createGroundPlaneWired(350, 100, 35, 10, 3, 'green', 'darkgreen');
  ambiente.add(plane);

  const { posicoesX, posicoesZ } = iniciaPosicoes();
  
  for (let i = 0; i < posicoesX.length; i++)
  {
    if (i % 2 === 0) {
      let arvore = criaArvoreTriangularVerao(posicoesX[i], posicoesZ[i]);
      ambiente.add(arvore);
    } else {
       let arvore = criaArvoreRedondaVerao(posicoesX[i], posicoesZ[i]);
       ambiente.add(arvore);
    }
  }
  
  ambiente.position.set(x, y, z);

  return ambiente;
}

export function criaCenarioInverno(x, y, z)
{
  let ambiente = new THREE.Object3D();
  let plane = createGroundPlaneWired(350, 100, 35, 10, 3, 'snow', 'lightgray');
  ambiente.add(plane);
  
  const { posicoesX, posicoesZ } = iniciaPosicoes();
  
  for (let i = 0; i < posicoesX.length; i++)
  {
    if (i % 2 === 0) {
      let arvore = criaArvoreTriangularInverno(posicoesX[i], posicoesZ[i]);
      ambiente.add(arvore);
    } else {
       let arvore = criaArvoreRedondaInverno(posicoesX[i], posicoesZ[i]);
       ambiente.add(arvore);
    }
  }
  
  ambiente.position.set(x, y, z);

  return ambiente;
}

export function criaCenarioOutono(x, y, z)
{
  let ambiente = new THREE.Object3D();
  let plane = createGroundPlaneWired(350, 100, 35, 10, 3, 'olive', 'darkgoldenrod');
  ambiente.add(plane);

  const { posicoesX, posicoesZ } = iniciaPosicoes();
  
  for (let i = 0; i < posicoesX.length; i++)
  {
    if (i % 2 === 0) {
      let arvore = criaArvoreTriangularOutono(posicoesX[i], posicoesZ[i]);
      ambiente.add(arvore);
    } else {
       let arvore = criaArvoreRedondaOutono(posicoesX[i], posicoesZ[i]);
       ambiente.add(arvore);
    }
  }
  
  ambiente.position.set(x, y, z);

  return ambiente;
}

export function criaCenarioPrimavera(x, y, z)
{
  let ambiente = new THREE.Object3D();
  let plane = createGroundPlaneWired(350, 100, 35, 10, 3, 'darkgreen', 'forestgreen');
  ambiente.add(plane);

  const { posicoesX, posicoesZ } = iniciaPosicoes();

  for (let i = 0; i < posicoesX.length; i++)
  {
    if (i % 4 === 0) {
      let arvore = criaArvoreTriangularMaca(posicoesX[i], posicoesZ[i]);
      ambiente.add(arvore);
    } else if (i % 4 === 1) {
       let arvore = criaArvoreRedondaLaranja(posicoesX[i], posicoesZ[i]);
       ambiente.add(arvore);
    } else if (i % 4 === 2) {
      let arvore = criaArvoreTriangularLaranja(posicoesX[i], posicoesZ[i]);
      ambiente.add(arvore);
    } else {
      let arvore = criaArvoreRedondaMaca(posicoesX[i], posicoesZ[i]);
      ambiente.add(arvore);
    }
  }
  
  ambiente.position.set(x, y, z);

  return ambiente;
}

export function criaCenario(x, y, z, tipo = 'verao') {
    if (tipo === 'verao') {
      return criaCenarioVerao(x, y, z);
    } else if (tipo === 'inverno') {
      return criaCenarioInverno(x, y, z);
    } else if (tipo === 'outono') {
      return criaCenarioOutono(x, y, z);
    } else if (tipo === 'primavera') {
      return criaCenarioPrimavera(x, y, z);
    }
}