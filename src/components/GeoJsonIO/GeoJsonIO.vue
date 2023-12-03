<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center"></MapboxGLInit>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import { geojsonIO } from './geojson.io/ui/dnd';

const mapboxGLLoadedFunc = (map) => {
    console.log('mapboxGLLoadedFunc ==>', map)
    addDemoModelLayer(map);
}

const randomRgba = () => `rgb(${Math.random() * 256 | 0},${Math.random() * 256 | 0},${Math.random() * 256 | 0})`

const drawLine = (map, geojson) => {
    const id = 'line-' + Date.now();
    if (!map.getSource(id)) {
        map.addSource(id, { type: 'geojson', data: geojson });
    } 

    if (!map.getLayer(id)) {
        let layer = {
            id: id,
            type: "line",
            source: id,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': randomRgba(),
                'line-width': 3
            }
        };

        map.addLayer(layer);
    }
}

const center = ref([104.1465432836781, 30.857102559661133]);
const addDemoModelLayer = (map) => {
    geojsonIO(map, (geojson) => {
        console.log('geojson ==>', geojson)
        drawLine(map, geojson);
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
  