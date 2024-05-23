import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import Stats from 'three/examples/jsm/libs/stats.module'
import mapboxgl from 'mapbox-gl'
import { isEmpty } from 'lodash'

import vertexShader from './glsl/global.vert'
import fragmentShader from './glsl/global.frag'
// import fragmentShader from './glsl/globalV2.frag'

export default class TerrainRenderClass{
    constructor(id, map) {
        this.id = id;
        this.map = map;

        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        this.material = null;
        this.geometry = null;
        this.mesh = null;

        this.parameters = {
            scale: 1.0,
            threshold:  1.0,
            depthSampleCount: 128,
            showTerrain: true,
            showBox: true,
            pickUpPoint: true,
            terrainPoint: new THREE.Vector3(0.5, 0.3, 0.0),
            pitch1: 0.1,
            pitch2: 0.3,
            radius: 0.01
        };

        this.bounds = {
            minX: 72.167,
            minY: 14.861,
            maxX: 136.519,
            maxY: 55.909,
        };

        this.terrainResolution = new THREE.Vector2();

        this.localBounds = {
            minX: 104,
            minY: 30,
            maxX: 114,
            maxY: 40,
        };

        this.uniforms = {
            cameraPosition:   { value: new THREE.Vector3() },
            tex:              { value: null },
            depthSampleCount: { value: 256 },
            scale:            { value: 1 },
            threshold:        { value: 1 },
            boxResolution:    { value: new THREE.Vector3() },
            maxLat:           { value: 50 },
            minLat:           { value: 20 },
            showTerrain:      { value: this.parameters.showTerrain },
            showBox:          { value: this.parameters.showBox },
            pickUpPoint:      { value: this.parameters.pickUpPoint },
            terrainPoint:     { value: this.parameters.terrainPoint },
            pitchRange:       { value: new THREE.Vector2(this.parameters.pitch1, this.parameters.pitch2) },
            radius:           { value: this.parameters.radius },
        };

        this.stats = new Stats()

        document.body.appendChild(this.stats.dom)

        this.setTerrainPointBind = this.setTerrainPoint.bind(this);

        window.TerrainRenderClass = this;
    }
   
    initGui () {
        const gui = new GUI();
    
        const updateUniforms = this.updateUniforms.bind(this);

        gui.add( this.parameters, 'scale', 0, 1, 0.01 ).onChange( updateUniforms );
        gui.add( this.parameters, 'threshold', 0, 1, 0.01 ).onChange( updateUniforms );
        gui.add( this.parameters, 'depthSampleCount', 0, 1024, 1 ).onChange( updateUniforms );
        gui.add( this.parameters, 'showTerrain' ).onChange( updateUniforms );
        gui.add( this.parameters, 'showBox' ).onChange( updateUniforms );
        gui.add( this.parameters, 'pickUpPoint' ).onChange( updateUniforms );
        gui.add( this.parameters, 'pitch1', 0, 2, 0.01 ).onChange( updateUniforms );
        gui.add( this.parameters, 'pitch2', 0, 5, 0.01 ).onChange( updateUniforms );
        gui.add( this.parameters, 'radius', 0.005, 0.05, 0.005 ).onChange( updateUniforms );

        if (this.parameters.pickUpPoint) {
            this.map.on('click', this.setTerrainPointBind);
        } else {
            this.map.off('click', this.setTerrainPointBind);
        }
    }

    updateUniforms() {
        this.material.uniforms.threshold.value = this.parameters.threshold;
        this.material.uniforms.scale.value = this.parameters.scale;
        this.material.uniforms.depthSampleCount.value = this.parameters.depthSampleCount;
        this.material.uniforms.showTerrain.value = this.parameters.showTerrain;
        this.material.uniforms.showBox.value = this.parameters.showBox;
        this.material.uniforms.pitchRange.value = new THREE.Vector2(this.parameters.pitch1, this.parameters.pitch2);
        this.material.uniforms.radius.value = this.parameters.radius;

        if (this.parameters.pickUpPoint) {
            this.map.on('click', this.setTerrainPointBind);
        } else {
            this.map.off('click', this.setTerrainPointBind);
        }
    }

    setTerrainPoint (e) {
        console.log('setTerrainPoint ==>', e.lngLat)
        const lngLat = e.lngLat;
        const { minX, maxX, minY, maxY } = this.bounds;

        const mm1 = mapboxgl.MercatorCoordinate.fromLngLat([minX, minY]);
        const mm2 = mapboxgl.MercatorCoordinate.fromLngLat([maxX, maxY]);
        const tt = mapboxgl.MercatorCoordinate.fromLngLat([lngLat.lng, lngLat.lat]);

        const tx = (tt.x - mm1.x) / (mm2.x - mm1.x);
        const ty = (tt.y - mm1.y) / (mm2.y - mm1.y);

        console.log('tx, ty ==>', tx, ty);

        this.material.uniforms.terrainPoint.value = new THREE.Vector3(tx, ty, 0.0);
    }

    init() {
        const loader = new THREE.TextureLoader();
    
        // loader.load('/texture/china-terrain-2.png', 
        loader.load('/texture/china-terrain-300dpi.png', 
            (texture) => { 
                // 清除场景
                this.clearScene();

                this.texture = texture;

                this.terrainResolution.set(texture.source.data.width, texture.source.data.height);

                this.initGui();

                this.render();
            }, 
            (xhr) => { }, 
            (err) => { console.error( 'An error happened' ) }
        )
    
    }
    
    render () {
        this.initMesh();

        this.drawLayer()
    }


    initCanvas(map, gl) {
        const { renderer } = this;

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
        }
    }


    initMesh() {
        const texture = this.texture;

        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        // Material

        this.uniforms.tex.value =  texture

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );

        const material = new THREE.RawShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: this.uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        // THREE.Mesh
        const mesh = new THREE.Mesh( geometry, material );

        // mesh.rotation.z = -Math.PI / 2;
        // mesh.rotation.z = Math.PI;

        this.geometry = geometry;
        this.material = material;
        this.mesh     = mesh;

        this.scene.add(mesh)

        this.setMeshPosition(mesh, this.bounds);

        this.material.uniforms.boxResolution.value = new THREE.Vector3(1, mesh.scale.x / mesh.scale.y, mesh.scale.x / mesh.scale.z);

        // box
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const materialHL = new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.9, transparent: true });
        const meshHL = new THREE.LineSegments( edgesGeometry, materialHL);

        this.meshHL = meshHL;

        this.scene.add(meshHL)

        this.setMeshPosition(this.meshHL, this.bounds);

        this.renderer.render( this.scene, this.camera );
    }



    setMeshPosition (mesh, bounds) {
        const min = mapboxgl.MercatorCoordinate.fromLngLat([bounds.minX, bounds.minY], 0);
        const max = mapboxgl.MercatorCoordinate.fromLngLat([bounds.maxX, bounds.maxY], this.altitude || 80000);

        const boundScaleBox = [  min.x, min.y, min.z, max.x, max.y, max.z ];

        mesh.position.x = (boundScaleBox[0] + boundScaleBox[3]) / 2;
        mesh.position.y = (boundScaleBox[1] + boundScaleBox[4]) / 2;
        mesh.position.z = (boundScaleBox[2] + boundScaleBox[5]) / 2;

        mesh.scale.x = (boundScaleBox[3] - boundScaleBox[0]);
        mesh.scale.y = (boundScaleBox[4] - boundScaleBox[1]);
        mesh.scale.z = (boundScaleBox[5] - boundScaleBox[2]);
    }


    /**
     * 设置垂直高度倍数
     * @param value
     */
    setExaggeration (value) {
        this.mesh.scale.z = this.mesh.scale.z * value;
    }

    /***
     * 设置色卡
     * @param value
     */
    setColorMap (value) {
        this.parameters.colorMap = value
        const texture = this.colorMapTexture[this.parameters.colorMap]
        if (texture && this.isLoaded) {
            this.material.uniforms.colorMap.value = texture;
        } else {
            console.warn('this texture not exist')
        }
    }

    /***
     * 设置亮度
     * @param value
     */
    setBrightness (value) {
        if (this.isLoaded) {
            this.material.uniforms.brightness.value = value;
        }
    }

    /***
     * 设置阈值
     * @param value
     */
    setDepthSampleCount (value) {
        if (this.isLoaded) {
            this.material.uniforms.depthSampleCount.value = value;
        }
    }


    showLayer (show) {
        if(this.renderer) {
            this.renderer.domElement.style.display = show ? 'block' : 'none';
        }
    }

    drawLayer () {
        const customLayer = {
            id: this.id,
            type: 'custom',
            renderingMode: '3d',
            onAdd: (map, gl) => {
                window.mapIns = this.map = map;
                this.initCanvas(map, gl);
            },

            render: (gl, matrix) => {
                const { renderer, scene, camera } = this;
                this.stats.begin();

                camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix)

                if (this.mesh && this.mesh.material.uniforms && this.mesh.material.uniforms.cameraPosition) {
                    const camera = this.map.getFreeCameraOptions();

                    const cameraPosition = camera._position

                    this.mesh.material.uniforms.cameraPosition.value.copy( { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z } );
                }

                 if (renderer) {
                    renderer.resetState();
                    renderer.render(scene, camera);
                }

                if (this.map) {
                    this.map.triggerRepaint();
                }

                this.stats.end();
            },


            onRemove: () => {
                this.clearScene();
            }
        };

        if (!this.map.getLayer(this.id)) {
            this.map.addLayer(customLayer);
        }
    }

    clearScene() {
        if (this.scene && this.scene.children.length > 0) {
            this.scene.children.forEach(mesh => {
                if (mesh) {

                    if (mesh.material) {
                        Object.values(mesh.material.uniforms).forEach(uniform => {
                            if (uniform.value && uniform.value.isTexture) {
                                uniform.value.dispose();
                            }
                        })
                        mesh.material.dispose();
                    }

                    if (mesh.geometry) {
                        mesh.geometry.dispose();
                    }
                    this.scene.remove(mesh);
                    mesh.clear();
                    mesh = null;
                }
            })
            this.scene.children = [];
        }

        if (this.volume) {
            delete this.volume.data;
            this.volume = null;
        }
    }

    // ==========================
    removeLayer () {
        if (this.map && this.map.getLayer(this.id)) {
            this.map.removeLayer(this.id)
        }
    }

    /**
     * 清除
     */

    destroy () {
        this.removeLayer()

        this.clearScene();

        if (this.renderer) {
            this.renderer.domElement.remove();
        }

        this.id = null;
        this.map = null;

        this.renderer = null;

        this.camera = null;
        this.scene = null;
    }

    dispose () {
        this.destroy()
    }

}