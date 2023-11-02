import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { colorMap  } from './colorMap';

import { getWindSpeedColorByValue } from './Constants'

export default class InstancePerformance {
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

        this.Method = {
            INSTANCED: 'INSTANCED',
			MERGED: 'MERGED',
			NAIVE: 'NAIVE'
        };

        this.api = {
            method: this.Method.INSTANCED,
            count: 1000,
            min: 0.5,
            max: 50
        };

        this.boxMatrixFunc = boxMatrix(dataInstance);

        this.onWindowResizeBind = this.onWindowResize.bind(this);
        this.initMeshBind = this.initMesh.bind(this);
        this.animateBind = this.animate.bind(this);

        this.init();
        this.addLight();
		this.initMesh();
		this.animate();

        window.InstancePerformance = this;
    }

    
        
    init() {
        // const { container, camera, renderer, scene, } = this;
        const width = this.container.innerWidth || this.container.clientWidth;
        const height = this.container.innerHeight || this.container.clientHeight;

        // camera

        this.camera = new THREE.PerspectiveCamera( 70, width / height, 1, 1000 );
        this.camera.position.z = 30;

        // renderer

        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( width, height );
        // this.container = document.getElementById( 'container' );
        this.container.appendChild( this.renderer.domElement );

        // scene

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xffffff );

        // controls

        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        // this.controls.autoRotate = true;

        // stats

        this.stats = new Stats();
        this.container.appendChild( this.stats.dom );

        // gui

        this.gui = new GUI();
        this.gui.add( this.api, 'method', this.Method ).onChange( this.initMeshBind );
        this.gui.add( this.api, 'count', 1, 300000 ).step( 1 ).onChange( this.initMeshBind );
        this.gui.add( this.api, 'min', 0, 50 ).step( 0.5 ).onChange( this.initMeshBind );
        this.gui.add( this.api, 'max', 0, 50 ).step( 0.5 ).onChange( this.initMeshBind );

        const perfFolder = this.gui.addFolder( 'Performance' );

        this.guiStatsEl = document.createElement( 'div' );
        this.guiStatsEl.classList.add( 'gui-stats' );

        perfFolder.$children.appendChild( this.guiStatsEl );
        perfFolder.open();

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

    getArrowGeometry () {
        const radialSegments  = 16;
        const scale = 1;
        const coneRadius = 0.1 * scale;
        const coneHeight = 0.3 * scale;
        const cylinderRaduis = 0.025 * scale;
        const cylinderHeight = 0.7 * scale;

        const coneGeometry = new THREE.ConeGeometry( coneRadius, coneHeight, radialSegments );
        const cylinderGeometry = new THREE.CylinderGeometry( cylinderRaduis, cylinderRaduis, cylinderHeight, radialSegments );
        cylinderGeometry.translate(0, -cylinderHeight / 2, 0);
        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries( [coneGeometry, cylinderGeometry] );

        return mergedGeometry;
    }

    initMesh() {
        const { api, Method } = this;

        this.clean();

        // make instances

        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // this.material = new THREE.MeshNormalMaterial();
        // geometry.computeVertexNormals();
        const geometry = this.getArrowGeometry();


        this.scene.add(new THREE.AxesHelper(1000));

        console.time( api.method + ' (build)' );

        switch ( api.method ) {

            case Method.INSTANCED:
                // this.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true });

                this.material = new THREE.MeshPhongMaterial({
                    transparent: true,
                    opacity: 0.85,
                    depthTest: true,
                    depthWrite: true,
                    alphaTest: 0,
                    side: THREE.DoubleSide,
              
                    // color: this.colorList[this.parameters.isoValue | 0],
                    emissive: 0x000000,
                    specular: 0x111111,
                    shininess: 100,
                    combine: THREE.MultiplyOperation,
                    reflectivity: 1,
                    refractionRatio: 0.5
                  })
                this.makeInstanced( geometry );
                break;

            case Method.MERGED:
                this.material = new THREE.MeshNormalMaterial();
                this.makeMerged( geometry );
                break;

            case Method.NAIVE:
                this.material = new THREE.MeshNormalMaterial();
                this.makeNaive( geometry );
                break;

        }

        console.timeEnd( api.method + ' (build)' );
    }

    makeInstanced( geometry ) {
        const { guiStatsEl, scene, material, api } = this;

        const { widthSize, heightSize, depthSize } = this.dataInstance.header;
        const size = widthSize * heightSize * depthSize;

        const matrix = new THREE.Matrix4();
        const mesh = new THREE.InstancedMesh( geometry, material, size );

        const lengths = [];

        for ( let i = 0; i < size; i ++ ) {

            // randomizeMatrix( matrix );
            // gridMatrix(matrix, i, this.dataInstance);
            const speed = new THREE.Vector2(this.dataInstance.U[i], this.dataInstance.V[i]).length();

            if (speed > api.min  &&  speed <= api.max) {
                const vec3 = new THREE.Vector3(this.dataInstance.U[i], this.dataInstance.V[i], this.dataInstance.W[i]);
                

                lengths.push(speed)

                this.boxMatrixFunc(matrix, i, vec3, speed);

                mesh.setMatrixAt( i, matrix );

                // mesh.setColorAt(i, new THREE.Color( Math.random() * 0xffffff | 0));
                // mesh.setColorAt(i, new THREE.Color( getWindSpeedColorByValue(speed)));
                mesh.setColorAt(i, new THREE.Color( colorMap[speed * 3|0]));
            }
        }

        scene.add( mesh );

        console.log('lengths =>', lengths)

        //

        const geometryByteLength = this.getGeometryByteLength( geometry );

        guiStatsEl.innerHTML = [

            '<i>GPU draw calls</i>: 1',
            '<i>GPU memory</i>: ' + this.formatBytes( api.count * 16 + geometryByteLength, 2 )

        ].join( '<br/>' );

    }

    makeMerged( geometry ) {
        const { guiStatsEl, scene, material, api } = this;

        const geometries = [];
        const matrix = new THREE.Matrix4();

        for ( let i = 0; i < api.count; i ++ ) {

            // randomizeMatrix( matrix );
            gridMatrix(matrix, i, api.count);

            const instanceGeometry = geometry.clone();
            instanceGeometry.applyMatrix4( matrix );

            geometries.push( instanceGeometry );

        }

        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries( geometries );

        scene.add( new THREE.Mesh( mergedGeometry, material ) );

        //

        guiStatsEl.innerHTML = [

            '<i>GPU draw calls</i>: 1',
            '<i>GPU memory</i>: ' + this.formatBytes( this.getGeometryByteLength( mergedGeometry ), 2 )

        ].join( '<br/>' );

    }

    makeNaive( geometry ) {
        const { guiStatsEl, scene, material, api } = this;

        const matrix = new THREE.Matrix4();

        for ( let i = 0; i < api.count; i ++ ) {

            // randomizeMatrix( matrix );
            gridMatrix(matrix, i, api.count);

            const mesh = new THREE.Mesh( geometry, material );
            mesh.applyMatrix4( matrix );

            scene.add( mesh );

        }

        //

        const geometryByteLength = this.getGeometryByteLength( geometry );

        guiStatsEl.innerHTML = [

            '<i>GPU draw calls</i>: ' + api.count,
            '<i>GPU memory</i>: ' + this.formatBytes( api.count * 16 + geometryByteLength, 2 )

        ].join( '<br/>' );

    }

    onWindowResize() {
        console.log('onWindowResize ==>', this);
        const { container, camera, renderer } = this;

        const width = container.innerWidth || container.clientWidth;;
        const height = container.innerHeight || container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize( width, height );

    }

    animate() {

        requestAnimationFrame( this.animateBind );

        this.controls.update();
        this.stats.update();

        this.render();

    }

    render() {

        this.renderer.render( this.scene, this.camera );

    }

    getGeometryByteLength( geometry ) {

        let total = 0;

        if ( geometry.index ) total += geometry.index.array.byteLength;

        for ( const name in geometry.attributes ) {

            total += geometry.attributes[ name ].array.byteLength;

        }

        return total;

    }

    formatBytes( bytes, decimals ) {

        if ( bytes === 0 ) return '0 bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = [ 'bytes', 'KB', 'MB' ];

        const i = Math.floor( Math.log( bytes ) / Math.log( k ) );

        return parseFloat( ( bytes / Math.pow( k, i ) ).toFixed( dm ) ) + ' ' + sizes[ i ];

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

        // this.stats = null;
        // this.gui = null;
        // this.guiStatsEl = null;
        // this.controls = null;

        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.material = null;

        this.onWindowResizeBind = null;
        this.initMeshBind = null;
    }
}


const randomizeMatrix = function () {

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    return function ( matrix ) {

        position.x = Math.random() * 40 - 20;
        position.y = Math.random() * 40 - 20;
        position.z = Math.random() * 40 - 20;

        quaternion.random();

        scale.x = scale.y = scale.z = Math.random() * 1;

        matrix.compose( position, quaternion, scale );

    };

}();

const boxMatrix = function (data) {

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const { widthSize, heightSize, depthSize } = data.header;
    const planeSize = widthSize * heightSize;
    const origin = new THREE.Vector3(0, 1, 0);

    return function ( matrix, i, vec3, _scale) {

        const z = (i / planeSize) | 0;
        const y = ((i % planeSize) / heightSize) | 0;
        const x = i % (planeSize) % heightSize;

        position.x = x;
        position.y = y;
        position.z = z;

        // quaternion.random();
        quaternion.setFromUnitVectors(origin, vec3);

        scale.x = scale.z = 1;
        scale.y = _scale / 5;
        // scale.y = _scale / 128;

        matrix.compose( position, quaternion, scale );

    };

};


const gridMatrix = function () {

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    return function ( matrix, i, total ) {

        const grid = Math.ceil(total **  (1/3));

        const z = (i / grid / grid) | 0;
        const y = ((i % (grid * grid)) / grid) | 0;
        const x = i % (grid * grid) % grid;

        position.x = x;
        position.y = y;
        position.z = z;

        quaternion.random();

        scale.x = scale.y = scale.z = 1;

        matrix.compose( position, quaternion, scale );

    };

}();