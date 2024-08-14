import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import vertexShader from './shader/echo/echo.vert'
// import fragmentShader from './shader/radar/global.frag'
import fragmentShader from './shader/echo/echo.frag'

import { addCSS2Object, setMeshUniform } from './tool/utils';


const isNumber = (number) => typeof number === 'number';
/***
 * 单部雷达
 */
export default class EchoCube{
  constructor (renderer, camera, scene, echoInfo, textures) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    this.echoInfo = echoInfo || {
      id: 'echo',
      width: 400,
      height: 400,
      depth: 100,
      lngLat: [120.230278, 35.988611],
      alt: 0
    };

    const { clientWidth, clientHeight } = renderer.domElement;

    this.uniforms = {
      cameraPosition:   { value: new THREE.Vector3() },
      depthSampleCount: { value: 128 },
      tex1:             { value: textures[0] },
      tex2:             { value: textures[1]},
      delta:            { value: 0.0 },
      colorTex:         { value: __YW__.colorSystem.colorMapTexture['Z'] },
      boxSize:          { value: [this.echoInfo.width * 1e3, this.echoInfo.height * 1e3, this.echoInfo.depth * 1e3] },
      iResolution:      { value: [clientWidth, clientHeight]},
    };

    window.EchoCube = this;
  }

  render () {
      this.initEcho();
  }

  /**
   * 初始化回波
   */
  initEcho () {
      const { width, height, depth, id, lngLat, alt } = this.echoInfo; 

      const uniforms = this.uniforms;

      const geometry = new THREE.BoxGeometry( width * 1e3, height * 1e3, depth * 1e3);

      // const material = new THREE.MeshNormalMaterial();

      const material = new THREE.RawShaderMaterial( {
          glslVersion: THREE.GLSL3,
          uniforms: uniforms,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
      });

      const mesh = new THREE.Mesh( geometry, material );

      mesh.name = 'echo-zone-'+ id

      mesh.translateZ(depth * 1e3 * 0.5);

      this.mesh = mesh;

      const object = new WGS84Object3D(mesh);

      object.WGS84Position = new THREE.Vector3(lngLat[0], lngLat[1], alt);

      // edge
      // const edge = new THREE.LineSegments(new THREE.EdgesGeometry( geometry ), new THREE.LineBasicMaterial( { color: 0xffffff } ) );  
      // edge.translateZ(depth * 1e3 * 0.5);
      // object.add(edge);

      this.echo = object;

      this.scene.add(object);
  }
 

  updateCameraPosition() {
    if (!this.isDispose) {
      const { scene } = this;
      const echoInfo = this.echoInfo;
      const cameraPosition = this.camera.position;

      const name = 'echo-zone-' + echoInfo.id;
      const object = this.scene.getObjectByName(name);
  
      setMeshUniform(object, 'cameraPosition', { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z })

      let t = Math.abs(Math.cos(performance.now() / 20000));
      this.updateDeltaTime(t)
    }
  }

  updateDeltaTime(delta) {
    const name = 'echo-zone-' + this.echoInfo.id;
    const object = this.scene.getObjectByName(name);

    setMeshUniform(object, 'delta', delta)
  }



  removeItem (object) {
    if (object) {
      setMeshUniform(object, 'tex1', null);
      setMeshUniform(object, 'tex2', null);
      setMeshUniform(object, 'colorTex', null);
      this.scene.remove(object);
      object.clear();
    }
  }


  destroy () {
    this.echoInfo = null;
    // 删除 radarModel
    this.removeItem(this.echo);

    this.isDispose = true;
  }

  dispose () {
    this.destroy()
  }
}
