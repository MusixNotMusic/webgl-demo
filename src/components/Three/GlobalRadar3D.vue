<template>
    <div id="map"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import fragmentShader from '../shaderThree/global.frag'
import vertexShader from '../shaderThree/demo.vert'

const centerOrigin =  [104, 30] || [0, 0];

const parameters = {
    colormap: 'Z',
    threshold0: 0,
    threshold: 1, 
    depthSampleCount: 128,
    brightness: 1.0,
};


let renderer,
    scene,
    camera,
    material,
    mesh,
    uniforms;
 
 let cmtextures = {}; 

 function initGui () {
    const gui = new GUI();
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
    

    gui.add( parameters, 'colormap', colorNams ).onChange( updateUniforms );

    gui.add( parameters, 'threshold', 0, 1, 0.01 ).onChange( updateUniforms );
    gui.add( parameters, 'threshold0', 0, 1, 0.01 ).onChange( updateUniforms );
    gui.add( parameters, 'depthSampleCount', 0, 1024, 1 ).onChange( updateUniforms );
    gui.add( parameters, 'brightness', 0, 7, 0.1 ).onChange( updateUniforms );
}

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

    initGui()

    const loader = new THREE.FileLoader();

    loader.setResponseType('arraybuffer').load('/resource/data1', 
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
            console.log('result ==>', volume)

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
        uniforms = { 
            tex:              { value: texture },
            colorMap:         { value: cmtextures[ parameters.colormap ] },
            depthSampleCount: { value: parameters.depthSampleCount },
            threshold0:       { value: parameters.threshold0 },
            threshold:        { value: parameters.threshold },
            brightness:       { value: 1.0 },
            cameraPosition:   { value: new THREE.Vector3() }
        }


        material = new THREE.RawShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        } );

        // THREE.Mesh
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );

        mesh = new THREE.Mesh( geometry, material );

        mesh.rotation.z = -Math.PI / 2;

        // const axesMesh = new THREE.AxesHelper( 1e6 );

        // scene.add(axesMesh);

        scene.add(mesh)

        const min = mapboxgl.MercatorCoordinate.fromLngLat([volume.minLongitude, volume.minLatitude], 0)
        const max =  mapboxgl.MercatorCoordinate.fromLngLat([volume.maxLongitude, volume.maxLatitude], 50000)

        const boundScaleBox = [  min.x, min.y, min.z, max.x, max.y, max.z ]

        scene.position.x = (boundScaleBox[0] + boundScaleBox[3]) / 2;
        scene.position.y = (boundScaleBox[1] + boundScaleBox[4]) / 2;
        scene.position.z = (boundScaleBox[2] + boundScaleBox[5]) / 2;

        scene.scale.x = (boundScaleBox[3] - boundScaleBox[0]);
        scene.scale.y = (boundScaleBox[4] - boundScaleBox[1]);
        scene.scale.z = (boundScaleBox[5] - boundScaleBox[2]);
        
        render();
    }

    function updateUniforms() {

        material.uniforms[ 'colorMap' ].value = cmtextures[ parameters.colormap ];
        material.uniforms.threshold.value = parameters.threshold;
        material.uniforms.threshold0.value = parameters.threshold0;
        material.uniforms.depthSampleCount.value = parameters.depthSampleCount;
        material.uniforms.brightness.value = parameters.brightness;
        render();

    }

    function render() {
        renderer.render( scene, camera );
    }

    function clearScene() {
        if (scene && scene.children.length > 0) {
            scene.children.forEach(mesh => {
                if (mesh) {
                    if (mesh.material && mesh.material.uniforms) {
                        if (mesh.material.uniforms.tex.value) {
                            mesh.material.uniforms.tex.value.dispose();
                            mesh.material.uniforms.tex.value.source.data = null;
                            mesh.material.uniforms.tex.value.source = null;
                        }
                        mesh.material.uniforms.tex.value = null;
                    }

                    if (mesh.material) {
                        mesh.material.dispose();
                    }

                    if (mesh.geometry) {
                        mesh.geometry.dispose();
                    }
                    mesh = null;
                }
            })
            scene.children = [];
        }

    }



    // configuration of the custom layer for a 3D model per the CustomLayerInterface
    const customLayer = {
        id: '3d-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, gl) {

            window.mapIns = this.map = map;
            init(map, gl)
        },
        render: function (gl, matrix) {
            camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix)

            if (mapIns && mesh && mesh.material ) {
                const camera = mapIns.getFreeCameraOptions();

                const cameraPosition = camera._position

                mesh.material.uniforms.cameraPosition.value.copy( { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z } );
            }

            if (renderer) {
                renderer.resetState();
                renderer.render(scene, camera);
            }

            if (this.map) {
                this.map.triggerRepaint();
            }
        },

        onRemove() {
            clearScene();

            if (renderer) {
                renderer.domElement.remove();
                renderer.dispose();
            }

            if (this.map) {
                this.map = null;
            }
        }

    };


    mapboxgl.accessToken = 'pk.eyJ1IjoibXVzaXgiLCJhIjoiY2xocjRvM2VsMGFkdzNqc2l3NHhxM285eCJ9.9TK1C4mjpPMG5wNx8m1KmA';
    let map;
    const initMapbox = () => {
        map = new mapboxgl.Map({
            container: 'map',
            // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
            // style: 'mapbox://styles/mapbox/dark-v11',
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

    onUnmounted(() => {
        map.removeLayer('3d-model');
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
  