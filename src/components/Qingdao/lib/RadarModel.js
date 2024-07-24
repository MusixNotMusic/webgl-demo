import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { radarInfoList } from './data/radar'

import vertexShader from './shader/radar/global.vert'
import fragmentShader from './shader/radar/global.frag'

import { addCSS2Object, setMeshUniform } from './tool/utils';


const isNumber = (number) => typeof number === 'number';
/***
 * 单部雷达
 */
export default class RadarModel{
  constructor (renderer, camera, scene, radarInfo) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    this.radarInfo = radarInfo;
    // 雷达模型文件
    this.radarModel = radarInfo.model;

    this.uniforms = {
      cameraPosition:   { value: new THREE.Vector3() },
      depthSampleCount: { value: 128 },
      pitchRange:       { value: new THREE.Vector2(0.0, 0.6) },
      radius:           { value: radarInfo.radius * 1e3 },
      azimuth:          { value: Math.PI * 0.5 },
      elevation:        { value: Math.random() * 0.6}
    };

    this.azimuth = Math.random() * Math.PI * 2;

    window.StationModel = this;
  }

  render () {
    return this.loadFBXModel().then((model) => {
      // this.initPointLightHelper();
      this.initRadarModel(model);
      this.initRadarDetectionZone();
      this.initDirectionalLightHelper();

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

    object.scale.set(10, 10, 10);

    object.add(new THREE.AxesHelper(1000))

    object.name = radarInfo.name;

    addCSS2Object(object, radarInfo.name, [0, 5000, 0], null);

    this.scene.add(object)
  }

  /**
   * 雷达探测区域
   */
  initRadarDetectionZone () {
      const radarInfo = this.radarInfo; 

      const radius = radarInfo.radius * 1e3;

      const uniforms = this.uniforms;
      
      const geometry = new THREE.BoxGeometry( radius * 2.0, radius * 2.0, radius * 2.0 );

      const material = new THREE.RawShaderMaterial( {
          glslVersion: THREE.GLSL3,
          uniforms: uniforms,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh( geometry, material );

      mesh.name = 'radar-detection-zone-'+ radarInfo.id

      mesh.translateZ(radius);

      this.mesh = mesh;

      const object = new WGS84Object3D(mesh);

      object.WGS84Position = new THREE.Vector3(radarInfo.lngLat[0], radarInfo.lngLat[1], radarInfo.alt);

      this.scene.add(object);
  }
 

  updateCameraPosition() {
    const { renderer, scene, camera } = this;
    const radarInfo = this.radarInfo;
    const cameraPosition = this.camera.position;

    const name = 'radar-detection-zone-' + radarInfo.id;
    const object = this.scene.getObjectByName(name);
 
    setMeshUniform(object, 'cameraPosition', { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z })

    this.setScanAngle(Math.cos(performance.now() / 5000) * Math.PI * 2 + this.azimuth);

    renderer.render(scene, camera);
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

    this.scene.add( object );

  }

  initPointLightHelper () {
    const pointLight = new THREE.PointLight( 0xff0000, 1, 10000 );

    const lightObject = new WGS84Object3D(pointLight);
    
    lightObject.WGS84Position = new THREE.Vector3(120.5, 35, 44000);
    
    lightObject.add(new THREE.AxesHelper(10000));

    this.scene.add( lightObject );

    window.PointLight = lightObject;

    const sphereSize = 10000;
    const pointLightHelper = new THREE.PointLightHelper( pointLight.clone(), sphereSize );
    const helper = new WGS84Object3D(pointLightHelper);
    helper.WGS84Position = new THREE.Vector3(120.5, 35, 44000);
    this.scene.add( helper );
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


  destroy () {
    this.radarInfo = null;
    // 删除 radarModel
    // this.scene.remove(this.radarModel);
    // this.radarModel.clean();
  }

  dispose () {
    this.destroy()
  }
}
