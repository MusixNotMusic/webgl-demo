<template>
  <div class="wrap" ref="containerRef">
  </div>
</template>
<script>
import { onMounted, onUnmounted, ref } from "vue";
// import InstancePerformance from "./model/InstancePerformance";
import { WindField3DFormat } from "../parseFile/WindField3D/WindField3DFormat";
import InstancePerformance from "./model/InstancePerformance";
import FlowFeildWind from './model/FlowFieldWind';

export default {
  name: 'WindFieldArrows',
  setup() {
    let instance;
    
    const containerRef = ref(null);

    const render = () => {
      fetch('/resource/windField').then(data => data.arrayBuffer()).then((buffer) => {
        const bytes = new Uint8Array(buffer);
        const wf3d = WindField3DFormat.parser(bytes);
        console.log('instance =>', wf3d);
        instance = new FlowFeildWind(containerRef.value, wf3d);
        // instance = new InstancePerformance(containerRef.value, wf3d);
      })
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