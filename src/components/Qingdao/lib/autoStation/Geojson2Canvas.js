import * as d3 from 'd3-geo';
import * as turf from '@turf/turf';

/**
 * List<List<List<List<double>>>
 * @param {*} coordinates 
 */
function parseMultiPolygon(coordinates) {
    const group = [];
    if (coordinates.length > 0) {
        coordinates.forEach(one => {
            one.forEach((two, index) => {
                group.push(two)
            })
        })
    }

    return group;
}

/**
 * List<List<List<double>>
 * @param {*} coordinates 
 */
function parsePolygon(coordinates) {
    const group = [];
    if (coordinates.length > 0) {
        coordinates.forEach(one => {
            group.push(one)
        })
    }

    return group;
}

export function geojson2Canvas2(geojson, points, width, height) {
    console.time('geojson2canvas')

    // d3 geo
    const projection = d3.geoMercator().fitSize([width, height], geojson);

    // init canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    // 2d context
    const context = canvas.getContext('2d');

    geojson.features.forEach(feature => {
        const { geometry, properties } = feature;
        const { type, coordinates } = geometry;
        const { color } = properties;

        // parse
        let group = [];
        if (type === 'MultiPolygon') {
            group = parseMultiPolygon(coordinates);
        } else if (type === 'Polygon'){
            group = parsePolygon(coordinates);
        }

        // draw
        if (group.length > 0) {
            group.forEach(polygon => {
                context.beginPath();
                polygon.forEach(point => {
                    context.lineTo(...projection(point));
                })
                context.fillStyle = color;
                context.fill();
                context.strokeStyle = 'orangered';
                context.stroke();
            })
        }
    })

    points.forEach((item) => {
        const pos = projection(item.point);
        const value = item.value;
        
        context.beginPath();
        context.arc(pos[0], pos[1], 1, 0, Math.PI * 2);
        context.fillStyle = 'blue';
        context.fill();

        context.beginPath();
        context.fillStyle = 'red';
        context.font  = '30px serif';
        const { width } = context.measureText(item.value.toFixed(2));
        context.fillText(item.value.toFixed(2), pos[0] - width * 0.5, pos[1] + 30);
    })

    console.timeEnd('geojson2canvas')

    return {
        domElement: canvas
    }
}