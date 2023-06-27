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
import { PlaneModel1 } from "./model/Plane1.js";
import { BoxModel } from "./model/Box.js";
import demo1FragmentShader  from './shader/cloud/view.frag'
// import cloudFragmentShader  from './shader/cloud/cloud.glsl'
import cloud1FragmentShader  from './shader/cloud/cloud1.glsl'

// import cloudBoxFragmentShader from './shader/cloud/box.frag'
import cloudBoxFragmentShader from './shader/cloud/box1.frag'
import { Box2 } from "three";
export default {
  name: 'cloud',
  setup() {
    const bufferARef = ref(null);
    const bufferBRef = ref(null);
    const bufferCRef = ref(null);
    const bufferDRef = ref(null);

    let planeA = ref(null);
    let planeB = ref(null);
    let planeC = ref(null);

    const initA = () => {
      planeA.value = new PlaneModel(bufferARef.value);
      console.log('planeA ==>', planeA.value)
    }

    const initB = () => {
      const option = {
        fragmentShader: cloudBoxFragmentShader,
        // uniforms: { tex: { value: null }}
      }
      planeB.value = new BoxModel(bufferBRef.value, option);
      console.log('planeB ==>', planeB.value)
    }

    const initC = () => {
      const option = {
        fragmentShader: cloud1FragmentShader || demo1FragmentShader,
      };
      planeC.value = new PlaneModel1(bufferCRef.value, option);
    }

    onMounted(() => {
      setTimeout(() => {
        // initA()
        initB()
        // initC()
      })
    })

    onUnmounted(() => {
      if (planeA.value) planeA.value.dispose()
      if (planeB.value) planeB.value.dispose()
      if (planeC.value) planeC.value.dispose()
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