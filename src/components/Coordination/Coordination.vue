<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center" :zoom="zoom"></MapboxGLInit>
</template>

<script setup>
import mapboxgl from 'mapbox-gl';
import { onMounted, onUnmounted, ref } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import RadarModelLayer from './lib/RadarModelLayer';

let instance;
const center = ref([104.1465432836781, 30.867102559661133]);
const zoom = ref(5);

window.mapboxgl = mapboxgl;

const mapboxGLLoadedFunc = (map) => {
    window.mapIns = map;
    addRadarLayer(map);
}


const addRadarLayer = (map) => {
    if (!instance) {
        instance = new RadarModelLayer('radar', map);
    }
    return instance.render()
}


onMounted(() => {

})

onUnmounted(() => {
    if(instance) instance.dispose();
})
    
</script>

<style scoped>
</style>
  