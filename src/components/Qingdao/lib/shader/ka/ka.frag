precision highp float;
precision highp sampler2D;
in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform float depthSampleCount;

uniform vec2 pitchRange;

uniform float radius;

uniform float azimuth; // 方位角
uniform float elevation; // 仰角

uniform float iTime; // 仰角

#define SUN normalize(vec3(0.7,0.6,0.3))

#define PI 3.141592653589793
#define HPI 1.5707963267948966

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


float dot2( in vec3 v ) { return dot(v,v); }


/**
 *  https://github.com/GreatAttractor/gpuart/blob/master/shaders/cone.glsl
 *  
 */
#define VISIBILITY_OFFSET 1.0e-4
#define CONE_TOLERANCE    1.0e-7

vec4 intersectCone(vec3 ro, vec3 rd, vec3 center, vec3 axis, float dis, float cosa)
{

    vec3 co = ro - center;

    float cosa2 = cosa*cosa;

    float a = dot(rd, axis)*dot(rd, axis) - cosa2;
    float b = 2. * (dot(rd, axis)*dot(co, axis) - dot(rd,co)*cosa2);
    float c = dot(co,axis)*dot(co,axis) - dot(co,co)*cosa2;

    float det = b*b - 4.0*a*c;
    if (det < 0.0) return vec4(-1.0);

    det = sqrt(det);
    float k1 = (-b - det) / (2. * a);
    float k2 = (-b + det) / (2. * a);

    float t = -1.0;

    vec3 p1 = ro + k1*rd;
    vec3 p2 = ro + k2*rd;

    float t1 = dot(axis, p1 - center.xyz);
    float t2 = dot(axis, p2 - center.xyz);

    bool onaxis1 = t1 >= 0.0 && t1 <= dis;
    bool onaxis2 = t2 >= 0.0 && t2 <= dis;

    if (k1 < VISIBILITY_OFFSET && onaxis2)
    {
        t = k2;
    }
    else if (k2 < VISIBILITY_OFFSET && onaxis1)
    {
        t = k1;
    }
    else
    {
        if (k1 < k2 && onaxis1 && onaxis2
            || onaxis1 && !onaxis2)
        {
            t = k1;
        }
        else if (k2 < k1 && onaxis1 && onaxis2
            || !onaxis1 && onaxis2)
        {
            t = k2;
        }
        else
        {
            t = -1.0;
            return vec4(-1.0);
        }
    }

    if (t > 0.0)
    {
        vec3 cp = ro + t*rd - center;
        vec3 normal = normalize(cp * dot(axis, cp) / dot(cp, cp) - axis);
        if (dot(normal, rd) > 0.0)
            normal = -normal;

        return vec4(t, normal);
    }

    return vec4(-1.0);
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
    // col += 0.4*smoothstep(-0.01,0.01,cos(uv.x*0.5)*cos(uv.y*0.5)); 
    // col *= smoothstep(-1.0,-0.98,cos(uv.x))*smoothstep(-1.0,-0.98,cos(uv.y));
    col += 0.4*smoothstep(-0.01,0.01,cos(uv.x*0.5)*cos(uv.y*0.5)); 
    col *= smoothstep(-1.0,-0.98,cos(uv.x))*smoothstep(-1.0,-0.98,cos(uv.y));
    
    return col;
}


#define AA 1

void main(){
    vec3 ro = vOrigin;
    vec3 rd = normalize( vDirection );
    
    vec3 p = vec3(0.0);

    vec3 center = vec3(0.0, 0.0, -radius + 2000.0);
    
    vec4 col = vec4(0.0);


    // sphere intersection
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {

        float H = radius * sin(pitchRange.x);
        float beta = H / radius;
        vec4 tnor = intersectCone(ro, rd, center, vec3(0, 0, 1), H, beta);
        float t = tnor.x;

        if (t > 0.0) {
            vec3 pos = ro + t * rd;
            vec3 nor = tnor.yzw;

            vec3 ref = reflect(SUN, nor);
            float light = abs(dot(ref, rd));
            col = vec4(vec3(0.7), light * 0.5);
        }



        vec2 NF = iSphere(ro, rd, center, radius);
        vec3 pos = ro + NF.x * rd;
        vec3 pc = (pos - center);

        vec3 nor = normalize(pc);

        float pitch =  atan(pc.z / length(pc.xy));

        if (pitch >= pitchRange.x && length(pc) <= radius * 1.00001) {

            // vec3 ref = reflect(SUN, nor);
            // float light = abs(dot(ref, rd));
            // col = vec4(vec3(0.5), 1.0 - light);

            vec3 ref = reflect(SUN, nor);
            float light = abs(dot(ref, rd));
            col = vec4(vec3(0.7), light * 0.5);


            if (length(pc) > radius * 0.9999 && abs(pitch - pitchRange.x) < 0.01) { 
                col = vec4(1.0, 1.0, 1.0, light);
            }
        }
    }


    // cap intersect
    vec3  pa = vec3(radius * cos(azimuth) * cos(elevation), radius * sin(azimuth)* cos(elevation), radius * sin(elevation) - radius);
    vec3  pb = center;
    float crr = 400.0;
    
    // cap 
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {
        // raytrace
        float t = capIntersect( ro, rd, pa, pb, crr);
        if (t > 0.0 ) {
            col = vec4(vec3(0.0, 1.0, 0.0), 0.5);
        }
        vec3 pa1 = mix(pa, pb, abs(sin(iTime)));
        vec3 pb1 = mix(pa, pb, abs(sin(iTime) + 0.05));

        float t1 = capIntersect( ro, rd, pa1, pb1, crr * 0.8);
        if(t1 > 0.0) {
            col = vec4(vec3(1.0, 0.0, 0.0), 1.0);
        }
    }

    color = col;

    color.rgb = sqrt( color.rgb );
    
    if ( color.a == 0.0 ) discard;
}