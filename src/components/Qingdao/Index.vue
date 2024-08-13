<template>
  <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center" :zoom="zoom" :loadDEM="false"></MapboxGLInit>
  <div class="alt-slider">
      <div class="line"></div>
      <div class="dot" v-for="(item, index) in altList" 
          :class="{active: index === activceIndex}" 
          :key="index" 
          @click="altItemClick(item); activceIndex = index">{{item.value / 1000}}K
      </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import { onMounted, onUnmounted, ref } from 'vue';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import QingdaoScene from './lib/QingdaoScene';

export default {
  name: '',
  components: { MapboxGLInit },
  setup() {
    let instance;
    const center = ref([120.5, 36]);
    const activceIndex = ref(-1);
    const zoom = ref(6);
    const altList = ref([
      { name: '10K', value: 1 * 1e4 },
      { name: '20K', value: 2 * 1e4 },
      { name: '30K', value: 3 * 1e4 },
      { name: '40K', value: 4 * 1e4 },
      { name: '50K', value: 5 * 1e4 },
    ].reverse());


    window.mapboxgl = mapboxgl;

    const mapboxGLLoadedFunc = (map) => {
      window.mapIns = map;
      addRadarLayer(map);
    }


    const addRadarLayer = (map) => {
      if (!instance) {
          instance = new QingdaoScene('qingdao', map);
      }
      
      instance.render()
      // map.once('idle', (e) => {
      // });
    }

    const altItemClick = (item) => {
      if(instance) {
        instance.isoPlane.setAltitude(item.value);
      }
    }

    onMounted(() => {
    })

    onUnmounted(() => {
      if(instance) instance.dispose();
    })

    return {
      center,
      altList,
      activceIndex,
      zoom,
      mapboxGLLoadedFunc,
      altItemClick
    }
  }
}
  
</script>

<style scoped lang="scss">
  .alt-slider{
    position: fixed;
    right: 30px;
    bottom: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    row-gap: 60px;
    font-size: 12px;

    .line {
      position: absolute;
      height: 100%;
      width: 2px;
      background: rgb(104, 147, 240);
      left: 50%;
    }
    .dot {
      width: 25px;
      height: 25px;
      border-radius: 50%;
      line-height: 25px;
      text-align: center;
      background: rgb(104, 147, 240);
      color: #fff;
      z-index: 1;
      cursor: pointer;
    }
    .dot:hover {
      background: salmon;
    }
    .active {
      background: salmon;
    }
  }
</style>
