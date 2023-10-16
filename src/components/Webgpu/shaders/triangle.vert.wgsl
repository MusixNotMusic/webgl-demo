struct VSOut {
    @builtin(position) nds_position: vec4<f32>,
    @location(0) color: vec3<f32>,
};

struct UBO {
    modelViewProj: mat4x4<f32>,
    primaryColor: vec4<f32>,
    accentColor: vec4<f32>
};

@group(0) @binding(0)
var<uniform> unifroms: UBO;

@vertex
fn main(@location(0) in_pos: vec3<f32>,
        @location(1) in_color: vec3<f32>) -> VSOut {
    var vs_out: VSOut;
    vs_out.nds_position = uniforms.modelViewProj * vec4<f32>(in_pos, 1.0);
    vs_out.color = in_color;
    return vsOut;
}