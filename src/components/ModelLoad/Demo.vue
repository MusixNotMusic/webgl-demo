<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center"></MapboxGLInit>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import mapboxgl from 'mapbox-gl';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import DemoModelLayer from './DemoModelLayer';
import Test from './ModelDemo/Demo';

window.mapboxgl = mapboxgl;

const mapboxGLLoadedFunc = (map) => {
    window.mapIns = map;
    console.log('mapboxGLLoadedFunc ==>', map)
    addDemoModelLayer(map);
}

const center = ref([104.1465432836781, 30.857102559661133]);
let instance;
let test;
const addDemoModelLayer = (map) => {
    // if (!instance) {
    //     instance = new DemoModelLayer('demo', map);
    // }
    // instance.render();

    if (!test) {
        test = new Test('test', map);
    }
    test.render();
}

onMounted(() => {
})

onUnmounted(() => {
    if(instance) instance.dispose();
    if(test) test.dispose();
})
    
</script>

<style scoped>
</style>
  