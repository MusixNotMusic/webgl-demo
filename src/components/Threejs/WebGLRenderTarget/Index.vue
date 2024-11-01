<template>
</template>
<script>
import { onMounted, onUnmounted } from 'vue';
import WebGLRendererTargetDemo from './lib/WebGLRenderTargetDemo';
export default {
    name: 'WebGLRenderTarget',
    setup () {
        const demo = new WebGLRendererTargetDemo();
        demo.init();
        
        onMounted(() => {

        })

        onUnmounted(() => {
            if (demo) {
                demo.dispose();
            }
        })
    }
}
</script>