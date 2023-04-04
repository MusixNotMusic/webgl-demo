<template>
    <div id="map"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import CappiFragment from '../shaderThree/cappi.frag'
import CappiVertex from '../shaderThree/cappi.vert'


const modelOrigin = [104, 30];
const centerOrigin =  [104, 30] || [0, 0];
const modelAltitude = 100;
const modelRotate = [0, 0, 0];

const parameters = { 
    colormap: 'Z',
    threshold: 0, 
    steps: 40, 
    verticalExaggeration: 5 
};

const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
);

// transformation parameters to position, rotate and scale the 3D model onto the map
const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    /* Since the 3D model is in real world meters, a scale transform needs to be
        * applied since the CustomLayerInterface expects units in MercatorCoordinates.
        */
    scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};


let renderer,
    scene,
    camera,
    material,
    mesh;
 
 let cmtextures = {}; 

    function init(map) {

        scene = new THREE.Scene();
        camera = new THREE.Camera()

        // Create renderer
        renderer = new THREE.WebGLRenderer({ alpha: true });

        if (map && renderer.domElement) {
            const mapCanvas = map.getCanvas();
            const width = mapCanvas.width;
            const height = mapCanvas.height;

            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize( width, height );

            renderer.domElement.style.width = mapCanvas.style.width;
            renderer.domElement.style.height = mapCanvas.style.height;
            renderer.domElement.style.position = "absolute";
            renderer.domElement.style.pointerEvents = "none";
            renderer.setDrawingBufferSize(width, height, 1);
            map.getCanvasContainer().appendChild(renderer.domElement);
        } else {
            renderer.setSize( canvas.innerWidth, canvas.innerHeight );
            document.body.appendChild( renderer.domElement );
        }

        // Lighting is baked into the shader a.t.m.
        let dirLight =  new THREE.AmbientLight( 0x0000ff );

        scene.add(dirLight)

        const colors = [
            { name: 'Z', path: '/color/Z.png' },
            { name: 'colors1', path: '/color/colors1.png' },
            { name: 'blue', path: '/color/blue.png'},
            { name: 'rainbow1', path: '/color/rainbow.png'},
            { name: 'rainbows', path: '/color/rainbows.png'},
            { name: 'extreme', path: '/color/extreme.png'},
            { name: 'horizon', path: '/color/horizon.png'},
            { name: 'skyline', path: '/color/skyline.png'},
            { name: 'smallrainbows', path: '/color/smallrainbows.png'},
            { name: 'plasma', path: '/color/plasma.png'},
            { name: 'natural', path: '/color/natural.png'},
            { name: 'viridis', path: '/resource/cm_viridis.png'},
            { name: 'gray', path: '/resource/cm_gray.png'},
            { name: 'rainbow', path: '/resource/rainbow.png'},
        ]

        // Colormap textures
        cmtextures = {};
        const colorNams = {}

        colors.forEach(color => {
            cmtextures[color.name] = new THREE.TextureLoader().load( color.path, render )
            colorNams[color.name] = color.name
        })

        // The gui for interaction
        const gui = new GUI();
      
        gui.add( parameters, 'colormap', colorNams ).onChange( update );
		gui.add( parameters, 'threshold', 0, 1, 0.01 ).onChange( update );
		gui.add( parameters, 'steps', 0, 300, 1 ).onChange( update );
		gui.add( parameters, 'verticalExaggeration', 1, 10, 1 );

        const loader = new THREE.FileLoader();

        loader.setResponseType('arraybuffer').load('/resource/rtdpz3d', 
            (data) => { 
                const dv = new DataView(data, 0, 32);
                const body = new DataView(data, 32);
                const minLongitude = dv.getUint32(0, true);
                const minLatitude = dv.getUint32(4, true);
                const maxLongitude = dv.getUint32(8, true);
                const maxLatitude = dv.getUint32(12, true);
                const widDataCnt = dv.getUint32(16, true);
                const heiDataCnt = dv.getUint32(20, true);
                const layerCnt = dv.getUint32(24, true);
                const cutHeight = dv.getFloat32(28, true);

                const volume = {
                    data: new Uint8Array(body.buffer.slice(32)),
                    xLength: widDataCnt,
                    yLength: heiDataCnt,
                    zLength: layerCnt,
                    minLongitude: minLongitude / 360000,
                    minLatitude: minLatitude / 360000,
                    maxLongitude: maxLongitude / 360000,
                    maxLatitude: maxLatitude / 360000
                };
                // console.log('result ==>', volume)

                initVolume(volume);
                // initNoiseVolume(volume);
            }, 
            (xhr) => { }, 
            (err) => { console.error( 'An error happened' ) }
        )

        // window.addEventListener( 'resize', onWindowResize );

    }

    const initVolume = (volume) => {
        // Texture to hold the volume. We have scalars, so we put our data in the red channel.
        // THREEJS will select R32F (33326) based on the THREE.RedFormat and THREE.FloatType.
        // Also see https://www.khronos.org/registry/webgl/specs/latest/2.0/#TEXTURE_TYPES_FORMATS_FROM_DOM_ELEMENTS_TABLE
        // TODO: look the dtype up in the volume metadata
        const texture = new THREE.Data3DTexture( volume.data, volume.xLength, volume.yLength, volume.zLength );
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        // Material
        const uniforms =  {
            map: { value: texture },
            cameraPosition: { value: new THREE.Vector3() },
            threshold: { value: parameters.threshold },
            steps:     { value: parameters.steps },
            colorMap:  { value: cmtextures[ parameters.colormap ] },
		}

        material = new THREE.RawShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: uniforms,
            vertexShader: CappiVertex,
            fragmentShader: CappiFragment,
            transparent: true,
            side: THREE.DoubleSide
        } );

        // THREE.Mesh
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );

        mesh = new THREE.Mesh( geometry, material );

        const axesMesh = new THREE.AxesHelper( 1e6 );

        scene.add(axesMesh);
        scene.add(mesh)

        const min = mapboxgl.MercatorCoordinate.fromLngLat([volume.minLongitude, volume.minLatitude], 500)
        const max =  mapboxgl.MercatorCoordinate.fromLngLat([volume.maxLongitude, volume.maxLatitude], 20000)

        const boundScaleBox = [  min.x, min.y, min.z, max.x, max.y, max.z ]

        scene.position.x = (boundScaleBox[0] + boundScaleBox[3]) / 2;
        scene.position.y = (boundScaleBox[1] + boundScaleBox[4]) / 2;
        scene.position.z = (boundScaleBox[2] + boundScaleBox[5]) / 2;

        scene.scale.x = (boundScaleBox[3] - boundScaleBox[0]);
        scene.scale.y = (boundScaleBox[4] - boundScaleBox[1]);
        scene.scale.z = (boundScaleBox[5] - boundScaleBox[2]);
        
        render();
    }

    function update() {
        material.uniforms.colorMap.value = cmtextures[ parameters.colormap ];
        material.uniforms.threshold.value = parameters.threshold;
        material.uniforms.steps.value = parameters.steps;
        render();
    }

    function render() {
        renderer.render( scene, camera );
    }


    // reuse canvas
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";


    // configuration of the custom layer for a 3D model per the CustomLayerInterface
    const customLayer = {
        id: '3d-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, gl) {
            this.camera = new THREE.Camera();
            this.scene = new THREE.Scene();

            // create two three.js lights to illuminate the model
            const directionalLight = new THREE.DirectionalLight(0xffffff);
            directionalLight.position.set(0, -70, 100).normalize();
            this.scene.add(directionalLight);

            const directionalLight2 = new THREE.DirectionalLight(0xffffff);
            directionalLight2.position.set(0, 70, 100).normalize();
            this.scene.add(directionalLight2);


            this.scene.add( new THREE.AxesHelper( 1e4 ) );
            const sphere = new THREE.SphereGeometry(1e3, 32, 16);
            const object = new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( 0xff0000 ) );
            const box = new THREE.BoxHelper( object, 0xffff00 );
            // this.scene.add( object );

            this.scene.add( box );


            window.mapIns = this.map = map;
            this.map.on("resize", this.onResize.bind(this));

            // use the Mapbox GL JS map canvas for three.js
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas || map.getCanvas(),
                antialias: true
            });


            init(map, gl)

            if (canvas) {
                map.getCanvasContainer().appendChild(this.renderer.domElement);
            }

            this.renderer.autoClear = false;

            this.onResize()
        },
        render: function (gl, matrix) {
            const rotationX = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(1, 0, 0),
                modelTransform.rotateX
            );
            const rotationY = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 1, 0),
                modelTransform.rotateY
            );
            const rotationZ = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 0, 1),
                modelTransform.rotateZ
            );

            const m = new THREE.Matrix4().fromArray(matrix);
            const l = new THREE.Matrix4()
                .makeTranslation(
                    modelTransform.translateX,
                    modelTransform.translateY,
                    modelTransform.translateZ
                )
                .scale(
                    new THREE.Vector3(
                        modelTransform.scale,
                        -modelTransform.scale,
                        modelTransform.scale
                    )
                )
                .multiply(rotationX)
                .multiply(rotationY)
                .multiply(rotationZ);

            m.multiply(l);

            this.camera.projectionMatrix = m;

            // const translateScaleMatrix = new THREE.Matrix4().scale(new THREE.Vector3(1, 1, Number(parameters.verticalExaggeration)));

            // const projectionMatrix = new THREE.Matrix4().fromArray(matrix);

            // camera.projectionMatrix = projectionMatrix.multiply(translateScaleMatrix)
            camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix)

            if (mapIns && mesh && mesh.material ) {
                mesh.scale.z = Number(parameters.verticalExaggeration)

                const camera = mapIns.getFreeCameraOptions();

                const cameraPosition = camera._position

                mesh.material.uniforms.cameraPosition.value.copy( { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z } );
            }

            if (renderer) {
                renderer.resetState();
                renderer.render(scene, camera);
            }

            if (this.renderer) {
                this.renderer.resetState();
                this.renderer.render(this.scene, this.camera);
            }
            if (this.map) {
                this.map.triggerRepaint();
            }
        },

        onRemove() {
            if (this.map) {
                this.map = null;
            }
        },

        onResize() {
            if (this.map && this.renderer) {
                const mapCanvas = this.map.getCanvas();
                const width = mapCanvas.width;
                const height = mapCanvas.height;
                if (canvas) {
                    this.renderer.domElement.style.width = mapCanvas.style.width;
                    this.renderer.domElement.style.height = mapCanvas.style.height;
                    this.renderer.setDrawingBufferSize(width, height, 1);
                } else {
                    this.renderer.setViewport(0, 0, width, height);
                }
            }
        }
    };


    mapboxgl.accessToken = 'pk.eyJ1IjoibXVzaXgiLCJhIjoiY2xiYWZybGowMGFlYTN2bzFtaWRrcmR5OCJ9.Qvl9IQUEuWq2eD3GvkJ5AQ';

    const initMapbox = () => {
        const map = new mapboxgl.Map({
            container: 'map',
            // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
            style: 'mapbox://styles/mapbox/streets-v12',
            zoom: 5,
            center: centerOrigin,
            pitch: 45,
            projection: 'mercator',
            // projection: 'globe',
            useWebGL2: true,
            antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
        });

        map.on('style.load', () => {
            map.addLayer(customLayer, 'waterway-label');
        });
    }

    onMounted(() => {
        initMapbox()
    })
    
</script>

<style scoped>
body {
    margin: 0; padding: 0; 
}

#map {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%; 
}
</style>
  