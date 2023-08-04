import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class ThreeModel {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderBind = this.render.bind(this);
        this.onWindowResizeBind = this.onWindowResize.bind(this);

        window.ThreeModel = this;
    }

    initRender () {
        this.renderer = new THREE.WebGLRenderer({});
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( this.renderer.domElement );
    }

    initCamera () {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera( 45, aspect , 1, 1e5 );
        this.camera.position.set( 200, 200, 100 );
        // this.camera.lookAt(0, 1, 0);
        this.camera.up.set( 0, 0, 1 ); // In our data, z is up
    }

    initController() {
        // Create controls
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.addEventListener( 'change', this.renderBind );
        this.controls.target.set( 0, 0, 0 );
        this.controls.update();
    }

    init(path) {

        // Create renderer
        this.initRender()

        this.initCamera()
     
        this.initController()

        this.initLight()

        fetch(path)
            .then(response => response.arrayBuffer())
            .then(buffer => this.initMesh(new Float32Array(buffer)))

        window.addEventListener( 'resize', this.onWindowResizeBind );
    }

    initLight () {
        const ambientLight = new THREE.AmbientLight('#000000');

        this.scene.add(ambientLight);

        // this.particleLight = new THREE.Mesh(
        //     new THREE.SphereGeometry( .05, 8, 8 ),
        //     new THREE.MeshBasicMaterial( { color: 0xffffff } )
        // );
        // this.scene.add( this.particleLight );

        // this.particleLight.add( new THREE.PointLight( 0xffffff, 300 ) );

        const light1 = new THREE.DirectionalLight( 0xffffff, 3 );
        light1.position.set( 0, 100, 0 );
        this.scene.add( light1 );

        const light2 = new THREE.DirectionalLight( 0xffffff, 3 );
        light2.position.set( 100, 200, 100 );
        this.scene.add( light2 );

        const light3 = new THREE.DirectionalLight( 0xffffff, 3 );
        light3.position.set( - 100, - 200, - 100 );
        this.scene.add( light3 );
    }

    initMesh (buffer) {
        console.log('initMesh =>', buffer)
        // this.material = new THREE.MeshBasicMaterial( {
        //     color: 'orange',
        //     transparent: true,
        //     side: THREE.DoubleSide
        // });

        // this.material = new THREE.MeshNormalMaterial( {
        //     transparent: true,
        //     side: THREE.DoubleSide
        // });

        this.material = new THREE.MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.9,
            depthTest: true,
            depthWrite: true,
            alphaTest: 0,
            side: THREE.DoubleSide,

            color: 0x049ef4,
            emissive: 0x000000,
            roughness: 1,
            metalnessMap: 0,
            reflectivity: 0.5,
            clearcoat: 0.15,
            clearcoatRoughness: 0,
            fog: true
        })

        // this.material = new THREE.MeshPhongMaterial({
        //     transparent: true,
        //     opacity: 1,
        //     depthTest: true,
        //     depthWrite: true,
        //     alphaTest: 0,
        //     side: THREE.DoubleSide,

        //     color: 0x049ef4,
        //     emissive: 0x000000,
        //     specular: 0x111111,
        //     shininess: 100,
        //     combine: THREE.MultiplyOperation,
        //     reflectivity: 1,
        //     refractionRatio: 0.5
        // })

        // THREE.Mesh
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
        // this.geometry.setAttribute('position', mergeVertices(new THREE.BufferAttribute(buffer, 3)));
        this.geometry = mergeVertices(this.geometry);
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingBox();
        this.geometry.center();

        this.mesh = new THREE.Mesh( this.geometry, this.material );
        // this.mesh.translateX(-100)
        this.mesh.translateZ(8)

        this.scene.add( this.mesh );

        this.grid = new THREE.GridHelper( 400, 100 )
        this.grid.rotateX(Math.PI / 2)

        this.scene.add(this.grid);
        this.scene.add(new THREE.AxesHelper( 1e2 ));

        this.render();
    }

    onWindowResize () {
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.render();
    }

    render () {
        this.renderer.render( this.scene, this.camera );
    }

    emptyScene () {
        if (this.scene && this.scene.children.length > 0) {
            this.scene.children.forEach(mesh => {
                if (mesh) {
                    if (mesh.material && mesh.material.uniforms) {
                        if (mesh.material.uniforms.map.value) {
                            mesh.material.uniforms.map.value.dispose();
                            mesh.material.uniforms.map.value.source.data = null
                            mesh.material.uniforms.map.value.source = null
                        }
                        mesh.material.uniforms.map.value = null;
                    }

                    if (mesh.material) {
                        mesh.material.dispose()
                    }

                    if (mesh.geometry) {
                        mesh.geometry.dispose()
                    }
                    mesh = null
                }
            })
            this.scene.children = []
        }
    }

    resetScene () {
        this.emptyScene();
    }

    dispose () {
        if (this.renderer) {
            this.renderer.domElement.remove();
            this.renderer.dispose();
        }
        
        this.emptyScene();

        this.renderer = null;
        this.camera = null;
        this.scene = null;
    }
}