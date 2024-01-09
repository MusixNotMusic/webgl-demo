import * as THREE from 'three';

export default class DynamicTexture {
  constructor(vertexShader, fragmentShader, buffer, boxSize) {

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();

    this.vertexShader = vertexShader;
    this.fragmentShader = fragmentShader;

    this.swapCache = [];

    this.uniforms = {
      texture: { value: null }
    }

    // 初始化纹理数据
    this.initTextureData = create3DTextureData(buffer, boxSize);

    this.renderedIndex = 0;

    this.outputIndex = -1;

    this.createTextureDataEnvironment();

    this.createTextureSwapCache();
  }

  /**
   * 更新交换缓存纹理数据
   * @param {} textureData 
   */
  updateSwapCacheTextureData () {
    if (this.once) {
      this.uniforms.texture.value = this.textureData;
    } else {
      this.uniforms.texture.value = this.swapCache[this.renderedIndex];
    }
    this.scene.add(this.mesh);
  }

  /**
   * 创建一个平面用于 绘制纹理数据
   */
  createTextureDataEnvironment() {

    // this.uniforms.texture.value = this.textureData;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: this.vertexShader,
        fragmentShader: this.fragmentShader
      })
    );


    this.mesh = mesh;
  }

  /**
   * 纹理交换区
   */
  createTextureSwapCache (boxSize) {
    const option = {
      type: (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) ? THREE.HalfFloatType : THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    };

    const { width, height, depth } = boxSize;

    this.swapCache = [
      new THREE.WebGL3DRenderTarget(width, height, depth, option),
      new THREE.WebGL3DRenderTarget(width, height, depth, option),
    ]
  }

  /**
   * 创建一个3d纹理
   * @param {*} buffer 
   * @param {*} boxSize 
   * @returns 
   */
  create3DTextureData(buffer, boxSize) {
    const { width, height, depth } = boxSize;
    const texture3dData = new THREE.Data3DTexture(new Float32Array(buffer), width, height, depth);

    texture3dData.format = THREE.RedFormat;
    texture3dData.type = THREE.FloatType;
    texture3dData.magFilter = THREE.NearestFilter;
    texture3dData.minFilter = THREE.NearestFilter;
    texture3dData.needsUpdate = true;

    return texture3dData;
  }
}

