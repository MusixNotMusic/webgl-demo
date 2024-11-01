import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import vertexShader from '../shader/heat.vert';
import fragmentShader from '../shader/heat.frag';
import fragmentDrawShader from '../shader/draw.frag';

export default class WebGLRendererTargetDemo {
    constructor() {
        this.scene = new THREE.Scene();

        this.scene.background = new THREE.Color( 0xffffff );

        this.clock = new THREE.Clock();

        this.iFrame = 0;

        this.resolution = new THREE.Vector2(1000, 1000);

        window.WebGLRendererTargetDemo = this;

        this.renderBind = this.render.bind(this);

        this.onWindowResizeBind = this.onWindowResize.bind(this);
    }

    init(path) {
        this.initRenderTarget();

        this.initRender();

        this.initCamera();
     
        this.initController();

        this.initMesh();

        this.initTexturePlane();

        this.animate();

        window.addEventListener( 'resize', this.onWindowResizeBind );
    }

    initRender () {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( this.renderer.domElement );
    }

    initCamera () {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera( 45, aspect , 1, 1e5 );
        this.camera.position.set( 0, 100, 200 );
        this.camera.up.set( 0, 1, 0 ); // In our data, z is up

        this.moveCamera = new THREE.PerspectiveCamera( 45, aspect , 1, 1e5 );
        this.moveCamera.position.set( 200, 200, 100 );
        this.moveCamera.up.set( 0, 1, 0 ); // In our data, z is up

        this.oCamera = new THREE.OrthographicCamera(-this.resolution.x / 2.0, this.resolution.x / 2.0, this.resolution.y / 2.0, -this.resolution.y / 2.0, 1, 1000);
        this.oCamera.position.set(0, 0, 10);
    }

    initController() {
        // Create controls
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.addEventListener( 'change', this.renderBind );
        this.controls.target.set( 0, 0, 0 );
        this.controls.update();
    }


    initMesh () {
        const { scene } = this

        const size = 50;
        const box = new THREE.BoxGeometry( size, size, size);
        // const material = new THREE.MeshBasicMaterial({ 
        //     transparent: true, 
        //     opacity: 1.0, 
        //     side: THREE.DoubleSide,
        //     // map: this.renderTarget.texture
        // });

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                tex:    { value: null },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentDrawShader,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(box, material);
        mesh.position.y =  size * 0.5;

        this.mesh = mesh;

        const grid = new THREE.GridHelper(200, 10);
        const axes = new THREE.AxesHelper(200);

        scene.add(mesh);
        scene.add(grid);
        scene.add(axes);
    }

    initRenderTarget () {
        const option = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            type: THREE.FloatType,
            depthBuffer: false
        }
        this.renderTarget  = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, option);
        this.renderTarget1 = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, option);
        this.renderTarget2 = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, option);
    }



    initTexturePlane() {
        const plane = new THREE.PlaneGeometry( this.resolution.x, this.resolution.y );
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                tex:    { value: null },
                iFrame: { value: this.iFrame },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide
        });

        const planeMesh = new THREE.Mesh(plane, material);
        planeMesh.position.set(0, 0, 0);
        planeMesh.visible = true;
       
        this.planeMesh = planeMesh;

        // this.scene.add(planeMesh);
    }

    onWindowResize () {
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.render();
    }

    render () {
        if (this.renderer) {
            let temp;
            if (this.iFrame % 2 == 0) {
                this.renderer.setRenderTarget(this.renderTarget1);
                temp = this.renderTarget1;
            } else {
                this.renderer.setRenderTarget(this.renderTarget2);
                temp = this.renderTarget2;
            }
            // this.planeMesh.material.uniforms.tex.value = null;
            this.renderer.render( this.planeMesh, this.oCamera );
            this.planeMesh.material.uniforms.tex.value = temp.texture;
            this.planeMesh.material.uniforms.iFrame.value = ++this.iFrame;


            // update box mesh
            // let time =  this.clock.getElapsedTime();
            // this.moveCamera.position.set(200 * Math.cos(time), 200 ,  200 * Math.sin(time));
            // this.moveCamera.lookAt(0, 0, 0);
            // this.mesh.material.map = null;
            // this.renderer.setRenderTarget(this.renderTarget);
            // this.renderer.render( this.scene, this.oCamera );
            // this.mesh.material.map = this.renderTarget.texture;

            this.mesh.material.uniforms.tex.value = temp.texture;

            this.renderer.setRenderTarget(null);
            this.renderer.render( this.scene, this.camera );
        }
    }

    animate() {
        requestAnimationFrame( this.animate.bind(this) );
        this.render();
    }

    resetScene () {
        this.cleanScene();
    }

    cleanScene () {
        if (this.scene && this.scene.children.length > 0) {
            this.scene.children.forEach(mesh => {
                if (mesh) {
                    if (mesh.material) {
                        mesh.material.dispose()
                    }

                    if (mesh.geometry) {
                        mesh.geometry.dispose()
                    }

                    mesh.clear();
                    mesh = null
                }
            })
            this.scene.children = []
        }
    }

    dispose () {
        if (this.renderer) {
            this.renderer.domElement.remove();
            this.renderer.dispose();
        }
        
        this.cleanScene();

        this.renderer = null;
        this.camera = null;
        this.scene = null;
    }
}

