import * as THREE from 'three';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';


export class OutlineEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.composer = new EffectComposer(this.renderer);

        this.initPass();
    }

    initPass() {
        const { scene, camera, composer } = this;


        const renderPass = new RenderPass( scene, camera );
		composer.addPass( renderPass );

        const outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
		composer.addPass( outlinePass );

        const outputPass = new OutputPass();
		composer.addPass( outputPass );

        const effectFXAA = new ShaderPass( FXAAShader );
        effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
        composer.addPass( effectFXAA );

        this.outlinePass = outlinePass;

    }


    selectedObjects(objects) {

        const { outlinePass } = this;

        if(objects && outlinePass) {
            if (Array.isArray(objects)) {
                outlinePass.selectedObjects = objects;
            } else {
                outlinePass.selectedObjects = [objects];
            }
        }
    }

    render() {
        this.composer.render();
    }
}