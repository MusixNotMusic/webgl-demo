import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import vertexShader from './shader/cloud/cloud.vert';
// import fragmentShader from './shader/cloud/cloud.frag';
import fragmentShader from './shader/cloud/noise.frag';

export default class HorizonClouds {
    constructor(container, dataInstance) {
        this.container = container;
        
        this.dataInstance = dataInstance;

        this.stats = null;
        this.gui = null;
        this.guiStatsEl = null;
        this.controls = null;

        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.material = null;

        // clock
        this.clock = new THREE.Clock();
        this.time = 0;

        this.params = {
            STEPS: 32,
            COVERAGE: 0.5,
            THICKNESS: 5,
            FBM_FREQ: 2.76434
        };

        this.uniforms = {};

        this.onWindowResizeBind = this.onWindowResize.bind(this);

        this.animateBind = this.animate.bind(this);
        
        this.updateUniformsBind = this.updateUniforms.bind(this);

        this.init();
		this.initMesh();
		this.animate();

        window.FlowFeildWind = this;
    }
        
    init() {
        const width = this.container.innerWidth || this.container.clientWidth;
        const height = this.container.innerHeight || this.container.clientHeight;

        // camera
        this.camera = new THREE.PerspectiveCamera( 70, width / height, 1, 10000 );
        this.camera.position.set(50, 50, 50);
        // renderer

        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.clearColor = 'blue'
        this.renderer.setSize( width, height );
        this.container.appendChild( this.renderer.domElement );

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x000 );

        // controls

        this.controls = new OrbitControls( this.camera, this.renderer.domElement );

        // stats

        this.stats = new Stats();
        this.container.appendChild( this.stats.dom );

        // gui

        this.gui = new GUI();
        this.gui.add( this.params, 'STEPS', 0, 256 ).step( 2 ).onChange( this.updateUniformsBind );
        this.gui.add( this.params, 'COVERAGE', 0, 1.0 ).step( 0.01 ).onChange( this.updateUniformsBind );
        this.gui.add( this.params, 'THICKNESS', 0, 100.0 ).step( 1.0).onChange( this.updateUniformsBind );
        this.gui.add( this.params, 'FBM_FREQ', 1.0, 4.0).step( 0.01).onChange( this.updateUniformsBind );

        this.guiStatsEl = document.createElement( 'div' );
        this.guiStatsEl.classList.add( 'gui-stats' );

        // listeners
        window.addEventListener( 'resize', this.onWindowResizeBind );

    }

    addLight () {
        const ambientLight = new THREE.AmbientLight(0xffffff);
    
        this.scene.add(ambientLight);
    }



    updateUniforms() {
        if (this.material) {
            this.material.uniforms.STEPS.value = this.params.STEPS;
            this.material.uniforms.COVERAGE.value = this.params.COVERAGE;
            this.material.uniforms.THICKNESS.value = this.params.THICKNESS;
            this.material.uniforms.FBM_FREQ.value = this.params.FBM_FREQ;
        }
    }

    initMesh() {
        this.clean();

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        this.time =  this.clock.getElapsedTime();

        const uniforms =  {
            STEPS: { value: this.params.STEPS },
            COVERAGE: { value: this.params.COVERAGE },
            THICKNESS: { value: this.params.THICKNESS},
            FBM_FREQ: { value: this.params.FBM_FREQ},
            iTime: { value: this.time },
            iChannel0: { value: new THREE.TextureLoader().load( '/texture/noise.jpg' ) }
		}


        const material = new THREE.RawShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide
        } );
        
        // const material = new THREE.MeshNormalMaterial();

        this.material = material;

        const mesh = new THREE.Mesh(geometry, material);

        const scale = 50.0;

        mesh.scale.set(scale, 20, scale)

        this.scene.add(mesh);

        this.scene.add(new THREE.AxesHelper(100));
        this.scene.add(new THREE.GridHelper(100, 10));
    }


    onWindowResize() {
        const { container, camera, renderer } = this;

        const width = container.innerWidth || container.clientWidth;;
        const height = container.innerHeight || container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize( width, height );

    }

    animate() {
        this.frameId = requestAnimationFrame( this.animateBind );

        this.controls.update();
        this.stats.update();

        this.render();
    }

    render() {
        this.camera.updateProjectionMatrix();
        this.time =  this.clock.getElapsedTime();
        this.material.uniforms.iTime.value = this.time;
        this.renderer.render( this.scene, this.camera );

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

    dispose () {
        this.clean();

        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.material = null;

        cancelAnimationFrame(this.frameId);

        this.onWindowResizeBind = null;
    }
}
