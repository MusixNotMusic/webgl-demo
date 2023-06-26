uniform sampler2D   tex;
uniform vec3        iResolution;
varying vec3        texCoord;

void main() {
    // vec2 fragCoord = gl_FragCoord.xy / iResolution.xy;
    // gl_FragColor.rgb = texture(gl_FragCoord.xy, fragCoord.xy).rgb;
    // gl_FragColor.rgb = vec3(gl_FragCoord.xy, 1.0);
    gl_FragColor.rgb = vec3(texCoord.xy, 1.0);
    gl_FragColor.a = 1.0;
}