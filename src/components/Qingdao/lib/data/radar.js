import { randomPosition } from '@turf/turf'
// 青岛随机坐标
const randomQingdao = () => randomPosition([119, 35, 121, 37]);

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