<template>
  <div class="wrap">
    <div class="bufferA">
      <canvas id="bufferA" width="100%" height="100%" ref="bufferARef"></canvas>
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
import * as THREE from 'three';
import bufferA from './shader/cloud/bufferA.glsl';
import frag from './shader/cloud/demo.frag';
import vertex from './shader/cloud/vertex.vert'
export default {
  name: 'cloud',
  setup() {
    const bufferARef = ref(null);
    const bufferBRef = ref(null);
    const bufferCRef = ref(null);
    const bufferDRef = ref(null);

    let camera, scene, renderer;
    
    let material;
    let quad

    let resolution = new THREE.Vector3();
    let mouse = new THREE.Vector4(212, 393, -203, -325);
    let mouseButton = new THREE.Vector4(0, 0, 0, 0);
    let normalizedMouse = new THREE.Vector2(0.26452599388379205, 0.9985507246376811);
    let frameCounter = 0;

    // Audio Init
    const audioContext = {
      sampleRate: 0
    };

    let clock = new THREE.Clock();
    let pausedTime = 0.0;
    let deltaTime = 0.0;
    let startingTime = 0;
    let time = startingTime;

    let date = new THREE.Vector4();

    let updateDate = function() {
      let today = new Date();
      date.x = today.getFullYear();
      date.y = today.getMonth();
      date.z = today.getDate();
      date.w = today.getHours() * 60 * 60
          + today.getMinutes() * 60
          + today.getSeconds()
          + today.getMilliseconds() * 0.001;
    };

    let forceAspectRatio = (width, height) => {
      // Forced aspect ratio
      let forcedAspects = [0,0];
      let forcedAspectRatio = forcedAspects[0] / forcedAspects[1];
      let aspectRatio = width / height;

      if (forcedAspectRatio <= 0 || !isFinite(forcedAspectRatio)) {
        let resolution = new THREE.Vector3(width, height, 1.0);
        return resolution;
      }
      else if (aspectRatio < forcedAspectRatio) {
        let resolution = new THREE.Vector3(width, Math.floor(width / forcedAspectRatio), 1);
        return resolution;
      }
      else {
        let resolution = new THREE.Vector3(Math.floor(height * forcedAspectRatio), height, 1);
        return resolution;
      }
    };

    const init = () => {
      const canvas = bufferARef.value;
      const gl = canvas.getContext('webgl2');

      resolution = forceAspectRatio(canvas.clientWidth, canvas.clientHeight);

      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, context: gl, preserveDrawingBuffer: true });
      camera = new THREE.OrthographicCamera(-resolution.x / 2.0, resolution.x / 2.0, resolution.y / 2.0, -resolution.y / 2.0, 1, 1000);
      camera.position.set(0, 0, 10);

      scene = new THREE.Scene();

      updateDate();
    }

    const renderBufferA = () => {
      material = new THREE.ShaderMaterial({
        fragmentShader: frag,
        vertexShader: vertex,
        // depthWrite: false,
        // depthTest: false,
        uniforms: {
          // iResolution: { type: 'v3', value: resolution },
          // iTime: { type: 'f', value: 0.0 },
          // iTimeDelta: { type: 'f', value: 0.0 },
          // iFrame: { type: 'i', value: 0 },
          // iMouse: { type: 'v4', value: mouse },
          // iMouseButton: { type: 'v2', value: mouseButton },
          //
          // iChannelResolution: { type: 'v3v', value: Array(10).fill(new THREE.Vector3(0,0,0)) },
          //
          // iDate: { type: 'v4', value: date },
          // iSampleRate: { type: 'f', value: audioContext.sampleRate },
          //
          // iChannel0: { type: 't' },
          // iChannel1: { type: 't' },
          // iChannel2: { type: 't' },
          // iChannel3: { type: 't' },
          // iChannel4: { type: 't' },
          // iChannel5: { type: 't' },
          // iChannel6: { type: 't' },
          // iChannel7: { type: 't' },
          // iChannel8: { type: 't' },
          // iChannel9: { type: 't' },
          //
          // resolution: { type: 'v2', value: resolution },
          // time: { type: 'f', value: 0.0 },
          // mouse: { type: 'v2', value: normalizedMouse },
        }
      })
      quad = new THREE.Mesh(
          new THREE.PlaneGeometry(100, 100),
          material
      );

      scene.add(quad);
    }

    function render() {
      requestAnimationFrame(render);
      // Pause Whole Render

      // Advance Time
      deltaTime = clock.getDelta();
      time = startingTime + clock.getElapsedTime() - pausedTime;
      updateDate();

      // console.log('render resolution ==>', resolution)

      // material.uniforms['iResolution'].value = resolution;
      // material.uniforms['iTimeDelta'].value = deltaTime;
      // material.uniforms['iTime'].value = time;
      // material.uniforms['iFrame'].value = frameCounter;
      // material.uniforms['iMouse'].value = mouse;
      // material.uniforms['iMouseButton'].value = mouseButton;
      //
      // material.uniforms['resolution'].value = resolution;
      // material.uniforms['time'].value = time;
      // material.uniforms['mouse'].value = normalizedMouse;

      quad.geometry = new THREE.PlaneGeometry(resolution.x, resolution.y);

      // Audio Update
      renderer.render(scene, camera);
    }

    const drawBufferA = () => {
      init()
      renderBufferA()
      render()
    }

    onMounted(() => {
      drawBufferA()
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