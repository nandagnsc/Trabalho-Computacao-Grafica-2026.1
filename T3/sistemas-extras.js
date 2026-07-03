import * as THREE from 'three';

// ==========================================
// 1. MODO DE INVENCIBILIDADE (Tecla 'G')
// ==========================================
export class SistemaInvencibilidade {
    constructor() {
        this.ativo = false;
        this.elementoUI = this._criarInterface();

        // Mapeia a tecla 'G' para ligar/desligar
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'g') {
                this.alternarModo();
            }
        });
    }

    _criarInterface() {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '70px'; // Fica no topo, abaixo do contador de tiros
        div.style.left = '50%';
        div.style.transform = 'translateX(-50%)';
        div.style.padding = '12px 24px';
        div.style.borderRadius = '8px';
        div.style.fontFamily = 'Verdana, sans-serif';
        div.style.fontSize = '18px';
        div.style.fontWeight = 'bold';
        div.style.zIndex = '100';
        div.style.pointerEvents = 'none'; // Não atrapalha cliques
        div.style.display = 'none'; // Começa escondido
        
        // Estilo chamativo para ficar bem visível na interface
        div.textContent = '🛡️ MODO INVENCÍVEL ATIVADO 🛡️';
        div.style.color = '#ffffff';
        div.style.background = 'rgba(255, 215, 0, 0.6)'; // Fundo Dourado Translúcido
        div.style.border = '2px solid #ffd700';
        div.style.textShadow = '0 0 10px #000000';

        document.body.appendChild(div);
        return div;
    }

    alternarModo() {
        this.ativo = !this.ativo;
        // Mostra o aviso apenas quando estiver ativo
        this.elementoUI.style.display = this.ativo ? 'block' : 'none';
        console.log(`Modo Invencível: ${this.ativo ? 'ON' : 'OFF'}`);
    }

    estaInvencivel() {
        return this.ativo;
    }
}


// ==========================================
// 2. TELA DE CARREGAMENTO (Loading Screen)
// ==========================================
export class TelaCarregamento {
    constructor(onStartCallback) {
        this.onStartCallback = onStartCallback;
        // Agora nós pegamos carona no carregador oficial do Three.js!
        this.manager = THREE.DefaultLoadingManager; 
        this.elementoTela = this._criarTelaHtml();
        this._configurarEventos();
    }

    _criarTelaHtml() {
        const div = document.createElement('div');
        div.id = 'tela-loading';
        div.style.position = 'absolute';
        div.style.top = '0'; div.style.left = '0';
        div.style.width = '100vw'; div.style.height = '100vh';
        
        // Imagem de fundo temática (Céu/Nuvens/Avião). Substitua a URL se quiser outra.
        div.style.backgroundImage = 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1517976487492-5750f3195933?q=80&w=2070")';
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center';
        
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.justifyContent = 'center';
        div.style.alignItems = 'center';
        div.style.zIndex = '9999'; // Fica por cima de absolutamente tudo
        div.style.color = '#fff';
        div.style.fontFamily = 'Verdana, sans-serif';

        div.innerHTML = `
            <h1 style="font-size: 50px; color: #ff99cc; text-shadow: 0 0 20px #ff99cc; margin-bottom: 20px; text-transform: uppercase;">Shooter Girls</h1>
            <h2 style="font-size: 20px; font-weight: normal; margin-bottom: 30px;">Quase pronto para o jogo...</h2>
            
            <div style="width: 50vw; max-width: 500px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 15px; border: 2px solid #fff; position: relative; overflow: hidden;">
                <div id="barra-progresso" style="width: 0%; height: 100%; background: #ff99cc; transition: width 0.2s ease;"></div>
                <span id="texto-progresso" style="position: absolute; width: 100%; top: 5px; left: 0; text-align: center; font-size: 16px; font-weight: bold; text-shadow: 1px 1px 2px #000;">0%</span>
            </div>

            <button id="btn-start" style="margin-top: 50px; padding: 15px 50px; font-size: 24px; font-weight: bold; border: none; border-radius: 8px; cursor: not-allowed; opacity: 0.5; transition: all 0.3s ease;" disabled>
                CARREGANDO...
            </button>
        `;

        document.body.appendChild(div);

        // Lógica do botão START
        const btnStart = div.querySelector('#btn-start');
        btnStart.addEventListener('click', () => {
            // Efeito de fade-out bonito na hora de sair
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.6s ease';
            setTimeout(() => {
                div.style.display = 'none';
                if(this.onStartCallback) this.onStartCallback();
            }, 600);
        });

        return div;
    }

    _configurarEventos() {
        const texto = this.elementoTela.querySelector('#texto-progresso');
        const barra = this.elementoTela.querySelector('#barra-progresso');
        const botao = this.elementoTela.querySelector('#btn-start');

        // Durante o download de qualquer asset (GLTF, texturas, sons)
        this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const porcentagem = Math.floor((itemsLoaded / itemsTotal) * 100);
            texto.textContent = `${porcentagem}%`;
            barra.style.width = `${porcentagem}%`;
        };

        // Quando 100% dos arquivos estiverem prontos
        this.manager.onLoad = () => {
            texto.textContent = "100%";
            barra.style.width = "100%";
            barra.style.background = "#4caf50"; // Barra fica verde
            
            // Libera e estiliza o botão START
            botao.textContent = "INICIAR JOGO";
            botao.disabled = false;
            botao.style.cursor = 'pointer';
            botao.style.opacity = '1';
            botao.style.background = '#4caf50';
            botao.style.color = '#fff';
            botao.style.boxShadow = '0 0 20px #4caf50';
        };
    }
}
    // ==========================================
// 3. SISTEMA DE HEALTH PACKS
// ==========================================
export class SistemaHealthPacks {
    constructor(scene, cameraBox, listener) {
        this.scene = scene;
        this.cameraBox = cameraBox;
        this.healthPacks = [];
        this.contadorAbates = 0;
        this.listener = listener;

        // Exigência do Professor: Distâncias para avaliar o atrator
        this.distanciaAtracao = 45.0; // Distância em que começa a puxar
        this.distanciaColeta = 6.0;   // Distância em que é coletado

        this._criarTexturaEMaterial();
        this.uiDebugDistancia = this._criarUIDebug();

        // Carrega o som do Health Pack
        this.somHealthPack = new THREE.Audio(listener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./recarregaVida.wav', (buffer) => {
            this.somHealthPack.setBuffer(buffer);
            this.somHealthPack.setVolume(0.08);
        });
    }

    tocarSomHealthPack() {
        if (this.somHealthPack.isPlaying) {
            this.somHealthPack.stop();
        }
        this.somHealthPack.play();
    }
    

    

    _criarTexturaEMaterial() {
        // Cria uma textura de Cruz Vermelha via código (sem arquivos externos!)
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // Fundo branco
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#ff0000'; // Cruz Vermelha
        ctx.fillRect(48, 16, 32, 96);
        ctx.fillRect(16, 48, 96, 32);

        const textura = new THREE.CanvasTexture(canvas);
        this.geometriaHP = new THREE.BoxGeometry(4, 4, 4);
        this.materialHP = new THREE.MeshStandardMaterial({ 
            map: textura,
            emissive: new THREE.Color(0x330000) // Dá um leve brilho
        });
    }

    _criarUIDebug() {
        // Caixa de texto exigida para o professor avaliar as distâncias
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '120px';
        div.style.left = '20px';
        div.style.padding = '10px';
        div.style.background = 'rgba(0, 0, 0, 0.7)';
        div.style.border = '1px dashed #ff99cc';
        div.style.color = '#ff99cc';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '12px';
        div.style.zIndex = '100';
        div.innerHTML = `[TESTE DE HA]<br>Raio Atrator: ${this.distanciaAtracao}m<br>Raio Coleta: ${this.distanciaColeta}m<br>Distância do HA: N/A`;
        document.body.appendChild(div);
        return div;
    }

    registrarAbate() {
        this.contadorAbates++;
        // A cada 3 inimigos abatidos, spawna um Health Pack
        if (this.contadorAbates % 3 === 0) {
            this._spawnHealthPack();
        }
    }

    _spawnHealthPack() {
        const hp = new THREE.Mesh(this.geometriaHP, this.materialHP);
        
        // Aparece aleatoriamente à frente do avião
        const xAleatorio = (Math.random() - 0.5) * 60; // Entre -30 e 30
        const zLonge = this.cameraBox.position.z - 150; // Bem à frente
        
        hp.position.set(xAleatorio, 5, zLonge); // Y=5 para ficar no ar
        this.scene.add(hp);
        this.healthPacks.push(hp);
    }

    curar(sistemaTiros) {
        // Cada HA cura 25%. Como o máximo são 20 tiros, 25% equivale a recuperar 5 tiros!
        const tirosRecuperados = 5;
        
        // Subtrai os tiros sofridos (garantindo que não fique menor que 0)
        sistemaTiros.contadorTirosSofridos -= tirosRecuperados;
        if (sistemaTiros.contadorTirosSofridos < 0) {
            sistemaTiros.contadorTirosSofridos = 0;
        }

        // Atualiza visualmente a nova barra gráfica de integridade
        sistemaTiros._atualizarHUD();
    }

    atualizar(deltaSegundos, posicaoAviaoMundo, sistemaTiros) {
        let menorDistancia = Infinity;

        for (let i = this.healthPacks.length - 1; i >= 0; i--) {
            const hp = this.healthPacks[i];
            
            hp.rotation.x += 1.5 * deltaSegundos;
            hp.rotation.y += 2.0 * deltaSegundos;

            const distancia = hp.position.distanceTo(posicaoAviaoMundo);
            if (distancia < menorDistancia) menorDistancia = distancia;

            // Efeito Atrator (Puxa para o avião)
            if (distancia < this.distanciaAtracao) {
                const direcao = new THREE.Vector3().subVectors(posicaoAviaoMundo, hp.position).normalize();
                const velocidadePuxao = 60 * deltaSegundos; 
                hp.position.add(direcao.multiplyScalar(velocidadePuxao));
            }

            // Coleta efetiva do item
            if (distancia < this.distanciaColeta) {
                this.scene.remove(hp);
                this.healthPacks.splice(i, 1);
                
                this.tocarSomHealthPack();
                
                // CHAMA A CURA PASSANDO O SISTEMA DE TIROS
                this.curar(sistemaTiros); 
            }
            
            else if (hp.position.z > this.cameraBox.position.z + 50) {
                this.scene.remove(hp);
                this.healthPacks.splice(i, 1);
            }
        }

        // Atualiza a interface de teste do professor
        if (this.healthPacks.length > 0) {
            this.uiDebugDistancia.innerHTML = `[TESTE DE HA]<br>Raio Atrator: ${this.distanciaAtracao}m<br>Raio Coleta: ${this.distanciaColeta}m<br>Distância do HA: ${menorDistancia.toFixed(1)}m`;
        } else {
            this.uiDebugDistancia.innerHTML = `[TESTE DE HA]<br>Raio Atrator: ${this.distanciaAtracao}m<br>Raio Coleta: ${this.distanciaColeta}m<br>Nenhum HA no mapa`;
        }
    }
}

