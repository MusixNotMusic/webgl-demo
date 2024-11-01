import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { addCSS2Object, setMeshUniform } from './tool/utils';

import { initIsoPlaneCanvas } from './autoStation'

const isNumber = (number) => typeof number === 'number';
/**
 * Ka Cloud Radar
 */
export default class IsoPlaneModel{
  constructor (renderer, camera, scene, planeInfo) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    this.planeInfo = planeInfo || {
      type: 'S',
      lngLat: [120.230278, 35.988611],
      alt: 10000,
      width: 600,
      height: 600
    }

    window.IsoPlaneModel = this;
  }

  render () {
    return this.loadTextureData().then((result) => {
      if (!this.mesh) {
        this.initIsoPlane(result);
      }
      const { renderer, scene, camera } = this;
      renderer.render(scene, camera);
      return result;
    })
  }


  loadTextureData (url) {
    return new Promise((resolve, reject) => {
      this.isoIsoPlaneCanvas = initIsoPlaneCanvas(this.map, (result) => {
        const texture = new THREE.CanvasTexture(result.domElement);
        result.texture = texture;
        resolve(result)
      }, false)
    })
  }

  /**
   * 雷达探测区域
   */
  initIsoPlane (result) {
      const { texture, center, width, height, bbox } = result;
      const planeInfo = this.planeInfo; 

      // const { width, height, high } = planeInfo;
      const cosa = 1 / Math.cos(center[1] / 180 * Math.PI);

      const uniforms = this.uniforms;
      
      const geometry = new THREE.PlaneGeometry( width * 1e3 * cosa, height * 1e3 * cosa);

      const material = new THREE.MeshBasicMaterial( {
        transparent: true,
        side: THREE.DoubleSide,
        map: texture,
        depthTest: false,
        depthWrite: false
      });

      const mesh = new THREE.Mesh( geometry, material );

      mesh.name = 'iso-plane-'+ planeInfo.id

      this.mesh = mesh;

      const object = new WGS84Object3D(mesh);

      // object.WGS84Position = new THREE.Vector3(planeInfo.lngLat[0], planeInfo.lngLat[1], planeInfo.alt);
      object.WGS84Position = new THREE.Vector3(center[0], center[1], planeInfo.alt);

      this.plane = object;

      this.scene.add(object);
  }

  setAltitude(alt){
    return this.render().then(result => {
      const { texture, center } = result;
      if(this.mesh) {
        setTimeout(() => {
          this.mesh.material.map = texture;
        })
      }
      this.plane.WGS84Position = new THREE.Vector3(center[0], center[1], alt);
      return result;
    })
  }
 
 
  removeItem (object) {
    if (object) {
      this.scene.remove(object);
      object.clear();
    }
  }


  destroy () {
    this.planeInfo = null;
    // 删除 radarModel
    this.removeItem(this.plane);

    if(this.isoIsoPlaneCanvas) this.isoIsoPlaneCanvas.dispose();

    this.isDispose = true;
  }

  dispose () {
    this.destroy()
  }
}
