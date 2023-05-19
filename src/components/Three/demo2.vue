<template>
    <div id="map"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import FragmentShader from '../shaderThree/iso.frag'
import VertexShader from '../shaderThree/iso.vert'
import { accessToken } from './token'

const centerOrigin =  [104, 30] || [0, 0];

const parameters = { 
    colorMap: 'Z',
    clim1: 0, 
    clim2: 1, 
    renderstyle: 'iso', 
    isothreshold: 0.15
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
      

        gui.add( parameters, 'clim1', 0, 1, 0.01 ).onChange( update );
        gui.add( parameters, 'clim2', 0, 1, 0.01 ).onChange( update );
        gui.add( parameters, 'colorMap', colorNams ).onChange( update );
        gui.add( parameters, 'renderstyle', { mip: 'mip', iso: 'iso' } ).onChange( update );
        gui.add( parameters, 'isothreshold', 0, 1, 0.01 ).onChange( update );
        

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
            u_size: { value: [ volume.xLength, volume.yLength,  volume.zLength ] },
            u_clim: { value: [ parameters.clim1, parameters.clim2 ] },
            u_renderstyle: { value: parameters.renderstyle == 'mip' ? 0 : 1 },
            u_renderthreshold:     { value: parameters.isothreshold },
            colorMap:  { value: cmtextures[ parameters.colorMap ] },
            cameraPosition: { value: new THREE.Vector3() }
		}

        material = new THREE.RawShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: uniforms,
            vertexShader: VertexShader,
            fragmentShader: FragmentShader,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            side: THREE.DoubleSide
        } );

        // material = new THREE.MeshBasicMaterial( {
        //     color: 'red',
        //     transparent: true,
        //     side: THREE.DoubleSide
        // } );

        // THREE.Mesh
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );

        mesh = new THREE.Mesh( geometry, material );

        // mesh.material.wireframe = true
        window.mesh = mesh

        const axesMesh = new THREE.AxesHelper( 1e3 );

        scene.add(axesMesh);
        scene.add(mesh)

        const min = mapboxgl.MercatorCoordinate.fromLngLat([volume.minLongitude, volume.minLatitude], 1e4)
        const max =  mapboxgl.MercatorCoordinate.fromLngLat([volume.maxLongitude, volume.maxLatitude], 1e4)

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

        material.uniforms[ 'u_clim' ].value = [ parameters.clim1, parameters.clim2 ];
        material.uniforms[ 'u_renderstyle' ].value = parameters.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
        material.uniforms[ 'u_renderthreshold' ].value = parameters.isothreshold; // For ISO renderstyle
        material.uniforms.colorMap.value = cmtextures[ parameters.colorMap ];

        render();
    }

    function render() {
        renderer.render( scene, camera );
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

            // const translateScaleMatrix = new THREE.Matrix4().scale(new THREE.Vector3(1, 1, Number(parameters.verticalExaggeration)));

            // const projectionMatrix = new THREE.Matrix4().fromArray(matrix);

            // camera.projectionMatrix = projectionMatrix.multiply(translateScaleMatrix)
            camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix)

            // if (mapIns && mesh && mesh.material ) {

            //     if( ! mesh.geometry.boundingBox ) mesh.geometry.computeBoundingBox();
            //     var height = mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y;
            //     //height is here the native height of the geometry
            //     //that does not change with scaling. 
            //     //So we need to multiply with scale again
            //     mesh.scale.z = Number(parameters.verticalExaggeration)
            //     mesh.position.z = height *  mesh.scale.z / 2 ;

            //     const camera = mapIns.getFreeCameraOptions();

            //     const cameraPosition = camera._position

            //     // if (mesh.material.uniforms)
            //         mesh.material.uniforms.cameraPosition.value.copy( { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z } );
            // }

            if (renderer) {
                renderer.resetState();
                renderer.render(scene, camera);
            }

            if (this.map) {
                this.map.triggerRepaint();
            }
        },

        onRemove() {
            if (this.map) {
                this.map = null;
            }
        }

    };


    mapboxgl.accessToken = accessToken;

    const initMapbox = () => {
        const map = new mapboxgl.Map({
            container: 'map',
            // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
            style: 'mapbox://styles/mapbox/streets-v12',
            zoom: 5,
            center: centerOrigin,
            pitch: 45,
            projection: 'mercator',
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
  