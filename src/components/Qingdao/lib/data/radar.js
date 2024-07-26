import { randomPosition } from '@turf/turf'
// 青岛随机坐标
const randomQingdao = () => randomPosition([119, 35, 121, 37]);

const randomQingdao2 = () => randomPosition([118, 34, 122, 38]);

export const radarInfoList = [
    {
        id: 1,
        name: 'radar-1',
        lngLat: randomQingdao(),
        alt: 0,
        radius: 75
    },
    {
        id: 2,
        name: 'radar-2',
        lngLat: randomQingdao(),
        alt: 0,
        radius: 150
    },
    {
        id: 3,
        name: 'radar-3',
        lngLat: randomQingdao(),
        alt: 0,
        radius: 75
    },
    // {
    //     id: 4,
    //     name: 'radar-4',
    //     lngLat: randomQingdao(),
    //     alt: 0,
    //     radius: 150
    // },
    // {
    //     id: 5,
    //     name: 'radar-5',
    //     lngLat: randomQingdao(),
    //     alt: 0,
    //     radius: 75
    // },
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
            COVERAGE: 0.34,
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
    //     alt: 1e5 * 1.5,
    //     width: 1e6,
    //     height: 1e6,
    //     value: {
    //         COVERAGE: 0.43,
    //         FBM_FREQ: 2.76434,
    //         OFFSET: 3.0,
    //         windU: 0.03,
    //         windV: 0.02,
    //     }
    // },
]


export const kaInfoList = [
    {
        id: 1,
        name: 'ka-1',
        lngLat: randomQingdao2(),
        alt: 0,
        radius: 75
    },
    {
        id: 2,
        name: 'ka-2',
        lngLat: randomQingdao2(),
        alt: 0,
        radius: 75
    },
    {
        id: 3,
        name: 'ka-3',
        lngLat: randomQingdao2(),
        alt: 0,
        radius: 75
    }
]