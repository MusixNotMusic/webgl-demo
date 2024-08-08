import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';

import vertexShader from './shader/cloud/cloud.vert';
import fragmentShader from './shader/cloud/noise.frag';

import { WGS84Object3D } from './WGS84Object3D';

import { addCSS2Object, setMeshUniform } from './tool/utils';

export default class HorizonClouds {
    constructor(renderer, camera, scene) {

        this.stats = null;
        this.gui = null;
        this.guiStatsEl = null;

        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.material = null;

        // clock
        this.clock = new THREE.Clock();
        this.time = 0;

        this.params = {
            STEPS: { min: 0, max: 512, step: 1 },
            COVERAGE: { min: 0, max: 2, step: 0.01 },
            THICKNESS: { min: 0, max: 100, step: 1 },
            FBM_FREQ: { min: 0, max: 5, step: 0.1 },
            OFFSET: { min: 0, max: 4, step: 0.1 },
            windU: { min: -1, max: 1, step: 0.01 },
            windV: { min: -1, max: 1, step: 0.01 },
        };

        this.values = {
            STEPS: 2,
            COVERAGE: 0.34,
            THICKNESS: 5,
            FBM_FREQ: 2.76434,
            OFFSET: 2.3,
            windU: 0.02,
            windV: 0.01,
        }

        this.uniforms = {};

        this.updateUniformsBind = this.updateUniforms.bind(this);

        this.init();
		this.initMesh();

        window.FlowFeildWind = this;
    }
        
    init() {
        // stats
        this.stats = new Stats();
        document.body.appendChild( this.stats.dom );

        // gui
        this.gui = new GUI();

        Object.entries(this.params).forEach(([key, obj]) => {
            this.gui.add(this.values, key, obj.min, obj.max).step( obj.step ).onChange( this.updateUniformsBind );
        })

        this.guiStatsEl = document.createElement( 'div' );
        this.guiStatsEl.classList.add( 'gui-stats' );

    }


    updateUniforms() {
        if (this.material) {
            Object.entries(this.params).forEach(([key, obj]) => {
                this.material.uniforms[key].value = this.values[key];
            })
        }
    }

    initMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        this.time =  this.clock.getElapsedTime();

        const uniforms =  {
            STEPS: { value: this.values.STEPS },
            COVERAGE: { value: this.values.COVERAGE },
            THICKNESS: { value: this.values.THICKNESS},
            FBM_FREQ: { value: this.values.FBM_FREQ},
            OFFSET: { value: this.values.OFFSET},
            windU: { value: this.values.windU },
            windV: { value: this.values.windV },
            iTime: { value: this.time },
            cameraPosition: { value: new THREE.Vector3() },
		}


        const material = new THREE.RawShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide
        } );

        // const material = new THREE.MeshNormalMaterial( {
        //     side: THREE.DoubleSide
        // });

        this.material = material;

        const mesh = new THREE.Mesh(geometry, material);

        mesh.scale.set(1e6, 1e6, 1e5);

        mesh.name = 'cloud';

        const object = new WGS84Object3D(mesh);

        const lngLat = [120.42233192979313, 36.43421482671216];

        const alt =  1e5 * 2;

        object.WGS84Position = new THREE.Vector3(lngLat[0], lngLat[1], alt);


        this.cloud = object;

        this.scene.add(object)

    }
    
    updateCameraPosition() {
        if (!this.isDispose) {
          const { renderer, scene, camera } = this;
          const cameraPosition = this.camera.position;
    
          const name = 'cloud';
          const object = this.scene.getObjectByName(name);
      
          setMeshUniform(object, 'cameraPosition', { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z })

          setMeshUniform(object, 'iTime', this.clock.getElapsedTime())

          this.stats.update();

          this.renderer.render( this.scene, this.camera );
        }
    }


    clean() {
        const { scene } = this;

        const meshes = [];

        scene.traverse( function ( object ) {

            if ( object.isMesh ) meshes.push( object );

        } );

        for ( let i = 0; i < meshes.length; i ++ ) {

            const mesh = meshes[ i ];
            mesh.material.dispose();
            mesh.geometry.dispose();

            scene.remove( mesh );

        }

    }

    removeItem (object) {
        if (object) {
          this.scene.remove(object);
          object.clear();
        }
      }
    
    
    destroy () {
        this.removeItem(this.cloud);

        this.isDispose = true;

        this.stats.dom.remove();
    }

    dispose () {
        this.destroy();
    }
}
