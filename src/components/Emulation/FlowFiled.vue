<template>
  <div class="flow-feild-wrap">
    <canvas class="canvas" id="canvas-webgl"></canvas>
    <div class="p-preloader"></div>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import init from '../../core/FlowField/flow_field_2/init'
export default {
  name: 'FlowField',
  setup() {
    onMounted(() => {
      init();
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.flow-feild-wrap {
}

.canvas{
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
}

.p-preloader {
  width: 900px;
  height: 600px;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
