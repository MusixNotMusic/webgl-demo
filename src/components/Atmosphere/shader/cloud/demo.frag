uniform vec3        iResolution;
uniform float       iTime;
uniform float       iTimeDelta;
uniform int         iFrame;
uniform vec4        iDate;
uniform vec3        iChannelResolution[10];
uniform vec4        iMouse;
uniform vec4        iMouseButton;
uniform sampler2D   iChannel0;
uniform sampler2D   iChannel1;
uniform sampler2D   iChannel2;
uniform sampler2D   iChannel3;
uniform sampler2D   iChannel4;
uniform sampler2D   iChannel5;
uniform sampler2D   iChannel6;
uniform sampler2D   iChannel7;
uniform sampler2D   iChannel8;
uniform sampler2D   iChannel9;
uniform sampler2D   iKeyboard;
uniform float       iSampleRate;

#define iGlobalTime iTime
#define iGlobalFrame iFrame

//
// Noise functions
//
// Hash without Sine by DaveHoskins
//
// https://www.shadertoy.com/view/4djSRW
//
float hash12( vec2 p ) {
    p  = 50.0*fract( p*0.3183099 );
    return fract( p.x*p.y*(p.x+p.y) );
}

float hash13(vec3 p3) {
    p3  = fract(p3 * 1031.1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+19.19);
    return fract((p3.xxy + p3.yxx)*p3.zyx);
}

float valueHash(vec3 p3) {
    p3  = fract(p3 * 0.1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

//
// Noise functions used for cloud shapes
//
float valueNoise( in vec3 x, float tile ) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);

    return mix(mix(mix( valueHash(mod(p+vec3(0,0,0),tile)),
    valueHash(mod(p+vec3(1,0,0),tile)),f.x),
    mix( valueHash(mod(p+vec3(0,1,0),tile)),
    valueHash(mod(p+vec3(1,1,0),tile)),f.x),f.y),
    mix(mix( valueHash(mod(p+vec3(0,0,1),tile)),
    valueHash(mod(p+vec3(1,0,1),tile)),f.x),
    mix( valueHash(mod(p+vec3(0,1,1),tile)),
    valueHash(mod(p+vec3(1,1,1),tile)),f.x),f.y),f.z);
}

float voronoi( vec3 x, float tile ) {
    vec3 p = floor(x);
    vec3 f = fract(x);

    float res = 100.;
    for(int k=-1; k<=1; k++){
        for(int j=-1; j<=1; j++) {
            for(int i=-1; i<=1; i++) {
                vec3 b = vec3(i, j, k);
                vec3 c = p + b;

                if( tile > 0. ) {
                    c = mod( c, vec3(tile) );
                }

                vec3 r = vec3(b) - f + hash13( c );
                float d = dot(r, r);

                if(d < res) {
                    res = d;
                }
            }
        }
    }

    return 1.-res;
}

float tilableVoronoi( vec3 p, const int octaves, float tile ) {
    float f = 1.;
    float a = 1.;
    float c = 0.;
    float w = 0.;

    if( tile > 0. ) f = tile;

    for( int i=0; i<octaves; i++ ) {
        c += a*voronoi( p * f, f );
        f *= 2.0;
        w += a;
        a *= 0.5;
    }

    return c / w;
}

float tilableFbm( vec3 p, const int octaves, float tile ) {
    float f = 1.;
    float a = 1.;
    float c = 0.;
    float w = 0.;

    if( tile > 0. ) f = tile;

    for( int i=0; i<octaves; i++ ) {
        c += a*valueNoise( p * f, f );
        f *= 2.0;
        w += a;
        a *= 0.5;
    }

    return c / w;
}

//#define windDir vec3(cos(iTime / 200.0), -sin(iTime / 50.0), 0.0)
#define windDir vec3(cos(iTime), -sin(iTime), 0.0)

bool resolutionChanged() {
    return floor(texelFetch(iChannel1, ivec2(0), 0).r) != floor(iResolution.x);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 vUV = fragCoord / iResolution.xy;
    vec3 coord = fract(vec3(vUV + vec2(.2,0.62), .5)) - 0.5;

    vec4 col = vec4(1);

    float mfbm = 0.9;
    float mvor = 0.7;

    col.r = mix(1., tilableFbm( coord, 7, 4. ), mfbm) *
            mix(1., tilableVoronoi( coord, 8, 9. ), mvor);
    col.g = 0.625 * tilableVoronoi( coord + 0., 3, 15. ) +
            0.250 * tilableVoronoi(  coord + 0., 3, 19. ) +
            0.125 * tilableVoronoi( coord + 0., 3, 23. )
            -1.;
    col.b = 1. - tilableVoronoi( coord + 0.5, 6, 9. );

    fragColor = col;
}
void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    mainImage(gl_FragColor, fragCoord);
}