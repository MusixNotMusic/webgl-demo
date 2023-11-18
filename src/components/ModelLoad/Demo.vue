<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc"></MapboxGLInit>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import DemoModelLayer from './DemoModelLayer';

const mapboxGLLoadedFunc = (map) => {
    console.log('mapboxGLLoadedFunc ==>', map)
    addDemoModelLayer(map);
}

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
  