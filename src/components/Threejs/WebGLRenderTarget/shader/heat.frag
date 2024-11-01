precision highp float;
precision highp sampler2D;

uniform sampler2D tex;

uniform int iFrame;

in vec2 vUv;

out vec4 color;

#define K 1.75
#define max_T 100.0
#define min_T -100.0

float tTexture(vec2 uv, float c) {
    if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
        return texture(tex, uv).r;
    }
    return 0.0;
}

void main () {
    vec2 uv = vUv;

    vec3 col = vec3(0.0);

    if(iFrame < 100) {
        vec3 p1 = vec3(0.1, 0.1, 0.05);        
        vec3 p2 = vec3(0.3, 0.3, 0.11);        
        vec3 p3 = vec3(0.6, 0.4, 0.11);
        vec3 p4 = vec3(0.2, 0.4, 0.04);    
        vec3 p5 = vec3(0.8, 0.7, 0.25);
        
        vec4 box = vec4(0.1, 0.3, 0.5, 0.7);
        
        if (length(uv - p1.xy) < p1.z) { col = vec3(max_T, 0.0, 0.0); }        
        
        if (length(uv - p2.xy) < p2.z) { col = vec3(min_T, 0.0, 0.0); }       
        
        if (length(uv - p3.xy) < p3.z) { col = vec3(max_T, 0.0, 0.0); }        
        
        if (length(uv - p4.xy) < p4.z) { col = vec3(min_T * 0.5, 0.0, 0.0); }

        if (length(uv - p5.xy) < p5.z) { col = vec3(max_T, 0.0, 0.0); }
        
        if (uv.x > box.x && uv.x < box.y && uv.y > box.z && uv.y < box.w) { col = vec3(max_T * 0.8, 0.0, 0.0); }
    } else {
        float epsilon = 0.0001;
        
        float c = texture(tex, uv).r;
        
        float temp;
      
        float t = tTexture(uv + vec2(0.0, epsilon), c);

        float r = tTexture(uv + vec2(-epsilon, 0.0), c);

        float b = tTexture(uv + vec2(0.0, -epsilon), c);

        float l = tTexture(uv + vec2(epsilon, 0.0), c);

        temp = c + K * (t + r + b + l - 4.0 * c);
        temp = max(temp, min_T); 
        col = vec3(temp, 0.0, 0.0);

        // col = vec3(0.0, 1.0, 1.0);
    }

    color = vec4(col, 1.0);
}