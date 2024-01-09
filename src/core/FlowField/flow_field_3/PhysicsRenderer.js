import * as THREE from 'three';

import vs from './glsl/physicsRenderer.vs';
import fs from './glsl/physicsRendererInit.fs';

const createMesh = (uniforms, vs, fs) => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.RawShaderMaterial({
      uniforms,
      vertexShader: vs,
      fragmentShader: fs
    })
  );

  return mesh;
};

export default class PhysicsRenderer {
  constructor(avs, afs) {
    const option = {
      type: (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) ? THREE.HalfFloatType : THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.position = [
      new THREE.WebGL3DRenderTarget(0, 0, 0, option),
      new THREE.WebGL3DRenderTarget(0, 0, 0, option),
    ];
 
    this.positionUniforms = {
      position: {
        value: null,
      },
      time: {
        value: 0
      }
    };
    
    this.positionMesh = createMesh(this.positionUniforms, avs, afs);
    this.targetIndex = 0;

    window.PhysicsRenderer = this;
  }
  start(renderer, positionArrayBase, width, height, depth) {
    this.size = this.vUniforms.side.value = positionArrayBase.length;

    // make arrays of velocity and position.
    const positionArray = [];

    for (var i = 0; i < this.size; i++) {
      if (positionArrayBase && positionArrayBase[i] != undefined) {
        positionArray[i] = positionArrayBase[i];
      } else {
        positionArray[i] = 0;
      }
    }

    for (var i = 0; i < 2; i++) {
      this.position[i].setSize(width, height, depth);
    }

    // set position of the first frame.
    const texture3dData = new THREE.Data3DTexture(new Float32Array(positionArray), width, height, depth);

    texture3dData.format = THREE.RedFormat;
    texture3dData.type = THREE.FloatType;
    texture3dData.magFilter = THREE.NearestFilter;
    texture3dData.minFilter = THREE.NearestFilter;
    texture3dData.needsUpdate = true;

    const posInitMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial({
        uniforms: {
          initData: {
            value: texture3dData
          }
        },
        vertexShader: vs,
        fragmentShader: fs
      })
    );

    this.scene.add(this.camera);
    this.scene.add(posInitMesh);
    renderer.setRenderTarget(this.position[Math.abs(this.targetIndex - 1)]);
    renderer.render(this.scene, this.camera);
    this.scene.remove(posInitMesh);
    this.scene.add(this.positionMesh);
  }

  update(renderer, time) {
    const prevIndex = Math.abs(this.targetIndex - 1);
    const nextIndex = this.targetIndex;

    // update position.
    this.positionUniforms.position.value = this.position[prevIndex].texture;
    renderer.setRenderTarget(this.position[nextIndex]);
    renderer.render(this.scene, this.camera);

    // update the index number of the renderTarget array.
    this.targetIndex = prevIndex;

    // update the time.
    this.positionUniforms.time.value += time;
  }
}
