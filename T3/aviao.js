import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';

export function criarAviao() {
    // Criamos um grupo vazio que serve de contêiner. 
    // Ele é retornado na hora e o jogo não quebra.
    const aviaoContainer = new THREE.Group();

    // Instancia o carregador de GLTF/GLB
    const loader = new GLTFLoader();

    // Carrega o F-15C (.glb)
    loader.load(
        './aviao.glb',
        (gltf) => {
            const aviao = gltf.scene;

            // 1. AJUSTE DE ESCALA: 
            aviao.scale.set(0.7, 0.7, 0.7);

            // 2. AJUSTE DE ROTAÇÃO:
            aviao.rotateY(Math.PI);

            // 3. ATIVAR SOMBRAS:
            aviao.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Garante que os materiais nativos do GLB reajam bem à luz do jogo
                    if (child.material) {
                        child.material.roughness = 0.5;
                    }
                }
            });

            // Adiciona o modelo carregado dentro do contêiner que já está na cena
            aviaoContainer.add(aviao);
            console.log("Avião carregado com sucesso com todas as texturas!");
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% carregado');
        },
        (error) => {
            console.error('Erro ao carregar o modelo do avião:', error);
        }
    );

    return aviaoContainer;
}