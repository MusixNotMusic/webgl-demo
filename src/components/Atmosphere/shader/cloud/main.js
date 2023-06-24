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

let paused = false;
let pauseButton = document.getElementById('pause-button');
if (pauseButton) {
    pauseButton.onclick = function(){
        paused = pauseButton.checked;
        if (!paused) {
            // Audio Resume
            pausedTime += clock.getDelta();
        }
        else {
            // Audio Pause
        }
    };
}

{
    let screenshotButton = document.getElementById("screenshot");
    if (screenshotButton) {
        screenshotButton.addEventListener('click', saveScreenshot);
    }
}

{
    let reloadButton = document.getElementById("reload");
    if (reloadButton) {
        reloadButton.addEventListener('click', reloadWebview);
    }
}

let canvas = document.getElementById('canvas');
let gl = canvas.getContext('webgl2');
let isWebGL2 = gl != null;
if (gl == null) gl = canvas.getContext('webgl');
let supportsFloatFramebuffer = (gl.getExtension('EXT_color_buffer_float') != null) || (gl.getExtension('WEBGL_color_buffer_float') != null);
let supportsHalfFloatFramebuffer = (gl.getExtension('EXT_color_buffer_half_float') != null);
let framebufferType = THREE.UnsignedByteType;
if (supportsFloatFramebuffer) framebufferType = THREE.FloatType;
else if (supportsHalfFloatFramebuffer) framebufferType = THREE.HalfFloatType;

let renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, context: gl, preserveDrawingBuffer: true });
let resolution = new THREE.Vector3();
let mouse = new THREE.Vector4(212, 393, -203, -325);
let mouseButton = new THREE.Vector4(0, 0, 0, 0);
let normalizedMouse = new THREE.Vector2(0.26452599388379205, 0.9985507246376811);
let frameCounter = 0;

// Audio Init
const audioContext = {
    sampleRate: 0
};
// Audio Resume

let buffers = [];

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
        dependents: [],
    },
]
// Buffers
buffers.push({
    Name: 'd:/_workspace/shadertoy/src/vcloud2/bufferA.glsl',
    File: 'd:/_workspace/shadertoy/src/vcloud2/bufferA.glsl',
    LineOffset: 357,
    Target: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    ChannelResolution: Array(10).fill(new THREE.Vector3(0,0,0)),
    PingPongTarget: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    PingPongChannel: 0,
    Dependents: [{"Index":2,"Channel":0}],
    Shader: new THREE.ShaderMaterial({
        fragmentShader: bufferA,
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
});
buffers.push({
    Name: 'd:/_workspace/shadertoy/src/vcloud2/bufferB.glsl',
    File: 'd:/_workspace/shadertoy/src/vcloud2/bufferB.glsl',
    LineOffset: 357,
    Target: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    ChannelResolution: Array(10).fill(new THREE.Vector3(0,0,0)),
    PingPongTarget: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    PingPongChannel: 0,
    Dependents: [{"Index":2,"Channel":3}],
    Shader: new THREE.ShaderMaterial({
        fragmentShader: document.getElementById('d:/_workspace/shadertoy/src/vcloud2/bufferB.glsl').textContent,
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
});
buffers.push({
    Name: 'd:/_workspace/shadertoy/src/vcloud2/bufferD.glsl',
    File: 'd:/_workspace/shadertoy/src/vcloud2/bufferD.glsl',
    LineOffset: 357,
    Target: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    ChannelResolution: Array(10).fill(new THREE.Vector3(0,0,0)),
    PingPongTarget: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    PingPongChannel: 1,
    Dependents: [{"Index":3,"Channel":1},{"Index":4,"Channel":1}],
    Shader: new THREE.ShaderMaterial({
        fragmentShader: document.getElementById('d:/_workspace/shadertoy/src/vcloud2/bufferD.glsl').textContent,
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
});
buffers.push({
    Name: 'd:/_workspace/shadertoy/src/vcloud2/bufferC.glsl',
    File: 'd:/_workspace/shadertoy/src/vcloud2/bufferC.glsl',
    LineOffset: 357,
    Target: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    ChannelResolution: Array(10).fill(new THREE.Vector3(0,0,0)),
    PingPongTarget: new THREE.WebGLRenderTarget(resolution.x, resolution.y, { type: framebufferType }),
    PingPongChannel: 0,
    Dependents: [{"Index":2,"Channel":2},{"Index":4,"Channel":0}],
    Shader: new THREE.ShaderMaterial({
        fragmentShader: document.getElementById('d:/_workspace/shadertoy/src/vcloud2/bufferC.glsl').textContent,
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
});
buffers.push({
    Name: 'd:/_workspace/shadertoy/src/vcloud2/main.glsl',
    File: 'd:/_workspace/shadertoy/src/vcloud2/main.glsl',
    LineOffset: 357,
    Target: null,
    ChannelResolution: Array(10).fill(new THREE.Vector3(0,0,0)),
    PingPongTarget: null,
    PingPongChannel: 0,
    Dependents: [],
    Shader: new THREE.ShaderMaterial({
        fragmentShader: document.getElementById('d:/_workspace/shadertoy/src/vcloud2/main.glsl').textContent,
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
});

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
let commonIncludes = [];
// Includes
commonIncludes.push({
    Name: 'd:/_workspace/shadertoy/src/vcloud2/common.glsl',
    File: 'd:/_workspace/shadertoy/src/vcloud2/common.glsl'
});

// WebGL2 inserts more lines into the shader
if (isWebGL2) {
    for (let buffer of buffers) {
        buffer.LineOffset += 16;
    }
}

// Keyboard Init

// Uniforms Init
// Uniforms Update

let texLoader = new THREE.TextureLoader();
// Texture Init
buffers[0].ChannelResolution[0] = new THREE.Vector3(buffers[0].Target.width, buffers[0].Target.height, 1);
buffers[0].Shader.uniforms.iChannelResolution.value = buffers[0].ChannelResolution;
buffers[0].Shader.uniforms.iChannel0 = { type: 't', value: (() => {
        let texture = buffers[0].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };
buffers[0].Shader.uniforms.iChannel0 = { type: 't', value: buffers[0].PingPongTarget.texture };

buffers[1].ChannelResolution[0] = new THREE.Vector3(buffers[1].Target.width, buffers[1].Target.height, 1);
buffers[1].Shader.uniforms.iChannelResolution.value = buffers[1].ChannelResolution;
buffers[1].Shader.uniforms.iChannel0 = { type: 't', value: (() => {
        let texture = buffers[1].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };
buffers[1].Shader.uniforms.iChannel0 = { type: 't', value: buffers[1].PingPongTarget.texture };

buffers[2].ChannelResolution[0] = new THREE.Vector3(buffers[0].Target.width, buffers[0].Target.height, 1);
buffers[2].Shader.uniforms.iChannelResolution.value = buffers[2].ChannelResolution;
buffers[2].Shader.uniforms.iChannel0 = { type: 't', value: (() => {
        let texture = buffers[0].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };buffers[2].ChannelResolution[1] = new THREE.Vector3(buffers[2].Target.width, buffers[2].Target.height, 1);
buffers[2].Shader.uniforms.iChannelResolution.value = buffers[2].ChannelResolution;
buffers[2].Shader.uniforms.iChannel1 = { type: 't', value: (() => {
        let texture = buffers[2].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };buffers[2].ChannelResolution[2] = new THREE.Vector3(buffers[3].Target.width, buffers[3].Target.height, 1);
buffers[2].Shader.uniforms.iChannelResolution.value = buffers[2].ChannelResolution;
buffers[2].Shader.uniforms.iChannel2 = { type: 't', value: (() => {
        let texture = buffers[3].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };
buffers[2].ChannelResolution[3] = new THREE.Vector3(buffers[1].Target.width, buffers[1].Target.height, 1);
buffers[2].Shader.uniforms.iChannelResolution.value = buffers[2].ChannelResolution;
buffers[2].Shader.uniforms.iChannel3 = { type: 't', value: (() => {
        let texture = buffers[1].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };
buffers[2].Shader.uniforms.iChannel1 = { type: 't', value: buffers[2].PingPongTarget.texture };

buffers[3].ChannelResolution[0] = new THREE.Vector3(buffers[3].Target.width, buffers[3].Target.height, 1);
buffers[3].Shader.uniforms.iChannelResolution.value = buffers[3].ChannelResolution;
buffers[3].Shader.uniforms.iChannel0 = { type: 't', value: (() => {
        let texture = buffers[3].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };buffers[3].ChannelResolution[1] = new THREE.Vector3(buffers[2].Target.width, buffers[2].Target.height, 1);
buffers[3].Shader.uniforms.iChannelResolution.value = buffers[3].ChannelResolution;
buffers[3].Shader.uniforms.iChannel1 = { type: 't', value: (() => {
        let texture = buffers[2].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };
buffers[3].Shader.uniforms.iChannel0 = { type: 't', value: buffers[3].PingPongTarget.texture };

buffers[4].ChannelResolution[0] = new THREE.Vector3(buffers[3].Target.width, buffers[3].Target.height, 1);
buffers[4].Shader.uniforms.iChannelResolution.value = buffers[4].ChannelResolution;
buffers[4].Shader.uniforms.iChannel0 = { type: 't', value: (() => {
        let texture = buffers[3].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };
buffers[4].ChannelResolution[1] = new THREE.Vector3(buffers[2].Target.width, buffers[2].Target.height, 1);
buffers[4].Shader.uniforms.iChannelResolution.value = buffers[4].ChannelResolution;
buffers[4].Shader.uniforms.iChannel1 = { type: 't', value: (() => {
        let texture = buffers[2].Target.texture;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })() };

let scene = new THREE.Scene();
let quad = new THREE.Mesh(
    new THREE.PlaneGeometry(resolution.x, resolution.y),
    null
);
scene.add(quad);

let camera = new THREE.OrthographicCamera(-resolution.x / 2.0, resolution.x / 2.0, resolution.y / 2.0, -resolution.y / 2.0, 1, 1000);
camera.position.set(0, 0, 10);

// Run every shader once to check for compile errors
let compileTimeStart = performance.now();
let failed=0;
for (let include of commonIncludes) {
    currentShader = {
        Name: include.Name,
        File: include.File,
        // add two for version and precision lines
        LineOffset: 26 + 2
    };
    // bail if there is an error found in the include script
    if(compileFragShader(gl, document.getElementById(include.Name).textContent) == false) {
        throw Error(`Failed to compile ${include.Name}`);
    }
}

for (let buffer of buffers) {
    currentShader = {
        Name: buffer.Name,
        File: buffer.File,
        LineOffset: buffer.LineOffset
    };
    quad.material = buffer.Shader;
    renderer.setRenderTarget(buffer.Target);
    renderer.render(scene, camera);
}
currentShader = {};
let compileTimeEnd = performance.now();
let compileTime = compileTimeEnd - compileTimeStart;
if (compileTimePanel !== undefined) {
    for (let i = 0; i < 200; i++) {
        compileTimePanel.update(compileTime, 200);
    }
}

computeSize();
render();

function addLineNumbers( string ) {
    let lines = string.split( '\\n' );
    for ( let i = 0; i < lines.length; i ++ ) {
        lines[ i ] = ( i + 1 ) + ': ' + lines[ i ];
    }
    return lines.join( '\\n' );
}

function compileFragShader(gl, fsSource) {
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        const fragmentLog = gl.getShaderInfoLog(fs);
        console.error( 'THREE.WebGLProgram: shader error: ', gl.getError(), 'gl.COMPILE_STATUS', null, null, null, null, fragmentLog );
        return false;
    }
    return true;
}

function render() {
    requestAnimationFrame(render);
    // Pause Whole Render
    if (paused) return;

    // Advance Time
    deltaTime = clock.getDelta();
    time = startingTime + clock.getElapsedTime() - pausedTime;
    updateDate();

    // Audio Update

    for (let buffer of buffers) {
        buffer.Shader.uniforms['iResolution'].value = resolution;
        buffer.Shader.uniforms['iTimeDelta'].value = deltaTime;
        buffer.Shader.uniforms['iTime'].value = time;
        buffer.Shader.uniforms['iFrame'].value = frameCounter;
        buffer.Shader.uniforms['iMouse'].value = mouse;
        buffer.Shader.uniforms['iMouseButton'].value = mouseButton;

        buffer.Shader.uniforms['resolution'].value = resolution;
        buffer.Shader.uniforms['time'].value = time;
        buffer.Shader.uniforms['mouse'].value = normalizedMouse;

        quad.material = buffer.Shader;
        renderer.setRenderTarget(buffer.Target);
        renderer.render(scene, camera);
    }

    // Uniforms Update

    // Keyboard Update

    for (let buffer of buffers) {
        if (buffer.PingPongTarget) {
            [buffer.PingPongTarget, buffer.Target] = [buffer.Target, buffer.PingPongTarget];
            buffer.Shader.uniforms[`iChannel${buffer.PingPongChannel}`].value = buffer.PingPongTarget.texture;
            for (let dependent of buffer.Dependents) {
                const dependentBuffer = buffers[dependent.Index];
                dependentBuffer.Shader.uniforms[`iChannel${dependent.Channel}`].value = buffer.Target.texture;
            }
        }
    }

    frameCounter++;
}
function computeSize() {
    let forceAspectRatio = (width, height) => {
        // Forced aspect ratio
        let forcedAspects = [0,0];
        let forcedAspectRatio = forcedAspects[0] / forcedAspects[1];
        let aspectRatio = width / height;

        if (forcedAspectRatio <= 0 || !isFinite(forcedAspectRatio)) {
            let resolution = new THREE.Vector3(width, height, 1.0);
            return resolution;
        }
        else if (aspectRatio < forcedAspectRatio) {
            let resolution = new THREE.Vector3(width, Math.floor(width / forcedAspectRatio), 1);
            return resolution;
        }
        else {
            let resolution = new THREE.Vector3(Math.floor(height * forcedAspectRatio), height, 1);
            return resolution;
        }
    };

    // Compute forced aspect ratio and align canvas
    resolution = forceAspectRatio(window.innerWidth, window.innerHeight);
    canvas.style.left = `${(window.innerWidth - resolution.x) / 2}px`;
    canvas.style.top = `${(window.innerHeight - resolution.y) / 2}px`;

    for (let buffer of buffers) {
        if (buffer.Target) {
            buffer.Target.setSize(resolution.x, resolution.y);
        }
        if (buffer.PingPongTarget) {
            buffer.PingPongTarget.setSize(resolution.x, resolution.y);
        }
    }
    renderer.setSize(resolution.x, resolution.y, false);

    // Update Camera and Mesh
    quad.geometry = new THREE.PlaneGeometry(resolution.x, resolution.y);
    camera.left = -resolution.x / 2.0;
    camera.right = resolution.x / 2.0;
    camera.top = resolution.y / 2.0;
    camera.bottom = -resolution.y / 2.0;
    camera.updateProjectionMatrix();

    // Reset iFrame on resize for shaders that rely on first-frame setups
    frameCounter = 0;
}
function saveScreenshot() {
    let doSaveScreenshot = () => {
        renderer.domElement.toBlob(function(blob){
            let a = document.createElement('a');
            let url = URL.createObjectURL(blob);
            a.href = url;
            a.download = 'shadertoy.png';
            a.click();
        }, 'image/png', 1.0);
    };

    let forcedScreenshotResolution = [0,0];
    if (forcedScreenshotResolution[0] <= 0 || forcedScreenshotResolution[1] <= 0) {
        renderer.render(scene, camera);
        doSaveScreenshot();
    }
    else {
        renderer.setSize(forcedScreenshotResolution[0], forcedScreenshotResolution[1], false);

        for (let buffer of buffers) {
            buffer.Shader.uniforms['iResolution'].value = new THREE.Vector3(forcedScreenshotResolution[0], forcedScreenshotResolution[1], 1);
            buffer.Shader.uniforms['resolution'].value = new THREE.Vector3(forcedScreenshotResolution[0], forcedScreenshotResolution[1], 1);

            quad.material = buffer.Shader;
            renderer.setRenderTarget(buffer.Target);
            renderer.render(scene, camera);
        }

        doSaveScreenshot();
        renderer.setSize(resolution.x, resolution.y, false);
    }
}
function reloadWebview() {
    if (vscode !== undefined) {
        vscode.postMessage({ command: 'reloadWebview' });
    }
}
function updateMouse() {
    if (vscode !== undefined) {
        vscode.postMessage({
            command: 'updateMouse',
            mouse: {
                x: mouse.x,
                y: mouse.y,
                z: mouse.z,
                w: mouse.w
            },
            normalizedMouse: {
                x: normalizedMouse.x,
                y: normalizedMouse.y
            }
        });
    }
}
let dragging = false;
function updateNormalizedMouseCoordinates(clientX, clientY) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = clientX - rect.left;
    let mouseY = resolution.y - clientY - rect.top;

    if (mouseButton.x + mouseButton.y != 0) {
        mouse.x = mouseX;
        mouse.y = mouseY;
    }

    normalizedMouse.x = mouseX / resolution.x;
    normalizedMouse.y = mouseY / resolution.y;
}
canvas.addEventListener('mousemove', function(evt) {
    updateNormalizedMouseCoordinates(evt.clientX, evt.clientY);
    updateMouse();
}, false);
canvas.addEventListener('mousedown', function(evt) {
    if (evt.button == 0)
        mouseButton.x = 1;
    if (evt.button == 2)
        mouseButton.y = 1;

    if (!dragging) {
        updateNormalizedMouseCoordinates(evt.clientX, evt.clientY);
        mouse.z = mouse.x;
        mouse.w = mouse.y;
        dragging = true
    }

    updateMouse();
}, false);
canvas.addEventListener('mouseup', function(evt) {
    if (evt.button == 0)
        mouseButton.x = 0;
    if (evt.button == 2)
        mouseButton.y = 0;

    dragging = false;
    mouse.z = -mouse.z;
    mouse.w = -mouse.w;

    updateMouse();
}, false);
window.addEventListener('resize', function() {
    computeSize();
});