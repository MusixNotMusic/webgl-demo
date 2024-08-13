import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { radarInfoList, cloudInfoList, kaInfoList } from './data/radar'

import vertexShader from './shader/radar/global.vert'
import fragmentShader from './shader/radar/global.frag'

import RadarModel from './RadarModel';
import KaModel from './KaModel';
import IsoPlaneModel from './IsoPlaneModel';
import EchoCube from './EchoCube';

// import HorizonClouds from './HorizonClouds';
import HorizonClouds2D from './HorizonClouds2D';

import { decompress } from "../../utils/decompress/ZstdDecompress";
import { VoxelFormat } from "../../parseFile/VoxelFormat";

/***
 * 矩形立方体的 等值面结构
 */
export default class QingdaoScene extends BaseMercatorMeterProjectionModelClass{
  constructor (id, map, radarInfoList_) {
    super(id, map);
    
    this.id = id;
    
    this.map = map;

    this.radarInfoList = radarInfoList_ || radarInfoList.slice(0, 7);

    this.cloudInfoList = cloudInfoList;

    this.kaInfoList = kaInfoList;

    this.radarModelList = [];

    this.cloudModelList = [];

    this.kaModelList = [];

    // create LOD
    // this.lod = new THREE.LOD();
    // this.scene.add(this.lod);

    this.zoomBind = this.zoom.bind(this);

    this.stats = new Stats();
    document.body.appendChild( this.stats.dom );
    
    window.QingdaoScene = this;
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
    //   this.horizonClouds.updateCameraPosition();
    // }

    // 云层天气
    this.cloudModelList.forEach(cloudModel => {
      if (cloudModel) {
        cloudModel.render();
      }
    })

    if (this.echoCube) {
      this.echoCube.updateCameraPosition();
    }

    this.stats.update();
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

  loadTextureData () {
    return fetch('/resource/layerMoc_100.z').then(resqust => resqust.arrayBuffer()).then(decompress).then((data) => {
      const instance = VoxelFormat.parser(data);
      const volume = {
          minLongitude: instance.header.leftLongitude / 10000,
          minLatitude: instance.header.bottomLatitude / 10000,
          maxLongitude: instance.header.rightLongitude / 10000,
          maxLatitude: instance.header.topLatitude / 10000,
          data: instance.voxelData.slice(0, instance.voxelData.length),
          width:  instance.header.horDataCnt,
          height: instance.header.verDataCnt,
          depth:  instance.header.levelCnt,
          cutHeight: 500,
          altitudeList: Array.from(instance.evelationList)
      }

      const texture = new THREE.Data3DTexture( volume.data, volume.width, volume.height, volume.depth );
      texture.format = THREE.RedFormat;
      texture.type = THREE.UnsignedByteType;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.needsUpdate = true;

      return texture;
    })
  }

  render () {
    this.loadTextureData().then((texture) => {
      console.log('texture ==>', texture);
      this.drawLayer();
      this.initKaModel();
      // this.initRadarModel(texture);
      // this.initCloud();
      this.initIsoPlane();

      // this.initEchoCube(texture);
    })
  }

  initEchoCube(texture) {
    this.echoCube = new EchoCube(this.renderer, this.camera, this.scene, null, texture);
    this.echoCube.render();
  }

  initIsoPlane() {
    this.isoPlane = new IsoPlaneModel(this.renderer, this.camera, this.scene);
    this.isoPlane.render();
  }

  initCloud() {
    // this.horizonClouds = new HorizonClouds(this.renderer, this.camera, this.scene);
    this.cloudInfoList.forEach(cloud => {
      const horizonClouds = new HorizonClouds2D(this.renderer, this.camera, this.scene, cloud);
      this.cloudModelList.push(horizonClouds);
    })
  }

  initKaModel () {
    const loader = new FBXLoader();
    return new Promise((resolve) => {
      loader.load( '/model/fbx/ka2.fbx',  ( _model ) => {
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


  initRadarModel (texture) {
    const loader = new FBXLoader();
    return new Promise((resolve) => {
      loader.load( '/model/fbx/radar5.fbx',  ( _model ) => {
        const model = new WGS84Object3D(_model);
        //  add LOD
        this.radarInfoList.forEach((radarInfo, index) => {
          let object = model.clone();

          radarInfo.model = object;
          const radarModelInstance = new RadarModel(this.renderer, this.camera, this.scene, radarInfo,  null)

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

    if (this.isoInstance) this.isoInstance.dispose();

    if (this.echoCube) this.echoCube.dispose();
    
    this.stats.dom.remove();
  }

  dispose () {
    this.destroy()
  }

}
