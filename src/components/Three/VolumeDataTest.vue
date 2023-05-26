<template>
    <div id="map"></div>
    <div class=""></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import fragmentShader from '../shaderThree/volume-demo.frag'
import fragmentGobalShader from '../shaderThree/global.frag'
import fragmentGobalBakShader from '../shaderThree/global_bak.frag'
import vertexShader from '../shaderThree/demo.vert'
import vertexGobalShader from '../shaderThree/global.vert'
import VolumeRenderClass from './VolumeRenderClass'

const centerOrigin =  [104, 30] || [0, 0];

mapboxgl.accessToken = 'pk.eyJ1IjoibXVzaXgiLCJhIjoiY2xocjRvM2VsMGFkdzNqc2l3NHhxM285eCJ9.9TK1C4mjpPMG5wNx8m1KmA';
let map;
let volumeRender;
let volumeRender1;
let volumeRenderGlobal;
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
        volumeRender = new VolumeRenderClass('volume-test', map, '/resource/data1(6)', vertexShader, fragmentGobalBakShader, 60000, true)
        // volumeRender1 = new VolumeRenderClass('volume-test1', map, '/resource/2', vertexShader, fragmentGobalBakShader, 20000)
        volumeRenderGlobal = new VolumeRenderClass('volume-global', map, '/resource/data1', vertexGobalShader, fragmentGobalShader, 60000)
        // volumeRender1 = new VolumeRenderClass('volume-global', map, '/resource/data1(1)', vertexGobalShader, fragmentGobalShader, 60000)
        // volumeRender1.drawLayer();
        volumeRenderGlobal.drawLayer();
        volumeRender.drawLayer();
    });

    map.on('click', (e) => {
        console.log(e.lngLat.lng, e.lngLat.lat)

        const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat([e.lngLat.lng, e.lngLat.lat], 1000);

        console.log('mercatorCoord ==>', mercatorCoord);

        const result = cutOneRadarData(volumeRenderGlobal.volume, e.lngLat)
        // console.log('result', result)
    })
}

const cutOneRadarData = (volume, center) => {
    const { maxLatitude, maxLongitude, minLatitude, minLongitude, width, height, depth } = volume;
    const { lng, lat } = center;
    // const yIndex = Math.ceil((maxLongitude - lng) / (maxLongitude - minLongitude) * width);
    // const xIndex = Math.ceil((maxLatitude - lat) / (maxLatitude - minLatitude) * height);

    const yIndex = Math.ceil((lng - minLongitude) / (maxLongitude - minLongitude) * height);
    const xIndex = Math.ceil((maxLatitude - lat) / (maxLatitude - minLatitude) * width);
    const faceSize = width * height;

    let vec2_x = [1, 0, 0]
    let vec2_y = [0, 1, 0]

    const getVal = (volume, z, y, x) => {
        // console.log('offset ==>', faceSize * z +  y * width + x, volume.data[faceSize * z +  y * width + x])
        return volume.data[faceSize * z +  (y - 1) * width + x]
    }

    if (center) {
        // const slice = volume.data.slice(10 * faceSize, 11 * faceSize)
        // const index = slice.findIndex(i => i > 45)
        // console.log(slice)
        // console.log(index, index / width | 0, index % width)
        // console.log('yIndex, xIndex', yIndex, xIndex,  getVal(volume, 10, yIndex, xIndex))
        console.log('xIndex, yIndex', xIndex, yIndex)

        // for (let d = 0; d < depth; d++) {
        //     for (let i = 0; true; i++) {
        //         const x = xIndex + vec2_x[0] * i;
        //         const y = xIndex + vec2_x[1] * i;
        //         const index = faceSize * d + width * (y - 1) + x;
        //         if (!volume.data[index]) {
        //             vec2_x[2] = Math.max(vec2_x[2], i);
        //             break;
        //         }
        //     }

        //     for (let i = 0; true; i++) {
        //         const x = xIndex + vec2_y[0] * i;
        //         const y = xIndex + vec2_y[1] * i;
        //         const index = faceSize * d + width * (y - 1) + x;
        //         if (!volume.data[index]) {
        //             vec2_y[2] = Math.max(vec2_y[2], i);
        //             break;
        //         }
        //     }
        // }

        let maxVal = 0;
        for (let d = 0; d < depth; d++) {
           const val = getVal(volume, d, yIndex, xIndex)
           maxVal = Math.max(maxVal, val);
        }
        console.log('maxVal', maxVal);
    }
    return {
        xIndex,
        yIndex,
        vec2X: vec2_x,
        vec2Y: vec2_y
    }
}

const readFile = (path) => {
    const loader = new THREE.FileLoader();
    loader.setResponseType('arraybuffer').load(path, 
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
                console.log('readFile ===>',  volume)

                const { width, height, depth } = volume;

                const faceSize = width * height;
               
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
                const vx = [1, 0, 0];

                for(let z = 0; z < depth; z++) {
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            const vector = [x - center[0], y - center[1], z - center[2] ];
                            if (length(vector) <= radius) {
                                const cos = cosine(vector, vx);
                                if (cos < 0.8) {
                                    volume.data[z * faceSize + width * y + x] = 0;
                                }
                            } else {
                                volume.data[z * faceSize + width * y + x] = 0;
                            }
                        }
                    }
                }
               
            }, 
            (xhr) => { }, 
            (err) => { console.error( 'An error happened' ) }
        )
}

onMounted(() => {
    initMapbox()

    readFile('/resource/data1(6)');
})

onUnmounted(() => {
    if (volumeRender1) volumeRender1.dispose()
    if (volumeRender) volumeRender.dispose()
    if (volumeRenderGlobal) volumeRenderGlobal.dispose()
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
  