<template>
    <div id="map"></div>
    <div class=""></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import fragmentShader from '../shaderThree/volume-demo.frag'
import fragmentGobalShader from '../shaderThree/global.frag'
import vertexShader from '../shaderThree/demo.vert'
import VolumeRenderClass from './VolumeRenderClass'

const centerOrigin =  [104, 30] || [0, 0];

mapboxgl.accessToken = 'pk.eyJ1IjoibXVzaXgiLCJhIjoiY2xocjRvM2VsMGFkdzNqc2l3NHhxM285eCJ9.9TK1C4mjpPMG5wNx8m1KmA';
let map;
let volumeRender;
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
        volumeRender = new VolumeRenderClass('volume-test', map, '/resource/oneStation', vertexShader, fragmentShader, 20000)
        volumeRenderGlobal = new VolumeRenderClass('volume-global', map, '/resource/data1', vertexShader, fragmentGobalShader, 60000)
        volumeRender.drawLayer();
        volumeRenderGlobal.drawLayer();
        // volumeRender.drawLayer();
    });
}

onMounted(() => {
    initMapbox()
})

onUnmounted(() => {
    volumeRender.dispose();
    volumeRenderGlobal.dispose()
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
  