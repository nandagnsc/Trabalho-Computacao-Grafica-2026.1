/*
Presentation notes (Student C - Inimigos e jogabilidade / tiros)

Talk anchors for this file:
- constants (CADENCIA_TIRO_JOGADOR_MS, DISTANCIA_MAXIMA_TIRO): gameplay tuning points
- criarElementoContador: HUD element for hits received
- SistemaTiros: responsibilities: spawn, move, collision checks, HUD update, lifetime removal
- criarTiroInimigo vs _criarTiroJogador: explain directional math differences (aim from enemy -> player, and player shot from plane toward a distant aim point)
- collision detection: Box3 usage and why iterating arrays backwards for safe removal
- _deveRemoverPorDistancia: lifetime and camera-distance test

When presenting, show a short diagram (verbally) for collision flow: spawn -> advance -> box3.intersectsBox -> notify -> remove.
*/
import * as THREE from 'three';

// controla a cadencia dos tiros do jogador
const CADENCIA_TIRO_JOGADOR_MS = 170;
// distancia maxima antes de remover um tiro da cena
const DISTANCIA_MAXIMA_TIRO = 250;

// geometria plana usada para o tiro do jogador
const GEOMETRIA_TIRO_JOGADOR = new THREE.PlaneGeometry(4.2, 0.5);
// material solido para o tiro do jogador
const MATERIAL_TIRO_JOGADOR = new THREE.MeshBasicMaterial({
  color: 0xffe066,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// geometria em cone alongado usada para o tiro do inimigo
const GEOMETRIA_TIRO_INIMIGO = new THREE.ConeGeometry(0.18, 4.2, 8, 1);
const MATERIAL_TIRO_INIMIGO = new THREE.MeshBasicMaterial({ color: 0xff4d4d });

function criarElementoContador() {
  // reaproveita o contador caso ele ja exista na pagina
  let contador = document.getElementById('contador-tiros-player');
  if (contador) return contador;

  // cria o contador visivel de tiros sofridos
  contador = document.createElement('div');
  contador.id = 'contador-tiros-player';
  contador.style.position = 'fixed';
  contador.style.top = '5px';
  contador.style.left = '100px';
  contador.style.padding = '10px 14px';
  contador.style.border = '2px solid #ffffff';
  contador.style.borderRadius = '8px';
  contador.style.background = 'rgba(0, 0, 0, 0.45)';
  contador.style.color = '#ffffff';
  contador.style.fontFamily = 'Verdana, sans-serif';
  contador.style.fontSize = '14px';
  contador.style.fontWeight = 'bold';
  contador.style.zIndex = '20';

  contador.textContent = 'Tiros sofridos: 0';
  document.body.appendChild(contador);
  return contador;
}

export class SistemaTiros {
  constructor(cena, camera, listener) {
    // guarda referencias da cena e da camera para mover e remover tiros
    this.cena = cena;
    this.camera = camera;
    this.listener = listener;

    // listas de tiros ativos do jogador e dos inimigos
    this.tirosJogador = [];
    this.tirosInimigos = [];

    // controla se o botao esquerdo esta pressionado
    this.estaDisparoContinuoAtivo = false;
    // controla a ultima vez que o jogador disparou
    this.ultimoTiroJogadorMs = 0;

    // contador visivel dos tiros que o player recebeu
    this.contadorTirosSofridos = 0;
    this.elementoContador = criarElementoContador();

    // vetores auxiliares para evitar recriar objetos o tempo todo
    this._auxPosicaoCamera = new THREE.Vector3(); 
    this._auxBoxTiro = new THREE.Box3();
    
    // velocidades dinamicas (podem ser atualizadas via setSpeedProfile)
    this.velocidadeTiroJogador = 230;
    this.velocidadeTiroInimigo = 150;


    //SONS:
    this.somTiroJogador = new THREE.Audio(this.listener); //cria o objeto de áudio para o tiro do jogador
    this.somTiroInimigo = new THREE.Audio(this.listener); //cria o objeto de áudio para o tiro do inimigo
   
    this.somAviaoAtingido = new THREE.Audio(this.listener); //cria o objeto de áudio para o avião atingido
    this.somInimigoAtingido = new THREE.Audio(this.listener); //cria o objeto de áudio para o inimigo atingido


    const loader = new THREE.AudioLoader();
    loader.load('./TIROBASICO.wav', (buffer) => {
      this.somTiroJogador.setBuffer(buffer);
      this.somTiroJogador.setVolume(0.2); // Ajusta o volume do som do tiro do jogador
    });

    loader.load('./tirofino.wav', (buffer) => {
      this.somTiroInimigo.setBuffer(buffer);
      this.somTiroInimigo.setVolume(0.08); // Ajusta o volume do som do tiro do inimigo
    });

    loader.load('./aviao-atingido.wav', (buffer) => {
      this.somAviaoAtingido.setBuffer(buffer);
      this.somAviaoAtingido.setVolume(0.15); // Ajusta o volume do som do avião atingido
    });

    loader.load('./inimigo-atingido.wav', (buffer) => {
      this.somInimigoAtingido.setBuffer(buffer);
      this.somInimigoAtingido.setVolume(0.4); // Ajusta o volume do som do inimigo atingido
    });



  }


  //SONS:
  tocarSomTiroJogador() {
    if (this.somTiroJogador.isPlaying) {
      this.somTiroJogador.stop(); // Para o som atual se estiver tocando
    }
    this.somTiroJogador.play(); // Toca o som do tiro do jogador
  }

  tocarSomTiroInimigo() {
    if (this.somTiroInimigo.isPlaying) {
      this.somTiroInimigo.stop(); // Para o som atual se estiver tocando
    }
    this.somTiroInimigo.play(); // Toca o som do tiro do inimigo
  }


  tocarSomAviaoAtingido() {
    if (this.somAviaoAtingido.isPlaying) {
      this.somAviaoAtingido.stop(); // Para o som atual se estiver tocando
    }
    this.somAviaoAtingido.play(); // Toca o som do avião atingido
  }

  tocarSomInimigoAtingido() {
    if (this.somInimigoAtingido.isPlaying) {
      this.somInimigoAtingido.stop(); // Para o som atual se estiver tocando
    }
    this.somInimigoAtingido.play(); // Toca o som do inimigo atingido
  }


  definirDisparoContinuoAtivo(ativo) {
    // liga ou desliga o disparo continuo do jogador
    this.estaDisparoContinuoAtivo = ativo;
  }

  _atualizarHUD() {
    // atualiza o texto do contador na tela
    this.elementoContador.textContent = `Tiros sofridos: ${this.contadorTirosSofridos}`;
  }

  criarTiroInimigo(origemMundo, alvoMundo, idInimigoOrigem) { //
    // calcula a direcao do inimigo ate o jogador (vetor normalizado)
    const direcao = new THREE.Vector3().subVectors(alvoMundo, origemMundo).normalize();

    // cria o cone alongado que representa o tiro inimigo
    const meshTiro = new THREE.Mesh(GEOMETRIA_TIRO_INIMIGO, MATERIAL_TIRO_INIMIGO.clone());
    meshTiro.position.copy(origemMundo);

    // aponta o cone para a direcao do alvo
    const eixoFrenteCone = new THREE.Vector3(0, 1, 0); //
    meshTiro.quaternion.setFromUnitVectors(eixoFrenteCone, direcao); 
    meshTiro.rotateX(Math.PI);

    // adiciona o tiro na cena e na lista de ativos
    this.cena.add(meshTiro);

    // toca o som do tiro inimigo
    this.tocarSomTiroInimigo();


    this.tirosInimigos.push({
      objeto: meshTiro,
      direcao,
      velocidade: this.velocidadeTiroInimigo,
      distanciaPercorrida: 0,
      idInimigoOrigem,
    });
  }

  _criarTiroJogador(origemMundo, alvoMundo) {
    // guarda a posicao real da camera no mundo para usar como referencia visual
    const posicaoCameraMundo = new THREE.Vector3();
    this.camera.getWorldPosition(posicaoCameraMundo);

    // calcula a direcao da visao do jogador indo da camera ate a mira
    const direcaoVisao = new THREE.Vector3().subVectors(alvoMundo, posicaoCameraMundo).normalize();

    // projeta um ponto bem mais distante na mesma linha da mira
    const distanciaFoco = 100;
    const alvoDistante = new THREE.Vector3().copy(posicaoCameraMundo).addScaledVector(direcaoVisao, distanciaFoco);

    // calcula a direcao final do tiro saindo do aviao em direcao ao ponto distante da mira
    const direcao = new THREE.Vector3().subVectors(alvoDistante, origemMundo).normalize();

    // cria o mesh visual do tiro do jogador usando a geometria e o material definidos acima
    const tiro = new THREE.Mesh(GEOMETRIA_TIRO_JOGADOR, MATERIAL_TIRO_JOGADOR.clone());
    // posiciona o tiro um pouco a frente da origem para evitar sobreposicao com o aviao
    tiro.position.copy(origemMundo).addScaledVector(direcao, 4); // 

    // orienta o tiro para apontar visualmente na mesma direcao do disparo
    const destino = origemMundo.clone().add(direcao);
    tiro.lookAt(destino);

    // adiciona o tiro na cena para ele aparecer no render
    this.cena.add(tiro);

    
    this.tocarSomTiroJogador();// toca o som do tiro do jogador


    // registra o tiro no array de tiros ativos do jogador para atualizar depois
    this.tirosJogador.push({
      objeto: tiro,
      direcao,
      velocidade: this.velocidadeTiroJogador,
      distanciaPercorrida: 0,
    });
  }

  setSpeedProfile(profile) {
    // profile: { tiroVelMultiplier }
    if (!profile) return; 
    if (typeof profile.tiroVelMultiplier === 'number') { 
      this.velocidadeTiroJogador = 230 * profile.tiroVelMultiplier;
      this.velocidadeTiroInimigo = 100 * profile.tiroVelMultiplier;
    }
  }

  atualizar({
    deltaSegundos,
    tempoAtualMs,
    posicaoAviaoMundo,
    posicaoMiraMundo,
    boxJogador,
    inimigosColisiveis,
    aoAtingirInimigo,
  }) {
    // cria tiros enquanto o botao esquerdo estiver pressionado
    if (this.estaDisparoContinuoAtivo && tempoAtualMs - this.ultimoTiroJogadorMs >= CADENCIA_TIRO_JOGADOR_MS) {
      this._criarTiroJogador(posicaoAviaoMundo, posicaoMiraMundo);
      this.ultimoTiroJogadorMs = tempoAtualMs;
    }

    // move e testa colisao dos tiros do jogador e dos inimigos
    this._atualizarTirosJogador(deltaSegundos, inimigosColisiveis, aoAtingirInimigo);
    this._atualizarTirosInimigos(deltaSegundos, boxJogador);
  }

  _atualizarTirosJogador(deltaSegundos, inimigosColisiveis, aoAtingirInimigo) {
    // percorre de tras para frente para remover sem baguncar o array
    for (let i = this.tirosJogador.length - 1; i >= 0; i--) {
      const tiro = this.tirosJogador[i]; //
      const deslocamento = tiro.velocidade * deltaSegundos;

      // avanca o tiro na direcao calculada e atualiza a orientacao
      tiro.objeto.position.addScaledVector(tiro.direcao, deslocamento);
      //tiro.objeto.lookAt(this.camera.position);
      //tiro.distanciaPercorrida += deslocamento;

      let removeuTiro = false;
      // bounding box do tiro para detectar colisao com inimigos
      this._auxBoxTiro.setFromObject(tiro.objeto);

      for (const inimigo of inimigosColisiveis) {
        if (this._auxBoxTiro.intersectsBox(inimigo.box3)) {
          aoAtingirInimigo(inimigo.id); // notifica sistema de inimigos
          this.cena.remove(tiro.objeto); // remove visualmente
          this.tirosJogador.splice(i, 1); // remove do array
          this.tocarSomInimigoAtingido(); // toca o som do inimigo atingido
          removeuTiro = true;
          break;
        }
      }

      if (removeuTiro) continue;

      if (this._deveRemoverPorDistancia(tiro.distanciaPercorrida, tiro.objeto.position)) {
        // remove tiros que passaram da area util da cena
        this.cena.remove(tiro.objeto);
        this.tirosJogador.splice(i, 1); 
      }
    }
  }

  _atualizarTirosInimigos(deltaSegundos, boxJogador) {
    // percorre de tras para frente para remover tiros com seguranca
    for (let i = this.tirosInimigos.length - 1; i >= 0; i--) {
      const tiro = this.tirosInimigos[i];
      const deslocamento = tiro.velocidade * deltaSegundos;

      // avanca o tiro inimigo na direcao do jogador
      tiro.objeto.position.addScaledVector(tiro.direcao, deslocamento);
      tiro.distanciaPercorrida += deslocamento;

      // bounding box para detectar acerto no jogador
      this._auxBoxTiro.setFromObject(tiro.objeto);
      if (this._auxBoxTiro.intersectsBox(boxJogador)) {
        // incrementa o contador visivel e remove o tiro
        this.contadorTirosSofridos += 1;
        this._atualizarHUD();
        this.cena.remove(tiro.objeto);
        this.tirosInimigos.splice(i, 1);
        this.tocarSomAviaoAtingido(); // toca o som do avião atingido
        continue;
      }

      if (this._deveRemoverPorDistancia(tiro.distanciaPercorrida, tiro.objeto.position)) {
        // remove tiros que sairam do campo de visao
        this.cena.remove(tiro.objeto);
        this.tirosInimigos.splice(i, 1);
      }
    }
  }

  _deveRemoverPorDistancia(distanciaPercorrida, posicaoObjeto) {
    // corta o tiro quando ele anda alem do limite definido
    if (distanciaPercorrida >= DISTANCIA_MAXIMA_TIRO) return true;

    // corta o tiro quando ele fica muito longe da camera
    this.camera.getWorldPosition(this._auxPosicaoCamera);
    const distanciaDaCamera = posicaoObjeto.distanceTo(this._auxPosicaoCamera);

    return distanciaDaCamera > DISTANCIA_MAXIMA_TIRO;
  }
}
