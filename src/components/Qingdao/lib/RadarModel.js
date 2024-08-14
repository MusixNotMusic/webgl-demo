import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { radarInfoList } from './data/radar'

import vertexShader from './shader/radar/global.vert'
// import fragmentShader from './shader/radar/global.frag'
import fragmentShader from './shader/radar/global2.frag'

import { addCSS2Object, setMeshUniform } from './tool/utils';


const isNumber = (number) => typeof number === 'number';
/***
 * 单部雷达
 */
export default class RadarModel{
  constructor (renderer, camera, scene, radarInfo, texture) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    this.radarInfo = radarInfo;
    // 雷达模型文件
    this.radarModel = radarInfo.model;

    const { clientWidth, clientHeight } = renderer.domElement;

    this.uniforms = {
      cameraPosition:   { value: new THREE.Vector3() },
      depthSampleCount: { value: 128 },
      pitchRange:       { value: new THREE.Vector2(0.0, 0.6) },
      radius:           { value: radarInfo.radius * 1e3 },
      azimuth:          { value: Math.PI * 0.5 },
      elevation:        { value: Math.random() * 0.6},
      tex:              { value: texture },
      colorTex:         { value: __YW__.colorSystem.colorMapTexture['Z'] },
      iResolution:      { value: [clientWidth, clientHeight ]},
    };

    this.defines = {
      ECHO: !!texture
    }

    this.azimuth = Math.random() * Math.PI * 2;

    window.StationModel = this;
  }

  render () {
    return this.loadFBXModel().then((model) => {
      this.initRadarModel(model);
      this.initRadarDetectionZone();
      // this.initDirectionalLightHelper();

      return null;
    })
  }

  setCenter(object) {
    const box = new THREE.Box3().setFromObject(object);
    object.translateY(-box.max.z);
  }

  loadFBXModel (url) {
    const loader = new FBXLoader();

    if(!this.radarModel) {
      return new Promise((resolve) => {
        loader.load( url || '/model/fbx/radar2.fbx',  ( model ) => {
          this.radarModel = model;
          resolve(model);
        });
      })
    } else {
      return Promise.resolve(this.radarModel);
    }
  }

  initRadarModel(model) {
    const radarInfo = this.radarInfo;

    const object = new WGS84Object3D(model);

    object.WGS84Position = new THREE.Vector3(radarInfo.lngLat[0], radarInfo.lngLat[1], radarInfo.alt);

    object.rotation.x = Math.PI / 2;

    const scale = 40;

    object.scale.set(scale, scale, scale);

    object.add(new THREE.AxesHelper(100))

    object.name = radarInfo.name;

    addCSS2Object(object, radarInfo.name, [0, 75 * 1e3 * 1.5 / scale, 0], null);

    this.radar = object;

    this.scene.add(object)
  }

  /**
   * 雷达探测区域
   */
  initRadarDetectionZone () {
      const radarInfo = this.radarInfo; 

      const radius = radarInfo.radius * 1e3;

      const uniforms = this.uniforms;
      const defines = this.defines;
      
      const geometry = new THREE.BoxGeometry( radius * 2.0, radius * 2.0, radius * 2.0 );

      const material = new THREE.RawShaderMaterial( {
          glslVersion: THREE.GLSL3,
          uniforms: uniforms,
          defines: defines,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
      });

      const mesh = new THREE.Mesh( geometry, material );

      mesh.name = 'radar-detection-zone-'+ radarInfo.id

      mesh.translateZ(radius);

      this.mesh = mesh;

      const object = new WGS84Object3D(mesh);

      object.WGS84Position = new THREE.Vector3(radarInfo.lngLat[0], radarInfo.lngLat[1], radarInfo.alt);

      this.zone = object;

      this.degree = 0;

      this.scene.add(object);
  }
 

  updateCameraPosition() {
    if (!this.isDispose) {
      // const { renderer, scene, camera } = this;
      const { scene } = this;
      const radarInfo = this.radarInfo;
      const cameraPosition = this.camera.position;

      const name = 'radar-detection-zone-' + radarInfo.id;
      const object = this.scene.getObjectByName(name);
  
      setMeshUniform(object, 'cameraPosition', { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z })
      this.degree = this.degree + (radarInfo.type === 'S' ? 0.5 : 1);
      this.setScanAngle(-(this.degree / 360) * Math.PI * 2 + this.azimuth);

      // renderer.render(scene, camera);
    }
  }


  initDirectionalLightHelper () {
    const { lngLat } = this.radarInfo;
    const light = new THREE.DirectionalLight( 0xffffff );

    light.position.set( 0, 0, 1 ); 

    light.target = this.radarModel;

    // const helper = new THREE.DirectionalLightHelper( light, 5000, 0x0f0fcc );

    const _light = light.clone();

    const object = new WGS84Object3D(_light);
  
    // object.WGS84Position = new THREE.Vector3(lngLat[0], lngLat[1], 50000);

    // object.add(new THREE.AxesHelper(10000));

    // object.add(helper);
    this.light = object;

    this.scene.add( object );

  }

  setScanAngle(azimuth, elevation) {
    if(isNumber(azimuth)) {
      const object = this.radarModel.getObjectByName('head');
      if (object) {
        object.rotation.z = azimuth;
      }
      setMeshUniform(this.mesh, 'azimuth', azimuth + Math.PI * 0.5)
    }

    if(isNumber(elevation)) {
      const object = this.radarModel.getObjectByName('elevation');
      if (object) {
        object.rotation.x = elevation;
      }
      setMeshUniform(this.mesh, 'elevation', elevation)
    }
  }

  removeItem (object) {
    if (object) {
      setMeshUniform(object, 'tex', null);
      setMeshUniform(object, 'colorTex', null);
      this.scene.remove(object);
      object.clear();
    }
  }


  destroy () {
    this.radarInfo = null;
    // 删除 radarModel
    this.removeItem(this.radar);
    this.removeItem(this.zone);
    this.removeItem(this.light);

    this.isDispose = true;
  }

  dispose () {
    this.destroy()
  }
}
