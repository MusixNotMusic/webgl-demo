import {  getIsolineGeoJson, getIsobandsGeoJson } from '@cdyw/asd-2d';
import { autoStationData, autoStationOption, colorsStep } from './autoStationData';
import { geojson2Canvas2 } from './Geojson2Canvas';
import * as turf from '@turf/turf'

export function initIsoPlaneCanvas (map, cb, debug) {
    const options = autoStationOption;
    const colors = colorsStep.map(item => item.color);
    const breaks = colorsStep.map(item => item.value);
    const option = {
        data: autoStationData,
        key: options.type,
        textColor: options.textColor,
        breaks: breaks,
        colors: colors
    }

    const points = autoStationData.map(item => {
        return {
            point: [item.lon, item.lat],
            value: item[option.key]
        }
    })

    const isoline = null;
    // const isoline = getIsolineGeoJson(map, option);
    const isoband = getIsobandsGeoJson(map, option);

    let load1 = false;
    let load2 = false;
    let geojsons = [];

    const reorder = () => {
        if (load1 && load2) {
            console.log('reorder',  geojsons)
        }
    }

    const demo = (geojson, bbox) => {
        const height = 300;

        const widthDis = turf.distance(turf.point([bbox[0], bbox[3]]), turf.point([bbox[2], bbox[3]]));
        const heightDis = turf.distance(turf.point([bbox[2], bbox[1]]), turf.point([bbox[2], bbox[3]]));

        const apest = widthDis / heightDis;
        // const apest = (bbox[2] - bbox[0]) / (bbox[3] - bbox[1]);
        const scale = heightDis / height * 1000;

        let result = geojson2Canvas2(geojson.data, points, height * apest, height)
        if (debug) {
            result.domElement.style.position = 'fixed'
            result.domElement.style.zIndex = 10
            document.body.append(result.domElement);
        }
        return result;
    }

    // isoline.promise.then((geojson) => {
    //     geojsons.push(geojson);
    //     load1 = true;
    //     reorder(geojson);
    // })

    isoband.promise.then((geojson) => {
        geojsons.push(geojson);
        load2 = true;
        reorder(geojson);

        isoband.result = demo(geojson, isoband.bbox);

        if (cb) cb(isoband.result);
    })

    console.log('isoline, isoband', isoline, isoband)
    
    return {
        dispose: () => {

            // if (isoline.worker) {
            //     if (isoline.worker.target) {
            //         isoline.worker.target.terminate();
            //     } else {
            //         isoline.worker.terminate();
            //     }
            // }

            if (isoband.worker) {
                if (isoband.worker.target) {
                    isoband.worker.target.terminate();
                } else {
                    isoband.worker.terminate();
                }
            }

            if (isoband.result) {
                isoband.result.domElement.remove();
            }
        }
    }
}