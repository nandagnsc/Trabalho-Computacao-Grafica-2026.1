import * as THREE from  'three';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
        InfoBox,
        onWindowResize,
        createGroundPlaneXZ,
        createGroundPlaneWired} from "../libs/util/util.js";

export function criarAviao(){
    let aviao = new THREE.Group();
    const matCorpo = new THREE.MeshStandardMaterial({ color: "#f5f5f5", metalness: 0.3, roughness: 0.4 });
    const matDetalhe = new THREE.MeshStandardMaterial({ color: "#1e3a5f", metalness: 0.5, roughness: 0.3 });
    const matMotor  = new THREE.MeshStandardMaterial({ color: "#888c91", metalness: 0.8, roughness: 0.2 });
    const matVidro = new THREE.MeshStandardMaterial({ color: "#9bd3ff", metalness: 0.9,roughness: 0.05,transparent: true, opacity: 0.5});
    // const matCorpo = setDefaultMaterial("#f5f5f5");
    // const matDetalhe = setDefaultMaterial("#1e3a5f");
    // const matMotor  = setDefaultMaterial("#888c91");
    // const matVidro = setDefaultMaterial("#9bd3ff");

    // corpo do avião(a parte mais longa). 7 é o comprimento, 1.3 é a largura e a altura, e 32 é o número de segmentos.
    let corpoAviao = new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,7,15), matCorpo);
    corpoAviao.rotation.z = Math.PI/2;
    aviao.add(corpoAviao);

    let narizAviao = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 10), matCorpo);
    narizAviao.position.x = 3.5;
    narizAviao.scale.set(1,1,1.8);
    narizAviao.rotation.x = Math.PI/2;
    narizAviao.rotation.y = Math.PI/2;
    aviao.add(narizAviao);



    //asas do aviao. 3 é o raio, 32 é o número de segmentos.
    const asa = new THREE.Mesh(new THREE.SphereGeometry(3,20,20), matDetalhe);
    asa.scale.set(2.5,0.1,0.5);
    asa.position.set(0,-0.2,0);
    asa.rotation.y = Math.PI/2;
    aviao.add(asa);


    //motores do aviao. 0.4 é o raio, 2 é a altura, 32 é o número de segmentos. so muda o lado de cada um.
    const motorEsquerdo = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,2,10), matMotor);
    motorEsquerdo.position.set(0,-0.8,-4);
    motorEsquerdo.rotation.z = Math.PI/2;
    aviao.add(motorEsquerdo);

    const motorDireito = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,2,10), matMotor);
    motorDireito.position.set(0,-0.8,4);
    motorDireito.rotation.z = Math.PI/2;
    aviao.add(motorDireito);

    
    //luzes nas asas do aviao. 0.2 é o raio, 32 é o número de segmentos. deixei uma vermelha e uma verde, 
    // e não criei um material separado só pra elas porque achei que não valia a pena, já que são só duas esferas pequenas e nao vamos usar esse material em outros lugares.
    const luzEsquerda = new THREE.Mesh(new THREE.SphereGeometry(0.15,5,5), setDefaultMaterial("red"));
    luzEsquerda.position.set(0,-0.2,-7.5);
    aviao.add(luzEsquerda);

    const luzDireita = new THREE.Mesh(new THREE.SphereGeometry(0.15,5,5), setDefaultMaterial("green"));
    luzDireita.position.set(0,-0.2,7.5);
    aviao.add(luzDireita);




    let cauda = new THREE.Mesh(new THREE.SphereGeometry(1.3,32,32), matCorpo);
    cauda.position.set(-3.5,0,0); 
    cauda.scale.set(1,1,3);
    cauda.rotation.y = Math.PI/2;
    aviao.add(cauda);

    const caudaVertical = new THREE.Mesh(new THREE.SphereGeometry(0.9,20,20),matDetalhe);
    caudaVertical.scale.set(0.2,2,0.8);
    caudaVertical.rotation.y = Math.PI/2;
    caudaVertical.position.set(-6.5,1.2,0);
    aviao.add(caudaVertical);

    const caudaHorizontal = new THREE.Mesh(new THREE.SphereGeometry(1,20,20),matDetalhe);
    caudaHorizontal.position.set(-6.5,1.05,0);
    caudaHorizontal.scale.set(0.8,0.2,2.5);
    aviao.add(caudaHorizontal);



    const geoJanela = new THREE.SphereGeometry(0.2, 10, 10);

    for(let i = 0; i < 10; i++) {
        let posX = -2.5 + (i * 0.6);  
        let janelaD = new THREE.Mesh(geoJanela, matVidro);
        janelaD.position.set(posX, 0.4, 1.1); 
        janelaD.scale.set(1, 1.8, 0.8);
        aviao.add(janelaD);

        let janelaE = new THREE.Mesh(geoJanela, matVidro);
        janelaE.position.set(posX, 0.4, -1.1); 
        janelaE.scale.set(1, 1.8, 0.8); 
        aviao.add(janelaE);
    }

  return aviao;
}