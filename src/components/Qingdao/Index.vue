<template>
  <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center" :zoom="zoom" :loadDEM="false"></MapboxGLInit>
  <div class="alt-slider">
      <div class="line"></div>
      <div class="dot" v-for="(item, index) in altList" 
          :class="{active: index === activceIndex}" 
          :key="index" 
          @click="altItemClick(item); activceIndex = index">{{item.name}}
      </div>
  </div>

  <div class="mode-box">
      <div class="item" v-for="(mode, index) in modeList" 
          :class="{active: index === activceModeIndex}" 
          :key="index" 
          @click="modeItemClick(mode); activceModeIndex = index">{{mode.name}}
      </div>
  </div>

  <div class="view-box">
      <div class="item" v-for="(view, index) in viewList" 
          :class="{active: index === activceViewIndex}" 
          :key="index" 
          @click="viewItemClick(view); activceViewIndex = index">{{view.name}}
      </div>
  </div>
</template>

<script>
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
    const activceModeIndex = ref(-1);
    const activceViewIndex = ref(-1);
    const zoom = ref(6);
    const altList = ref([
      { name: '1km', value: 1 * 1e4 },
      { name: '2km', value: 2 * 1e4 },
      { name: '3km', value: 3 * 1e4 },
      { name: '4km', value: 4 * 1e4 },
      { name: '5km', value: 5 * 1e4 },
    ].reverse());


    const modeList = ref([
      { name: '云雷达模式', value: 1 },
      { name: '回波模式', value: 2 },
      { name: '清空模式', value: 0 },
    ]);


    const viewList = ref([
      { name: '视角1', value: 0, config: { center: [120.230278, 35.988611], zoom: 7.2, pitch: 85, bearing: -43.0, duration: 1000 } },
      { name: '视角2', value: 1, config: { center: [120.230278, 35.988611], zoom: 6.1, pitch: 42, bearing: -25.6, duration: 1000 } },
      { name: '视角3', value: 2, config: { center: [120.230278, 35.988611], zoom: 7.2, pitch: 85, bearing: +58.2, duration: 1000 } },
      { name: '视角4', value: 3, config: { center: [120.230278, 35.988611], zoom: 6.7, pitch: 37, bearing: +20.3, duration: 1000 } },
      { name: '视角5', value: 3, config: { center: [120.230278, 35.988611], zoom: 7.2, pitch: 60, bearing: +37.4, duration: 1000 } },
    ]);

    let mapIns = null;
    const mapboxGLLoadedFunc = (map) => {
      window.mapIns = map;
      mapIns = map;
      addRadarLayer(map);
    }


    const addRadarLayer = (map) => {
      if (!instance) {
          instance = new QingdaoScene('qingdao', map);
      }
      
      // instance.render()
      map.once('idle', (e) => {
        instance.render()
        setTimeout(() => {
          instance.zoom();
        }, 1000)
      });
    }

    const altItemClick = (item) => {
      if(instance) {
        instance.isoPlane.setAltitude(item.value);
      }
    }

    const modeItemClick = (item) => {
      if(instance) {
        if (item.value === 1) {
          instance.setCloudRadarMode();
        }

        if (item.value === 2) {
          instance.setEchoMode();
        }

        if (item.value === 0) {
          instance.cleanMode();
        }
      }
    }

    const viewConfigList = [
      { center: [120.230278, 35.988611], zoom: 7.2, pitch: 85, bearing: -43.0, duration: 1000 },
      { center: [120.230278, 35.988611], zoom: 6.1, pitch: 42, bearing: -25.6, duration: 1000 },
      { center: [120.230278, 35.988611], zoom: 7.2, pitch: 85, bearing: +58.2, duration: 1000 }
    ]
    const viewItemClick = (item) => {
        mapIns.flyTo(item.config);
    }

    onMounted(() => {
    })

    onUnmounted(() => {
      if(instance) instance.dispose();
    })

    return {
      center,
      altList,
      modeList,
      viewList,
      activceIndex,
      activceModeIndex,
      activceViewIndex,
      zoom,
      mapboxGLLoadedFunc,
      altItemClick,
      modeItemClick,
      viewItemClick
    }
  }
}
  
</script>

<style scoped lang="scss">
  $main-bg: rgb(217, 221, 230);
  $active-bg: rgb(52, 112, 241);
  $main-color: rgb(9, 64, 87);
  $active-color: rgb(255, 255, 255);
  .alt-slider{
    position: fixed;
    right: 30px;
    bottom: 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    row-gap: 60px;
    font-size: 12px;

    .line {
      position: absolute;
      height: 100%;
      width: 2px;
      background: $main-bg;
      left: calc(50% - 1px);
    }
    .dot {
      width: 25px;
      height: 25px;
      border-radius: 50%;
      line-height: 25px;
      text-align: center;
      background: $main-bg;
      color: $main-color;
      z-index: 1;
      cursor: pointer;
    }
    .dot:hover {
      background: $active-bg;
      color: $active-color;
    }
    .active {
      background: $active-bg;
      color: $active-color;
    }
  }

  .mode-box {
    position: fixed;
    display: flex;
    column-gap: 20px;
    bottom: 25px;
    right: 80px;
    font-size: 14px;
    .item {
      width: max-content;
      height: 30px;
      line-height: 30px;
      padding: 0px 5px ;
      text-align: center;
      background: $main-bg;
      color: $main-color;
      cursor: pointer;
    }

    .item:hover {
      background: $active-bg;
      color: $active-color;
    }
    .active {
      background: $active-bg;
      color: $active-color;
    }
  }

  .view-box {
    position: fixed;
    display: flex;
    column-gap: 20px;
    bottom: 65px;
    right: 80px;
    font-size: 14px;
    .item {
      width: max-content;
      height: 30px;
      line-height: 30px;
      padding: 0px 6px ;
      text-align: center;
      background: $main-bg;
      color: $main-color;;
      cursor: pointer;
    }

    .item:hover {
      background: $active-bg;
      color: $active-color;
    }
    .active {
      background: $active-bg;
      color: $active-color;
    }
  }

  :deep(.mapboxgl-ctrl-bottom-left) {
    display: none;
  }

  :deep(.mapboxgl-ctrl-bottom-right) {
    display: none;
  }
</style>
