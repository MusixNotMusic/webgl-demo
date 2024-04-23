import * as THREE from 'three';

import { TransformControls } from './TransformControls';

import BaseMercatorMeterProjectionModelClass from "./BaseMercatorMeterProjectionModelClass";


import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import mapboxgl from "mapbox-gl";

import { WGS84Object3D } from './WGS84Object3D';
import { OrthogonalShadow } from './OrthogonalShadow';
import { OutlineEffectTool } from './tool/OutlineEffectTool';

/***
 * 矩形立方体的 等值面结构
 */
export default class RadarModelLayer extends BaseMercatorMeterProjectionModelClass{
  constructor (id, map) {
    super(id, map);
    
    this.id = id;
    
    this.map = map;

    // this.emitter = new EventEmitter();

    this.zoomBind = this.zoom.bind(this);

    this.clickBind = this.click.bind(this);

    this.control = new TransformControls(this.camera, this.renderer.domElement, this.raycastCamera );

    this.outlineEffect = null;

    this.control.addEventListener('dragging-changed', (event) => {
        event.value ? this.disableAll() : this.enableAll()
        this.orthogonalShadow.follow();
    })

    this.control.addEventListener('objectChange', (event) => {
      this.orthogonalShadow.follow();
    })

    this.orthogonalShadow = new OrthogonalShadow(this.scene);

    this.scene.add( this.control );

    window.control = this.control;
    window.radarModel = this;
    window.THREE = THREE;
  }


  onBeforeRender() {
    this.outlineEffect = new OutlineEffectTool(this.map, this.scene, this.camera);
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
    this.raycast(event)
    console.log('click===>', event)
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
      this.initSphere();
      this.initPlaneShadow();
      // this.initDirectionalLightHelper();
      return null;
    })
  }


  initRadarModel () {
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load( '/model/fbx/radar2.fbx',  ( model ) => {

        const object = new WGS84Object3D(model);

        object.WGS84Position = new THREE.Vector3(104, 30, 3000);

        object.rotation.x = Math.PI / 2;

        object.scale.set(10, 10, 10);

        object.add(new THREE.AxesHelper(1000))

        window.demoModel = object;

        this.addCSS2Object(object, 'demo', null, [0, 500, 0]);

        this.scene.add(object)

        resolve(model);
      });
    
    })
  }

  initSphere () {
      const sphere = new THREE.SphereGeometry(500);
      const material = new THREE.MeshNormalMaterial();
      sphere.computeVertexNormals();

      const mesh = new THREE.Mesh(sphere, material);

      mesh.castShadow = true;
      mesh.receiveShadow = false;

      const sphereObject = new WGS84Object3D(mesh);

      sphereObject.WGS84Position = new THREE.Vector3(103.8, 30, 2000);

      window.sphere = sphereObject;

      this.scene.add(sphereObject);
  }

  initPlaneShadow() {
    const geometryP = new THREE.PlaneGeometry(10000, 10000);
    const materialP = new THREE.MeshStandardMaterial({ color:0xffffff, transparent: true, opacity: 0.5 })
    const plane = new THREE.Mesh(geometryP, materialP);

    plane.receiveShadow = true;

    const planeWrap = new WGS84Object3D(plane);

    planeWrap.WGS84Position = new THREE.Vector3(104, 30, 0);

    this.scene.add(planeWrap);
  }

  initDirectionalLightHelper () {

    const light = new THREE.DirectionalLight( 0xffffff );

    light.castShadow = true;

    light.shadow.mapSize.width = 512; // default
    light.shadow.mapSize.height = 512; // default
    light.shadow.camera.near = 0.5; // default
    light.shadow.camera.far = 50000; // default

    light.shadow.camera.right = 512;
    light.shadow.camera.left = - 512;
    light.shadow.camera.top	= 512;
    light.shadow.camera.bottom = - 512;

    light.position.set( 0, 1, 0 ); 

    light.target = window.demoModel;
    const helper = new THREE.DirectionalLightHelper( light, 1000, 0x0f0fcc );

    const object = new WGS84Object3D(light);
    object.WGS84Position = new THREE.Vector3(104, 30, 10000);

    window.DirectionalLight = object;

    object.add(new THREE.AxesHelper(1000));
    object.add(helper);

    this.scene.add( object );
  }


  initPointLightHelper () {
    const pointLight = new THREE.PointLight( 0xff0000, 1, 10000 );
    const lightObject = new WGS84Object3D(pointLight);
    lightObject.WGS84Position = new THREE.Vector3(104, 29.95, 4400);
    lightObject.add(new THREE.AxesHelper(1000));

    this.scene.add( lightObject );

    window.PointLight = lightObject;

    const sphereSize = 100;
    const pointLightHelper = new THREE.PointLightHelper( pointLight.clone(), sphereSize );
    const helper = new WGS84Object3D(pointLightHelper);
    helper.WGS84Position = new THREE.Vector3(104, 29.95, 4400);
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

    if (filterObjects.length > 0) {
      this.focusObject = filterObjects[0].object;
      if (this.isTransformMode())  this.control.attach(this.focusObject);
      this.orthogonalShadow.attach(this.focusObject)
      this.outlineEffect.clear();
      this.outlineEffect.add(this.focusObject)
    } else {
      this.focusObject = null;
      this.control.detach();
      this.orthogonalShadow.detach();
      this.outlineEffect.clear();
    }
  }

  isTransformMode () {
    const mode = this.mode;
    return mode === 'translate' || mode === 'rotate' || mode === 'scale'
  }

  setMode (mode) {
    this.mode = mode;
    if (mode === 'default') {
      this.control.detach();
    } else if (this.isTransformMode()){
      this.control.setMode(mode);
      if (!this.control.object) {
        this.control.attach(this.focusObject);
      }
    } 
  }

  renderHook() {
    if (this.outlineEffect && this.outlineEffect.composer) {
      this.outlineEffect.composer.render();
    }
  }

  setMeshRotation (mesh, x, y, z) {
    if (x) mesh.rotateX(x);
    if (z) mesh.rotateZ(z);
    if (y) mesh.rotateY(y);
  }

  disableAll() {
    this.map.dragPan.disable();
    // this.map.dragRotate.disable();
    this.map.doubleClickZoom.disable();
  }

  enableAll() {
    this.map.dragPan.enable();
    // this.map.dragRotate.enable();
    this.map.doubleClickZoom.enable();
  }


  destroy () {
    super.destroy();
  }

  dispose () {
    this.destroy()
  }

}
