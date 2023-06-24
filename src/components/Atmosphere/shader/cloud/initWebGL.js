import * as THREE from 'three'
import bufferA from './bufferA.glsl'
import bufferB from './bufferB.glsl'
import bufferC from './bufferC.glsl'
import bufferD from './bufferD.glsl'
import main from './main.glsl'

let clock = new THREE.Clock();
let pausedTime = 0.0;
let deltaTime = 0.0;
let startingTime = 0;
let time = startingTime;

let date = new THREE.Vector4();

let currentShader = {};

let updateDate = function() {
    let today = new Date();
    date.x = today.getFullYear();
    date.y = today.getMonth();
    date.z = today.getDate();
    date.w = today.getHours() * 60 * 60
        + today.getMinutes() * 60
        + today.getSeconds()
        + today.getMilliseconds() * 0.001;
};

updateDate();

let canvas;
let gl;
let renderer;
let isWebGL2;

let resolution = new THREE.Vector3();
let mouse = new THREE.Vector4(212, 393, -203, -325);
let mouseButton = new THREE.Vector4(0, 0, 0, 0);
let normalizedMouse = new THREE.Vector2(0.26452599388379205, 0.9985507246376811);
let frameCounter = 0;
let framebufferType;

const audioContext = {
    sampleRate: 0
};

function createWebgl() {
    canvas = document.getElementById('canvas');
    gl = canvas.getContext('webgl2');
    isWebGL2 = gl != null;
    if (gl == null) gl = canvas.getContext('webgl');

    let supportsFloatFramebuffer = (gl.getExtension('EXT_color_buffer_float') != null) || (gl.getExtension('WEBGL_color_buffer_float') != null);
    let supportsHalfFloatFramebuffer = (gl.getExtension('EXT_color_buffer_half_float') != null);

    framebufferType = THREE.UnsignedByteType;
    if (supportsFloatFramebuffer) {
        framebufferType = THREE.FloatType;
    } else if (supportsHalfFloatFramebuffer) {
        framebufferType = THREE.HalfFloatType;
    }

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, context: gl, preserveDrawingBuffer: true });
}

const buffers = [];
const bufferParams = [
    {
        fragmentShader: bufferA,
        dependents: [{"Index":2,"Channel":0}],
    },
    {
        fragmentShader: bufferB,
        dependents: [{"Index":2,"Channel":3}],
    },
    {
        fragmentShader: bufferD,
        dependents: [{"Index":3,"Channel":1},{"Index":4,"Channel":1}],
    },{
        fragmentShader: bufferC,
        dependents: [{"Index":2,"Channel":2},{"Index":4,"Channel":0}],
    },
    {
        fragmentShader: main,
        dependents: [{"Index":2,"Channel":0}],
    },
]

function createBuffer () {
    bufferParams.forEach(buf => {
        buffers.push({
            Name: 'd:/_workspace/shadertoy/src/vcloud2/bufferA.glsl',
            File: 'd:/_workspace/shadertoy/src/vcloud2/bufferA.glsl',
            LineOffset: 357,
            Target: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
            ChannelResolution: Array(10).fill(new THREE.Vector3(0,0,0)),
            PingPongTarget: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
            PingPongChannel: 0,
            Dependents: buf.dependents,
            Shader: new THREE.ShaderMaterial({
                fragmentShader: buf.fragmentShader,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    iResolution: { type: 'v3', value: resolution },
                    iTime: { type: 'f', value: 0.0 },
                    iTimeDelta: { type: 'f', value: 0.0 },
                    iFrame: { type: 'i', value: 0 },
                    iMouse: { type: 'v4', value: mouse },
                    iMouseButton: { type: 'v2', value: mouseButton },

                    iChannelResolution: { type: 'v3v', value: Array(10).fill(new THREE.Vector3(0,0,0)) },

                    iDate: { type: 'v4', value: date },
                    iSampleRate: { type: 'f', value: audioContext.sampleRate },

                    iChannel0: { type: 't' },
                    iChannel1: { type: 't' },
                    iChannel2: { type: 't' },
                    iChannel3: { type: 't' },
                    iChannel4: { type: 't' },
                    iChannel5: { type: 't' },
                    iChannel6: { type: 't' },
                    iChannel7: { type: 't' },
                    iChannel8: { type: 't' },
                    iChannel9: { type: 't' },

                    resolution: { type: 'v2', value: resolution },
                    time: { type: 'f', value: 0.0 },
                    mouse: { type: 'v2', value: normalizedMouse },
                }
            })
        })
    })
}