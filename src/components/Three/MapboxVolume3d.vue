<template>
    <div id="map"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { mat4 } from 'gl-matrix'
import { CameraSync } from '../../lib/mapbox/CameraSync';
import { VolumeRenderShader1 } from './VolumeShader';

import * as turf from '@turf/turf'

const modelOrigin = [148.9819, -35.39847];
const centerOrigin = [0, 0];
const modelAltitude = 0;
const modelRotate = [Math.PI / 2, 0, 0];

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
    controls,
    material,
    mesh,
    world,
    volconfig,
    cmtextures;

    var pt = turf.point(modelOrigin);
    var converted = turf.toMercator(pt);

    console.log('modelAsMercatorCoordinate ==>', modelAsMercatorCoordinate)
    console.log('converted ==>', converted.geometry.coordinates)


    function init(map, glContext) {

        scene = new THREE.Scene();
        // camera = new THREE.Camera()
        camera = new THREE.OrthographicCamera

        // Create renderer
        renderer = new THREE.WebGLRenderer({ alpha: true });
        // renderer.setPixelRatio( window.devicePixelRatio );
        // renderer.setSize( window.innerWidth, window.innerHeight );

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

        world = new THREE.Group();
        world.name = "world";

        const axes = new THREE.AxesHelper( 1e6 )

        world.add( axes );

        window.worldGroup = world

        scene.add(world)

        // Lighting is baked into the shader a.t.m.
        let dirLight =  new THREE.AmbientLight( 0xffffff );

        scene.add(dirLight)

        // The gui for interaction
        volconfig = { clim1: 0, clim2: 1, renderstyle: 'iso', isothreshold: 0.15, colormap: 'rainbow' };
        const gui = new GUI();
        gui.add( volconfig, 'clim1', 0, 1, 0.01 ).onChange( updateUniforms );
        gui.add( volconfig, 'clim2', 0, 1, 0.01 ).onChange( updateUniforms );
        gui.add( volconfig, 'colormap', { gray: 'gray', viridis: 'viridis', rainbow: 'rainbow' } ).onChange( updateUniforms );
        gui.add( volconfig, 'renderstyle', { mip: 'mip', iso: 'iso' } ).onChange( updateUniforms );
        gui.add( volconfig, 'isothreshold', 0, 1, 0.01 ).onChange( updateUniforms );



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
                console.log('result ==>', volume)

                initVolume(volume);
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
        // texture.type = THREE.FloatType;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        // Colormap textures
        cmtextures = {
            viridis: new THREE.TextureLoader().load( '/resource/cm_viridis.png', render ),
            gray: new THREE.TextureLoader().load( '/resource/cm_gray.png', render ),
            rainbow: new THREE.TextureLoader().load( '/resource/rainbow.png', render )
        };

        console.log('cmtextures ==>', cmtextures)

        // Material
        const shader = VolumeRenderShader1;

        const uniforms = THREE.UniformsUtils.clone( shader.uniforms );

        uniforms[ 'u_data' ].value = texture;
        uniforms[ 'u_size' ].value.set( volume.xLength, volume.yLength, volume.zLength );
        uniforms[ 'u_clim' ].value.set( volconfig.clim1, volconfig.clim2 );
        uniforms[ 'u_renderstyle' ].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
        uniforms[ 'u_renderthreshold' ].value = volconfig.isothreshold; // For ISO renderstyle
        uniforms[ 'u_cmdata' ].value = cmtextures[ volconfig.colormap ];

        console.log('uniforms ==>', uniforms)

        material = new THREE.ShaderMaterial( {
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            // side: THREE.BackSide, // The volume shader uses the backface as its "reference point"
            transparent: true,
            side: 2
        } );

        // THREE.Mesh
        const geometry = new THREE.BoxGeometry( volume.xLength, volume.yLength, volume.zLength );
        geometry.translate( volume.xLength / 2, volume.yLength / 2, volume.zLength / 2 );
        // geometry.translate( volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5 );

        mesh = new THREE.Mesh( geometry, material );

        var from = turf.point([volume.maxLongitude, volume.minLatitude]);
        var to = turf.point([volume.minLongitude, volume.minLatitude]);
        var from1 = turf.point([volume.minLongitude, volume.minLatitude]);
        var to1 = turf.point([volume.minLongitude, volume.maxLatitude]);
        var options = {units: 'kilometers'};
        var distance = turf.distance(from, to, options);
        var distance1 = turf.distance(from1, to1, options);

        const xScale = distance / volume.xLength
        const yScale = distance1 / volume.xLength
        mesh.scale.set(xScale, yScale, 1)
        mesh.position.x -= distance * xScale / 2
        mesh.position.y -= distance1 * yScale / 2
        world.add( mesh );

        render();
    }

    function updateUniforms() {

        material.uniforms[ 'u_clim' ].value.set( volconfig.clim1, volconfig.clim2 );
        material.uniforms[ 'u_renderstyle' ].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
        material.uniforms[ 'u_renderthreshold' ].value = volconfig.isothreshold; // For ISO renderstyle
        material.uniforms[ 'u_cmdata' ].value = cmtextures[ volconfig.colormap ];

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

    // sync camera
    let cameraSync;

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
            this.scene.add( object );

            this.scene.add( box );


            window.mapIns = this.map = map;
            this.map.on("resize", this.onResize.bind(this));

            // use the Mapbox GL JS map canvas for three.js
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas || map.getCanvas(),
                // context: gl,
                antialias: true
            });


            init(map, gl)

            cameraSync = new CameraSync(map, camera, world)

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

            this.camera.projectionMatrix = m.multiply(l);


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
            zoom: 6,
            center: centerOrigin,
            pitch: 0,
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
  