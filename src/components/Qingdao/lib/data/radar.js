import { randomPosition } from '@turf/turf'
// 青岛随机坐标
const randomQingdao = () => randomPosition([119, 35, 121, 37]);

const randomQingdao2 = () => randomPosition([118, 34, 122, 38]);

export const radarInfoList = [
    {
        id: 1,
        name: '青岛市-黄岛区-S波段',
        type: 'S',
        lngLat: [120.230278, 35.988611],
        alt: 0,
        radius: 200
    },
    {
        id: 2,
        name: '青岛市-崂山区-X波段',
        type: 'X',
        lngLat: [120.526111, 36.126944],
        alt: 0,
        radius: 75
    },
    {
        id: 7,
        name: '青岛市-即墨区-X波段',
        type: 'X',
        lngLat: [120.587222, 36.411667],
        alt: 0,
        radius: 75
    },
    {
        id: 3,
        name: '青岛市-平度市-X波段',
        type: 'X',
        lngLat: [119.884444, 36.796389],
        alt: 0,
        radius: 75
    },
    {
        id: 4,
        name: '青岛市-胶西区-X波段',
        type: 'X',
        lngLat: [119.858333, 36.168333],
        alt: 0,
        radius: 75
    },
    {
        id: 5,
        name: '青岛市-莱西区-X波段',
        type: 'X',
        lngLat: [120.473056, 36.938333],
        alt: 0,
        radius: 75
    },
    {
        id: 6,
        name: '青岛市-黄岛区-X波段',
        type: 'X',
        lngLat: [119.713889, 35.804722],
        alt: 0,
        radius: 75
    }
]


export const cloudInfoList = [
    {
        id: 1,
        name: 'cloud-1',
        lngLat: [120.5, 36],
        alt: 1e5 * 2,
        width: 1e6,
        height: 1e6,
        value: {
            COVERAGE: 0.5,
            FBM_FREQ: 2.76434,
            OFFSET: 2.3,
            windU: 0.02,
            windV: 0.01,
        }
    },
    // {
    //     id: 2,
    //     name: 'cloud-2',
    //     lngLat: [120.5, 36],
    //     alt: 1e5 * 1.98,
    //     width: 1e6,
    //     height: 1e6,
    //     value: {
    //         COVERAGE: 0.5,
    //         FBM_FREQ: 2.76434,
    //         OFFSET: 1.0,
    //         windU: 0.02,
    //         windV: 0.02,
    //     }
    // },

    // {
    //     id: 3,
    //     name: 'cloud-3',
    //     lngLat: [120.5, 36],
    //     alt: 1e5 * 1.96,
    //     width: 1e6,
    //     height: 1e6,
    //     value: {
    //         COVERAGE: 0.5,
    //         FBM_FREQ: 2.76434,
    //         OFFSET: 2.0,
    //         windU: 0.01,
    //         windV: 0.02,
    //     }
    // }
]


export const kaInfoList = [
    // {
    //     id: 1,
    //     name: '青岛市-市南区-ka',
    //     lngLat: [120.335556, 36.063889],
    //     alt: 0,
    //     radius: 75
    // },
    {
        id: 2,
        name: '青岛国家基本气象站毫米波测云仪',
        lngLat: [120.328611, 36.072222],
        alt: 0,
        radius: 75
    },
    {
        id: 3,
        name: '莱西国家基本气象站毫米波测云仪',
        lngLat: [120.56, 36.903056],
        alt: 0,
        radius: 75
    },
    {
        id: 4,
        name: '平度国家基本气象站毫米波测云仪',
        lngLat: [119.993333, 36.790278],
        alt: 0,
        radius: 75
    },
    {
        id: 5,
        name: '董家口毫米波测云仪',
        lngLat: [119.779444, 35.624722],
        alt: 0,
        radius: 75
    }
]