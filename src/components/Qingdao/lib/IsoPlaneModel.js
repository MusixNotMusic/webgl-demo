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
      alt: 50000,
      width: 220,
      height: 220 * 3 / 13
    }

    window.IsoPlaneModel = this;
  }

  render () {
    return this.loadTextureData().then((texture) => {
      this.initIsoPlane(texture);

      const { renderer, scene, camera } = this;
      renderer.render(scene, camera);
    })
  }


  loadTextureData (url) {
    return new Promise((resolve, reject) => {
      this.isoIsoPlaneCanvas = initIsoPlaneCanvas(this.map, (result) => {
        const texture = new THREE.CanvasTexture(result.domElement);
        resolve(texture)
      }, false)
    })
  }

  /**
   * 雷达探测区域
   */
  initIsoPlane (texture) {
      const planeInfo = this.planeInfo; 

      const { width, height, high } = planeInfo;

      const uniforms = this.uniforms;
      
      const geometry = new THREE.PlaneGeometry( width * 1e3, height * 1e3 );

      // const material = new THREE.RawShaderMaterial( {
      //     glslVersion: THREE.GLSL3,
      //     uniforms: uniforms,
      //     vertexShader: vertexShader,
      //     fragmentShader: fragmentShader,
      //     transparent: true,
      //     side: THREE.DoubleSide,
      //     depthTest: false,
      //     depthWrite: false
      // });

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

      object.WGS84Position = new THREE.Vector3(planeInfo.lngLat[0], planeInfo.lngLat[1], planeInfo.alt);

      this.plane = object;

      this.scene.add(object);
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
