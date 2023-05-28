import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import mapboxgl from 'mapbox-gl'
import { isEmpty } from 'lodash'

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

export default class VolumeRenderClass{
    constructor(id, map, path, vertexShader, fragmentShader, altitude, other) {
        this.id = id;
        this.map = map;

        this.vertexShader = vertexShader;
        this.fragmentShader = fragmentShader;

        this.path = path;

        this.altitude = altitude;

        this.other = other;

        this.volume = null;

        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        this.material = null;
        this.geometry = null;
        this.mesh = null;

        this.parameters = {
            colorMap: 'Z',
            threshold0: 0.0,
            threshold:  1.0,
            depthSampleCount: 128,
            brightness: 1.0,
            exaggeration: 1
        };

        this.colorMapTexture = {};
        this.uniforms = {
            cameraPosition:   { value: new THREE.Vector3() },
            tex:              { value: null },
            colorMap:         { value: null },
            depthSampleCount: { value: 256 },
            threshold0:       { value: 0 },
            threshold:        { value: 1 },
            brightness:       { value: 1 },
            rangeColor1:      { value: 0 },
            rangeColor2:      { value: 1 },
        };

        this.cmtextures = {};
       
        this.colorNames = colors.map(color => { return color.name })
        this.isLoaded = false
    }

    initColorTexture () {
        // Colormap textures
        const loader = new THREE.TextureLoader()
        const promiseArr = colors.map(color => {
           return new Promise((resolve, reject) => {
                loader.load( color.path, (texture) => { this.colorMapTexture[color.name] = texture; resolve(texture); } )
            })
        })

        return Promise.allSettled(promiseArr)
    }

    initGui () {
        const gui = new GUI();
    
        const updateUniforms = this.updateUniforms.bind(this);

        gui.add( this.parameters, 'colorMap', this.colorNames ).onChange( updateUniforms );
        gui.add( this.parameters, 'threshold0', 0, 1, 0.01 ).onChange( updateUniforms );
        gui.add( this.parameters, 'threshold', 0, 1, 0.01 ).onChange( updateUniforms );
        gui.add( this.parameters, 'depthSampleCount', 0, 1024, 1 ).onChange( updateUniforms );
        gui.add( this.parameters, 'brightness', 0, 7, 0.1 ).onChange( updateUniforms );
    }

    updateUniforms() {
        this.material.uniforms.colorMap.value = this.colorMapTexture[ this.parameters.colorMap ];
        this.material.uniforms.threshold.value = this.parameters.threshold;
        this.material.uniforms.threshold0.value = this.parameters.threshold0;
        this.material.uniforms.depthSampleCount.value = this.parameters.depthSampleCount;
        this.material.uniforms.brightness.value = this.parameters.brightness;
    }

    otherOperation (volume) {
        const { width, height, depth } = volume;

        const faceSize = width * height;
        
        const length2 = (v1) => {
            return Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
        }
        
        const length = (v1) => {
            return Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
        }

        const dot = (v1, v2) => {
            return (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]);
        }

        const cosine = (v1, v2) => {
            return dot(v1, v2) / (length(v1) * length(v2))
        }

        const radius = Math.min(width / 2 | 0, height / 2 | 0);
        const center = [width / 2 | 0, height / 2 | 0, 0]
        const vx = [0, 0, 1];

        for(let z = 0; z < depth; z++) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const vector = [x - center[0], y - center[1], z - center[2] ];
                    const vector1 = [x - center[0], y - center[1] ];
                    if (length2(vector1) <= radius) {
                        const cos = Math.abs(cosine(vector, vx));
                        if (cos < 0.5 || cos > 0.6) {
                            volume.data[z * faceSize + width * y + x] = 0;
                        }
                    } else {
                        volume.data[z * faceSize + width * y + x] = 0;
                    }
                }
            }
        }
        volume.minLongitude = 111.64374340131893
        volume.minLatitude = 32.2670560540258
        volume.maxLongitude = 112.90954306845631
        volume.maxLatitude = 33.5884722189723
    }

    init() {
        const loader = new THREE.FileLoader();
    
        loader.setResponseType('arraybuffer').load(this.path, 
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
                    width: widDataCnt,
                    height: heiDataCnt,
                    depth: layerCnt,
                    minLongitude: minLongitude / 360000,
                    minLatitude: minLatitude / 360000,
                    maxLongitude: maxLongitude / 360000,
                    maxLatitude: maxLatitude / 360000,
                    cutHeight: cutHeight
                };

                if (this.other) {
                    this.otherOperation(volume)
                }
    
                // 清除场景
                this.clearScene();

                this.volume = volume;
    
                if (isEmpty(this.colorMapTexture)) {
                    this.initGui()
                    this.initColorTexture().then(() => {
                        this.render(volume);
                        this.isLoaded = true;
                    })
                } else {
                    this.render(volume);
                    this.isLoaded = true;
                }
            }, 
            (xhr) => { }, 
            (err) => { console.error( 'An error happened' ) }
        )
    
    }
    
    render (volume) {
        this.initVolume(volume);
        this.setColorMap(this.parameters.colorMap);
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

        this.init(map);
    }


    initVolume(volume) {
        console.log('initVolume ==>', volume)
        const faceSize = volume.width * volume.height;
        // const texture = new THREE.Data3DTexture( volume.data.slice(10 * faceSize, 11 * faceSize), volume.width, volume.height, 1 );
        const texture = new THREE.Data3DTexture( volume.data, volume.width, volume.height, volume.depth );
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        this.volume = volume;

        // Material

        this.uniforms.tex.value =  texture
        this.uniforms.colorMap.value =  this.colorMapTexture[this.parameters.colorMap]

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );

        const material = new THREE.RawShaderMaterial( {
            glslVersion: THREE.GLSL3,
            uniforms: this.uniforms,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        // THREE.Mesh
        const mesh = new THREE.Mesh( geometry, material );

        mesh.rotation.z = -Math.PI / 2;
        // mesh.rotation.z = Math.PI;

        this.geometry = geometry;
        this.material = material;
        this.mesh     = mesh;

        this.scene.add(mesh)

        // box
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const materialHL = new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.9, transparent: true });
        const meshHL = new THREE.LineSegments( edgesGeometry, materialHL);

        this.meshHL = meshHL;

        this.scene.add(meshHL)

        const bounds = {
            minX: volume.minLongitude,
            minY: volume.minLatitude,
            maxX: volume.maxLongitude,
            maxY: volume.maxLatitude,
        };

        this.setScenePosition(this.scene, bounds);

        this.renderer.render( this.scene, this.camera );
    }

    setScenePosition (scene, bounds) {
        const min = mapboxgl.MercatorCoordinate.fromLngLat([bounds.minX, bounds.minY], 0);
        const max = mapboxgl.MercatorCoordinate.fromLngLat([bounds.maxX, bounds.maxY], this.altitude || 80000);

        const boundScaleBox = [  min.x, min.y, min.z, max.x, max.y, max.z ];

        scene.position.x = (boundScaleBox[0] + boundScaleBox[3]) / 2;
        scene.position.y = (boundScaleBox[1] + boundScaleBox[4]) / 2;
        scene.position.z = (boundScaleBox[2] + boundScaleBox[5]) / 2;

        scene.scale.x = (boundScaleBox[3] - boundScaleBox[0]);
        scene.scale.y = (boundScaleBox[4] - boundScaleBox[1]);
        scene.scale.z = (boundScaleBox[5] - boundScaleBox[2]);
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

    /***
     * 设置亮度
     * @param value
     */
    setThreshold (value) {
        if (this.isLoaded) {
            this.material.uniforms.threshold0.value = value;
        }
    }

    setThreshold1 (value) {
        if (this.isLoaded) {
            this.material.uniforms.threshold.value = value;
        }
    }

    /***
     * 设置亮度
     * @param value
     */
    setColorRange (value) {
        if (this.isLoaded) {
            this.material.uniforms.rangeColor1.value = value[0];
            this.material.uniforms.rangeColor2.value = value[1];
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

        if (this.renderer) {
            this.renderer.domElement.remove();
            this.renderer.dispose();
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