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
        volumeRender = new VolumeRenderClass('volume-test', map, '/resource/eastnorth75', vertexShader, fragmentGobalBakShader, 60000, true)
        volumeRender1 = new VolumeRenderClass('volume-test1', map, '/resource/eastnorth150', vertexShader, fragmentGobalBakShader, 60000, true)
        volumeRenderGlobal = new VolumeRenderClass('volume-global', map, '/resource/data1', vertexGobalShader, fragmentGobalShader, 60000)
        // volumeRender1 = new VolumeRenderClass('volume-global', map, '/resource/data1(1)', vertexGobalShader, fragmentGobalShader, 60000)
        volumeRenderGlobal.drawLayer();
        volumeRender1.drawLayer();
        volumeRender.drawLayer();
    });

    map.on('click', (e) => {
        console.log(e.lngLat.lng, e.lngLat.lat)

        // const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat([e.lngLat.lng, e.lngLat.lat], 1000);
        // console.log('mercatorCoord ==>', mercatorCoord);

        pickupVolumeData(volumeRenderGlobal.volume, e.lngLat)

        // cutCenterData(volumeRenderGlobal.volume, {offsetX: 277, offsetY: 1800}, 150, 150, 32)

        // renderVolume(volumeRenderGlobal.volume, {offsetX: 277, offsetY: 1800}, 150, 150, 32)
    })
}

const deg2radian = (deg) => deg / 180 * Math.PI;
const radian2deg = (radian) => radian / Math.PI * 180;

const pickupVolumeData = (volume, center) => {
    const { maxLatitude, maxLongitude, minLatitude, minLongitude, width, height, depth } = volume;
    const { lng, lat } = center;
    // const yIndex = Math.ceil((maxLongitude - lng) / (maxLongitude - minLongitude) * width);
    // const xIndex = Math.ceil((maxLatitude - lat) / (maxLatitude - minLatitude) * height);

    const tan = Math.tan;

    const yIndex = Math.ceil((lng - minLongitude) / (maxLongitude - minLongitude) * height);
    const xIndex = Math.ceil((maxLatitude - lat) / (maxLatitude - minLatitude) * width);

    const h1 = tan(deg2radian(minLatitude));
    const h2 = tan(deg2radian(maxLatitude));
    const dh = (h2 - h1) / width;
    const yIndex1 = Math.ceil((lng - minLongitude) / (maxLongitude - minLongitude) * height);
    const xIndex1 = Math.ceil((h2 - tan(deg2radian(lat))) / dh);
    // const xIndex1 = width - Math.ceil((tan(deg2radian(lat)) - h1) / dh);

    const faceSize = width * height;

    const getVal = (volume, z, y, x) => {
        return volume.data[faceSize * z +  (y - 1) * width + x]
    }


    if (center) {
        console.log('xIndex, yIndex', xIndex, yIndex)
        let maxVal = 0;
        for (let d = 0; d < depth; d++) {
           const val = getVal(volume, d, yIndex, xIndex)
           maxVal = Math.max(maxVal, val);
        }
        console.log('maxVal', maxVal);


        console.log('xIndex1, yIndex1', xIndex1, yIndex1)
        let maxVal1 = 0;
        for (let d = 0; d < depth; d++) {

           const val1 = getVal(volume, d, yIndex1, xIndex1)
           maxVal1 = Math.max(maxVal1, val1);
        }
        console.log('maxVal1', maxVal1);
    }
    return {
        xIndex,
        yIndex,
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

/**
 *  const yIndex = Math.ceil((lng - minLongitude) / (maxLongitude - minLongitude) * height);
 *  const xIndex = Math.ceil((maxLatitude - lat) / (maxLatitude - minLatitude) * width);
 * @param {*} volume 
 * @param {*} x 
 * @param {*} y 
 */
const index2Lnglat = (volume, x, y) => {
    const {maxLatitude, maxLongitude, minLatitude, minLongitude, height, width} = volume;
    return {
        lng: minLongitude + y * (maxLongitude - minLongitude) / height,
        lat: maxLatitude - x * (maxLatitude - minLatitude) / width,
    }
}

const index2Lnglat2 = (volume, x, y) => {
    const {maxLatitude, maxLongitude, minLatitude, minLongitude, height, width} = volume;
    const h1 = Math.tan(deg2radian(minLatitude));
    const h2 = Math.tan(deg2radian(maxLatitude));
    const dh = (h2 - h1) / width;
    return {
        lng: minLongitude + y * (maxLongitude - minLongitude) / height,
        lat: radian2deg(Math.atan(h2 - x * dh)) - 1.45,
    }
}

const cutCenterData = (volume, centerOffset, width, height, depth) => {
    const data = new Uint8Array(width * height * depth + 32);
    const dv = new DataView(data.buffer);

    const { offsetX, offsetY } = centerOffset;

    const top = Math.ceil(offsetY - height / 2);
    const bottom = Math.ceil(offsetY + height / 2);
    const left = Math.ceil(offsetX - width / 2);
    const right = Math.ceil(offsetX + width / 2);
    /**
     *      const minLongitude = dv.getUint32(0, true);
            const minLatitude = dv.getUint32(4, true);
            const maxLongitude = dv.getUint32(8, true);
            const maxLatitude = dv.getUint32(12, true);
            const widDataCnt = dv.getUint32(16, true);
            const heiDataCnt = dv.getUint32(20, true);
            const layerCnt = dv.getUint32(24, true);
            const cutHeight = dv.getFloat32(28, true);
     */
    const min = index2Lnglat2(volume, left, bottom);
    const max = index2Lnglat2(volume, right, top);

    dv.setUint32(0,  min.lng * 360000 | 0, true)
    dv.setUint32(4,  (min.lat + 0.1) * 360000 | 0, true)
    dv.setUint32(8,  max.lng * 360000 | 0, true)
    dv.setUint32(12, (max.lat - 0.1) * 360000 | 0, true)

    dv.setUint32(16, width, true)
    dv.setUint32(20, height, true)
    dv.setUint32(24, depth, true)
    dv.setFloat32(28, 500.0, true)

    const faceSize = width * height;

    const apply = (x, y, z) => volume.data[ volume.width * volume.height * z + volume.width * (bottom - y) + (right - x)]

    for(let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                data[z * faceSize + y * width + x + 32] = apply(x, y, z);
            }
        }
    }


    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(new Blob([data], {type: "application/octet-stream"}));
    elem.download = 'cutData';        
    document.body.appendChild(elem);
    elem.click();        
    document.body.removeChild(elem);

    return new File([new Blob([data])], 'data1');
}


const renderVolume = (volume, centerOffset, width, height, depth) => {
    let volumeData = {};
    const data = new Uint8Array(width * height * depth);

    const { offsetX, offsetY } = centerOffset;
    const top = Math.ceil(offsetY - height / 2);
    const bottom = Math.ceil(offsetY + height / 2);
    const left = Math.ceil(offsetX - width / 2);
    const right = Math.ceil(offsetX + width / 2);

    const min = index2Lnglat2(volume, left, bottom);
    const max = index2Lnglat2(volume, right, top);

    volumeData = {
        minLongitude: min.lng,
        minLatitude:  min.lat,
        maxLongitude: max.lng,
        maxLatitude:  max.lat,
        width:        width,
        height:       height,
        depth:        depth,
        cutHeight:    500
    }

    const faceSize = width * height;

    const apply = (x, y, z) => volume.data[ volume.width * volume.height * z + volume.width * (bottom - y) + (right - x)]

    for(let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                data[z * faceSize + y * width + x] = apply(x, y, z);
            }
        }
    }

    volumeData.data = data;

    volumeRender1.reset(volumeData)

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
  