import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { kaInfoList } from './data/radar'

import vertexShader from './shader/ka/ka.vert'
import fragmentShader from './shader/ka/ka.frag'

import { addCSS2Object, setMeshUniform } from './tool/utils';

const isNumber = (number) => typeof number === 'number';
/**
 * Ka Cloud Radar
 */
export default class KaModel{
  constructor (renderer, camera, scene, kaInfo) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    this.kaInfo = kaInfo;
    // 雷达模型文件
    this.kaModel = kaInfo.model;

    // clock
    this.clock = new THREE.Clock();

    this.uniforms = {
      cameraPosition:   { value: new THREE.Vector3() },
      depthSampleCount: { value: 32 },
      pitchRange:       { value: new THREE.Vector2(Math.PI * 0.5 * 0.9, Math.PI * 0.5) },
      radius:           { value: kaInfo.radius * 1e3 },
      azimuth:          { value: Math.PI * 0.5 },
      elevation:        { value: Math.PI * 0.5 },
      iTime:            { value: this.clock.getElapsedTime() }
    };

    this.azimuth = Math.random() * Math.PI * 2;

    window.StationModel = this;
  }

  render () {
    return this.loadFBXModel().then((model) => {
      this.initKaModel(model);
      this.initRadarDetectionZone();
      this.initDirectionalLightHelper();
      return null;
    })
  }


  loadFBXModel (url) {
    const loader = new FBXLoader();

    if(!this.radarModel) {
      return new Promise((resolve) => {
        loader.load( url || '/model/fbx/ka3.fbx',  ( model ) => {
          this.radarModel = model;
          resolve(model);
        });
      })
    } else {
      return Promise.resolve(this.radarModel);
    }
  }

  initKaModel(model) {
    const kaInfo = this.kaInfo;

    const object = new WGS84Object3D(model);

    object.WGS84Position = new THREE.Vector3(kaInfo.lngLat[0], kaInfo.lngLat[1], kaInfo.alt);

    object.rotation.x = Math.PI / 2;

    const scale = 5;

    object.scale.set(scale, scale, scale);

    object.add(new THREE.AxesHelper(1000))

    object.name = kaInfo.name;

    addCSS2Object(object, kaInfo.name, [0, this.kaInfo.radius * 1e3 * 1.5/ scale, 0], null);

    this.ka = object;

    this.scene.add(object)
  }

  /**
   * 雷达探测区域
   */
  initRadarDetectionZone () {
      const kaInfo = this.kaInfo; 

      const radius = kaInfo.radius * 1e3;

      const uniforms = this.uniforms;
      
      const geometry = new THREE.BoxGeometry( radius * 2.0, radius * 2.0, radius * 2.0 );

      const material = new THREE.RawShaderMaterial( {
          glslVersion: THREE.GLSL3,
          uniforms: uniforms,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false
      });

      const mesh = new THREE.Mesh( geometry, material );

      mesh.name = 'ka-detection-zone-'+ kaInfo.id

      mesh.translateZ(radius);

      this.mesh = mesh;

      const object = new WGS84Object3D(mesh);

      object.WGS84Position = new THREE.Vector3(kaInfo.lngLat[0], kaInfo.lngLat[1], kaInfo.alt);

      this.zone = object;

      this.scene.add(object);
  }
 

  updateCameraPosition() {
    if (!this.isDispose) {
      const { scene } = this;
      const kaInfo = this.kaInfo;
      const cameraPosition = this.camera.position;

      const name = 'ka-detection-zone-' + kaInfo.id;
      const object = this.scene.getObjectByName(name);
  
      setMeshUniform(object, 'cameraPosition', { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z })

      setMeshUniform(object, 'iTime', this.clock.getElapsedTime())

      this.setScanAngle(Math.cos(performance.now() / 5000) * Math.PI * 2 + this.azimuth);
    }
  }


  initDirectionalLightHelper () {
    const { lngLat } = this.kaInfo;
    const light = new THREE.DirectionalLight( 0xffffff );

    light.position.set( 0, 0, 1 ); 

    light.target = this.kaModel;

    const _light = light.clone();

    const object = new WGS84Object3D(_light);
  
    this.light = object;

    this.scene.add( object );

  }


  setScanAngle(azimuth, elevation) {
    if(isNumber(azimuth)) {
      setMeshUniform(this.mesh, 'azimuth', azimuth + Math.PI * 0.5)
    }

    if(isNumber(elevation)) {
      setMeshUniform(this.mesh, 'elevation', elevation)
    }
  }

  removeItem (object) {
    if (object) {
      this.scene.remove(object);
      object.clear();
    }
  }


  destroy () {
    this.kaInfo = null;
    // 删除 radarModel
    this.removeItem(this.ka);
    this.removeItem(this.zone);
    this.removeItem(this.light);

    this.removeItem(this.kaModel);

    this.isDispose = true;
  }

  dispose () {
    this.destroy()
  }
}
