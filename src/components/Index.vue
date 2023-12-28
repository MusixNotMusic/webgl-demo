<template>
    <router-view />
</template>

<script setup>
import { ColorSystem }from './utils/color/ColorSystem'
const colorSystem = new ColorSystem();
colorSystem.initColorTexture();
window['__YW__'] = {}
window['__YW__'].colorSystem = colorSystem;
</script>

<style scoped>
</style>
