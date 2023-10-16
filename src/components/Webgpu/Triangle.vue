<template>
<canvas id="webgpu" width="600" height="600">

</canvas>
</template>
<script>
import { onMounted  } from 'vue';
import vertShaderCode from './shaders/triangle.vert.wgsl';
import fragShaderCode from './shaders/triangle.frag.wgsl';

export default {
    name: 'triangle',
    setup() {
        const init = async() => {
            // resource
            const position = new Float32Array([
                1.0, -1.0, 0.0,
                -1.0, -1.0, 0.0,
                0.0, 1.0, 0.0
            ]);

            const colors = new Float32Array([
               1.0, 0.0, 0.0,
               0.0, 1.0, 0.0, 
               0.0, 0.0, 1.0,
            ]);
            
            const indices = new Uint16Array([0, 1, 2]);

            // initialzeAPI
            const gpu = navigator.gpu;
            if(!gpu) {
                throw new Error('WebGPU is not supported on this browser.');
            }
            
            // adapter
            let adapter = await gpu.requestAdapter();

            // device
            let device = await adapter.requestDevice();

            // queue 
            let queue = device.queue;

            // resizeBackings
            const canvas = document.querySelector('#webgpu');
            const context = canvas.getContext('webgpu');

            // Configure Context
            const canvasConfig = {
                device: device,
                format: 'bgra8unorm',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
                alphaMode: 'opaque'
            };

            context.configure(canvasConfig);

            const depthTextureDesc = {
                size: [canvas.width, canvas.height, 1],
                dimension: '2d',
                format: 'depth24plus-stencil8',
                usage: GPUTextureUsage.RENDER_ATTACMENT | GPUTextureUsage.COPY_SRC
            };

            let depthTexture = device.createTexture(depthTextureDesc);
            let depthTextureView = depthTexture.createView();



            let colorTexture = context.getCurrentTexture();
            let colorTextureView = colorTexture.createView();


            // initializeResources

            const createBuffer = (arr, usage) => {
                let desc = {
                    size: (arr.byteLength + 3) & ~3,
                    usage,
                    mappedAtCreation: true
                };

                let buffer = device.createBuffer(desc);

                const writeArray = arr instanceof Uint16Array
                    ? new Uint16Array(buffer.getMappedRange())
                    : new Float32Array(buffer.getMappedRange());
                writeArray.set(arr);
                buffer.unmap();
                return buffer;
            };

            let positionBuffer = createBuffer(position, GPUBufferUasge.VERTEX);
            let colorBuffer = createBuffer(colors, GPUBufferUasge.VERTEX);
            let indicesBuffer = createBuffer(indices, GPUBufferUasge.INDEX);


            const vsmDesc = { code: vertShaderCode };
            let vertModule = device.createShaderModule(vsmDesc);

            const fsmDesc = { code: fragShaderCode };
            let fragModule = device.createShaderModule(fsmDesc);

            const positionAttribDesc = {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3'
            };

            const colorAttribDesc = {
                shaderLocation: 1,
                offset: 0,
                format: 'float32x3'
            };

            const positionBufferDesc = {
                attributes: [positionAttribDesc],
                arrayStride: 4 * 3,
                stepMode: 'vertex'
            };

            const colorBufferDesc = {
                attributes: [colorAttribDesc],
                arrayStride: 4 * 3,
                stepMode: 'vertex'
            };

            // Depth
            const depthStencil = {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus-stencil8'
            };

            const pipelineLayoutDesc = { bindGroupLayouts: [] };
            const layout = device.createPipelineLayout(pipelineLayoutDesc);

            const vertex = {
                module: vertModule,
                entryPoint: 'main',
                buffers: [positionBufferDesc, colorBufferDesc]
            };

            const colorState = {
                format: 'bgra8unorm'
            };

            const fragment = {
                module: fragModule,
                entryPoint: 'main',
                targets: [colorState]
            };

            const pipelineDesc = {
                layout,

                vertex,
                fragment,

                primitive,
                depthStencil
            };

            const pipeline = device.createRenderPipeline(pipelineDesc);

            const encodeCommands = () => {
                let colorAttachment = {
                    view: colorTextureView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1},
                    loadOp: 'clear',
                    storeOp: 'store'
                };

                const depthAttachment = {
                    view: depthTextureView,
                    depthClearValue: 1,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                    stencilClearValue: 0,
                    stencilLoadOp: 'clear',
                    stencilStoreOp: 'store'
                };

                const renderPassDesc = {
                    colorAttachments: [colorAttachment],
                    depthStencilAttachment: depthAttachment
                };

                const commandEncoder = device.createCommandEncoder();

                const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
                passEncoder.setPipeline(pipeline);
                passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
                passEncoder.setScissorRect(0, 0, canvas.width, canvas.height);
                passEncoder.drawIndexed(3, 1);
                passEncoder.end();

                queue.submit([commandEncoder.finish()]);
            }

            const render = () => {
                colorTexture = context.getCurrentTexture();
                colorTextureView = colorTexture.createView();

                encodeCommands();

                requestAnimationFrame(render);
            }

            render();
        }

        onMounted(() => {
            init();
        })
    }
}
</script>