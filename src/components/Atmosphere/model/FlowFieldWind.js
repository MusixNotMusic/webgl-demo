import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { colorMap  } from './colorMap';

import vertexShader from './shader/volume.vert';
import fragmentShader from './shader/volume.frag';

import { getColorSystem } from '../../utils/color/constants';

export default class FlowFeildWind {
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
        this.pausedTime = 0.0;
        this.deltaTime = 0.0;
        this.startingTime = 0;
        this.time = this.startingTime;

        this.api = {
            depthSampleCount: 512,
            threshold0: 20,
            threshold: 40
        };

        this.uniforms = {
            u_map: { value: null },
            u_U: { value: null },
            u_V: { value: null },
            u_W: { value: null },
        };

        this.textureColor =  getColorSystem().colorMapTexture['rainbows']

        this.onWindowResizeBind = this.onWindowResize.bind(this);

        this.animateBind = this.animate.bind(this);
        
        this.updateUniformsBind = this.updateUniforms.bind(this);

        this.init();
        this.addLight();
		this.initMesh();
		this.animate();

        window.FlowFeildWind = this;
    }
        
    init() {
        const width = this.container.innerWidth || this.container.clientWidth;
        const height = this.container.innerHeight || this.container.clientHeight;

        // camera
        this.camera = new THREE.PerspectiveCamera( 70, width / height, 1, 1000 );
        this.camera.position.set(50, 50, 50);
        // renderer

        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( width, height );
        this.container.appendChild( this.renderer.domElement );

        // scene

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xffffff );

        // controls

        this.controls = new OrbitControls( this.camera, this.renderer.domElement );

        // stats

        this.stats = new Stats();
        this.container.appendChild( this.stats.dom );

        // gui

        this.gui = new GUI();
        this.gui.add( this.api, 'depthSampleCount', 0, 2048 ).step( 2 ).onChange( this.updateUniformsBind );
        this.gui.add( this.api, 'threshold0', 0, 256 ).step( 0.01 ).onChange( this.updateUniformsBind );
        this.gui.add( this.api, 'threshold', 0, 256 ).step( 0.01).onChange( this.updateUniformsBind );

        this.guiStatsEl = document.createElement( 'div' );
        this.guiStatsEl.classList.add( 'gui-stats' );

        // listeners
        window.addEventListener( 'resize', this.onWindowResizeBind );

    }

    addLight () {
        const ambientLight = new THREE.AmbientLight(0xffffff);
    
        this.scene.add(ambientLight);

        const ratio = 1e10;
        const intensity = 1;
        const light1 = new THREE.DirectionalLight( 0xffffff, intensity );
        // light1.position.set( 10 * ratio, 10 * ratio, 10 * ratio );
        light1.position.set( -0.5 * ratio, -0.5 * ratio, -1  * ratio );
        this.scene.add( light1 );
    
        const light2 = new THREE.DirectionalLight( 0xffffff, intensity );
        light2.position.set( 0, 0, -1 * ratio );
        this.scene.add( light2 );
    
        const light3 = new THREE.DirectionalLight( 0xffffff, intensity );
        light3.position.set( 0.5  * ratio, 0.5  * ratio, -1 * ratio );
        this.scene.add( light3 );
      }


    getTextureData(data, width, height, depth) {
        const texture = new THREE.Data3DTexture( data, width, height, depth );
        texture.format = THREE.RedFormat;
        texture.type = THREE.FloatType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }

    updateUniforms() {
        if (this.material) {
            this.material.uniforms.depthSampleCount.value = this.api.depthSampleCount;
            this.material.uniforms.threshold0.value = this.api.threshold0;
            this.material.uniforms.threshold.value = this.api.threshold;
        }
    }


    initMesh() {
        this.clean();

        const geometry = new THREE.BoxGeometry(1, 1, 1);

        const { widthSize, heightSize, depthSize } = this.dataInstance.header;
        const { U, V, W } = this.dataInstance;
        
        this.time =  this.clock.getElapsedTime();

        const uniforms =  {
            u_map: { value: this.textureColor },
            
            u_U:   { value: this.getTextureData( U, widthSize, heightSize, depthSize) },
            u_V:   { value: this.getTextureData( V, widthSize, heightSize, depthSize) },
            u_W:   { value: this.getTextureData( W, widthSize, heightSize, depthSize) },

            depthSampleCount: { value: this.api.depthSampleCount },
            threshold0: { value: this.api.threshold0 },
            threshold: { value: this.api.threshold},
            iTime: { value: this.time },
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

        mesh.scale.set(50, 50, 20)

        mesh.rotateX(Math.PI / 2);

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
