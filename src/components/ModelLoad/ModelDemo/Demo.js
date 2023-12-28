import * as THREE from 'three';
// import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { TransformControls } from '../TransformControls.js';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import { radarTestSet } from "../Constants";

import BaseModelLayer from "./BaseModelV2";

/***
 * 矩形立方体的 等值面结构
 */
export default class Test extends BaseModelLayer{
  constructor (id, map) {
    super(id, map);
    
    this.modelSize = { x: 2000, y: 2000, z: 4000 }

    this.type = 'radar'

    this.resizeBind = this.resize.bind(this);

    this.data = radarTestSet;
    // 预计边界

    this.zoomBind = this.zoom.bind(this);

    this.transformCamera = new THREE.PerspectiveCamera();

    this.control = new TransformControls( this.camera, this.renderer.domElement );

    window.Test = this;

  }

  zoom() {
    // let zoom = this.map.getZoom();
    // if (this.css2DRenderer) {
    //   const list = this.css2DRenderer.domElement.querySelectorAll('.name')
    //   list.forEach(dom => {
    //     dom.style.transform = `scale(${zoom / 10})`;
    //   })
    // }
  }

  addEventListener() {
    if (this.map) {
      this.map.on('zoom', this.zoomBind);
    }
  }

  removeEventListener() {
    if (this.map) {
      this.map.off('zoom', this.zoomBind);
    }
  }

  render () {
    return this.initMesh().then(() => {
      this.addLight();
      this.drawLayer();
      return null;
    })
  }

  initMesh () {
    const { scene } = this
    const loader = new FBXLoader();


    return new Promise((resolve, reject) => {
      loader.load( '/model/fbx/radar2.fbx',  ( model ) => {
        // loader.load( '/model/fbx/mig23mld.fbx',  ( model ) => {
        console.log('this.modelSize ==>');
        this.data.forEach((item, index) => {
          const object = model.clone();

          this.setMeshSide(object);

          object.rotation.x += Math.PI / 2;

          this.setObjectCenter(object);

          const custom = new THREE.Object3D();

          custom.name = item.name;

          custom.userData = {
            lon: item.lon,
            lat: item.lat,
            type: this.type,
            scale: 1
          }

          custom.add(object)

          this.setObjectCoords(custom);

          const axesHelper = new THREE.AxesHelper(500);
          custom.add(axesHelper);

          // this.addNewScene( custom );
          this.scene.add( custom );

          if (index === 0) {
            const { control } = this;
            control.addEventListener( 'dragging-changed', ( event ) => {

              // controls.enabled = ! event.value;
    
            });
            control.attach( custom );
            scene.add( control );
          }

          this.addCSS2Object(custom, item.name);
        })

        resolve(model)
      });
    })
  }



  lookAt() {
    const radar1 = this.scene.getObjectByName('radar-3');
    const radar2 = this.scene.getObjectByName('radar-2');

    window.radar1 = radar1;
    window.radar2 = radar2;

    const { x, y, z } = radar2.position;

    radar1.lookAt(x, y, z);

    // radar1.rotateZ(Math.PI / 2);
    // radar1.rotateX(Math.PI / 2);
  }

  destroy () {
    super.destroy();
  }

  dispose () {
    this.destroy()
  }

}
