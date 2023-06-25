uniform sampler2D  tex;
uniform vec3        iResolution;

void main() {
    vec2 fragCoord = gl_FragCoord.xy / iResolution.xy;
    gl_FragColor.rgb = texture(tex, fragCoord.xy).rgb;
    // gl_FragColor.rgb = vec3(fragCoord, 1.0);
    gl_FragColor.a = 1.0;
}