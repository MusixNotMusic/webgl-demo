import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { radarInfoList, cloudInfoList, kaInfoList } from './data/radar'

import vertexShader from './shader/radar/global.vert'
import fragmentShader from './shader/radar/global.frag'

import RadarModel from './RadarModel';
import KaModel from './KaModel';

// import HorizonClouds from './HorizonClouds';
import HorizonClouds2D from './HorizonClouds2D';

/***
 * 矩形立方体的 等值面结构
 */
export default class QingdaoScene extends BaseMercatorMeterProjectionModelClass{
  constructor (id, map, radarInfoList_) {
    super(id, map);
    
    this.id = id;
    
    this.map = map;

    this.radarInfoList = radarInfoList_ || radarInfoList.slice(0, 2);

    this.cloudInfoList = cloudInfoList;

    this.kaInfoList = kaInfoList;

    this.radarModelList = [];

    this.cloudModelList = [];

    this.kaModelList = [];

    this.zoomBind = this.zoom.bind(this);
  }


  renderHook() {
    // 雷达
    this.radarModelList.forEach(radarModel => {
      if (radarModel) {
        radarModel.updateCameraPosition();
      }
    })

    //  ka 云雷达
    this.kaModelList.forEach(kaModel => {
      if (kaModel) {
        kaModel.updateCameraPosition();
      }
    })

    // if (this.horizonClouds) {
    //   this.horizonClouds.render();
    // }

    // 云层天气
    this.cloudModelList.forEach(cloudModel => {
      if (cloudModel) {
        cloudModel.render();
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
    this.initKaModel();
    // this.initRadarModel();
    // this.initCloud();
  }

  initCloud() {
    // this.horizonClouds = new HorizonClouds(this.renderer, this.camera, this.scene);
    // this.horizonClouds = new HorizonClouds2D(this.renderer, this.camera, this.scene);
    this.cloudInfoList.forEach(cloud => {
      const horizonClouds = new HorizonClouds2D(this.renderer, this.camera, this.scene, cloud);
      this.cloudModelList.push(horizonClouds);
    })
  }

  initKaModel () {
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load( '/model/fbx/ka.fbx',  ( _model ) => {
        const model = new WGS84Object3D(_model);
        this.kaInfoList.forEach(kaInfo => {

          const object = model.clone();
          kaInfo.model = object;
          const kaModel = new KaModel(this.renderer, this.camera, this.scene, kaInfo);

          kaModel.render();
          this.kaModelList.push(kaModel);
        })

        resolve(model);
      });
    
    })
  }



  initRadarModel () {
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load( '/model/fbx/radar3.fbx',  ( _model ) => {
        const model = new WGS84Object3D(_model);
        this.radarInfoList.forEach(radarInfo => {

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
    this.radarModelList = null;

    this.kaModelList.forEach(ka => ka && ka.destroy());
    this.kaModelList = null;

    this.cloudModelList.forEach(cloud => cloud && cloud.destroy());
    this.cloudModelList = null;
  }

  dispose () {
    this.destroy()
  }

}
