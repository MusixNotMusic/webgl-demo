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

#define SHADER_TOY

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

#define windDir vec3(cos(iTime / 200.0), -sin(iTime / 50.0), 0.0)

vec4 cloudShapesNoise (vec2 uv) {
    vec3 coord = fract(vec3(uv + vec2(.2,0.62), .5) + windDir);
        
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

// mountains

vec3 noised( in vec2 x ) {
    vec2 f = fract(x);
    vec2 u = f*f*(3.0-2.0*f);
    
    vec2 p = vec2(floor(x));
    float a = hash12( (p+vec2(0,0)) );
	float b = hash12( (p+vec2(1,0)) );
	float c = hash12( (p+vec2(0,1)) );
	float d = hash12( (p+vec2(1,1)) );
    
	return vec3(a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y,
				6.0*f*(1.0-f)*(vec2(b-a,c-a)+(a-b-c+d)*u.yx));
}

const mat2 m2 = mat2(1.6,-1.2,1.2,1.6);

float terrainMap( in vec2 x, const int OCTAVES ) {
	vec2 p = x*(MOUNTAIN_HW_RATIO*SCENE_SCALE);
    float s = mix(1., smoothstep(.0,.4, abs(p.y)), .75);
    
    float a = 0.;
    float b = 1.;
	vec2  d = vec2(0.0);
    for( int i=0; i<OCTAVES; i++ ) {
        vec3 n = noised(p);
        d += n.yz;
        a += b*n.x/(1.0+dot(d,d));
		b *= 0.5;
        p = m2*p;
    }
	return s*a*(MOUNTAIN_HEIGHT*INV_SCENE_SCALE*.5);
}

float terrainMapB( in vec2 x, const int OCTAVES ) {
	vec2 p = x*(MOUNTAIN_HW_RATIO*SCENE_SCALE);
    float s = mix(1., smoothstep(.0,.4, abs(p.y)), .75);
    
    float a = 0.;
    float b = 1.;
	vec2  d = vec2(0.0);
    for( int i=0; i<OCTAVES; i++ ) {
        vec3 n = noised(p);
        d += n.yz;
        a += b*n.x/(1.0+dot(d,d));
		b *= 0.5;
        p = m2*p;
    }
	return s*a*(MOUNTAIN_HEIGHT*INV_SCENE_SCALE*.5);
}


float terrainMapNormalize( in vec2 x, const int OCTAVES ) {
	vec2 p = x;
    float s = mix(1., smoothstep(.0,.4, abs(p.y)), .75);
    
    float a = 0.;
    float b = 1.;
	vec2  d = vec2(0.0);
    for( int i=0; i<OCTAVES; i++ ) {
        vec3 n = noised(p);
        d += n.yz;
        a += b*n.x/(1.0+dot(d,d));
		b *= 0.5;
        p = m2*p;
    }
	return s*a;
}

vec3 calcNormal(in vec3 pos, float t, const int OCTAVES) {
    vec2  eps = vec2( (0.0015)*t, 0.0 );
    return normalize( vec3( terrainMap(pos.xz-eps.xy, OCTAVES) - terrainMap(pos.xz+eps.xy, OCTAVES),
                            2.0*eps.x,
                            terrainMap(pos.xz-eps.yx, OCTAVES) - terrainMap(pos.xz+eps.yx, OCTAVES) ) );
}

vec3 calcNormal1(in vec3 pos, float t, const int OCTAVES) {
    vec2  eps = vec2( (0.0015)*t, 0.0 );
    return normalize( vec3( terrainMapNormalize(pos.xz-eps.xy, OCTAVES) - terrainMapNormalize(pos.xz+eps.xy, OCTAVES),
                            2.0*eps.x,
                            terrainMapNormalize(pos.xz-eps.yx, OCTAVES) - terrainMapNormalize(pos.xz+eps.yx, OCTAVES) ) );
}

vec4 render( in vec3 ro, in vec3 rd ) {
	vec3 col, bgcol;
    
    float tmax = 10000.;
    // bouding top plane
    float topd = ((MOUNTAIN_HEIGHT*INV_SCENE_SCALE)-ro.y)/rd.y;
    if( rd.y > 0.0 && topd > 0.0 ) {
        tmax = min(tmax, topd);
    }
    
    // intersect with heightmap
    float t = 1.;
	for( int i=0; i<128; i++ ) {
        vec3 pos = ro + t*rd;
		float h = pos.y - terrainMap( pos.xz, 7 );
        if(abs(h)<(0.003*t) || t>tmax ) break; // use abs(h) to bounce back if under terrain
	    t += .9 * h;
	}
   	
    bgcol = col = getSkyColor(rd);
	if( t<tmax) {
		vec3 pos = ro + t*rd;
        vec3 nor = calcNormal( pos, t, 15);
           
        // terrain color - just back and white
        float s = smoothstep(0.5,0.9,dot(nor, vec3(.3,1.,0.05)));
        col = mix( vec3(.01), vec3(0.5,0.52,0.6), smoothstep(.1,.7,s ));
		
        // lighting	
        // shadow is calculated based on the slope of a low frequency version of the heightmap
        float shadow = .5 + clamp( -8.+ 16.*dot(SUN_DIR, calcNormal(pos, t, 5)), 0.0, .5 );
        shadow *= smoothstep(20.,80.,pos.y);
        
        float ao = terrainMap(pos.xz, 10)-terrainMap(pos.xz,7);
        ao = clamp(.25 + ao / (MOUNTAIN_HEIGHT*INV_SCENE_SCALE) * 200., 0., 1.);

        float ambient  = max(0.5+0.5*nor.y,0.0);
		float diffuse  = max(dot(SUN_DIR, nor), 0.0);
		float backlight = max(0.5 + 0.5*dot( normalize( vec3(-SUN_DIR.x, 0., SUN_DIR.z)), nor), 0.0);
	 	
        //
        // use a 3-light setup as described by Íñigo Quílez
        // https://iquilezles.org/articles/outdoorslighting
        //
		vec3 lin = (diffuse*shadow*3.) * SUN_COLOR;
		lin += (ao*ambient)*vec3(0.40,0.60,1.00);
        lin += (backlight)*vec3(0.40,0.50,0.60);
		col *= lin;
        col *= (.6+.4*smoothstep(400.,100.,abs(pos.z))); // dark in the distance
    
        // height based fog, see https://iquilezles.org/articles/fog
        float fogAmount = HEIGHT_BASED_FOG_C * (1.-exp( -t*rd.y*HEIGHT_BASED_FOG_B))/rd.y;
        col = mix( col, bgcol, fogAmount);
    } else {
        t = 10000.;
    }

	return vec4( col, t );
}

vec4 renderMountains (vec2 fragCoord) {
    vec3 ro, rd;
    vec3 o = hash33( vec3(fragCoord,iFrame) ) - 0.5; // dither
    getRay( iTime, (fragCoord+o.xy), iResolution.xy, iMouse/iResolution.xyxy, ro, rd);

    vec4 res = render( ro + rd*o.z, rd );

    vec2 spos = reprojectPos(ro+rd*res.w, iResolution.xy, iChannel1);
    spos -= o.xy/iResolution.xy; // undo dither
    
    vec2 rpos = spos * iResolution.xy;
    
    // if( !letterBox(rpos.xy, iResolution.xy, 2.3) 
    //     && !resolutionChanged() && !mouseChanged()) {
    //     vec4 ocol = texture( iChannel0, spos, 0.0 );
    //     res.rgb = mix(max(ocol.rgb,vec3(0)), res.rgb, .125);
    // }

    return res;
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

#define depthSampleCount 128

vec4 renderB( in vec3 ro, in vec3 rd ) {
    float t = 1.;

    float tmax = 10000.;
    // bouding top plane
    float topd = ((MOUNTAIN_HEIGHT*INV_SCENE_SCALE)-ro.y)/rd.y;
    if( rd.y > 0.0 && topd > 0.0 ) {
        tmax = min(tmax, topd);
    }

    vec2 bounds = hitBox( ro, rd );
    if ( bounds.x > bounds.y ) discard;
    bounds.x = max( bounds.x, 0.0 );
    vec3 pos = ro + bounds.x * rd * tmax;
    vec3 inc = 1.0 / abs( rd );
    float delta = min( inc.x, min( inc.y, inc.z ) );
    delta /= float(depthSampleCount);
    
    for ( float i = bounds.x; i < bounds.y; i += delta ) {

        pos += rd * delta;
		float h = (pos.y - terrainMap( pos.xz, 7 ));
        if(abs(h)<(0.003*t) || t>tmax ) break; // use abs(h) to bounce back if under terrain
	    t += .9 * delta;
    }


	vec3 col, bgcol;

    // col = vec3(terrainMapNormalize(pos.yz, 10), terrainMapNormalize(pos.xz, 5),  terrainMapNormalize(pos.xy, 7));
    col = vec3(terrainMapNormalize(pos.xz * 0.001, 10));

	return vec4( col, 1.0 );
}

vec4 renderC( in vec3 ro, in vec3 rd ) {
	vec3 col, bgcol;
    
    float tmax = 500.;
    // bouding top plane
    float topd = (ro.y)/rd.y;
    if( rd.y > 0.0 && topd > 0.0 ) {
        tmax = min(tmax, topd);
    }
    
    // intersect with heightmap
    float t = 1.;
	for( int i=0; i<256; i++ ) {
        vec3 pos = ro + t*rd;
		float h = pos.y - terrainMapNormalize( pos.xz, 7 );
        if(abs(h)<(0.003*t) || t>tmax ) break; // use abs(h) to bounce back if under terrain
	    t += .9 * h;
	}
   	
    bgcol = col = getSkyColor(rd);
	if( t<tmax) {
		vec3 pos = ro + t*rd;
        vec3 nor = calcNormal1( pos, t, 15);
           
        // terrain color - just back and white
        float s = smoothstep(0.5,0.9,dot(nor, vec3(.3,1.,0.05)));
        col = mix( vec3(.01), vec3(0.5,0.52,0.6), smoothstep(.1,.7,s ));
		
        // lighting	
        // shadow is calculated based on the slope of a low frequency version of the heightmap
        float shadow = .5 + clamp( -8.+ 16.*dot(SUN_DIR, calcNormal1(pos, t, 5)), 0.0, .5 );
        shadow *= smoothstep(20.,80.,pos.y);
        
        float ao = terrainMapNormalize(pos.xz, 10)-terrainMapNormalize(pos.xz,7);
        ao = clamp(.25 + ao / 200., 0., 1.);

        float ambient  = max(0.5+0.5*nor.y,0.0);
		float diffuse  = max(dot(SUN_DIR, nor), 0.0);
		float backlight = max(0.5 + 0.5*dot( normalize( vec3(-SUN_DIR.x, 0., SUN_DIR.z)), nor), 0.0);
	 	
        //
        // use a 3-light setup as described by Íñigo Quílez
        // https://iquilezles.org/articles/outdoorslighting
        //
		vec3 lin = (diffuse*shadow*3.) * SUN_COLOR;
		lin += (ao*ambient)*vec3(0.40,0.60,1.00);
        lin += (backlight)*vec3(0.40,0.50,0.60);
		col *= lin;
        col *= (.6+.4*smoothstep(400.,100.,abs(pos.z))); // dark in the distance
    
        // height based fog, see https://iquilezles.org/articles/fog
        float fogAmount = HEIGHT_BASED_FOG_C * (1.-exp( -t*rd.y*HEIGHT_BASED_FOG_B))/rd.y;
        col = mix( col, bgcol, fogAmount);
    } else {
        t = 10000.;
    }

	return vec4( col, t );
}

vec4 renderMountainsB (vec2 fragCoord) {
    vec3 ro = vOrigin, rd = normalize(vDirection);
    vec3 o = hash33( vec3(fragCoord,iFrame) ) - 0.5; // dither
    // getRay( iTime, (fragCoord+o.xy), iResolution.xy, iMouse/iResolution.xyxy, ro, rd);

    vec4 res = renderB( ro + rd*o.z, rd );
    // vec4 res = renderC( ro + rd*o.z, rd );

    return res;
}

//=========================== render could ===========================

#define CLOUD_MARCH_STEPS 12
#define CLOUD_SELF_SHADOW_STEPS 6

#define EARTH_RADIUS    (1500000.) // (6371000.)
#define CLOUDS_BOTTOM   (1350.)
#define CLOUDS_TOP      (2350.)

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
	vec3 uv = p * (0.00005 * CLOUDS_BASE_SCALE);
    // vec3 cloud = texture(iChannel0, uv.xz).rgb;
    vec3 cloud = cloudShapesNoise(uv.xz).rgb;
   
    float n = norY*norY;
    n *= cloud.b ;
        n+= pow(1.-norY, 16.); 
	return remap( cloud.r - n, cloud.g, 1.);
}

float cloudMapDetail(vec3 p) { 
    // 3d lookup in 2d texture :(
    p = abs(p) * (0.0016 * CLOUDS_BASE_SCALE * CLOUDS_DETAIL_SCALE);
  
    float yi = mod(p.y,32.);
    ivec2 offset = ivec2(mod(yi,8.), mod(floor(yi/8.),4.))*34 + 1;
    // float a = texture(iChannel3, (mod(p.xz,32.)+vec2(offset.xy)+1.)/iResolution.xy).r;
    float a = cloudShapesCube((mod(p.xz,32.)+vec2(offset.xy)+1.)/iResolution.xy).r;
    
    yi = mod(p.y+1.,32.);
    offset = ivec2(mod(yi,8.), mod(floor(yi/8.),4.))*34 + 1;
    float b = cloudShapesCube((mod(p.xz,32.)+vec2(offset.xy)+1.)/iResolution.xy).r;
    
    return mix(a,b,fract(p.y));
}

float cloudGradient( float norY ) {
    return linearstep( 0., .05, norY ) - linearstep( .8, 1.2, norY);
}

float cloudMap(vec3 pos, vec3 rd, float norY) {
    vec3 ps = pos;
    
    float m = cloudMapBase(ps, norY);
	m *= cloudGradient( norY );

	float dstrength = smoothstep(1., 0.5, m);
    
    // erode with detail
    if(dstrength > 0.) {
		m -= cloudMapDetail( ps ) * dstrength * CLOUDS_DETAIL_STRENGTH;
    }

	m = smoothstep( 0., CLOUDS_BASE_EDGE_SOFTNESS, m+(CLOUDS_COVERAGE-1.) );
    m *= linearstep0(CLOUDS_BOTTOM_SOFTNESS, norY);

    return clamp(m * CLOUDS_DENSITY * (1.+max((ps.x-7000.)*0.005,0.)), 0., 1.);
}

float volumetricShadow(in vec3 from, in float sundotrd ) {
    float dd = CLOUDS_SHADOW_MARGE_STEP_SIZE;
    vec3 rd = SUN_DIR;
    float d = dd * .5;
    float shadow = 1.0;

    for(int s=0; s<CLOUD_SELF_SHADOW_STEPS; s++) {
        vec3 pos = from + rd * d;
        float norY = (length(pos) - (EARTH_RADIUS + CLOUDS_BOTTOM)) * (1./(CLOUDS_TOP - CLOUDS_BOTTOM));

        if(norY > 1.) return shadow;

        float muE = cloudMap( pos, rd, norY );
        shadow *= exp(-muE * dd);

        dd *= CLOUDS_SHADOW_MARGE_STEP_MULTIPLY;
        d += dd;
    }
    return shadow;
}

vec4 renderClouds( vec3 ro, vec3 rd, inout float dist ) {
    if( rd.y < 0. ) {
        return vec4(0,0,0,10);
    }

    ro.xz *= SCENE_SCALE;
    ro.y = sqrt(EARTH_RADIUS*EARTH_RADIUS-dot(ro.xz,ro.xz));

    float start = interectCloudSphere( rd, CLOUDS_BOTTOM );
    float end  = interectCloudSphere( rd, CLOUDS_TOP );
    
    if (start > dist) {
        return vec4(0,0,0,10);
    }
    
    end = min(end, dist);
    
    float sundotrd = dot( rd, -SUN_DIR);

    // raymarch
    float d = start;
    float dD = (end-start) / float(CLOUD_MARCH_STEPS);

    float h = hash13(rd + fract(iTime) );
    d -= dD * h;

    float scattering =  mix( HenyeyGreenstein(sundotrd, CLOUDS_FORWARD_SCATTERING_G),
        HenyeyGreenstein(sundotrd, CLOUDS_BACKWARD_SCATTERING_G), CLOUDS_SCATTERING_LERP );

    float transmittance = 1.0;
    vec3 scatteredLight = vec3(0.0, 0.0, 0.0);

    dist = EARTH_RADIUS;

    for(int s=0; s<CLOUD_MARCH_STEPS; s++) {
        vec3 p = ro + d * rd;

        float norY = clamp( (length(p) - (EARTH_RADIUS + CLOUDS_BOTTOM)) * (1./(CLOUDS_TOP - CLOUDS_BOTTOM)), 0., 1.);

        float alpha = cloudMap( p, rd, norY );

        if( alpha > 0. ) {
            dist = min( dist, d);
            vec3 ambientLight = mix( CLOUDS_AMBIENT_COLOR_BOTTOM, CLOUDS_AMBIENT_COLOR_TOP, norY );

            vec3 S = (ambientLight + SUN_COLOR * (scattering * volumetricShadow(p, sundotrd))) * alpha;
            float dTrans = exp(-alpha * dD);
            vec3 Sint = (S - S * dTrans) * (1. / alpha);
            scatteredLight += transmittance * Sint; 
            transmittance *= dTrans;
        }

        if( transmittance <= CLOUDS_MIN_TRANSMITTANCE ) break;

        d += dD;
    }

    return vec4(scatteredLight, transmittance);
}

//
//
// !Because I wanted a second cloud layer (below the horizon), I copy-pasted 
// almost all of the code above:
//

float cloudMapLayer(vec3 pos, vec3 rd, float norY) {
    vec3 ps = pos;

    float m = cloudMapBase(ps, norY);
	// m *= cloudGradient( norY );
	float dstrength = smoothstep(1., 0.5, m);
    
    // erode with detail
    if (dstrength > 0.) {
		m -= cloudMapDetail( ps ) * dstrength * CLOUDS_DETAIL_STRENGTH;
    }

	m = smoothstep( 0., CLOUDS_BASE_EDGE_SOFTNESS, m+(CLOUDS_LAYER_COVERAGE-1.) );

    return clamp(m * CLOUDS_DENSITY, 0., 1.);
}


float volumetricShadowLayer(in vec3 from, in float sundotrd ) {
    float dd = CLOUDS_LAYER_SHADOW_MARGE_STEP_SIZE;
    vec3 rd = SUN_DIR;
    float d = dd * .5;
    float shadow = 1.0;

    for(int s=0; s<CLOUD_SELF_SHADOW_STEPS; s++) {
        vec3 pos = from + rd * d;
        float norY = clamp( (pos.y - CLOUDS_LAYER_BOTTOM ) * (1./(CLOUDS_LAYER_TOP - CLOUDS_LAYER_BOTTOM)), 0., 1.);

        if(norY > 1.) return shadow;

        float muE = cloudMapLayer( pos, rd, norY );
        shadow *= exp(-muE * dd);

        dd *= CLOUDS_SHADOW_MARGE_STEP_MULTIPLY;
        d += dd;
    }
    return shadow;
}

vec4 renderCloudLayer( vec3 ro, vec3 rd, inout float dist ) {
    if( rd.y > 0. ) {
        return vec4(0,0,0,10);
    }

    ro.xz *= SCENE_SCALE;
    ro.y = 0.;

    float start = CLOUDS_LAYER_TOP/rd.y;
    float end  = CLOUDS_LAYER_BOTTOM/rd.y;
    
    if (start > dist) {
        return vec4(0,0,0,10);
    }
    
    end = min(end, dist);
    
    float sundotrd = dot( rd, -SUN_DIR);

    // raymarch
    float d = start;
    float dD = (end-start) / float(CLOUD_MARCH_STEPS);

    float h = hash13(rd + fract(iTime) );
    d -= dD * h;

    float scattering =  mix( HenyeyGreenstein(sundotrd, CLOUDS_FORWARD_SCATTERING_G),
        HenyeyGreenstein(sundotrd, CLOUDS_BACKWARD_SCATTERING_G), CLOUDS_SCATTERING_LERP );

    float transmittance = 1.0;
    vec3 scatteredLight = vec3(0.0, 0.0, 0.0);

    dist = EARTH_RADIUS;

    for(int s=0; s<CLOUD_MARCH_STEPS; s++) {
        vec3 p = ro + d * rd;

        float norY = clamp( (p.y - CLOUDS_LAYER_BOTTOM ) * (1./(CLOUDS_LAYER_TOP - CLOUDS_LAYER_BOTTOM)), 0., 1.);

        float alpha = cloudMapLayer( p, rd, norY );

        if( alpha > 0. ) {
            dist = min( dist, d);
            vec3 ambientLight = mix( CLOUDS_AMBIENT_COLOR_BOTTOM, CLOUDS_AMBIENT_COLOR_TOP, norY );

            vec3 S = .7 * (ambientLight +  SUN_COLOR * (scattering * volumetricShadowLayer(p, sundotrd))) * alpha;
            float dTrans = exp(-alpha * dD);
            vec3 Sint = (S - S * dTrans) * (1. / alpha);
            scatteredLight += transmittance * Sint; 
            transmittance *= dTrans;
        }

        if( transmittance <= CLOUDS_MIN_TRANSMITTANCE ) break;

        d += dD;
    }

    return vec4(scatteredLight, transmittance);
}

bool resolutionChanged() {
    return floor(texelFetch(iChannel1, ivec2(0), 0).r) != floor(iResolution.x);
}

bool mouseChanged() {
    return iMouse.z * texelFetch(iChannel1, ivec2(1,0), 1).w < 0.;
}

vec4 renderCould (vec2 fragCoord) {
    vec4 color = vec4(0.0);
    vec3 ro = vOrigin;
    vec3 rd = normalize(vDirection);

    if (fragCoord.y < 0.5) {
        color = saveCamera(iTime, fragCoord, iMouse/iResolution.xyxy);
        if( abs(fragCoord.x-1.5)<0.5 ) color = vec4(iMouse);
        if( abs(fragCoord.x-0.5)<0.5 ) color = mouseChanged() ? vec4(0) : vec4(iResolution.xy,0,0);
    } else {
        if( letterBox(fragCoord, iResolution.xy, 2.25) ) {
        	color = vec4( 0., 0., 0., 1. );
       		return color;
        } else {
            // float dist = texelFetch(iChannel2, ivec2(fragCoord),0).w * SCENE_SCALE;
            float dist = renderMountains(vec2(fragCoord)).w * SCENE_SCALE;
            vec4 col = vec4(0.0,dist,dist,1);
            
            // vec3 ro, rd;
    		// getRay( iTime, fragCoord, iResolution.xy, iMouse/iResolution.xyxy, ro, rd);

            vec3 ro = vOrigin * 1000.0;
            vec3 rd = normalize(vDirection);

            if( rd.y > 0. ) {
                // clouds
                col = renderClouds(ro, rd, dist);
                float fogAmount = 1.-(.1 + exp(-dist*0.0001));
                col.rgb = mix(col.rgb, getSkyColor(rd)*(1.-col.a), fogAmount);
            } else {
                // cloud layer below horizon
                col = renderCloudLayer(ro, rd, dist);
                // height based fog, see https://iquilezles.org/articles/fog
                float fogAmount = HEIGHT_BASED_FOG_C * 
                    (1.-exp( -dist*rd.y*(INV_SCENE_SCALE*HEIGHT_BASED_FOG_B)))/rd.y;
                col.rgb = mix(col.rgb, getSkyColor(rd)*(1.-col.a), clamp(fogAmount,0.,1.));
            }

            // if( col.w > 1. ) {
            //     color = vec4(0,0,0,1);
            // } else {
            //     vec2 spos = reprojectPos(ro+rd*dist, iResolution.xy, iChannel1);
            //     vec2 rpos = spos * iResolution.xy;

        	// 	if( !letterBox(rpos.xy, iResolution.xy, 2.3) 
            //         && !resolutionChanged() && !mouseChanged()) {
            //         vec4 ocol = texture( iChannel1, spos, 0.0 ).xyzw;
            //         col = mix(ocol, col, 0.05);
            //     }
            // }

            color = col;
            return color;
        }
    }
}

vec4 cloudRenderDemo (vec3 ro, vec3 rd, float dist) {
    if( rd.y < 0. ) {
        return vec4(0,0,0,0);
    }

    ro.xz *= SCENE_SCALE;
    // ro.y = sqrt(EARTH_RADIUS*EARTH_RADIUS-dot(ro.xz,ro.xz));
    ro.y = EARTH_RADIUS;

    float start = interectCloudSphere( rd, CLOUDS_BOTTOM );
    float end  = interectCloudSphere( rd, CLOUDS_TOP );
    
    if (start > dist) {
        return vec4(0,0,0,0);
    }
    
    end = min(end, dist);
    
    float sundotrd = dot( rd, -SUN_DIR);

    // raymarch
    float d = start;
    float dD = (end-start) / float(CLOUD_MARCH_STEPS);

    float h = hash13(rd + fract(iTime) );
    d -= dD * h;

    float scattering =  mix( HenyeyGreenstein(sundotrd, CLOUDS_FORWARD_SCATTERING_G),
        HenyeyGreenstein(sundotrd, CLOUDS_BACKWARD_SCATTERING_G), CLOUDS_SCATTERING_LERP );

    float transmittance = 1.0;
    vec3 scatteredLight = vec3(0.0, 0.0, 0.0);

    dist = EARTH_RADIUS;

    for(int s=0; s<CLOUD_MARCH_STEPS; s++) {
        vec3 p = ro + d * rd;

        float norY = clamp( (length(p) - (EARTH_RADIUS + CLOUDS_BOTTOM)) * (1./(CLOUDS_TOP - CLOUDS_BOTTOM)), 0., 1.);

        float alpha = cloudMap( p, rd, norY );

        if( alpha > 0. ) {
            dist = min( dist, d);
            vec3 ambientLight = mix( CLOUDS_AMBIENT_COLOR_BOTTOM, CLOUDS_AMBIENT_COLOR_TOP, norY );

            vec3 S = (ambientLight + SUN_COLOR * (scattering * volumetricShadow(p, sundotrd))) * alpha;
            float dTrans = exp(-alpha * dD);
            vec3 Sint = (S - S * dTrans) * (1. / alpha);
            scatteredLight += transmittance * Sint; 
            transmittance *= dTrans;
        }

        if( transmittance <= CLOUDS_MIN_TRANSMITTANCE ) break;

        d += dD;
    }

    return vec4(scatteredLight, transmittance);
}

void main () {
    vec2 fragCoord = gl_FragCoord.xy;

    // gl_FragColor = cloudShapesNoise(texCoord2D);
    // gl_FragColor = cloudShapesCube(fragCoord);
    // gl_FragColor = renderMountains(fragCoord);
    // gl_FragColor = renderMountainsB(fragCoord);
    // gl_FragColor = renderCould(fragCoord);
    gl_FragColor = cloudRenderDemo(vOrigin, normalize(vDirection), 10000.0);
    // gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);
}