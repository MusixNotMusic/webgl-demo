import * as THREE from 'three';

// import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { TransformControls } from './TransformControls';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import {chengdu, generateRadarPoint, lasa} from "./Constants";

import { WGS84Object3D } from './WGS84Object3D'

/***
 * 矩形立方体的 等值面结构
 */
export default class RadarModelLayer extends BaseMercatorMeterProjectionModelClass{
  constructor (id, map) {
    super(id, map);
    
    this.id = id;
    
    this.map = map;

    this.modelSize = { x: 2000, y: 2000, z: 4000 }

    this.data = generateRadarPoint(map, chengdu, lasa, 10)

    this.zoomBind = this.zoom.bind(this);
    this.clickBind = this.click.bind(this);

    this.control = new TransformControls(this.camera, this.renderer.domElement );

    window.control = this.control;
    window.radarModel = this;
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

  click(event) {
    this.raycast(event)
  }

  addEventListener() {
    if (this.map) {
      this.zoomBind()
      this.map.on('zoom', this.zoomBind);

      this.map.on('click', this.clickBind);
    }
  }

  removeEventListener() {
    if (this.map) {
      this.map.off('zoom', this.zoomBind);
      this.map.off('click', this.clickBind);
    }
  }

  render () {
    return this.initMesh().then(() => {
      // this.addLight();
      this.drawLayer();
      this.initDirectionalLightHelper();
      this.initPointLightHelper();
      this.initDemoMesh();
      return null;
    })
  }

  initMesh () {
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load( '/model/fbx/radar2.fbx',  ( model ) => {
        const object = new THREE.Object3D();

        object.add(model);

        object.rotation.x = Math.PI / 2;

        this.setObjectCenter(model);

        const size = this.getObjectSize(model);

        model.position.y += size.y / 2;

        this.data.forEach((item) => {

          const mesh = object.clone();

          const custom = new THREE.Object3D();

          custom.userData = {
            lon: item.lon,
            lat: item.lat,
            alt: item.alt,
            name: item.name,
            scale: 5
          }

          custom.add(mesh)

          this.setObjectCoords(custom);

          this.addNewScene(custom);

          this.addCSS2Object(custom, item.name, null, [0, 0, 500]);
        })

        resolve(model);
      });
    })
  }


  initDemoMesh () {
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load( '/model/fbx/radar2.fbx',  ( model ) => {
        const object = new WGS84Object3D(model);

        object.WGS84Position = new THREE.Vector3(100, 30, 400);

        object.rotation.x = Math.PI / 2;

        object.scale.set(20, 20, 20);

        object.add(new THREE.AxesHelper(1000))

        window.demoModel = object;

        this.addCSS2Object(object, 'demo', null, [0, 500, 0]);

        this.scene.add(object)

        this.control.attach(object);

        this.scene.add( this.control );

        // const control = new WGS84Object3D(this.control);

        // control.WGS84Position = new THREE.Vector3(100, 30, 400);

        // window.controlObject = control;

        // this.scene.add( control );

        resolve(model);
      });
    })
  }

  initDirectionalLightHelper () {

    const light = new THREE.DirectionalLight( 0xFFFFFF );
    const helper = new THREE.DirectionalLightHelper( light.clone(), 1000, 0x0f0fcc );

    const object = new WGS84Object3D(helper);
    object.matrixWorldAutoUpdate = false;
    object.WGS84Position = new THREE.Vector3(100, 30.05, 4400);

    window.DirectionalLight = object;

    object.add(new THREE.AxesHelper(1000));
    object.add(light);

    this.scene.add( object );
  }


  initPointLightHelper () {
    const pointLight = new THREE.PointLight( 0xff0000, 10, 10000 );
    const lightObject = new WGS84Object3D(pointLight);
    lightObject.WGS84Position = new THREE.Vector3(100, 29.95, 4400);
    lightObject.add(new THREE.AxesHelper(1000));

    // const sphere = new THREE.SphereGeometry(200);
    // const object = new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: 0xff00ff }) );
    // lightObject.add(object);

    this.scene.add( lightObject );

    window.PointLight = lightObject;

    const sphereSize = 100;
    const pointLightHelper = new THREE.PointLightHelper( pointLight.clone(), sphereSize );
    const helper = new WGS84Object3D(pointLightHelper);
    helper.WGS84Position = new THREE.Vector3(100, 29.95, 4400);
    this.scene.add( helper );
  }


  calcModelRotation () {
    this.testSet.forEach(item => {
      const point1 = item.origin;
      const point2 = item.destination;

      const mm1 = mapboxgl.MercatorCoordinate.fromLngLat(point1.slice(0, 2), point1[2]);
      const mm2 = mapboxgl.MercatorCoordinate.fromLngLat(point2.slice(0, 2), point2[2]);

      const v1 = new THREE.Vector2(mm1.x, mm1.y);
      const v2 = new THREE.Vector2(mm2.x, mm2.y);
      const dir = v1.sub(v2).angle();

      let bearing = Math.atan2( point1[2] - point2[2], item.distance );
      item.rotation = {
        x: null,
        y: item.calcElevation ? -bearing : 0,
        z: -dir
      }
    })

  }


  raycast(event) {
    var mouse = new THREE.Vector2();
    mouse.x = ( event.point.x / this.map.transform.width ) * 2 - 1;
    mouse.y = 1 - ( event.point.y / this.map.transform.height ) * 2;

    const raycaster = new THREE.Raycaster();

    raycaster.setFromCamera(mouse, this.camera);

    const projectionMatrixInvert = this.camera.projectionMatrix.invert();
    const cameraPosition =
            new THREE.Vector3().applyMatrix4(projectionMatrixInvert);
    const mousePosition =
            new THREE.Vector3(mouse.x, mouse.y, 1)
            .applyMatrix4(projectionMatrixInvert);
    const viewDirection = mousePosition.clone()
            .sub(cameraPosition).normalize();

    raycaster.set(cameraPosition, viewDirection);

    console.log('raycaster', raycaster.intersectObjects(this.scene.children, true));
  }

  setMeshRotation (mesh, x, y, z) {
    if (x) mesh.rotateX(x);
    if (z) mesh.rotateZ(z);
    if (y) mesh.rotateY(y);
  }

  disableAll() {
    this.map.dragPan.disable();
    // this.map.dragRotate.disable();
    this.map.doubleClickZoom.disable();
  }

  enableAll() {
    this.map.dragPan.enable();
    // this.map.dragRotate.enable();
    this.map.doubleClickZoom.enable();
  }


  destroy () {
    super.destroy();
  }

  dispose () {
    this.destroy()
  }

}
