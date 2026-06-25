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
            <h1 style="font-size: 50px; color: #ff99cc; text-shadow: 0 0 20px #ff99cc; margin-bottom: 20px; text-transform: uppercase;">Rail Shooter</h1>
            <h2 style="font-size: 20px; font-weight: normal; margin-bottom: 30px;">Carregando modelos, sons e texturas...</h2>
            
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