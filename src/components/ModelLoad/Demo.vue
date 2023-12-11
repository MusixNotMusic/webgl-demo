<template>
    <MapboxGLInit @mapboxGLLoaded="mapboxGLLoadedFunc" :center="center"></MapboxGLInit>
</template>

<script setup>
import mapboxgl from 'mapbox-gl';
import { onMounted, onUnmounted, ref } from 'vue';
import mapboxgl from 'mapbox-gl';
import MapboxGLInit from '../Map/MapboxGLInit.vue';
import DemoModelLayer from './DemoModelLayerV2';
import { Threebox, THREE } from 'threebox-plugin';

import { TransformControls } from 'three/addons/controls/TransformControls.js';
import Test from './ModelDemo/Demo';

window.THREE = THREE;
window.mapboxgl = mapboxgl;

const mapboxGLLoadedFunc = (map) => {
    window.mapIns = map;
    console.log('mapboxGLLoadedFunc ==>', map)
    addDemoModelLayer(map);

    addThreeBoxModelLayer(map);
}

const center = ref([104.1465432836781, 30.867102559661133]);
let instance;
let test;
const addDemoModelLayer = (map) => {
    // if (!instance) {
    //     instance = new DemoModelLayer('demo', map);
    // }
    // instance.render();

    if (!test) {
        test = new Test('test', map);
    }
    test.render();
}

const addThreeBoxModelLayer = (map) => {
    let radar;
    let control;

    map.addLayer({
        id: 'custom_layer',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, mbxContext) {

            window.tb = new Threebox(
                map,
                mbxContext,
                { defaultLights: true }
            );

            control = new TransformControls(tb.camera, tb.renderer.domElement );

            var options = {
                obj: '/model/fbx/radar.fbx',
                type: 'fbx',
                scale: 1,
                units: 'meters',
                rotation: { x: 0, y: 0, z: 0 } //default rotation
            }

            tb.loadObj(options, function (model) {
                radar = model.setCoords(center.value);
                tb.add(radar);

                // control.setCoords([104, 30])
                // control.position.set(radar.position.x, radar.position.y, radar.position.z)
                control.attach(radar);
                control.scale.set(100, 100, 100);
                tb.add(control);
            })

        },
        render: function (gl, matrix) {
            tb.update();
        }
    });
}

onMounted(() => {
})

onUnmounted(() => {
    if(instance) instance.dispose();
    if(test) test.dispose();
})
    
</script>

<style scoped>
</style>
  