import * as THREE from 'three';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { radarTestSet } from "./Constants";

import BaseModelLayer from "./BaseModelLayer";

/***
 * 矩形立方体的 等值面结构
 */
export default class DemoModelLayer extends BaseModelLayer{
  constructor (id, map) {
    super(id, map);
    
    this.modelSize = { x: 2000, y: 2000, z: 4000 }

    this.type = 'radar'

    this.resizeBind = this.resize.bind(this);

    this.data = radarTestSet;
    // 预计边界
    this.calcModelBounds();

    this.zoomBind = this.zoom.bind(this);

    this.control = new TransformControls( this.camera, this.renderer.domElement );

    window.radar = this;
    window.THREE = THREE;

  }

  zoom() {
    let zoom = this.map.getZoom();
    if (this.css2DRenderer) {
      const list = this.css2DRenderer.domElement.querySelectorAll('.name')
      list.forEach(dom => {
        dom.style.transform = `scale(${zoom / 10})`;
      })
    }
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
            type: this.type
          }

          custom.add(object)

          this.setObjectBounds(custom, item.bounds);

          // const boxGeometry = new THREE.BoxGeometry(500, 500, 500);
          // const boxMaterial = new THREE.MeshBasicMaterial( { color: 'red' } );
          // const box = new THREE.Mesh(boxGeometry, boxMaterial);
          // boxMaterial.wireframe = true;
          // custom.add( box );


          const axesHelper = new THREE.AxesHelper(500);
          custom.add(axesHelper);
          
          scene.add( custom );

          if (index === 0) {

            const box = new THREE.BoxGeometry(10);
            const material = new THREE.MeshBasicMaterial({ color: 'blue' });

            const { control } = this;
            control.addEventListener( 'dragging-changed', ( event ) => {

              controls.enabled = ! event.value;
    
            } );
            control.attach( custom );
            scene.add( control );
            window.control = control;
            // this.setObjectBounds(control, item.bounds);
          }

          this.addCSS2Object(custom, item.name);
        })

        resolve(model)
      });
    })
  }

  setMeshBounds (mesh, bounds) {
    const min = mapboxgl.MercatorCoordinate.fromLngLat([bounds.minX, bounds.maxY], bounds.minZ);
    const max = mapboxgl.MercatorCoordinate.fromLngLat([bounds.maxX, bounds.minY], bounds.maxZ);

    const boundScaleBox = [  min.x, min.y, min.z, max.x, max.y, max.z ];

    mesh.position.x = (boundScaleBox[0] + boundScaleBox[3]) / 2;
    mesh.position.y = (boundScaleBox[1] + boundScaleBox[4]) / 2;
    mesh.position.z = (boundScaleBox[2] + boundScaleBox[5]) / 2;

    mesh.scale.x = (boundScaleBox[3] - boundScaleBox[0]);
    mesh.scale.y = (boundScaleBox[4] - boundScaleBox[1]);
    mesh.scale.z = (boundScaleBox[5] - boundScaleBox[2]);
  }


  lookAt() {
    const radar1 = this.scene.getObjectByName('radar-1');
    const radar2 = this.scene.getObjectByName('radar-2');

    window.radar1 = radar1;
    window.radar2 = radar2;

    const { x, y, z } = radar2.position;

    radar1.lookAt(x, y, z);

    radar1.rotateY(-Math.PI / 2);
    radar1.rotateZ(-Math.PI / 2);
  }

  lookAt2() {
    const source = this.scene.getObjectByName('radar-1');
    const target = this.scene.getObjectByName('radar-2');

    const faceVector = source.faceVector || new THREE.Vector3(0, 1, 0);



    const sPos = source.position.clone();
    const tPos = target.position.clone();

    const h1 = new THREE.Vector2(sPos.x, sPos.z);
    const h2 = new THREE.Vector2(tPos.x, tPos.z);
    const elevation = h1.sub(h2).angle()

    const v1 = new THREE.Vector2(tPos.x, tPos.y);
    const v2 = new THREE.Vector2(sPos.x, sPos.y);
    const direction = v1.sub(v2).angle();

    source.rotateZ(direction);
    // source.rotateX(elevation);
  }

  destroy () {
    super.destroy();
  }

  dispose () {
    this.destroy()
  }

}
