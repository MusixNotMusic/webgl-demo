<template>
  <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center" :zoom="zoom" :loadDEM="false"></MapboxGLInit>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import { onMounted, onUnmounted, ref } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import RadarModelLayer from './lib/RadarModelLayer';

export default {
  name: '',
  components: { MapboxGLInit },
  setup() {
    let instance;
    const center = ref([120.5, 36]);
    const zoom = ref(8);


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

    return {
      center,
      zoom,
      mapboxGLLoadedFunc
    }
  }
}
  
</script>

<style scoped lang="scss">

</style>
