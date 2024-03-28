<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center" :zoom="zoom" :loadDEM="false"></MapboxGLInit>
</template>

<script setup>
import mapboxgl from 'mapbox-gl';
import { onMounted, onUnmounted, ref } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import RadarModelLayer from './lib/RadarModelLayer';

let instance;
const center = ref([103.8, 30]);
const zoom = ref(12);

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
  