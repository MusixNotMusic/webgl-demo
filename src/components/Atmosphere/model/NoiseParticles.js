import * as THREE from 'three';
import Noise from './lib/noise'

import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { colorMap  } from './colorMap';

import { getWindSpeedColorByValue } from './Constants'


const computeNoise = (x, y, z) => {
    var noise = new Noise(Math.random());
    // var noise = new Simplex();

    var eps = 1.0;
    var n1, n2, a, b;
    var curl = new THREE.Vector3();

    n1 = noise.perlin3(x, y + eps, z);
    n2 = noise.perlin3(x, y - eps, z);

    a = (n1 - n2) / (2 * eps);

    n1 = noise.perlin3(x, y, z + eps);
    n2 = noise.perlin3(x, y, z - eps);

    b = (n1 - n2) / (2 * eps);

    curl.x = a - b;

    n1 = noise.perlin3(x, y, z + eps);
    n2 = noise.perlin3(x, y, z - eps);

    a = (n1 - n2)/(2 * eps);

    n1 = noise.perlin3(x + eps, y, z);
    n2 = noise.perlin3(x + eps, y, z);

    b = (n1 - n2)/(2 * eps);

    curl.y = a - b;

    n1 = noise.perlin3(x + eps, y, z);
    n2 = noise.perlin3(x - eps, y, z);

    a = (n1 - n2)/(2 * eps);

    n1 = noise.perlin3(x, y + eps, z);
    n2 = noise.perlin3(x, y - eps, z);

    b = (n1 - n2)/(2 * eps);

    curl.z = a - b;

    return curl;
}

class FlowField {
    constructor(size) {
        this.field = [];
        this.size  = size;
        this.init();
    }

    init() {
        const size = this.size;

        for (var x = 0; x < size; ++x) {
            this.field[x] = [];
        
            for (var y = 0; y < size; ++y) {
                this.field[x][y] = [];
        
                for (var z = 0; z < size; ++z) {
                    var mod = 0.07;
            
                    this.field[x][y][z] = computeNoise(x * mod, y * mod, z * mod);
                }
            }
        }
    }

    sample (x, y, z) {

        x = Math.round(x) + this.size / 2;
        y = Math.round(y) + this.size / 2;
        z = Math.round(z) + this.size / 2;
      
        return (this.field[x] && this.field[x][y] && this.field[x][y][z]) ? this.field[x][y][z] : undefined;
    }
} 

class Particles{
    constructor(num, size, flowField, instance) {
        this.flowField = flowField;
        var geometry = new THREE.BufferGeometry();

        // this.velocities = new Float32Array(size.x * size.y * size.z * 3);
        // this.vertices = new Float32Array(size.x * size.y * size.z * 3);
        // this.colors = new Float32Array(size.x * size.y * size.z * 3);

        // const zSize = size.x * size.y

        // for(let z = 0; z < size.z; z++) {
        //     for(let y = 0; y < size.y; y++) {
        //         for(let x = 0; x < size.x; x++) {
        //             let offset = zSize * z + y * x;
        //             this.vertices[offset * 3 + 0] = x;
        //             this.vertices[offset * 3 + 1] = y;
        //             this.vertices[offset * 3 + 2] = z;

        //             this.velocities[offset * 3 + 0] = instance.U[offset];
        //             this.velocities[offset * 3 + 1] = instance.V[offset];
        //             this.velocities[offset * 3 + 2] = instance.W[offset];

        //             this.colors[offset * 3 + 0] = instance.U[offset] / 255;
        //             this.colors[offset * 3 + 1] = instance.V[offset] / 255;
        //             this.colors[offset * 3 + 2] = instance.W[offset] / 255;
        //         }  
        //     }  
        // }

        this.velocities = new Float32Array(num * 3);
        this.vertices = new Float32Array(num * 3);
      
        for (var i = 0; i < num; ++i) {

          this.vertices[i * 3 + 0] = (Math.random() - 0.5);
          this.vertices[i * 3 + 1] = (Math.random() - 0.5);
          this.vertices[i * 3 + 2] = (Math.random() - 0.5);

          this.velocities[i * 3 + 0] = (Math.random() - 0.5);
          this.velocities[i * 3 + 1] = (Math.random() - 0.5);
          this.velocities[i * 3 + 2] = (Math.random() - 0.5);
        }

        // console.log(this.vertices);
        geometry.setAttribute( 'position', new THREE.BufferAttribute( this.vertices, 3 ) );
        // geometry.setAttribute( 'color', new THREE.BufferAttribute( this.colors, 3 ) );
      
        var material = new THREE.PointsMaterial({
          size: 0.25,
          color: 0x000
        });
      
        this.points = new THREE.Points(geometry, material);
    }

    update (time) {
        let num = this.velocities.length / 3;
        for (var i = 0; i < num; ++i) {
          var vx = this.vertices[i * 3 + 0];
          var vy = this.vertices[i * 3 + 1];
          var vz = this.vertices[i * 3 + 2];

          var vex = this.velocities[i * 3 + 0];
          var vey = this.velocities[i * 3 + 1];
          var vez = this.velocities[i * 3 + 2];

          let vertex = new THREE.Vector3(vx, vy, vz);
          let velocity = new THREE.Vector3(vex, vey, vez);
          
          var flow = this.flowField.sample(vx, vy, vz);
          let R = 40;
          if (flow) {
            var steer = flow.clone().sub(velocity);
            
            // if (vertex.length() < R) {
            //     velocity.add(steer.multiplyScalar(0.02));
            //     vertex.add(velocity.multiplyScalar(1.0));
            // } 

            if (Math.abs(vertex.length() - R * 0.5) < 0.02) {
                vertex.applyAxisAngle(new THREE.Vector3(0, 1, -1), time * Math.PI / 3.0)
            } else if (Math.abs(vertex.length() - R * 0.75) < 0.01) {
                vertex.applyAxisAngle(new THREE.Vector3(1, 1, 0), time * Math.PI / 5.0)
            } else if (vertex.length() < R){
                velocity.add(steer.multiplyScalar(0.02));
                vertex.add(velocity.multiplyScalar(1.0));
            }

            if (Math.abs(vertex.length() - R) < 1.0) {
                vertex.applyAxisAngle(new THREE.Vector3(0, 0, 1), time * Math.PI / 10.0)
            }
          }
          else {
            vertex.set(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5
            );
      
            velocity.set(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5
            );
          }

          this.vertices[i * 3 + 0] = vertex.x;
          this.vertices[i * 3 + 1] = vertex.y;
          this.vertices[i * 3 + 2] = vertex.z;

          this.velocities[i * 3 + 0] = velocity.x;
          this.velocities[i * 3 + 1] = velocity.y;
          this.velocities[i * 3 + 2] = velocity.z;
        }
        // this.points.geometry.setAttribute('position', this.vertices);
        // debugger
        this.points.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.vertices, 3 ) );
      }
}

export default class NoiseParticles {
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

        this.api = {
            count: 1000,
            min: 0.5,
            max: 50
        };


        this.onWindowResizeBind = this.onWindowResize.bind(this);
        this.initMeshBind = this.initMesh.bind(this);
        this.animateBind = this.animate.bind(this);

        this.clock = new THREE.Clock();

        this.init();
		this.initMesh();
		this.animate();

    }
        
    init() {
        // const { container, camera, renderer, scene, } = this;
        const width = this.container.innerWidth || this.container.clientWidth;
        const height = this.container.innerHeight || this.container.clientHeight;

        // camera

        this.camera = new THREE.PerspectiveCamera( 70, width / height, 1, 10000 );
        this.camera.position.z = 100;
        this.camera.position.y = 100;

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
        this.gui.add( this.api, 'count', 1, 300000 ).step( 1 ).onChange( this.initMeshBind );
        this.gui.add( this.api, 'min', 0, 50 ).step( 0.5 ).onChange( this.initMeshBind );
        this.gui.add( this.api, 'max', 0, 50 ).step( 0.5 ).onChange( this.initMeshBind );

        this.guiStatsEl = document.createElement( 'div' );
        this.guiStatsEl.classList.add( 'gui-stats' );

        const perfFolder = this.gui.addFolder( 'Performance' );

        perfFolder.$children.appendChild( this.guiStatsEl );
        perfFolder.open();

        // listeners

        window.addEventListener( 'resize', this.onWindowResizeBind );

    }

    initMesh() {
        const { widthSize, heightSize, depthSize } = this.dataInstance.header;
        const size = new THREE.Vector3(widthSize / 4 | 0, heightSize / 2 | 0, depthSize);
        const flowField = new FlowField(100);
        const particles = new Particles(30000, size, flowField, this.dataInstance);
        this.particles = particles;
        this.scene.add(particles.points);
        this.scene.add(new THREE.AxesHelper(1000));
        this.scene.add(new THREE.GridHelper(1000, 50));
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

       
        if (this.particles) this.particles.update(this.clock.getDelta());

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
        this.material = null;

        this.onWindowResizeBind = null;
        this.initMeshBind = null;
    }
}




