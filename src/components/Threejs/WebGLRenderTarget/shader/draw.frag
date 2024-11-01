precision highp float;
precision highp sampler2D;

uniform sampler2D tex;

uniform int iFrame;

in vec2 vUv;

out vec4 color;

#define max_T 100.0
#define min_T -100.0


void main () {
    vec2 uv = vUv;

    vec3 col = vec3(0.0);

    float val = texture(tex, uv).r;
    
    float t = (100.0 - val) / 200.0;
     
    if (t < 0.25 ) {
        col = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), t * 4.0);
    } else if (t < 0.5 ) {
        col = mix(vec3(1.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), (t - 0.25) * 4.0);
    } else if (t < 0.75 ) {
        col = mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), (t - 0.5)  * 4.0);
    } else {
        col = mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 0.0, 1.0), (t - 0.75) * 4.0);
    }
     
    color = vec4(col, 1.0);
}