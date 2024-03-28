import * as THREE from 'three';
import { WGS84Object3D } from './WGS84Object3D';

export class OrthogonalShadow {
    constructor(scene) {
        this.scene = scene;
        this.lightWrap = null;
        this.planeWrap = null;

        this.k = 16;

        this.initDirectionalLight();
        this.initPlaneShadow();
    }

    initDirectionalLight () {

        const light = new THREE.DirectionalLight( 0xffffff );
    
        light.castShadow = true;
    
        light.position.set( 0, 1, 0 ); 

    
        const lightWrap = new WGS84Object3D(light);

        lightWrap.visible = false;

        lightWrap.WGS84Position = new THREE.Vector3();
    
        lightWrap.add(new THREE.AxesHelper(1000));

        this.lightWrap = lightWrap;
    
        this.scene.add( lightWrap );
    }

    initPlaneShadow() {
        const geometry = new THREE.PlaneGeometry(1, 1);

        const material = new THREE.MeshStandardMaterial({ color:0xffffff, transparent: true, opacity: 1 })
        
        const plane = new THREE.Mesh(geometry, material);

        plane.receiveShadow = true;

        const planeWrap = new WGS84Object3D(plane);

        planeWrap.visible = false;

        planeWrap.WGS84Position = new THREE.Vector3();

        this.planeWrap = planeWrap;

        this.scene.add(planeWrap);
    }

    visible (show) {
        this.lightWrap.visible = show;
        this.planeWrap.visible = show;
    }

    setDirectionalLightCamera(size) {
        const light = this.lightWrap.children[0];

        const { x, y, z } = this.object.scale;

        const maxScale = Math.max(x, y, z);

        light.shadow.camera.scale.set(maxScale, maxScale, maxScale );

        light.shadow.camera.near = 0; // default

        light.shadow.camera.far = this.lightWrap.position.z + 1e6; // default


        const scale = 1 || (x ** 2 + y ** 2 + z ** 2);

        // light.shadow.camera.right = maxSize;
        // light.shadow.camera.left = -maxSize;
        // light.shadow.camera.top	= maxSize;
        // light.shadow.camera.bottom = -maxSize;

        light.shadow.camera.right = size.x;
        light.shadow.camera.left = -size.x;
        light.shadow.camera.top	= size.y;
        light.shadow.camera.bottom = -size.y;
        
        if (light.shadow.map) {

            // this.k <<= 2;
		    // if( this.k > 32 ) this.k = 16;
            let maxSize = Math.max(size.x, size.y, size.z);
            if (maxSize > 1024) maxSize = 1024;
            light.shadow.mapSize.set( maxSize, maxSize);
		    light.shadow.map.setSize( maxSize, maxSize );	
        }
    }

    getObjectSize (object) {
        const aabb = new THREE.Box3().setFromObject(object, true);
        const size = new THREE.Vector3();
        aabb.getSize(size);
        return size;
    }

    follow () {
        const object = this.object;

        const size = this.getObjectSize(object);

        const position = new THREE.Vector3();

        const quaternion = new THREE.Quaternion();
        
        const scale = new THREE.Vector3();

        object.matrixWorld.decompose( position, quaternion, scale );
        
        const positionLight = position.clone().setZ(position.z + 1e6);

        const positionPlane = position.clone().setZ(0);

        this.lightWrap.position.set(positionLight.x, positionLight.y, positionLight.z);

        // this.lightWrap.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        
        this.planeWrap.position.set(positionPlane.x, positionPlane.y, positionPlane.z);

        // update plane
        const plane = this.planeWrap.children[0];

        plane.scale.set(size.x, size.y, 1);

        this.setDirectionalLightCamera(size);
    }

    attach (object) {
        if (!object || object === this.object) return;
        
        this.object = object;

        object.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = true;
            }
        })

        object.castShadow = true;

        const light = this.lightWrap.children[0];

        light.target = object;

        this.follow();

        this.visible(true);
    }

    detach () {
        if (!this.object) return;

        const light = this.lightWrap.children[0];

        light.target = null;

        const object = this.object;

        object.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = false;
            }
        })

        object.castShadow = false;

        this.object = null;

        this.visible(false);
    }

    dispose () {
        this.lightWrap.clear();
        this.planeWrap.clear();
        this.lightWrap = null;
        this.planeWrap = null;
        this.object = null;
    }
} 