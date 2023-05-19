<template>
    <canvas id="canvas">Canvas not supported</canvas>
    <div id="map"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { accessToken } from './token'

const centerOrigin =  [104, 80];
const radius = 460000;

mapboxgl.accessToken = accessToken;

let bounds;

const width = 400
const hieght = 400

const setBounds = () => {
    const offsetLat = 0;
    const ll = new mapboxgl.LngLat(centerOrigin[0], centerOrigin[1] + offsetLat);
    bounds = ll.toBounds(radius / 2).toArray()

    console.log('bounds', bounds)
}

const drawCanvas = () => {
    
    const canvas = document.getElementById('canvas');
    const alpha1 = bounds[0][1];
    const alpha2 = bounds[1][1];
    const centerAp = centerOrigin[1];

    const rad2deg = (rad) => rad / 180 * Math.PI;
    const cos = Math.cos;
    const tan = Math.tan;

    // const delta = Math.sin(alpha2 / alpha1)

    // const delta = 2 * tan(rad2deg(centerAp)) / (tan(rad2deg(alpha1)) + tan(rad2deg(alpha2)))
    // const delta =  (tan(rad2deg(alpha1)) + tan(rad2deg(alpha2))) - 2 * tan(rad2deg(centerAp))

    const alp = tan(rad2deg(alpha1)) + tan(rad2deg(alpha2)) - tan(rad2deg(centerAp))
    
    const delta = alp / tan(rad2deg(centerAp));

    console.log('degree ==>', Math.atan(alp), alp / tan(rad2deg(centerAp)))

    // const 

    console.log(delta)

    canvas.width = width;
    canvas.height = hieght;
    // canvas.setAttribute('id', 'canvas')
    const ctx = canvas.getContext('2d');
    // ctx.scale(1, delta);

    if (ctx) {
        canvas.style.display = 'none';
    }

    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, width, hieght);

    ctx.beginPath();
    ctx.arc(width / 2, hieght / 2 * delta, 5, 0, Math.PI * 2, true);
    ctx.fillStyle = 'blue';
    ctx.fill();

    return canvas;
}

const drawMarker = (coords) => {
    const marker2 = new mapboxgl.Marker()
    .setLngLat(centerOrigin)
    .addTo(map);

    coords.forEach((coord) => {
       new mapboxgl.Marker()
        .setLngLat(coord)
        .addTo(map);
    })
}

let map;
const initMapbox = () => {
    map = new mapboxgl.Map({
        container: 'map',
        // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
        style: 'mapbox://styles/mapbox/streets-v12',
        zoom: 5,
        center: centerOrigin,
        pitch: 45,
        projection: 'mercator',
        useWebGL2: true,
        antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
    });

    setBounds()
    drawCanvas()

    console.log('map ==>', map)

    const coordinates = [
        [bounds[0][0], bounds[1][1]],
        [bounds[1][0], bounds[1][1]],
        [bounds[1][0], bounds[0][1]],
        [bounds[0][0], bounds[0][1]]
    ]

    map.on('style.load', () => {
        map.addSource('canvas-source', {
            type: 'canvas',
            canvas: 'canvas',
            coordinates: coordinates,
            // Set to true if the canvas source is animated. If the canvas is static, animate should be set to false to improve performance.
        });
            
        map.addLayer({
            id: 'canvas-layer',
            type: 'raster',
            source: 'canvas-source'
        });
    });

    drawMarker(coordinates)
}

onMounted(() => {
    initMapbox()
})
    
</script>

<style scoped>
body {
    margin: 0; padding: 0; 
}

#map {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%; 
}
</style>
  