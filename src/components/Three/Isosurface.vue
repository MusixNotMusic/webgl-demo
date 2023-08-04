<template>
</template>

<script>
import { onMounted, onUnmounted } from 'vue';
import ThreeModel from './model/ThreeModel'

export default {
    setup () {
        const model = new ThreeModel();
        onMounted(() => {
            model.init('/model/isosurface.raw')
        })

        onUnmounted(() => {
            model.dispose();
        })
    }
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
</style>
  