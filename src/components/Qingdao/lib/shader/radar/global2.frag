precision highp float;
precision highp sampler3D;
// precision highp sampler2D;
in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform sampler3D tex;
uniform sampler2D colorTex;

uniform float depthSampleCount;

uniform vec2 pitchRange;

uniform float radius;

uniform float azimuth; // 方位角
uniform float elevation; // 仰角

uniform vec2 iResolution;

#define SUN normalize(vec3(0.0, 1.0, -1.0))

#define PI 3.141592653589793

// #define ECHO

const float N = 10.0; // grid ratio
float gridTextureGradBox( in vec2 p, in vec2 ddx, in vec2 ddy )
{
	// filter kernel
    vec2 w = max(abs(ddx), abs(ddy)) + 0.01;

	// analytic (box) filtering
    vec2 a = p + 0.5*w;                        
    vec2 b = p - 0.5*w;           
    vec2 i = (floor(a)+min(fract(a)*N,1.0)-
              floor(b)-min(fract(b)*N,1.0))/(N*w);
    //pattern
    return (1.0-i.x)*(1.0-i.y);
}

/**
 * 球体相交
 */
vec2 iSphere( in vec3 ro, in vec3 rd, in vec3 ce, float ra )
{
    vec3 oc = ro - ce;
    float b = dot( oc, rd );
    float c = dot( oc, oc ) - ra*ra;
    float h = b*b - c;
    if( h < 0.0 ) return vec2(-1.0); // no intersection
    h = sqrt( h );
    return vec2( -b-h, -b+h );
}

// capsule defined by extremes pa and pb, and radious ra
// Note that only ONE of the two spherical caps is checked for intersections,
// which is a nice optimization
float capIntersect( in vec3 ro, in vec3 rd, in vec3 pa, in vec3 pb, in float ra )
{
    vec3  ba = pb - pa;
    vec3  oa = ro - pa;
    float baba = dot(ba,ba);
    float bard = dot(ba,rd);
    float baoa = dot(ba,oa);
    float rdoa = dot(rd,oa);
    float oaoa = dot(oa,oa);
    float a = baba      - bard*bard;
    float b = baba*rdoa - baoa*bard;
    float c = baba*oaoa - baoa*baoa - ra*ra*baba;
    float h = b*b - a*c;
    if( h >= 0.0 )
    {
        float t = (-b-sqrt(h))/a;
        float y = baoa + t*bard;
        // body
        if( y>0.0 && y<baba ) return t;
        // caps
        vec3 oc = (y <= 0.0) ? oa : ro - pb;
        b = dot(rd,oc);
        c = dot(oc,oc) - ra*ra;
        h = b*b - c;
        if( h>0.0 ) return -b - sqrt(h);
    }
    return -1.0;
}

vec3 pattern( in vec2 uv )
{
    vec3 col = vec3(0.6);
    col += 0.4*smoothstep(-0.01,0.01,cos(uv.x*0.5)*cos(uv.y*0.5)); 
    col *= smoothstep(-1.0,-0.98,cos(uv.x))*smoothstep(-1.0,-0.98,cos(uv.y));
    
    return col;
}



float f(vec3 pos) {
    return texture(tex, pos).x;
}

vec3 calcNormal( in vec3 p ) // for function f(p)
{
    const float h = 0.05; // replace by an appropriate value
    const vec2 k = vec2(1,-1);
    return normalize( k.xyy*f( p + k.xyy*h ) + 
                      k.yyx*f( p + k.yyx*h ) + 
                      k.yxy*f( p + k.yxy*h ) + 
                      k.xxx*f( p + k.xxx*h ) );
}

void calcRayForPixel( in vec2 pix, out vec3 resRo, out vec3 resRd )
{
	vec2 p = (2.0*pix-iResolution.xy) / iResolution.y;
	
	vec3 ro, ta;
    // camera matrix
    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww,vec3(0.0,1.0,0.0) ) );
    vec3 vv = normalize( cross(uu,ww));
	// create view ray
	vec3 rd = normalize( p.x*uu + p.y*vv + 2.0*ww );
	
	resRo = ro;
	resRd = rd;
}

vec2 texCoords( in vec3 pos, vec3 center, float R )
{
    vec2 matuv;

    vec3 pc = pos - center;
    vec3 nor = normalize(pc);

    if (length(pc) < R * 0.9999) {
        vec3 uu = cross(nor, vec3(0.0, 0.0, 1.0));
        nor = normalize(cross(uu, nor));
    }

    matuv = vec2( atan(nor.x,nor.z), acos(nor.y ) );

	return 8.0*matuv;
}

#define AA 1

void main(){
    vec3 ro = vOrigin;
    vec3 rd = normalize( vDirection );
    
    vec3 p = vec3(0.0);

    vec3 center = vec3(0.0, 0.0, -radius);
    
    vec4 col = vec4(0.0);

    vec2 NF = iSphere(ro, rd, center, radius);
    p = ro + NF.x * rd;
    float step = (NF.y - NF.x) / depthSampleCount;

    if (step < 0.01) discard;

#ifdef ECHO
    // 回波体
    float val = 0.0;
    float maxVal = 0.0;
    vec3 sumColor = vec3(1.0);
    float sumA = 0.0;
    float n = 0.0;
#endif

    // 边界
    bool once = true;
    vec4 colorB = vec4(0.0);

    for (float t = NF.x; t < NF.y; t += step) {
        vec3 pc = (p - center);

        float pitch =  pc.z / length(pc.xy);
        vec3 nor = normalize(pc);

        if (pitch > pitchRange.x && pitch <= pitchRange.y && pc.z >= 0.0) {
#ifdef ECHO
            vec3 pos = pc / radius * 0.5 + 0.5;
            val = texture(tex, pos).r;

            if (val > 0.2 && val < 1.0) {
                //  nor = calcNormal(pos);

                // vec3 ref = reflect(SUN, nor);
                // float light = max(abs(dot(ref, rd)), 0.1);

                maxVal = max(maxVal, val);
                sumA += val;
                // sumA += light;
                sumColor = sumColor + val * (texture(colorTex, vec2(val, 0.0)).rgb);
                n = n + 1.0;
            }
#endif

            if (once) {
                once = false;

#ifndef ECHO
                if (length(pc) < radius * 0.9999) {
                    vec3 uu = cross(nor, vec3(0.0, 0.0, 1.0));
                    nor = normalize(cross(uu, nor));
                }

                vec3 ref = reflect(SUN, nor);
                float light = abs(dot(ref, rd));
                colorB = vec4(vec3(0.7), light * 0.25);
#else
                colorB = vec4(vec3(0.7), 0.8);
#endif
                // vec3 pos = p;
                // vec3 ro, rd, ddx_ro, ddx_rd, ddy_ro, ddy_rd;
                // calcRayForPixel( gl_FragCoord.xy + vec2(0.0, 0.0), ro, rd );
                // calcRayForPixel( gl_FragCoord.xy + vec2(1.0, 0.0), ddx_ro, ddx_rd );
                // calcRayForPixel( gl_FragCoord.xy + vec2(0.0, 1.0), ddy_ro, ddy_rd );

                // vec3 ddx_pos = ddx_ro - ddx_rd*dot(ddx_ro-pos,nor)/dot(ddx_rd,nor);
                // vec3 ddy_pos = ddy_ro - ddy_rd*dot(ddy_ro-pos,nor)/dot(ddy_rd,nor);

                // // calc texture sampling footprint		
                // vec2     uv = texCoords(     pos, center, radius );
                // vec2 ddx_uv = texCoords( ddx_pos, center, radius ) - uv;
                // vec2 ddy_uv = texCoords( ddy_pos, center, radius ) - uv;

                // vec3 mate = vec3(0.4)*gridTextureGradBox( uv, ddx_uv, ddy_uv );

                // colorB = vec4(mate, 1.0);

                // if (length(pc) < radius * 0.99) {
                //     if (abs(mod(pc.x, radius * 0.1)) < radius * 0.003)
                //         colorB = vec4(1.0, 1.0, 1.0, 0.5);

                //     if (abs(mod(pc.y, radius * 0.1)) < radius * 0.003)
                //         colorB = vec4(1.0, 1.0, 1.0, 0.5);
                // }

                if (length(pc) > radius * 0.99 && abs(pitch - pitchRange.y) < 0.01) { 
                    colorB = vec4(1.0, 1.0, 1.0, 0.5);
                }
            }
        }
        
        p = p + step * rd;
    }

#ifdef ECHO
    vec4 colorMax = texture(colorTex, vec2(maxVal , 0.0));
    vec3 colorW = sumColor.rgb / sumA;
    float avgA = sumA / n;
    float u = pow(1.0 - avgA, n);

    float limit = 0.5;
    if (maxVal > limit) {
        col.rgb  = u * colorW + (1.0 - u) * colorMax.rgb;
        col.a = pow( maxVal, 1.0/ 4.2 );
    } else {
        col.rgb  = (1.0 - u) * colorW + u * colorMax.rgb;
        col.a = pow(maxVal, 1.0/ 3.3);
    }
    col.rgb = mix(colorB.rgb, col.rgb, 0.5);
#else
    col = colorB;
#endif

    // cap intersect
    vec3  pa = vec3(radius * cos(azimuth) * cos(elevation), radius * sin(azimuth)* cos(elevation), radius * sin(elevation) - radius);
    vec3  pb = center + vec3(0.0, 0.0, 2000.0 * 4.0);;
    float crr = 400.0;
    
    // cap 
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {
        // raytrace
        float t = capIntersect( ro, rd, pa, pb, crr);
        if (t > 0.0 ) {
            col = vec4(vec3(1.0, 0.0, 0.0), 0.5);
        }
    }

    color = col;
    
    if ( color.a == 0.0 ) discard;
}