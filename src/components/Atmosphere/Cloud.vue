<template>
  <div class="wrap">
    <div class="bufferA">
      <canvas id="bufferA" width="500" height="500" ref="bufferARef"></canvas>
    </div>
    <div class="bufferA">
      <canvas id="bufferB" width="100%" height="100%" ref="bufferBRef"></canvas>
    </div>
    <div class="bufferA">
      <canvas id="bufferC" width="100%" height="100%" ref="bufferCRef"></canvas>
    </div>
    <div class="bufferA">
      <canvas id="bufferD" width="100%" height="100%" ref="bufferDRef"></canvas>
    </div>
  </div>
</template>
<script>
import { onMounted, onUnmounted, ref } from "vue";
import { PlaneModel } from "./model/Plane.js";
export default {
  name: 'cloud',
  setup() {
    const bufferARef = ref(null);
    const bufferBRef = ref(null);
    const bufferCRef = ref(null);
    const bufferDRef = ref(null);

    let planeA;

    const initA = () => {
      planeA = new PlaneModel(bufferARef.value);
    }

    onMounted(() => {
      setTimeout(() => {
        initA()
      })
    })

    onUnmounted(() => {
      if (planeA) {
        planeA.dispose()
      }
    })

    return {
      bufferARef,
      bufferBRef,
      bufferCRef,
      bufferDRef
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
.bufferA {
  width: calc(50vw - 20px);
  height: calc(50vh - 20px);
  border: 1px solid orange;
}
canvas {
  width: 100%;
  height: 100%;
}
</style>