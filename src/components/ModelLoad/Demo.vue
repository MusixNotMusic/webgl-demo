<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center"></MapboxGLInit>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import DemoModelLayer from './DemoModelLayer';

const mapboxGLLoadedFunc = (map) => {
    console.log('mapboxGLLoadedFunc ==>', map)
    addDemoModelLayer(map);
}

const center = ref([104.1465432836781, 30.857102559661133]);
let instance;
const addDemoModelLayer = (map) => {
    if (!instance) {
        instance = new DemoModelLayer('demo', map);
    }
    instance.render();
}

onMounted(() => {
})

onUnmounted(() => {
    if(instance) instance.dispose();
})
    
</script>

<style scoped>
</style>
  