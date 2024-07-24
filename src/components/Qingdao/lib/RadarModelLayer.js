import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { radarInfoList } from './data/radar'

import vertexShader from './shader/radar/global.vert'
import fragmentShader from './shader/radar/global.frag'

import RadarModel from './RadarModel';

/***
 * 矩形立方体的 等值面结构
 */
export default class RadarModelLayer extends BaseMercatorMeterProjectionModelClass{
  constructor (id, map, radarList) {
    super(id, map);
    
    this.id = id;
    
    this.map = map;

    this.radarList = radarList || radarInfoList;

    this.radarModelList = [];

    this.zoomBind = this.zoom.bind(this);

    window.radarModel = this;
  }


  renderHook() {
    this.radarModelList.forEach(radarModel => {
      if (radarModel) {
        radarModel.updateCameraPosition();
      }
    })
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
    this.drawLayer();
    return this.initRadarModel().then(() => {
      return null;
    })
  }



  initRadarModel () {
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load( '/model/fbx/radar3.fbx',  ( _model ) => {
        const model = new WGS84Object3D(_model);
        this.radarList.forEach(radarInfo => {

          const object = model.clone();
          radarInfo.model = object;
          const radarModelInstance = new RadarModel(this.renderer, this.camera, this.scene, radarInfo);

          radarModelInstance.render();
          this.radarModelList.push(radarModelInstance);
        })

        resolve(model);
      });
    
    })
  }

  destroy () {
    super.destroy();
    this.radarModelList.forEach(radar => radar && radar.destroy());
  }

  dispose () {
    this.destroy()
  }

}
