import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';

// caminho do modelo low poly usado como inimigo
const CAMINHO_MODELO_INIMIGO = '../assets/models/drone.glb';
// numero de inimigos ativos ao mesmo tempo
const QUANTIDADE_INIMIGOS_ATIVOS = 2;
// intervalo entre disparos do inimigo (ms) -> 3 tiros por segundo
const CADENCIA_TIRO_INIMIGO_MS = 333;
// limite lateral para entrada e saida dos inimigos
const LIMITE_LATERAL_X = 26;
// faixa de velocidade horizontal dos inimigos
const VELOCIDADE_MINIMA_INIMIGO = 7;
const VELOCIDADE_MAXIMA_INIMIGO = 11;

// faixas de posicao para variar altura e profundidade
const ALTURA_MINIMA = -8;
const ALTURA_MAXIMA = 10;
const Z_MINIMO = -70;
const Z_MAXIMO = -30;

function numeroAleatorio(minimo, maximo) {
  // retorna um valor aleatorio dentro do intervalo informado
  return Math.random() * (maximo - minimo) + minimo;
}

function prepararMateriaisParaAnimacao(opcaoInimigo) {
  // coleta os materiais do modelo para permitir fade na destruicao
  const materiais = [];

  opcaoInimigo.traverse((no) => {
    if (!no.isMesh || !no.material) return;

    const listaMateriais = Array.isArray(no.material) ? no.material : [no.material];
    listaMateriais.forEach((material) => {
      material.transparent = true;
      material.depthWrite = false;
      materiais.push(material);
    });
  });

  return materiais;
}

function criarCaixaInimigo() {
  // cria uma estrutura simples para guardar a bounding box do inimigo
  return {
    box3: new THREE.Box3(),
    centro: new THREE.Vector3(),
  };
}

export class SistemaInimigos {

  constructor(cena, grupoPai) {
    // guarda a cena e o objeto que recebe os inimigos no mundo
    this.cena = cena;
    this.grupoPai = grupoPai;
    this.loader = new GLTFLoader();

    // modelo base carregado do disco
    this.modeloBase = null;
    this.inicializado = false;

    // lista de inimigos em uso
    this.inimigos = [];
    this._idInimigo = 0;
    // multiplicador usado para ajustar velocidade horizontal dos inimigos
    this._movimentoXYMultiplier = 1.0;
  }

  async inicializar() {
    // carrega o modelo uma vez e cria os inimigos iniciais
    this.modeloBase = await this._carregarModeloInimigo();

    for (let i = 0; i < QUANTIDADE_INIMIGOS_ATIVOS; i++) {
      const inimigo = this._criarInimigo();
      this.inimigos.push(inimigo);
      this.grupoPai.add(inimigo.objeto);
    }

    this.inicializado = true;
  }

  _carregarModeloInimigo() {
    // carrega o glb do drone de forma assincrona
    return new Promise((resolve, reject) => {
      this.loader.load(
        CAMINHO_MODELO_INIMIGO,
        (gltf) => {
          const modelo = gltf.scene;
          modelo.scale.set(2.0, 2.0, 2.0);
          modelo.traverse((no) => {
            if (!no.isMesh) return;
            no.castShadow = true;
            no.receiveShadow = true;
          });
          resolve(modelo);
        },
        undefined,
        (erro) => reject(erro)
      );
    });
  }

  _criarInimigo() {
    // clona o modelo base para criar um inimigo independente
    const objeto = this.modeloBase.clone(true);
    const caixa = criarCaixaInimigo();

    // armazena os dados de controle do inimigo
    const inimigo = {
      id: ++this._idInimigo,
      objeto,
      caixa,
      velocidadeX: 0,
      ultimoDisparoMs: performance.now(),
      estado: 'ativo',
      tempoAnimacaoDestruicao: 0,
      materiaisAnimaveis: prepararMateriaisParaAnimacao(objeto),
    };

    this._reposicionarInimigo(inimigo, true);
    return inimigo;
  }

  _reposicionarInimigo(inimigo, resetarDisparo = false, tempoAtualMs = performance.now()) {
    // sorteia de qual lado ele vai entrar na tela
    const entrouPelaEsquerda = Math.random() < 0.5;
    const direcao = entrouPelaEsquerda ? 1 : -1;

    // coloca o inimigo na lateral escolhida e varia altura/profundidade
    inimigo.objeto.position.x = entrouPelaEsquerda ? -LIMITE_LATERAL_X : LIMITE_LATERAL_X;
    inimigo.objeto.position.y = numeroAleatorio(ALTURA_MINIMA, ALTURA_MAXIMA);
    inimigo.objeto.position.z = numeroAleatorio(Z_MINIMO, Z_MAXIMO);

    // aplica multiplicador dinamico na velocidade horizontal
    inimigo.velocidadeX = numeroAleatorio(VELOCIDADE_MINIMA_INIMIGO, VELOCIDADE_MAXIMA_INIMIGO) * this._movimentoXYMultiplier * direcao;
    // gira o modelo para ele olhar na direcao do movimento
    inimigo.objeto.rotation.y = direcao > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;

    // reseta estado visual e animacao
    inimigo.objeto.scale.set(2.0, 2.0, 2.0);
    inimigo.objeto.visible = true;
    inimigo.estado = 'ativo';
    inimigo.tempoAnimacaoDestruicao = 0;

    for (const material of inimigo.materiaisAnimaveis) {
      material.opacity = 1;
    }

    if (resetarDisparo) {
      // reinicia a contagem de disparo quando ele volta para a cena
      inimigo.ultimoDisparoMs = tempoAtualMs;
    }

    // atualiza a bounding box usada nas colisoes
    inimigo.caixa.box3.setFromObject(inimigo.objeto);
  }

  setSpeedProfile(profile) {
    // profile: { movimentoXYMultiplier }
    if (!profile) return;
    if (typeof profile.movimentoXYMultiplier === 'number') {
      this._movimentoXYMultiplier = profile.movimentoXYMultiplier;
    }
  }

  marcarComoAtingido(idInimigo) {
    // inicia a animacao de desaparecimento do inimigo atingido
    const inimigo = this.inimigos.find((item) => item.id === idInimigo);
    if (!inimigo || inimigo.estado !== 'ativo') return false;

    inimigo.estado = 'destruindo';
    inimigo.tempoAnimacaoDestruicao = 0;
    return true;
  }

  atualizar(deltaSegundos, tempoAtualMs, obterPosicaoJogadorMundo, criarTiroInimigo) {
    // nao faz nada ate o carregamento terminar
    if (!this.inicializado) return;

    // percorre todos os inimigos ativos para mover, atirar e animar
    for (const inimigo of this.inimigos) {
      if (inimigo.estado === 'ativo') {
        // movimenta o inimigo de uma lateral para a outra
        inimigo.objeto.position.x += inimigo.velocidadeX * deltaSegundos;

        const saiuPelaDireita = inimigo.objeto.position.x > LIMITE_LATERAL_X + 2;
        const saiuPelaEsquerda = inimigo.objeto.position.x < -LIMITE_LATERAL_X - 2;
        if (saiuPelaDireita || saiuPelaEsquerda) {
          // quando sai da tela, reaparece do outro lado
          this._reposicionarInimigo(inimigo);
          continue;
        }

        // dispara se ja passou o tempo minimo desde o ultimo tiro
        if (tempoAtualMs - inimigo.ultimoDisparoMs >= CADENCIA_TIRO_INIMIGO_MS) {
          const posicaoOrigem = new THREE.Vector3();
          inimigo.objeto.getWorldPosition(posicaoOrigem);

          // cria um tiro ja apontado para o jogador
          const posicaoJogador = obterPosicaoJogadorMundo();
          criarTiroInimigo(posicaoOrigem, posicaoJogador, inimigo.id);
          inimigo.ultimoDisparoMs = tempoAtualMs;
        }

        // atualiza a bounding box para colisao com tiros do jogador
        inimigo.caixa.box3.setFromObject(inimigo.objeto);
        inimigo.caixa.box3.getCenter(inimigo.caixa.centro);
      } else {
        // anima a saida com queda, encolhimento e fade
        inimigo.tempoAnimacaoDestruicao += deltaSegundos;

        const progresso = Math.min(inimigo.tempoAnimacaoDestruicao / 0.5, 1);
        const escala = THREE.MathUtils.lerp(2.0, 0.05, progresso);

        inimigo.objeto.scale.setScalar(escala);
        inimigo.objeto.position.y -= 14 * deltaSegundos;

        for (const material of inimigo.materiaisAnimaveis) {
          material.opacity = 1 - progresso;
        }

        inimigo.caixa.box3.setFromObject(inimigo.objeto);

        if (progresso >= 1) {
          // reaparece depois de terminar a animacao
          this._reposicionarInimigo(inimigo, true, tempoAtualMs);
        }
      }
    }
  }

  obterInimigosColisiveis() {
    // retorna apenas os inimigos ativos para teste de colisao
    if (!this.inicializado) return [];

    return this.inimigos
      .filter((inimigo) => inimigo.estado === 'ativo')
      .map((inimigo) => ({
        id: inimigo.id,
        box3: inimigo.caixa.box3,
      }));
  }
}
