import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

export default class ThreeModel {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderBind = this.render.bind(this);
        this.onWindowResizeBind = this.onWindowResize.bind(this);

        window.ThreeModel = this;
        window.THREE = THREE;
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
        

        this.control = new TransformControls( this.camera, this.renderer.domElement );
    }

    init(path) {

        // Create renderer
        this.initRender()

        this.initCamera()
     
        this.initController()

        this.initLight()

        // this.initModelMesh()

        fetch(path)
            .then(response => response.arrayBuffer())
            .then(buffer =>
                 this.initMesh(new Float32Array(buffer)))

        window.addEventListener( 'resize', this.onWindowResizeBind );
    }

    initLight () {
        const ambientLight = new THREE.AmbientLight('#000000');

        this.scene.add(ambientLight);

        // this.addOneLight([0, 100, 0]);
        this.addOneLight([100, 200, 100]);
        this.addOneLight([-100, -200, -100]);
    }

    addOneLight(position) {
        const light = new THREE.DirectionalLight( 0xffffff, 3 );
        light.position.set( position[0], position[1], position[2] );
        this.scene.add( light );


        const lHelper = new THREE.DirectionalLightHelper(light, 5);
        light.target = new THREE.Object3D();
        this.scene.add( lHelper );
    }

    getObjectSize (object) {
        object.scale.set(1, 1, 1);
        const aabb = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        aabb.getSize(size);
        return size;
    }

    setObjectCenter (object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.set(-center.x, -center.y, -center.z);
    }

    initModelMesh () {
        const { scene } = this
        const loader = new FBXLoader();
    
        loader.load( '/model/fbx/radar.fbx',  ( model ) => {
            const object = model.clone();

            object.rotation.x += Math.PI / 2;

            this.setObjectCenter(object);

            const custom = new THREE.Object3D();


            custom.add(object)

            const axesHelper = new THREE.AxesHelper(500);
            custom.add(axesHelper);
            custom.position.set(100, 100, 50);
            custom.scale.set(0.2, 0.2, 0.2);
            custom.rotateX(Math.PI / 2);
            this.custom = custom;
            scene.add( custom );
        })

      }

    initMesh (buffer) {
        // console.log('initMesh =>', buffer)
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

        this.mesh.attach(new THREE.AxesHelper(10))

        this.grid = new THREE.GridHelper( 400, 100 )

        this.grid.rotateX(Math.PI / 2)

        this.scene.add(this.grid);
        this.scene.add(new THREE.AxesHelper( 1e2 ));


        const coneGeo = new THREE.ConeGeometry(5, 20, 32);
        coneGeo.rotateX( Math.PI / 2 );
        const baseMaterial = new THREE.MeshBasicMaterial({ color: 'red' });

        const coneMesh = new THREE.Mesh(coneGeo, baseMaterial);
        // coneMesh.position.set(50, 50, 50);

        const direction = new THREE.Vector3();
        coneMesh.getWorldDirection(direction);
        console.log('WorldDirection ==>', direction);

        const axesHelper = new THREE.AxesHelper(20);

        const group = new THREE.Group();

        group.add(axesHelper);

        group.add(coneMesh);

        group.position.set(50, 50, 50);

        this.coneMesh = group;

        this.scene.add(group);

        this.animate();
    }

    onWindowResize () {
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.render();
    }

    render () {
        if (this.renderer) {
            this.renderer.render( this.scene, this.camera );
        }
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

    animate() {

        requestAnimationFrame( this.animate.bind(this) );
        this.render();

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