export const colorsStep = [
    {
        "value": -30,
        "color": "rgb(0,0,255)"
    },
    {
        "value": -28,
        "color": "rgb(0,16,238)"
    },
    {
        "value": -26,
        "color": "rgb(0,32,222)"
    },
    {
        "value": -24,
        "color": "rgb(0,49,205)"
    },
    {
        "value": -22,
        "color": "rgb(0,65,189)"
    },
    {
        "value": -20,
        "color": "rgb(0,82,172)"
    },
    {
        "value": -18,
        "color": "rgb(0,98,156)"
    },
    {
        "value": -16,
        "color": "rgb(0,115,139)"
    },
    {
        "value": -14,
        "color": "rgb(0,131,123)"
    },
    {
        "value": -12,
        "color": "rgb(0,148,106)"
    },
    {
        "value": -10,
        "color": "rgb(0,164,90)"
    },
    {
        "value": -8,
        "color": "rgb(0,180,74)"
    },
    {
        "value": -6,
        "color": "rgb(0,197,57)"
    },
    {
        "value": -4,
        "color": "rgb(0,213,41)"
    },
    {
        "value": -2,
        "color": "rgb(0,230,24)"
    },
    {
        "value": 0,
        "color": "rgb(0,246,8)"
    },
    {
        "value": 2,
        "color": "rgb(8,246,0)"
    },
    {
        "value": 4,
        "color": "rgb(24,230,0)"
    },
    {
        "value": 6,
        "color": "rgb(41,213,0)"
    },
    {
        "value": 8,
        "color": "rgb(57,197,0)"
    },
    {
        "value": 10,
        "color": "rgb(74,180,0)"
    },
    {
        "value": 12,
        "color": "rgb(90,164,0)"
    },
    {
        "value": 14,
        "color": "rgb(106,148,0)"
    },
    {
        "value": 16,
        "color": "rgb(123,131,0)"
    },
    {
        "value": 18,
        "color": "rgb(139,115,0)"
    },
    {
        "value": 20,
        "color": "rgb(156,98,0)"
    },
    {
        "value": 22,
        "color": "rgb(172,82,0)"
    },
    {
        "value": 24,
        "color": "rgb(189,65,0)"
    },
    {
        "value": 26,
        "color": "rgb(205,49,0)"
    },
    {
        "value": 28,
        "color": "rgb(222,32,0)"
    },
    {
        "value": 30,
        "color": "rgb(238,16,0)"
    }
]

export const autoStationOption = {
    "type": "tem",
    "textColor": "#D92B39",
    "lineColor": "#D92B39"
} 

export function getData () {
    return [
        {
            id: 2,
            name: '青岛国家基本气象站毫米波测云仪',
            lon: 120.328611,
            lat: 36.072222,
            tem: Math.random() * 20 - 5,
        },
        {
            id: 3,
            name: '莱西国家基本气象站毫米波测云仪',
            lon: 120.56,
            lat: 36.903056,
            tem: Math.random() * 20 - 5,
        },
        {
            id: 4,
            name: '平度国家基本气象站毫米波测云仪',
            lon: 119.993333,
            lat: 36.790278,
            tem: Math.random() * 20 - 5,
        },
        {
            id: 5,
            name: '董家口毫米波测云仪',
            lon: 119.779444,
            lat: 35.624722,
            tem: Math.random() * 20 - 5,
        }
    ]
}

export const autoStationData = [
    {
        id: 2,
        name: '青岛国家基本气象站毫米波测云仪',
        lon: 120.328611,
        lat: 36.072222,
        tem: Math.random() * 20 - 5,
    },
    {
        id: 3,
        name: '莱西国家基本气象站毫米波测云仪',
        lon: 120.56 + 0.2,
        lat: 36.903056 + 0.2,
        tem: Math.random() * 20 - 5,
    },
    {
        id: 4,
        name: '平度国家基本气象站毫米波测云仪',
        lon: 119.993333,
        lat: 36.790278,
        tem: Math.random() * 20 - 5,
    },
    {
        id: 5,
        name: '董家口毫米波测云仪',
        lon: 119.779444 - 0.2,
        lat: 35.624722 - 0.2,
        tem: Math.random() * 20 - 5,
    }
]
