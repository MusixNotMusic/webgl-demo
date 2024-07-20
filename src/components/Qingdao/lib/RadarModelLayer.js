import * as THREE from 'three';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';

import { radarInfoList } from './data/radar'

import vertexShader from './shader/radar/global.vert'
import fragmentShader from './shader/radar/global.frag'

/***
 * 矩形立方体的 等值面结构
 */
export default class RadarModelLayer extends BaseMercatorMeterProjectionModelClass{
  constructor (id, map, radarList) {
    super(id, map);
    
    this.id = id;
    
    this.map = map;

    this.radarList = radarList || radarInfoList.slice(0, 1);

    this.zoomBind = this.zoom.bind(this);

    this.clickBind = this.click.bind(this);

    window.radarModel = this;
  }


  // onBeforeRender() {
  // }

  renderHook() {
    this.updateRadarDetectionZoneCameraPosition();

    const { renderer, scene, camera } = this;
    renderer.render(scene, camera);
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

  click(event) {
    // this.raycast(event)
  }

  addEventListener() {
    if (this.map) {
      this.zoomBind()
      this.map.on('zoom', this.zoomBind);

      this.map.on('click', this.clickBind);
    }
  }

  removeEventListener() {
    if (this.map) {
      this.map.off('zoom', this.zoomBind);
      this.map.off('click', this.clickBind);
    }
  }

  render () {
    return this.initRadarModel().then(() => {
      this.drawLayer();
      // this.initPointLightHelper();
      this.initRadarDetectionZone();
      // this.initRadarCone();
      // this.initDirectionalLightHelper();
      return null;
    })
  }

  setCenter(object) {
    const box = new THREE.Box3().setFromObject(object);
    object.translateY(-box.max.z);
  }


  initRadarModel () {
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load( '/model/fbx/radar2.fbx',  ( _model ) => {
        const model = new WGS84Object3D(_model);
        this.radarList.forEach(radar => {

          const object = model.clone();

          object.WGS84Position = new THREE.Vector3(radar.lngLat[0], radar.lngLat[1], radar.alt);

          object.rotation.x = Math.PI / 2;

          object.scale.set(10, 10, 10);

          object.add(new THREE.AxesHelper(1000))

          object.name = radar.name;

          this.addCSS2Object(object, radar.name, null, [0, 500, 0]);

          this.scene.add(object)
        })

        resolve(model);
      });
    
    })
  }

  initRadarDetectionZone () {
     
    this.radarList.forEach(radar => {
      const radius = radar.radius * 1e3;

      const uniforms = {
        cameraPosition:   { value: new THREE.Vector3() },
        depthSampleCount: { value: 128 },
        pitchRange:       { value: new THREE.Vector2(0.0, 0.5) },
        radius:           { value:  radius },
      };
      
      const geometry = new THREE.BoxGeometry( radius * 2.0, radius * 2.0, radius * 2.0 );

      const material = new THREE.RawShaderMaterial( {
          glslVersion: THREE.GLSL3,
          uniforms: uniforms,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          transparent: true,
          side: THREE.BackSide,
      });

      const mesh = new THREE.Mesh( geometry, material );

      mesh.name = 'radar-detection-zone-'+radar.id

      mesh.translateZ(radius);

      const object = new WGS84Object3D(mesh);

      object.WGS84Position = new THREE.Vector3(radar.lngLat[0], radar.lngLat[1], radar.alt);

      this.scene.add(object);
    })
    
  }


  setMeshPosition (mesh, bounds) {
    const min = mapboxgl.MercatorCoordinate.fromLngLat([bounds.minX, bounds.minY], 0);
    const max = mapboxgl.MercatorCoordinate.fromLngLat([bounds.maxX, bounds.maxY], this.altitude || 80000);

    const boundScaleBox = [  min.x, min.y, min.z, max.x, max.y, max.z ];

    const unit = 1;

    mesh.position.x = (boundScaleBox[0] + boundScaleBox[3]) / 2 * unit;
    mesh.position.y = (boundScaleBox[1] + boundScaleBox[4]) / 2 * unit;
    mesh.position.z = (boundScaleBox[2] + boundScaleBox[5]) / 2 * unit

    mesh.scale.x = (boundScaleBox[3] - boundScaleBox[0]) * unit;
    mesh.scale.y = (boundScaleBox[4] - boundScaleBox[1]) * unit;
    mesh.scale.z = (boundScaleBox[5] - boundScaleBox[2]) * unit;
  }

  updateRadarDetectionZoneCameraPosition() {
    // const projectionMatrixInvert = this.raycastCamera.projectionMatrix.invert();
    // const cameraPosition = new THREE.Vector3().applyMatrix4(projectionMatrixInvert);

    const cameraPosition = this.camera.position;

    // const camera = this.map.getFreeCameraOptions();
    // const cameraPosition = camera._position

    this.radarList.forEach(radar => {
      const name = 'radar-detection-zone-' + radar.id;
      const object = this.scene.getObjectByName(name);
      if (object && object.material.uniforms && object.material.uniforms.cameraPosition) {
        object.material.uniforms.cameraPosition.value.copy( { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z } );
      }
    })
  }

  initRadarCone () {
    const meshs = [];
    // const elevations = [0.0, 0.5, 1, 1.45, 2, 2.4, 3, 3.35, 4.0, 4.3, 5.0, 6.0, 9.9, 14.6, 19.5]
    const elevations = [0.0, 0.5, 2, 19.5]
    this.radarList.forEach((item) => {
      elevations.forEach((elevation, index) => {
        const radius = item.radius * 1000;
        const radian = elevation / 180 * Math.PI;
        const height = radius * Math.sin(radian);
        const coneRadius = radius * Math.cos(radian);
        const geometry = new THREE.ConeGeometry(coneRadius, height, 32); 
        geometry.computeVertexNormals();
        // const material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.3 - index * 0.01, depthWrite: false, wireframe: false });
        // const material = new THREE.MeshBasicMaterial( { 
        //   color: 0xffffff, 
        //   side: THREE.FrontSide, 
        //   transparent: true, 
        //   opacity: 0.3 - 0.03 * index, 
        //   depthWrite: true, 
        //   depthTest: true,
        //   depthFunc: THREE.LessDepth
        // });

        const material = new THREE.MeshPhysicalMaterial({
            metalness: .9,
            roughness: .05,
            envMapIntensity: 0.9,
            clearcoat: 1,
            transparent: true,
            // transmission: .95,
            opacity: .5,
            reflectivity: 0.2,
            refractionRatio: 0.985,
            ior: 0.9,
            side: THREE.BackSide,
        })
        
        const cone = new THREE.Mesh( geometry, material );

        this.setCenter(cone);

        const object = new WGS84Object3D(cone);

        object.WGS84Position = new THREE.Vector3(item.lngLat[0], item.lngLat[1], item.alt);

        object.rotation.x = -Math.PI / 2;
        

        object.add(new THREE.AxesHelper(100))

        this.addCSS2Object(object, item.name, null, [0, 5000, 0]);

        this.scene.add(object)
      })
    })
  }


  initDirectionalLightHelper () {

    const light = new THREE.DirectionalLight( 0xffffff );

    light.position.set( 0, 0, 1 ); 

    const helper = new THREE.DirectionalLightHelper( light, 20000, 0x0f0fcc );
    const _light = light.clone();

    const object = new WGS84Object3D(_light);
  
    object.WGS84Position = new THREE.Vector3(120.5, 36, 50000);

    object.add(new THREE.AxesHelper(10000));
    object.add(helper);

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


  raycast(event) {
    var mouse = new THREE.Vector2();
    mouse.x = ( event.point.x / this.map.transform.width ) * 2 - 1;
    mouse.y = 1 - ( event.point.y / this.map.transform.height ) * 2;

    const raycaster = new THREE.Raycaster();

    raycaster.setFromCamera(mouse, this.camera);


    //   this.raycastCamera
    const projectionMatrixInvert = this.raycastCamera.projectionMatrix.invert();
    const cameraPosition =
            new THREE.Vector3().applyMatrix4(projectionMatrixInvert);
    const mousePosition =
            new THREE.Vector3(mouse.x, mouse.y, 1)
            .applyMatrix4(projectionMatrixInvert);
    const viewDirection = mousePosition.clone()
            .sub(cameraPosition).normalize();

    raycaster.set(cameraPosition, viewDirection);

    const inersectObjects = raycaster.intersectObjects(this.scene.children, true)

    const excludesList = ['raycaster-helper', 'TransformControlsPlane'];

    const isTransformControls = (object) => {
        let target = object;
        while(target) {
          if (target.isTransformControls) {
            return true;
          }
          target = target.parent;
        }
        return false;
    }

    // this.isTransformControls
    let filterObjects = inersectObjects.filter(({ object }) => !isTransformControls(object))

    console.log('raycaster', filterObjects);

  }



  setMeshRotation (mesh, x, y, z) {
    if (x) mesh.rotateX(x);
    if (z) mesh.rotateZ(z);
    if (y) mesh.rotateY(y);
  }

  disableAll() {
    this.map.dragPan.disable();
    this.map.doubleClickZoom.disable();
  }

  enableAll() {
    this.map.dragPan.enable();
    this.map.doubleClickZoom.enable();
  }


  destroy () {
    super.destroy();
  }

  dispose () {
    this.destroy()
  }

}
