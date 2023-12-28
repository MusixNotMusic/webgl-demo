<template>
    <div id="map"></div>
    <div class=""></div>
    <div class="upload">
        <div>
            <label for="">截取半径:</label>
            <input type="text" v-model="radius" @change="radiusChange">
        </div>
        <div>
            <label for="">是否添加头:</label>
            <input type="checkbox" v-model="head" @change="headChange">
        </div>
        <input type="file" id="uploadInput" @change="uploadFileChange">
        <button @click="pickDataClick">下载数据</button>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/src/css/mapbox-gl.css'

import fragmentShader from '../shaderThree/volume-demo.frag'
import fragmentGobalShader from '../shaderThree/global.frag'
import fragmentGobalBakShader from '../shaderThree/global_bak.frag'
import vertexShader from '../shaderThree/demo.vert'
import vertexGobalShader from '../shaderThree/global.vert'
import VolumeRenderClass from './VolumeRenderClass'
import { decompress } from '../utils/decompress/ZstdDecompress'
import { accessToken } from './token'

const centerOrigin =  [104, 30] || [0, 0];

mapboxgl.accessToken = accessToken;

let map;
let volumeRender;
let volumeRender1;
let volumeRenderGlobal;

let radius = ref(75);
let head = ref(true);
let xIndex = 0;
let yIndex = 0;

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
        useWebGL2: false,
        antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
    });


    map.on('style.load', () => {
        // volumeRender = new VolumeRenderClass('volume-test', map, '/resource/eastnorth75', vertexShader, fragmentGobalBakShader, 60000, true)
        volumeRender1 = new VolumeRenderClass('volume-test1', map, '/resource/eastnorth150', vertexShader, fragmentGobalBakShader, 60000, true)
        volumeRenderGlobal = new VolumeRenderClass('volume-global', map, '/resource/data1', vertexGobalShader, fragmentGobalShader, 60000)

        volumeRenderGlobal.drawLayer();
        volumeRender1.drawLayer();
        // volumeRender.drawLayer();
    });

    map.on('click', (e) => {
        console.log(e.lngLat.lng, e.lngLat.lat)

        const res = lnglat2Index(volumeRenderGlobal.volume, e.lngLat.lng, e.lngLat.lat);
       
        xIndex = res.xIndex;
        yIndex = res.yIndex;
        
        console.log("lnglat2Index xIndex, yIndex", res.xIndex, res.yIndex);

        // cutCenterData(volumeRenderGlobal.volume, {offsetX: 277, offsetY: 1800}, 150, 150, 32)

        const _radius = Number(radius.value);


        const { width, height, maxLongitude, minLongitude, maxLatitude, minLatitude } = volumeRenderGlobal.volume;
        const uLon = (maxLongitude - minLongitude) / height;
        const uLat = (maxLatitude - minLatitude) / width;

        const { lng, lat } = e.lngLat;
        const bounds = [[lng - _radius * 0.5 * uLon, lat - _radius * 0.5 * uLat], [lng + _radius * 0.5 * uLon, lat + _radius * 0.5 * uLat]];
        renderVolumeByBounds(volumeRenderGlobal.volume, {offsetX: res.xIndex, offsetY: res.yIndex}, _radius, _radius, 32, bounds);
        // renderVolume(volumeRenderGlobal.volume, {offsetX: res.xIndex, offsetY: res.yIndex}, radius, radius, 32, e.lngLat, radius * 1000)
    })
}

const deg2radian = (deg) => deg / 180 * Math.PI;
const radian2deg = (radian) => radian / Math.PI * 180;

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

const index2Lnglat2 = (volume, x, y) => {
    const {maxLatitude, maxLongitude, minLatitude, minLongitude, height, width} = volume;
    const h1 = Math.tan(deg2radian(minLatitude));
    const h2 = Math.tan(deg2radian(maxLatitude));
    const dh = (h2 - h1) / width;
    return {
        lng: minLongitude + y * (maxLongitude - minLongitude) / height,
        lat: radian2deg(Math.atan(h2 - x * dh)) - 1.45,
        // lat: radian2deg(Math.atan(h2 - x * dh)) - 3.65,
        // lat: radian2deg(Math.atan(h2 - x * dh)),
        // lat: maxLatitude - x / (maxLatitude - minLatitude),
    }
}

/**
 * 经纬度转 墨卡托
 * @param {*} volume 
 * @param {*} lng 
 * @param {*} lat 
 */
const lnglat2Index = (volume, lng, lat) => {
    const {maxLatitude, maxLongitude, minLatitude, minLongitude, height, width} = volume;
    const max = mapboxgl.MercatorCoordinate.fromLngLat([maxLongitude, maxLatitude], 0);
    const min = mapboxgl.MercatorCoordinate.fromLngLat([minLongitude, minLatitude], 0);
    const cur = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], 0);

    const tx = (cur.x - min.x) / (max.x - min.x);
    const ty = (max.y - cur.y) / (max.y - min.y);

    return {
        xIndex: ty * width,
        yIndex: tx * height,
    }
}

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
const cutCenterData = (volume, centerOffset, width, height, depth) => {

    const { offsetX, offsetY } = centerOffset;

    const top = Math.ceil(offsetY - height / 2);
    const bottom = Math.ceil(offsetY + height / 2);
    const left = Math.ceil(offsetX - width / 2);
    const right = Math.ceil(offsetX + width / 2);
   
    const min = index2Lnglat2(volume, left, bottom);
    const max = index2Lnglat2(volume, right, top);
    
    let data;

    if (head.value) {

        data = new Uint8Array(width * height * depth + 32);
        const dv = new DataView(data.buffer);

        dv.setUint32(0,  min.lng * 360000 | 0, true)
        dv.setUint32(4,  (min.lat + 0.1) * 360000 | 0, true)
        dv.setUint32(8,  max.lng * 360000 | 0, true)
        dv.setUint32(12, (max.lat - 0.1) * 360000 | 0, true)

        dv.setUint32(16, width, true)
        dv.setUint32(20, height, true)
        dv.setUint32(24, depth, true)
        dv.setFloat32(28, 500.0, true)
    } else {
        data = new Uint8Array(width * height * depth);
    }

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
    elem.download = `cut_${width}x${height}x${depth}_uint8.raw`;
    document.body.appendChild(elem);
    elem.click();        
    document.body.removeChild(elem);

    return new File([new Blob([data])], 'data1');
}


const renderVolume = (volume, centerOffset, width, height, depth, lnglat, radius) => {
    let volumeData = {};
    const data = new Uint8Array(width * height * depth);

    const { offsetX, offsetY } = centerOffset;
    const top = Math.ceil(offsetY - height / 2);
    const bottom = Math.ceil(offsetY + height / 2);
    const left = Math.ceil(offsetX - width / 2);
    const right = Math.ceil(offsetX + width / 2);

    const ll = new mapboxgl.LngLat(lnglat.lng, lnglat.lat);
    const coors = ll.toBounds(radius).toArray();

    const min = index2Lnglat2(volume, left, bottom);
    const max = index2Lnglat2(volume, right, top);

    volumeData = {
        minLongitude: coors[1][0] || min.lng,
        minLatitude:  coors[1][1] || min.lat,
        maxLongitude: coors[0][0] || max.lng,
        maxLatitude:  coors[0][1] || max.lat,
        width:        width,
        height:       height,
        depth:        depth,
        cutHeight:    volume.cutHeight
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

const renderVolumeByBounds = (volume, centerOffset, width, height, depth, bounds) => {
    let volumeData = {};
    const data = new Uint8Array(width * height * depth);

    const { offsetX, offsetY } = centerOffset;
    const top = Math.floor(offsetY - height / 2);
    const bottom = Math.floor(offsetY + height / 2);
    const left = Math.floor(offsetX - width / 2);
    const right = Math.floor(offsetX + width / 2);

    const coors = bounds;

    const min = index2Lnglat2(volume, left, bottom);
    const max = index2Lnglat2(volume, right, top);

    volumeData = {
        minLongitude: coors[1][0] || min.lng,
        minLatitude:  coors[1][1] || min.lat,
        maxLongitude: coors[0][0] || max.lng,
        maxLatitude:  coors[0][1] || max.lat,
        width:        width,
        height:       height,
        depth:        depth,
        cutHeight:    volume.cutHeight
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


const uploadFileChange = () => {
    const uploadInput = document.getElementById("uploadInput");
    var reader = new FileReader();

    for (const file of uploadInput.files) {
        // formData.append('files', file, file.name);

        reader.addEventListener('load', () => {
            decompress(reader.result).then((data) => {
                console.log("decompress", data);
                const volume = VolumeRenderClass.parseRawVolumeData(data.buffer);
                volumeRenderGlobal.reset(volume);
            });
        });
        reader.readAsArrayBuffer(file);
    }


    console.log('uploadFileChange', uploadInput.files, reader);
}

const radiusChange = () => {
    console.log('radius =>', radius)
}

const headChange = () => {
    console.log('head =>', head)
}

const pickDataClick = () => {
    cutCenterData(volumeRenderGlobal.volume, {offsetX: xIndex, offsetY: yIndex}, radius.value, radius.value, 32)
}
    
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

.upload {
    position: fixed;
    top: 20px;
    left: 40px;
    background: rgba(0, 0, 0, 0.7);
    padding: 10px;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    row-gap: 5px;
    column-gap: 10px;
    align-items: flex-start;
   
}
button {
    padding: 0px 20px;
}
label {
    color: #fff;
    width: 80px;
}

input[type="file"] {
    color: #fff;
}
</style>
  