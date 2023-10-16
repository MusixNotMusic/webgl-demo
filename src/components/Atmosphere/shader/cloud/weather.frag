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

varying vec3        texCoord;
varying vec2        texCoord2D;

varying vec3 vOrigin;
varying vec3 vDirection;

#define iGlobalTime iTime
#define iGlobalFrame iFrame

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

#define SUN_DIR normalize(vec3(-.7,.5,.75))
#define SUN_COLOR (vec3(1.,.9,.85)*1.4)

#define CAMERA_FL 2.

//
// Noise functions
//
// Hash without Sine by DaveHoskins
//
// https://www.shadertoy.com/view/4djSRW
//

float hash13(vec3 p3) {
    p3  = fract(p3 * 1031.1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
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

#define windDir vec3(cos(iTime / 200.0), -sin(iTime / 50.0), 0.0)

vec4 cloudShapesNoise (vec2 uv) {
    vec3 coord = fract(vec3(uv + vec2(.2,0.62), .5));
        
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

    return col;    
}

vec4 cloudShapesCube (vec2 fragCoord) {
    float z = floor(fragCoord.x/34.) + 8.*floor(fragCoord.y/34.);
    vec2 uv = mod(fragCoord.xy, 34.) - 1.;
    vec3 coord = vec3(uv, z) / 32.;

    float r = tilableVoronoi( coord, 16,  3. );
    float g = tilableVoronoi( coord,  4,  8. );
    float b = tilableVoronoi( coord,  4, 16. );

    float c = max(0., 1.-(r + g * .5 + b * .25) / 1.75);
    return vec4(c);
}

vec4 cloudShapesCube1 (vec3 p) {
    // float z = floor(fragCoord.x/34.) + 8.*floor(fragCoord.y/34.);
    // vec2 uv = mod(fragCoord.xy, 34.) - 1.;
    // vec3 coord = vec3(uv, z) / 32.;

    float r = tilableVoronoi( p, 16,  3. );
    float g = tilableVoronoi( p,  4,  8. );
    float b = tilableVoronoi( p,  4, 16. );

    float c = max(0., 1.-(r + g * .5 + b * .25) / 1.75);
    return vec4(c);
}


//=========================== render could ===========================

#define CLOUD_MARCH_STEPS 5
#define CLOUD_SELF_SHADOW_STEPS 6

#define EARTH_RADIUS    (0.0) // (6371000.)
#define CLOUDS_BOTTOM   (.5)
#define CLOUDS_TOP      (.8)

#define CLOUDS_LAYER_BOTTOM   (-150.)
#define CLOUDS_LAYER_TOP      (-70.)

#define CLOUDS_COVERAGE (.52)
#define CLOUDS_LAYER_COVERAGE (.41)

#define CLOUDS_DETAIL_STRENGTH (.225)
#define CLOUDS_BASE_EDGE_SOFTNESS (.1)
#define CLOUDS_BOTTOM_SOFTNESS (.25)
#define CLOUDS_DENSITY (.03)
#define CLOUDS_SHADOW_MARGE_STEP_SIZE (10.)
#define CLOUDS_LAYER_SHADOW_MARGE_STEP_SIZE (4.)
#define CLOUDS_SHADOW_MARGE_STEP_MULTIPLY (1.3)
#define CLOUDS_FORWARD_SCATTERING_G (.8)
#define CLOUDS_BACKWARD_SCATTERING_G (-.2)
#define CLOUDS_SCATTERING_LERP (.5)

#define CLOUDS_AMBIENT_COLOR_TOP (vec3(149., 167., 200.)*(1.5/255.))
#define CLOUDS_AMBIENT_COLOR_BOTTOM (vec3(39., 67., 87.)*(1.5/255.))
#define CLOUDS_MIN_TRANSMITTANCE .1

#define CLOUDS_BASE_SCALE 1.51
#define CLOUDS_DETAIL_SCALE 20.

float HenyeyGreenstein( float sundotrd, float g) {
	float gg = g * g;
	return (1. - gg) / pow( 1. + gg - 2. * g * sundotrd, 1.5);
}


float interectCloudSphere( vec3 rd, float r ) {
    float b = EARTH_RADIUS * rd.y;
    float d = b * b + r * r + 2. * EARTH_RADIUS * r;
    return -b + sqrt( d );
}

float linearstep( const float s, const float e, float v ) {
    return clamp( (v-s)*(1./(e-s)), 0., 1. );
}

float linearstep0( const float e, float v ) {
    return min( v*(1./e), 1. );
}

float remap(float v, float s, float e) {
	return (v - s) / (e - s);
}

float cloudMapBase(vec3 p, float norY) {
	vec3 uv = p;
    // vec3 cloud = texture(iChannel0, uv.xz).rgb;
    vec3 cloud = cloudShapesNoise(uv.xz).rgb;
   
    float n = norY*norY;
    n *= cloud.b ;
        n+= pow(1.-norY, 16.); 
	return remap( cloud.r - n, cloud.g, 1.);
}

float cloudMapDetail1(vec3 p) { 
    // 3d lookup in 2d texture :(
    p = abs(p);
  
    float a = cloudShapesCube1(p).r;
    
    float b = cloudShapesCube1(p + vec3(0.0, 0.01, 0.0)).r;
    
    return mix(a,b,fract(p.y));
}

float cloudGradient( float norY ) {
    return linearstep( 0., .05, norY ) - linearstep( .8, 1.2, norY);
}


float cloudMap1(vec3 pos, vec3 rd, float norY) {
    vec3 ps = pos;
    
    float m = cloudMapBase(ps, norY);
	m *= cloudGradient( norY );

	float dstrength = smoothstep(1., 0.5, m);
    
    // // erode with detail
    if(dstrength > 0.) {
		m -= cloudMapDetail1( ps ) * dstrength * CLOUDS_DETAIL_STRENGTH;
    }

	m = smoothstep( 0., CLOUDS_BASE_EDGE_SOFTNESS, m+(CLOUDS_COVERAGE-1.) );
    m *= linearstep0(CLOUDS_BOTTOM_SOFTNESS, norY);

    // return m;
    return clamp(m * CLOUDS_DENSITY * (1.+max((ps.x-7000.)*0.5,0.)), 0., 1.);
}



vec2 hitBox( vec3 orig, vec3 dir ) {
    const vec3 box_min = vec3( - 0.5 );
    const vec3 box_max = vec3( 0.5 );
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
    vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
    vec3 tmin = min( tmin_tmp, tmax_tmp );
    vec3 tmax = max( tmin_tmp, tmax_tmp );
    float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
    float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
    return vec2( t0, t1 );
}

vec4 cloudRender (vec3 ro, vec3 rd) {
    vec2 bounds = hitBox( ro, rd );
    if ( bounds.x > bounds.y ) discard;

    bounds.x = max( bounds.x, 0.0 );

    float start = bounds.x;
    float end  =  bounds.y;

    float sundotrd = dot( rd, -SUN_DIR);

    // raymarch
    float d = start;
    float dD = (end-start) / float(CLOUD_MARCH_STEPS);

    float scattering =  mix( HenyeyGreenstein(sundotrd, CLOUDS_FORWARD_SCATTERING_G),
        HenyeyGreenstein(sundotrd, CLOUDS_BACKWARD_SCATTERING_G), CLOUDS_SCATTERING_LERP );

    float transmittance = 1.0;
    vec3 scatteredLight = vec3(0.0, 0.0, 0.0);


    vec3 p = vec3(0.0);
    vec4 col = vec4(0.0);
    vec4 wind = vec4(10.0, 4.0, 0.0, 200.0);
    vec3 windV =  vec3(iTime / wind.w * wind.x, iTime / wind.w * wind.y, iTime / wind.w * wind.z);
    float top = 0.5;
    float bottom = 0.2;
    float alpha = 1.0;
    for(int s=0; s<CLOUD_MARCH_STEPS; s++) {
        p = ro + d * rd;

        float norY = clamp( (p.y - bottom) * (1./(top - bottom)), 0., 1.);

        if (norY > bottom) {

            alpha = cloudMap1(p, rd, norY);
            col = cloudShapesCube1(p + windV);

        } else {
            col = vec4(0.0);
            break;
        }
        
        if (col.y > 0.3) {
            col = vec4(vec3(1.0), pow(alpha, 2.2)) + col;
            break;
        }
        d += dD;
    }

    return col;
}


vec3 modularsnap(in vec3 p,float size)//p = position, size can be vec3
{
    return floor((p+size*.5)/size) * size;
}

float hash11(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hashRain12(vec2 p)
{
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float sdBox( vec3 p, vec3 b )
{
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdPlane( vec3 p, vec3 n, float h )
{
    // n must be normalized
    return dot(p,n) + h;
}

float sdSphere( vec3 p, float s )
{
    return length(p)-s;
}

vec3 repeat( in vec3 p, in vec3 c )
{
    vec3 q = mod(p+0.5*c,c)-0.5*c;
    return q;
}


float rainSDF(vec3 p)
{
    float rainsize= .125;
    float snapsize= .45;// rain droplets separation
    vec3 m = modularsnap(p,snapsize);

    float x=1.0-2.0*hashRain12((m.xz+.5)*1.31457453); //multiplying by a random offset
    float z=1.0-2.0*hashRain12((m.xz+.2)*1.41569562);

    float yrandom=hashRain12(m.xz*1.4234123); //random y offset

    float rainspeed = 2.5+.3*hash11(yrandom);//random rainfall speed

    //separating droplets in x,y,z dimension
    vec3 randomoffset=vec3(x*snapsize*.25,-iTime*(rainspeed)+yrandom,z*snapsize*.25);

    //you can choose any sdf shape

    //BOX WATER DROPLET
    //float r=sdBox(repeat(p-randomoffset,vec3(snapsize)),  vec3(.025,.5,.025)*rainsize);

    //ELONGATED SPHERE WATER DROPLET
    p=repeat(p-randomoffset,vec3(snapsize));
    p.y*=.05;//elongated sphere effect

    float r = sdSphere( p, rainsize * .01);

    return r;
}


/**
 * rain render
 */
vec4 rainRender(vec3 o, vec3 d)
{

    float r=1.0;
    float plane=1.0;
    float maxdist=32.0;
    float t= 0.5;

    //Marching
    //u don't need many steps, 64 steps because of plane
    //water droplets would work with 16 steps :)

    vec4 raincolor =  vec4(1.0, 1.0, 1.0, 0.7);// default blue color for rain
    vec4 color =      vec4(0.0);

    for(int i = 0; i < 32; i++) {
        vec3 p = o + d * t;
        
        r = rainSDF(p);

        plane = sdPlane(p, vec3(0.0, 1.0, 0.0), 1.0);//added a plane so you can percieve the rain in 3D

        float dist = min(r, plane);
        t += dist;

        if(dist < .0001 || t > maxdist) {
            if(r < plane) {
                color = raincolor;
            }
            break;
        }
    }


    return color;
}


vec4 rainRender1(vec3 ro, vec3 rd)
{

    vec2 bounds = hitBox( ro, rd );
    if ( bounds.x > bounds.y ) discard;

    bounds.x = max( bounds.x, 0.0 );

    float start = bounds.x;
    float end  =  bounds.y;

    int step = 32;

    float d = start;
    float dD = (end-start) / float(step);

    float maxdist = 32.0;
    float distance = 0.5;
    //Marching
    //u don't need many steps, 64 steps because of plane
    //water droplets would work with 16 steps :)

    vec4 raincolor =  vec4(1.0, 1.0, 1.0, 0.7);// default blue color for rain
    vec4 color =      vec4(0.0);

    for(int i = 0; i < step; i++) {
        vec3 p = ro + d * rd;

        if (p.y > 0.25) break;

        vec3 p1 = ro + distance * rd;
        float r = rainSDF(p1);

        float plane = sdPlane(p1, vec3(0.0, 1.0, 0.0), 1.0);//added a plane so you can percieve the rain in 3D

        float dist = min(r, plane);
        distance += dist;

        if(dist < .0001 || distance > maxdist) {
            if(r < plane) {
                color = raincolor;
            }
            break;
        }

        d += dD;
    }


    return color;
}

vec2 rot2D(vec2 p, float angle) {

    angle = radians(angle);
    float s = sin(angle);
    float c = cos(angle);

    return p * mat2(c,s,-s,c);

}

// lightning
// https://www.shadertoy.com/view/WscyWB

// const int MAX_STEPS = 32;
// const float EPSILON = 1e-4;
// const float CLOUD_START = 20.0;
// const float CLOUD_EXTENT = 20.0;
// float speed = 2.5;
// const float strikeFrequency = 0.1;

// const float MIN_DIST = 0.1;
// const float MAX_DIST = 1000.0;

// vec2 bolt0 = vec2(1e10);
// vec2 bolt1 = vec2(1e10);
// vec2 bolt2 = vec2(1e10);

// const vec3 boltColour = vec3(0.3, 0.6, 1.0);
// //Used to shape lightning bolts
// //https://www.shadertoy.com/view/lt3BWM

// #define HASHSCALE 0.1031

// float hash(float p){
//     vec3 p3  = fract(vec3(p) * HASHSCALE);
//     p3 += dot(p3, p3.yzx + 19.19);
//     return fract((p3.x + p3.y) * p3.z);
// }

// float fade(float t) { return t*t*t*(t*(6.*t-15.)+10.); }

// float grad(float hash, float p){
//     int i = int(1e4*hash);
//     return (i & 1) == 0 ? p : -p;
// }

// float perlinNoise1D(float p){
//     float pi = floor(p), pf = p - pi, w = fade(pf);
//     return mix(grad(hash(pi), pf), grad(hash(pi + 1.0), pf - 1.0), w) * 2.0;
// }


// float fbm(float pos, int octaves){
//     if(pos < 0.0){
//         return 0.0;
//     }
//     float total = 0.0;
//     float frequency = 0.2;
//     float amplitude = 1.0;
//     for(int i = 0; i < octaves; i++){
//         if(i > 2){
//             pos += 0.5*iTime;
//         }
//         total += perlinNoise1D(pos * frequency) * amplitude;
//         amplitude *= 0.5;
//         frequency *= 2.0;
//     }
//     return total;
// }

// float sdCappedCylinder( vec3 p, float h, float r ){
//     vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(h,r);
//     return min(max(d.x,d.y),0.0) + length(max(d,0.0));
// }

// float getSDF(vec3 p) {

//     float dist = 1e10;

//     //Shift everything to start at the cloud
//     p.y -= CLOUD_START;

//     //The counter of a bolt in a series
//     float t = 0.0;
//     //The offset of the series
//     float shift = 0.0;

//     //Number of noise levels for FBM
//     int octaves = 4;
//     //Scale of the y coordinate as noise input. Controls the smoothness of the bolt
//     float scale = 0.5;
//     //Offset to give simultaneous bolts different shapes
//     float shapeOffset = 15.2;
//     //Fraction of the total bolt length 0->1
//     float progress;

//     //The fraction of the lifetime of the bolt it takes for it to descend.
//     //The bolt persists in full form for 1.0-descentDuration fraction of the total period.
//     float descentDuration = 0.5;

//     //Spatial range of the bolt
//     float range = CLOUD_EXTENT*0.4;
//     float boltLength = CLOUD_START*0.5;
//     //Bolt thickness
//     float radius = 0.01;
//     //xz: the shape of the bolt
//     //y:  progress used as bolt length and positioning
//     vec3 offset;
//     vec2 location;

//     float time;

//     for(int i = 0; i < 3; i++){

//         shapeOffset *= 2.0;
//         shift = fract(shift + 0.25);
//         time = iTime * speed + shift;
//         t = floor(time)+1.0;
        
//         //Reset the position of the iteration bolt
//         if(i == 0){
//         	bolt0 = vec2(1e10);
//         }
//         if(i == 1){
//         	bolt1 = vec2(1e10);
//         }
//         if(i == 2){
//         	bolt2 = vec2(1e10);
//         }

//         //Bolts strike randomly
//         if(hash(float(i)+t*0.026) > strikeFrequency){
//             continue;
//         }
//         location = 2.0*vec2(hash(t+float(i)+0.43), hash(t+float(i)+0.3))-1.0;
//         location *= range;
//         progress = clamp(fract(time)/descentDuration, 0.0, 1.0);
        
//         //Briefly increase the radius of the bolt the moment it makes contact
//         if(progress > 0.95 && fract(time) - descentDuration < 0.1){
//             radius = 0.1;
//         }else{
//             radius = 0.01;
//         }
//         progress *= boltLength;
//         offset = vec3(location.x+fbm(shapeOffset+t*0.2+(scale*p.y), octaves), 
//                       progress, 
//                       location.y+fbm(shapeOffset+t*0.12-(scale*p.y), octaves));
        
//         //Store the xz location of the iteration bolt
//         //Raymarching translations are reversed so invert the sign
//         if(i == 0){
//         	bolt0 = -location.xy;
//         }
//         if(i == 1){
//         	bolt1 = -location.xy;
//         }
//         if(i == 2){
//         	bolt2 = -location.xy;
//         }
//         dist = min(dist, sdCappedCylinder(p+offset, radius, progress));
//     }

//     return dist;
// }

// float getGlow(float dist, float radius, float intensity){
//     dist = max(dist, 1e-6);
//     return pow(radius/dist, intensity);	
// }

// float distanceToScene(vec3 ro, vec3 rd, float start, float end, out vec3 glow) {

//     float depth = start;
//     float dist;
    
//     for (int i = 0; i < MAX_STEPS; i++) {

//         vec3 p = ro + depth * rd;
//         //Warping the cylinder breaks the shape. Reduce step size to avoid this.
//         dist = 0.5 * getSDF(p);
//         //Accumulate the glow along the view ray.
//         glow += getGlow(dist, 0.01, 0.8) * boltColour;

//         if (dist < EPSILON){
//             return depth;
//         }

//         depth += dist;

//         if (depth >= end){ 
//             return end; 
//         }
//     }

//     return end;
// }

void main () {
    vec2 fragCoord = gl_FragCoord.xy;

    // vec4 cloud = vec4(0.0);

    vec4 rain = rainRender1(vOrigin, normalize(vDirection));
    vec4 cloud = cloudRender(vOrigin, normalize(vDirection));

    vec4 color = vec4(0.0);

    // vec3 glow = vec3(0);
    // float dist = distanceToScene(vOrigin, normalize(vDirection), 0.0, MAX_DIST, glow);
    // if (vOrigin.y < CLOUD_START) {
    //     color += vec4(glow, 0.6);
    // }

    gl_FragColor = color + cloud + rain;
    // gl_FragColor = mix(cloud, rain, 0.6);
}