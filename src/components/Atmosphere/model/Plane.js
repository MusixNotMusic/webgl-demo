import * as THREE from 'three';
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import fragment from '../shader/cloud/demo.frag'
import vertex from '../shader/cloud/vertex.vert'
export class PlaneModel {
    constructor(canvas) {
        this.canvas = canvas;

        this.aspect = canvas.clientHeight / canvas.clientWidth;

        // this.camera = new THREE.PerspectiveCamera(45, this.aspect, 0.1, 1000);

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });

        this.resolution = new THREE.Vector3(canvas.clientHeight, canvas.clientWidth, 1);

        this.controls = null;

        this.resizeBind = this._resize.bind(this);

        this.renderBind = this.render.bind(this);

        this.initCamera()

        this.createMesh();

        this.initController();

        this.resize();

        this.renderScene();
    }

    getUniform () {

    }

    initCamera () {
        // this.camera = new THREE.PerspectiveCamera( 45, this.aspect , 1, 1e5 );
        // this.camera.position.set( 50, 50, 50 );
        // this.camera.up.set( 0, 1, 0 ); // In our data, z is up

        const { x, y } = this.resolution;
        this.camera = new THREE.OrthographicCamera(-x / 2.0, x / 2.0, y / 2.0, -y / 2.0, 1, 1000);
        this.camera.position.set(0, 0, 10);
    }

    createMesh() {
        const geometry = new THREE.PlaneGeometry(this.resolution.x, this.resolution.y);
        const material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            fragmentShader: fragment,
            // vertexShader:   vertex,
            transparent: true,
            uniforms: {
                iResolution: { type: 'v3', value: this.resolution },
            }
        })

        this.material = material;
        this.geometry = geometry;

        const plane = new THREE.Mesh(geometry, material);
        this.scene.add(plane);

        // axes helper

        const axesHelper = new THREE.AxesHelper(100);
        this.scene.add(axesHelper);
    }

    initController() {
        // Create controls
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.addEventListener( 'change', this.renderBind );
        this.controls.target.set( 0, 0, 0 );
        this.controls.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);

    }

    renderScene() {
        const _render = () => {
            this.render();
            requestAnimationFrame(_render)
        }
        _render();
    }

    _resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.canvas.style.width = container.clientWidth + 'px';
        this.canvas.style.height = container.clientHeight + 'px';
        this.resolution = new THREE.Vector3(this.canvas.clientHeight, this.canvas.clientWidth, 1);
        if (this.camera) {
            this.camera.left = -this.resolution.x / 2.0;
            this.camera.right = this.resolution.x / 2.0;
            this.camera.top = this.resolution.y / 2.0;
            this.camera.bottom = -this.resolution.y / 2.0;
            this.camera.updateProjectionMatrix();
        }

        if (this.geometry) {
            this.geometry = new THREE.PlaneGeometry(this.resolution.x, this.resolution.y);
        }
        if (this.material) this.material.uniforms.iResolution.value = this.resolution;
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    resize() {
        this._resize();
        window.addEventListener('resize', this.resizeBind)
    }

    dispose() {
        window.removeEventListener('resize', this.resizeBind)
    }
}