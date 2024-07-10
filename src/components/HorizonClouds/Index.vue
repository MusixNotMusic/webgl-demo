<template>
  <div class="wrap" ref="containerRef">
  </div>
</template>
<script>
import { onMounted, onUnmounted, ref } from "vue";
// import InstancePerformance from "./model/InstancePerformance";
import HorizonClouds from './lib/HorizonClouds';

export default {
  name: 'WindFieldArrows',
  setup() {
    let instance;
    
    const containerRef = ref(null);

    const render = () => {
      instance = new HorizonClouds(containerRef.value);
    }

    onMounted(() => {
        render()
    })

    onUnmounted(() => {
      if (instance) instance.dispose();
    })

    return {
      containerRef
    }
  }
}
</script>
<style scoped>
.wrap {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
  column-gap: 10px;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
</style>