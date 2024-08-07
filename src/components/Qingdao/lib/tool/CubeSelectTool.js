import * as THREE from 'three';



export class CubeSelectTool {
    constructor(map, renderer, scene, camera) {
        this.map = map;

        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
    }

    enableMapboxDrag (yes) {
        yes ? this.map.dragPan.enable() : this.map.dragPan.disable();
    }

    addEventLinstener () {
        const mousedown = () => {

        }

        const mousemove = () => {
            
        }

        const mouseup = () => {
            
        }

        const mousedownBind = mousedown.bind(this);
        const mousemoveBind = mousemove.bind(this);
        const mouseupBind = mouseup.bind(this);
    }
    

    render() {

    }
}