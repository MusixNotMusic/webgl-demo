<template>
  <div class="wrap" ref="containerRef">
  </div>
</template>
<script>
import { onMounted, onUnmounted, ref } from "vue";
import { WindField3DFormat } from "../../parseFile/WindField3D/WindField3DFormat";
import { decompress } from "../../utils/decompress/ZstdDecompress"; 

import FlowFieldWindNext from './FlowFieldWindNext';

export default {
  name: 'WindFieldArrows',
  setup() {
    let instance;
    
    const containerRef = ref(null);

    const render = () => {
      // fetch('/resource/wind/20221014_200000.00.31001.000_3000.zst')
      fetch('/resource/wind/windField.zip')
      // fetch('/resource/wind/windField')
      .then(data => data.arrayBuffer())
      .then(async (data) => { return await decompress(data); })
      .then((buffer) => {
        const bytes = new Uint8Array(buffer);
        const wf3d = WindField3DFormat.parser(bytes);
        console.log('instance =>', wf3d);
        instance = new FlowFieldWindNext(containerRef.value, wf3d);
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