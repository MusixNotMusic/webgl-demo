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

#define SHADER_TOY


// Himalayas. Created by Reinder Nijhoff 2018
// Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
// @reindernijhoff
//
// https://www.shadertoy.com/view/MdGfzh
//
// This is my first attempt to render volumetric clouds in a fragment shader.
//
// I started this shader by trying to implement the clouds of Horizon Zero Dawn, as
// described in "The real-time volumetric cloudscapes of Horizon Zero Dawn" by
// Andrew Schneider and Nathan Vos.[1] To model the shape of the clouds, two look-up
// textures are created with different frequencies of (Perlin -) Worley noise:
//
// Buffer A: The main look-up texture for the cloud shapes.
// Buffer B: A 3D (32x32x32) look-up texture with Worley Noise used to add small details
//           to the shapes of the clouds. I have packed this 3D texture into a 2D buffer.
//
// Because it is not possible (yet) to create buffers with fixed size, or 3D buffers, the
// look-up texture in Buffer A is 2D, and a slice of the volume that is described in the
// article. Therefore, and because I didn't have any slots left (in Buffer C) to use a
// cloud type/cloud coverage texture, the modelling of the cloud shapes in this shader is
// in the end mostly based on trial and error, and is probably far from the code used in
// Horizon Zero Dawn.
//
// Buffer D: Rendering of the clouds.
//
// I render the clouds using the improved integration method of volumetric media, as described
// in "Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite" by
// Sébastien Hillaire.[2]
//
// You can find the (excellent) example shaders of Sébastien Hillaire (SebH) here:
//
// https://www.shadertoy.com/view/XlBSRz
// https://www.shadertoy.com/view/MdlyDs
//
// Buffer C: Landscape
//
// To create an interesting scene and to add some scale to the clouds, I render a
// terrain using a simple heightmap, based on the work by Íñigo Quílez on value noise and its
// analytical derivatives.[3]
//
// In fact, the heightmap of this shader is almost exactly the same as the heightmap that
// is used in Íñigo Quílez' shader Elevated:
//
// https://www.shadertoy.com/view/MdX3Rr
//
// To reduce noise I use temporal reprojection (both for clouds (Buffer D) and the terrain
// (Buffer C)) separatly. The temporal reprojection code is based on code from the shader
// "Rain Forest" (again by Íñigo Quílez):
//
// https://www.shadertoy.com/view/4ttSWf
//
// Finally, in the Image tab, clouds and terrain are combined, a small humanoid is added
// (by Hazel Quantock) and post processing is done.
//
// [1] https://www.guerrilla-games.com/read/the-real-time-volumetric-cloudscapes-of-horizon-zero-dawn
// [2] https://media.contentapi.ea.com/content/dam/eacom/frostbite/files/s2016-pbs-frostbite-sky-clouds-new.pdf
// [3] https://iquilezles.org/articles/morenoise
//




// Himalayas. Created by Reinder Nijhoff 2018
// @reindernijhoff
//
// https://www.shadertoy.com/view/MdGfzh
//
// This is my first attempt to render volumetric clouds in a fragment shader.
//
// 1 unit correspondents to SCENE_SCALE meter.

#define SCENE_SCALE (10.)
#define INV_SCENE_SCALE (.1)

#define MOUNTAIN_HEIGHT (5000.)
#define MOUNTAIN_HW_RATIO (0.00016)

#define SUN_DIR normalize(vec3(-.7,.5,.75))
#define SUN_COLOR (vec3(1.,.9,.85)*1.4)

#define FLAG_POSITION (vec3(3900.5,720.,-2516.)*INV_SCENE_SCALE)
#define HUMANOID_SCALE (2.)

#define CAMERA_RO (vec3(3980.,730.,-2650.)*INV_SCENE_SCALE)
#define CAMERA_FL 2.

#define HEIGHT_BASED_FOG_B 0.02
#define HEIGHT_BASED_FOG_C 0.05


mat3 getCamera( in float time, in vec4 mouse, inout vec3 ro, inout vec3 ta ) {
    ro = CAMERA_RO;
    vec3 cw;
    if (mouse.z > 0.) {
        vec2 m = (mouse.xy - .5) * 2.3;
        float my = -sin(m.y);
        cw = normalize(vec3(-sin(-m.x), my+.15, cos(-m.x)));
    } else {
        ro.x += -cos(time*.13)*5.*INV_SCENE_SCALE;
        ro.z += (-cos(time*.1)*100.+20.)*INV_SCENE_SCALE;
        cw = normalize(vec3(-.1,.18,1.));
    }
    ta = ro + cw*(200.*INV_SCENE_SCALE);
    vec3 cp = vec3(0.0,1.0, 0.0);
    vec3 cu = normalize( cross(cw,cp) );
    vec3 cv = normalize( cross(cu,cw) );
    return mat3( cu, cv, cw );
}

void getRay( in float time, in vec2 fragCoord, in vec2 resolution, in vec4 mouse, inout vec3 ro, inout vec3 rd) {
    vec3 ta;
    mat3 cam = getCamera( time, mouse, ro, ta );
    vec2 p = (-resolution.xy + 2.0*(fragCoord))/resolution.y;
    rd = cam * normalize(vec3(p,CAMERA_FL));
}

//
// To reduce noise I use temporal reprojection (both for clouds (Buffer D) and the terrain
// (Buffer C) seperatly. The temporal repojection code is based on code from the shader
// "Rain Forest" (again by Íñigo Quílez):
//
// https://www.shadertoy.com/view/4ttSWf
//
vec4 saveCamera( in float time, in vec2 fragCoord, in vec4 mouse ) {
    vec3 ro, ta;
    mat3 cam = getCamera( time, mouse, ro, ta );
    vec4 fragColor;

    if( abs(fragCoord.x-4.5)<0.5 ) fragColor = vec4( cam[2], -dot(cam[2],ro) );
    if( abs(fragCoord.x-3.5)<0.5 ) fragColor = vec4( cam[1], -dot(cam[1],ro) );
    if( abs(fragCoord.x-2.5)<0.5 ) fragColor = vec4( cam[0], -dot(cam[0],ro) );

    return fragColor;
}

vec2 reprojectPos( in vec3 pos, in vec2 resolution, in sampler2D storage ) {
    mat4 oldCam = mat4( texelFetch(storage,ivec2(2,0),0),
    texelFetch(storage,ivec2(3,0),0),
    texelFetch(storage,ivec2(4,0),0),
    0.0, 0.0, 0.0, 1.0 );

    vec4 wpos = vec4(pos,1.0);
    vec3 cpos = (wpos*oldCam).xyz;
    vec2 npos = CAMERA_FL * cpos.xy / cpos.z;
    return 0.5 + 0.5*npos*vec2(resolution.y/resolution.x,1.0);
}

//
// Fast skycolor function by Íñigo Quílez
// https://www.shadertoy.com/view/MdX3Rr
//
vec3 getSkyColor(vec3 rd) {
    float sundot = clamp(dot(rd,SUN_DIR),0.0,1.0);
    vec3 col = vec3(0.2,0.5,0.85)*1.1 - max(rd.y,0.01)*max(rd.y,0.01)*0.5;
    col = mix( col, 0.85*vec3(0.7,0.75,0.85), pow(1.0-max(rd.y,0.0), 6.0) );

    col += 0.25*vec3(1.0,0.7,0.4)*pow( sundot,5.0 );
    col += 0.25*vec3(1.0,0.8,0.6)*pow( sundot,64.0 );
    col += 0.20*vec3(1.0,0.8,0.6)*pow( sundot,512.0 );

    col += clamp((0.1-rd.y)*10., 0., 1.) * vec3(.0,.1,.2);
    col += 0.2*vec3(1.0,0.8,0.6)*pow( sundot, 8.0 );
    return col;
}

bool letterBox(vec2 fragCoord, const vec2 resolution, const float aspect) {
    if( fragCoord.x < 0. || fragCoord.x > resolution.x ||
    abs(2.*fragCoord.y-resolution.y) > resolution.x * (1./aspect) ) {
        return true;
    } else {
        return false;
    }
}

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



#define AA 3

//
// Cheap 2D Humanoid SDF for dropping into scenes to add a sense of scale.
// Hazel Quantock 2018
//
// Based on: https://www.shadertoy.com/view/4scBWN
//
float RoundMax( float a, float b, float r ) {
    a += r; b += r;
    float f = ( a > 0. && b > 0. ) ? sqrt(a*a+b*b) : max(a,b);
    return f - r;
}

float RoundMin( float a, float b, float r ) {
    return -RoundMax(-a,-b,r);
}

float Humanoid( in vec2 uv, in float phase ) {
    float n3 = sin((uv.y-uv.x*.7)*11.+phase)*.014; // "pose"
    float n0 = sin((uv.y+uv.x*1.1)*23.+phase*2.)*.007;
    float n1 = sin((uv.y-uv.x*.8)*37.+phase*4.)*.004;
    float n2 = sin((uv.y+uv.x*.9)*71.+phase*8.)*.002;


    float head = length((uv-vec2(0,1.65))/vec2(1,1.2))-.15/1.2;
    float neck = length(uv-vec2(0,1.5))-.05;
    float torso = abs(uv.x)-.25 - uv.x*.3;

    torso = RoundMax( torso, uv.y-1.5, .2 );
    torso = RoundMax( torso, -(uv.y-.6), .0 );

    float f = RoundMin(head,neck,.04);
    f = RoundMin(f,torso,.02);

    float leg = abs(abs(uv.x+(uv.y-.9)*.1*cos(phase*3.))-.15+.075*uv.y)-.07-.07*uv.y;
    leg = max( leg, uv.y-1. );

    f = RoundMin(f,leg,.1);

    float stick = max(abs(uv.x+.4-uv.y*.04)-0.025, uv.y-1.15);
    float arm = max(max(abs(uv.y-1.-uv.x*.3) - .06, uv.x), -uv.x-.4);

    f = RoundMin(f, stick, 0.0);
    f = RoundMin(f, arm, 0.05);

    f += (-n0+n1+n2+n3)*(.1+.9*uv.y/1.6);

    return max( f, -uv.y );
}

//
// Lens flare, original based on:
// musk's lens flare by mu6k
//
// https://www.shadertoy.com/view/4sX3Rs
//
float lensflare(vec2 fragCoord) {
    vec3 ro, ta;
    mat3 cam = getCamera( iTime, iMouse/iResolution.xyxy, ro, ta );
    vec3 cpos = SUN_DIR*cam;
    vec2 pos = CAMERA_FL * cpos.xy / cpos.z;
    vec2 uv = (-iResolution.xy + 2.0*fragCoord)/iResolution.y;

    vec2 uvd = uv*(length(uv));
    float f = 0.1/(length(uv-pos)*16.0+1.0);
    f += max(1.0/(1.0+32.0*pow(length(uvd+0.8*pos),2.0)),.0)*0.25;
    vec2 uvx = mix(uv,uvd,-0.5);
    f += max(0.01-pow(length(uvx+0.4*pos),2.4),.0)*6.0;
    f += max(0.01-pow(length(uvx-0.3*pos),1.6),.0)*6.0;
    uvx = mix(uv,uvd,-0.4);
    f += max(0.01-pow(length(uvx+0.2*pos),5.5),.0)*2.0;

    return f;
}

bool intersectSphere ( in vec3 ro, in vec3 rd, in vec4 sph ) {
    vec3  ds = ro - sph.xyz;
    float bs = dot(rd, ds);
    float cs = dot(ds, ds) - sph.w*sph.w;
    float ts = bs*bs - cs;

    if( ts > 0.0 ) {
        ts = -bs - sqrt( ts );
        if( ts>0. ) {
            return true;
        }
    }
    return false;
}

bool intersectPlane (in vec3 ro, in vec3 rd, in vec3 n, in vec3 p0, inout float dist) {
    dist = dot(p0 - ro, n)/dot(rd,n);
    return dist > 0.;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    if( letterBox(fragCoord, iResolution.xy, 2.35) ) {
        fragColor = vec4( 0., 0., 0., 1. );
    } else {
        vec4 col = texelFetch(iChannel0, ivec2(fragCoord), 0);
        vec4 clouds = texelFetch(iChannel1, ivec2(fragCoord), 0);

        col.rgb = clouds.rgb + col.rgb * clouds.a;

        vec3 ro, rd, ta;
        mat3 cam = getCamera( iTime, iMouse/iResolution.xyxy, ro, ta );
        float dist;
        vec4 tcol = vec4(0.);
        vec2 p = (-iResolution.xy + 2.0*(fragCoord))/iResolution.y;
        rd = cam * normalize(vec3(p,CAMERA_FL));

        if (intersectSphere(ro,rd,vec4(FLAG_POSITION,HUMANOID_SCALE*INV_SCENE_SCALE*2.))) {
            for(int x=0; x<AA; x++) {
                for(int y=0; y<AA; y++) {
                    vec2 p = (-iResolution.xy + 2.0*(fragCoord + vec2(x,y)/float(AA) - .5))/iResolution.y;
                    rd = cam * normalize(vec3(p,CAMERA_FL));

                    if (intersectPlane(ro, rd, vec3(0,0,1), FLAG_POSITION, dist) && dist < col.w) {
                        vec3 pos = ro + rd * dist;
                        vec2 uv = (pos.xy - FLAG_POSITION.xy)*(SCENE_SCALE/HUMANOID_SCALE);
                        uv.x = -uv.x + uv.y*0.05;
                        float sdf = Humanoid( uv, 3. );
                        float a = smoothstep(.4,.6,.5-.5*sdf/(abs(sdf)+.002));
                        float sdf2 = Humanoid( uv+vec2(.025,0.05), 3. );
                        float a2 = smoothstep(.4,.6,.5-.5*sdf2/(abs(sdf2)+.002));
                        float c = (a-a2)*2.;
                        c = clamp(c+uv.x*.2+.6,0.,1.); c*=c; c*=c;
                        tcol += vec4(mix(vec3(.04,0.05,0.06),SUN_COLOR,c),a);
                    }
                }
            }
            tcol /= float(AA*AA);
        }

        col.rgb = mix(col.rgb, tcol.rgb, tcol.w);

        // lens flare
        col.rgb += SUN_COLOR*lensflare(fragCoord)*smoothstep(-.3,.5,dot(rd,SUN_DIR));
        col.rgb = clamp(col.rgb, vec3(0), vec3(1));

        // gamma and contrast
        col.rgb = mix(col.rgb, pow(col.rgb, vec3(1./2.2)), .85);
        col.rgb = mix( col.rgb, col.bbb, 0.2 );

        // vignette
        vec2 uv = fragCoord / iResolution.xy;
        col.rgb = mix(col.rgb*col.rgb, col.rgb, pow( 16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y), 0.1 ));

        // noise
        col.rgb -= hash12(fragCoord)*.025;

        fragColor = vec4( col.rgb, 1. );
    }
}
void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    mainImage(gl_FragColor, fragCoord);
}