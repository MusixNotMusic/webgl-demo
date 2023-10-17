import * as THREE from 'three';
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import Stats from 'three/examples/jsm/libs/stats.module'
import fragment from '../shader/cloud/weather.frag'
import vertex from '../shader/cloud/box.vert'
import { defaultsDeep } from 'lodash';
export class BoxModel {
    constructor(canvas, options = {}, dependency) {
        this.canvas = canvas;

        this.options = options;

        this.dependency = dependency;

        this.setParams();

        this.aspect = canvas.clientWidth / canvas.clientHeight;

        this.resolution = new THREE.Vector3(canvas.clientHeight, canvas.clientWidth, 1);

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });

        this.renderTarget = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, { type: THREE.UnsignedByteType} );

        this.renderer.setRenderTarget(this.renderTarget);

        this.material = null;
        
        this.geometry = null;
        
        this.uniforms = this.getUniform();

        this.controls = null;

        this.resizeBind = this._resize.bind(this);

        this.renderBind = this.render.bind(this);

        this.initCamera()

        this.createMesh();

        this.initController();

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        this.resize();

        this.renderScene();
    }

    setParams () {
        this.clock = new THREE.Clock();
        this.pausedTime = 0.0;
        this.deltaTime = 0.0;
        this.startingTime = 0;
        this.time = this.startingTime;
        this.date = new THREE.Vector4();

        this.resolution = new THREE.Vector3();
        this.mouse = new THREE.Vector4(212, 393, -203, -325);
        this.mouseButton = new THREE.Vector4(0, 0, 0, 0);
        this.normalizedMouse = new THREE.Vector2(0.26452599388379205, 0.9985507246376811);
        this.frameCounter = 0;

        this.audioContext = {
            sampleRate: 0
        };

        this.updateDate();
    }

    updateDate () {
        let today = new Date();
        this.date.x = today.getFullYear();
        this.date.y = today.getMonth();
        this.date.z = today.getDate();
        this.date.w = today.getHours() * 60 * 60 
            + today.getMinutes() * 60
            + today.getSeconds()
            + today.getMilliseconds() * 0.001;
    }

    getUniform () {
        return {
            iTime: { type: 'f', value: 0.0 },
            status: { value: [true, false, false, true] },
        }
    }

    setUniforms () {
        if(this.material && this.material.uniforms) {

            this.deltaTime = this.clock.getDelta();
            this.time = this.startingTime + this.clock.getElapsedTime() - this.pausedTime;
            this.updateDate();

     
            this.material.uniforms['iTime'].value = this.time;
            this.material.uniforms['status'].value = [true, false, false, true];
        }
    }

    initCamera () {
        this.camera = new THREE.PerspectiveCamera( 45, this.aspect , 1, 1e5 );
        this.camera.position.set( 0, 500, -500 );
        this.camera.up.set( 0, 1, 0 ); // In our data, z is up

        // const { x, y } = this.resolution;
        // this.camera = new THREE.OrthographicCamera(-x / 2.0, x / 2.0, y / 2.0, -y / 2.0, 0.1, 1000);
        // this.camera.position.set(0, 0, 100);
    }

    createMesh() {
        const width  = 1;
        const height = 1;
        const depth  = 1;
        const scale = 200;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            // depthWrite: false,
            // depthTest: false,
            fragmentShader: this.options.fragmentShader || fragment,
            vertexShader:   this.options.vertexShader || vertex,
            transparent: true,
            uniforms: defaultsDeep(this.options.uniforms || {}, this.getUniform())
        })

        // const material = new THREE.MeshBasicMaterial({
        //     side: THREE.DoubleSide,
        //     transparent: true,
        //     color: 'orange'
        // })

        this.material = material;
        this.geometry = geometry;

        const box = new THREE.Mesh(geometry, material);
        box.translateY(height / 2 * scale)
        box.scale.set(scale, scale, scale);
        box.wireframe = true;
        this.scene.add(box);

        // axes helper

        const axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(axesHelper);

        const gridHelper = new THREE.GridHelper(1000, 50);
        this.scene.add(gridHelper);
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
            this.setUniforms();
            this.render();
            if (this.dependency) {
                const texture = this.dependency.value.renderTarget.texture;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                this.material.uniforms.tex.value = texture;
            }
            this.controls.update();
            this.stats.update()
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
        // this.resolution = new THREE.Vector3(this.canvas.clientHeight, this.canvas.clientWidth, 1);
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
        // if (this.material && this.material.uniforms) this.material.uniforms.iResolution.value = this.resolution;
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderTarget.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    resize() {
        this._resize();
        window.addEventListener('resize', this.resizeBind)
    }

    dispose() {
        window.removeEventListener('resize', this.resizeBind)
        this.canvas.remove();
        this.material.dispose();
    }
}