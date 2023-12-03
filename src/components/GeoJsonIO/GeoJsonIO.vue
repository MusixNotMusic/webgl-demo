<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center"></MapboxGLInit>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import { geojsonIO } from './geojson.io/ui/dnd';
import { drawCircle } from './geojson.io/layer/circle';
import { drawLine } from './geojson.io/layer/line';

const mapboxGLLoadedFunc = (map) => {
    console.log('mapboxGLLoadedFunc ==>', map)
    addDemoModelLayer(map);
}

const randomRgba = () => `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`

const center = ref([104.1465432836781, 30.857102559661133]);
const addDemoModelLayer = (map) => {
    geojsonIO(map, (geojson) => {
        console.log('geojson ==>', geojson)
        const type = geojson.features[0].geometry.type;

        if (type.toLocaleLowerCase() === 'point') {
            drawCircle(map, geojson);
        } else {
            drawLine(map, geojson);
        }
    })
}

onMounted(() => {
})

onUnmounted(() => {
})
    
</script>

<style>
.dragover {
    background: rgba(255, 255, 255, 0.5);
}
</style>
  