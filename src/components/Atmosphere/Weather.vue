<template>
  <div class="wrap">
      <canvas id="bufferC" width="100%" height="100%" ref="canvasRef"></canvas>
  </div>
</template>
<script>
import { onMounted, onUnmounted, ref } from "vue";
import { BoxModel } from "./model/Box.js";
import cloudBoxFragmentShader from './shader/cloud/weather.frag'
export default {
  name: 'cloud',
  setup() {
    let weatherBox;
    const canvasRef = ref(null);
    const render = () => {
      const option = {
        fragmentShader: cloudBoxFragmentShader,
        // uniforms: { tex: { value: null }}
      }
      weatherBox = new BoxModel(canvasRef.value, option);
    }

   

    onMounted(() => {
        render()
    })

    onUnmounted(() => {
      if (weatherBox) weatherBox.dispose();
    })

    return {
      canvasRef
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

canvas {
  width: 100%;
  height: 100%;
}
</style>