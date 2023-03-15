<template>
</template>

<script setup>
import { onMounted } from 'vue'
import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// import vertexShader from '../shader/vertex.vert';
// import vertexShader from '../shaderThree/vertex2.vert';
// import fragmentShader  from '../shaderThree/maxValue.frag';

import vertexShader from '../shaderThree/vertex1.vert';
import fragmentShader  from '../shaderThree/demo.frag';

let renderer,
    scene,
    camera,
    controls,
    material,
    mesh,
    volconfig,
    cmtextures,
    normals,
    uniforms,
    aspect;


    function calculateNormals(textureData, width, height, depth){

        normals = new Uint8ClampedArray(textureData.length*3);

        var xn = 0;
        var yn = 0;
        var zn = 0;

        for(var i = 0; i < textureData.length; i++){

            xn = textureData[i-1] - textureData[i+1];
            if(!isNaN(xn)){
                normals[i*3  ] = xn + 128;
            } else {
                normals[i*3  ] = 128;
            }

            yn = textureData[i-width] - textureData[i+width];
            if(!isNaN(yn)){
                normals[i*3+1] = yn + 128;
            } else {
                normals[i*3+1] = 128;
            }

            zn = textureData[i-(width*height)] - textureData[i+(width*height)];
            if(!isNaN(zn)){
                normals[i*3+2] = zn + 128;
            } else {
                normals[i*3+2] = 128;
            }
            
        }

        normals = new Uint8Array(normals);
    }

    function initRender () {
        renderer = new THREE.WebGLRenderer({});
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( renderer.domElement );
    }

    function initCamera () {
        aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera( 45, aspect , 1, 1e5 );
        camera.position.set( 10, 10, 10 );
        camera.up.set( 0, 0, 1 ); // In our data, z is up
    }


    function initController() {
        // Create controls
        controls = new OrbitControls( camera, renderer.domElement );
        controls.addEventListener( 'change', render );
        controls.target.set( 0, 0, 0 );
        // controls.minZoom = 0.5;
        // controls.maxZoom = 4;
        // controls.enablePan = false;
        controls.update();
    }

    function initGui () {
        volconfig = { colormap: 'rainbow' };

        // Colormap textures
        cmtextures = {
            viridis: new THREE.TextureLoader().load( '/resource/cm_viridis.png', render ),
            gray: new THREE.TextureLoader().load( '/resource/cm_gray.png', render ),
            rainbow: new THREE.TextureLoader().load( '/resource/rainbow.png', render )
        };

        const gui = new GUI();
        // gui.add( volconfig, 'clim1', 0, 1, 0.01 ).onChange( updateUniforms );
        // gui.add( volconfig, 'clim2', 0, 1, 0.01 ).onChange( updateUniforms );
        gui.add( volconfig, 'colormap', { gray: 'gray', viridis: 'viridis', rainbow: 'rainbow' } ).onChange( updateUniforms );
        // gui.add( volconfig, 'renderstyle', { mip: 'mip', iso: 'iso' } ).onChange( updateUniforms );
        // gui.add( volconfig, 'isothreshold', 0, 1, 0.01 ).onChange( updateUniforms );
    }

    function init() {

        scene = new THREE.Scene();

        // Create renderer
        initRender()

        initCamera()
     
        initController()

        initGui()

      

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

                calculateNormals(volume.data, volume.xLength, volume.yLength, volume.zLength);

                initVolume(volume);
            })

        window.addEventListener( 'resize', onWindowResize );

    }

    const initVolume = (volume) => {
        const texture = new THREE.Data3DTexture( volume.data, volume.xLength, volume.yLength, volume.zLength );
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;


        // Material
        // const shader = VolumeRenderShader1;
        // const uniforms = THREE.UniformsUtils.clone( shader.uniforms );

        uniforms = { 
            tex:              { value: texture },
            normals:          { value: normals },
            colorMap:         { value: cmtextures[ volconfig.colormap ] },
            skybox:           { value: null },
            transform:        { value: null },
            inverseTransform: { value: null },
            depthSampleCount: { value: 512 },
            zScale:           { value: 1.0 },
            brightness:       { value: 1.0 },
            aspect:           { value: aspect }
        }


        // material = new THREE.RawShaderMaterial( {
        material = new THREE.ShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        } );

        // THREE.Mesh
        const geometry = new THREE.BoxGeometry( volume.xLength, volume.yLength, volume.zLength );
        // geometry.translate( volume.xLength / 2, volume.yLength / 2, volume.zLength / 2 );

        mesh = new THREE.Mesh( geometry, material );

        scene.add( mesh );

        // material.uniforms.transform.value = mesh.matrix.toArray();
        // material.uniforms.inverseTransform.value = mesh.matrix.invert().toArray();

        scene.add( new THREE.AxesHelper( 1e2 ));
        render();
    }

    function updateUniforms() {

        // material.uniforms[ 'u_clim' ].value.set( volconfig.clim1, volconfig.clim2 );
        // material.uniforms[ 'u_renderstyle' ].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
        // material.uniforms[ 'u_renderthreshold' ].value = volconfig.isothreshold; // For ISO renderstyle
        material.uniforms[ 'colorMap' ].value = cmtextures[ volconfig.colormap ];

        render();

    }

    function onWindowResize() {

        renderer.setSize( window.innerWidth, window.innerHeight );

        render();

    }

    function render() {

        if (material) {
            material.uniforms.transform.value = mesh.matrix.toArray();
            material.uniforms.inverseTransform.value = mesh.matrix.invert().toArray();
        }
        camera.updateProjectionMatrix();
        renderer.render( scene, camera );

    }



    onMounted(() => {
        init()
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
  