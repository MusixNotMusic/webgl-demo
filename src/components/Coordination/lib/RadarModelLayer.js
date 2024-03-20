import * as THREE from 'three';
import { LightProbeHelper } from 'three/addons/helpers/LightProbeHelper.js';

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

    window.radarModel = this;
    window.THREE = THREE;

    this.addEventListener();
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
      this.zoomBind()
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
      // this.addLight();
      this.drawLayer();
      // this.initLightHelper();
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

        object.scale.set(10, 10, 10);

        object.add(new THREE.AxesHelper(1000))

        this.demoModel = object;

        this.addCSS2Object(object, 'demo', null, [0, 500, 0]);

        this.scene.add(object)

        resolve(model);
      });
    })
  }

  initLightHelper () {

    const light = new THREE.DirectionalLight( 0xFFFFFF );
    const helper = new THREE.DirectionalLightHelper( light, 1000, 0x0f0fcc );

    const object = new WGS84Object3D(helper);
    object.WGS84Position = new THREE.Vector3(100, 30.05, 4400);

    object.add(new THREE.AxesHelper(1000));
    object.add(light);

    this.scene.add( object );
  }


  initPointLightHelper () {
    const pointLight = new THREE.PointLight( 0xff0000, 10, 10000 );
    const lightObject = new WGS84Object3D(pointLight);
    lightObject.WGS84Position = new THREE.Vector3(100, 29.95, 4400);
    this.scene.add( lightObject );

    const sphereSize = 100;
    const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize );
    const helper = new WGS84Object3D(pointLightHelper);
    helper.WGS84Position = new THREE.Vector3(100, 29.95, 4400);
    helper.add(new THREE.AxesHelper(1000));
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

  setMeshRotation (mesh, x, y, z) {
    if (x) mesh.rotateX(x);
    if (z) mesh.rotateZ(z);
    if (y) mesh.rotateY(y);
  }


  destroy () {
    super.destroy();
  }

  dispose () {
    this.destroy()
  }

}
