import * as turf from "@turf/turf";


export const chengdu = [104.065735, 30.659462];
export const lasa = [101.4258811943111, 30.455436180946947];


const radarTestSet = [
    {
        "lon": 104.1465432836781,
        "lat": 30.857102559661133,
        "alt": 493.282183324013,
        "height": 1000,
        "name": "radar-1",
        "radius": 75,
    },
    {
        "lon": 103.79008084540231,
        "lat": 30.540806567830078,
        "alt": 488.5099845127259,
        "height": 1000,
        "name": "radar-2",
        "radius": 75,
    },
    {
        "lon": 103.54880099492942,
        "lat": 30.749339183781178,
        "alt": 609.5438471493073,
        "height": 1000,
        "name": "radar-3",
        "radius": 75,
    },
    {
        "lon": 103.23425734970041,
        "lat": 30.19657742567797,
        "alt": 699.8681397862983,
        "height": 1000,
        "name": "radar-4",
        "radius": 75,
    },
    {
        "lon": 103.05076643475697,
        "lat": 30.948763753159504,
        "alt": 2891.955542046845,
        "height": 1000,
        "name": "radar-5",
        "radius": 75,
    },
    {
        "lon": 102.71397336942259,
        "lat": 30.23996457426491,
        "alt": 2443.371060939059,
        "height": 1000,
        "name": "radar-6",
        "radius": 75,
    },
    {
        "lon": 102.55763125591625,
        "lat": 30.940925893622044,
        "alt": 4244.862272878927,
        "height": 1000,
        "name": "radar-7",
        "radius": 75,
    },
    {
        "lon": 102.20330233612538,
        "lat": 30.306340769021894,
        "alt": 2194.2606681712,
        "height": 1000,
        "name": "radar-8",
        "radius": 75,
    },
    {
        "lon": 101.97835264064018,
        "lat": 30.772695486265956,
        "alt": 2048.866482602262,
        "height": 1000,
        "name": "radar-9",
        "radius": 75,
    },
    {
        "lon": 101.5925083565761,
        "lat": 30.236526051170436,
        "alt": 4170.985411788492,
        "height": 1000,
        "name": "radar-10",
        "radius": 75,
    }
]

const testDateSet = [
    {
        "lon": 104,
        "lat": 30,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 31,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 32,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 33,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 34,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 35,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 36,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 37,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 38,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 39,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 40,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 41,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 42,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 43,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 44,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 45,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 46,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 47,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 48,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    },
    {
        "lon": 104,
        "lat": 49,
        "alt": 800,
        "height": 1000,
        "name": "radar-1",
        "radius": 75
    }
]


/**
 * 随机分配
 * @param start
 * @param dest
 * @param size
 * @returns {[]}
 */
export function generateRadarPoint(map, start, dest, size) {
    const exaggeration =  map.getTerrain() ? map.getTerrain().exaggeration : 1;
    testDateSet.forEach(item => item.alt = item.alt * exaggeration);
    return testDateSet;
}