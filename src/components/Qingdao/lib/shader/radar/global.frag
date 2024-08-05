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

#define SUN normalize(vec3(1.0, 0.5, -0.5))

#define PI 3.141592653589793

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



vec4 intersectCone(vec3 ro, vec3 rd, vec3 center, vec3 axis, float dis, float cosa)
{

    vec3 co = ro - center;

    float cosa2 = cosa*cosa;

    float a = dot(rd, axis)*dot(rd, axis) - cosa2;
    float b = 2. * (dot(rd, axis)*dot(co, axis) - dot(rd,co)*cosa2);
    float c = dot(co,axis)*dot(co,axis) - dot(co,co)*cosa2;

    float det = b*b - 4.*a*c;
    if (det < 0.0) return vec4(-1.0);

    det = sqrt(det);
    float t1 = (-b - det) / (2. * a);
    float t2 = (-b + det) / (2. * a);

    // This is a bit messy; there ought to be a more elegant solution.
    float t = t1;
    // if (t < 0. || t2 > 0. && t2 < t) t = t2;
    if (t < 0. && t2 < t) t = t2;
    // if (t < 0.) return vec4(-1.0);

    vec3 cp = ro + t*rd - center;
    float h = dot(cp, axis);
    if (h < 0. || h > dis) return vec4(-1.0);

    vec3 n = normalize(cp * dot(axis, cp) / dot(cp, cp) - axis);

    return vec4(t, n);
}

vec2 intersectCone3(vec3 ro, vec3 rd, vec3 center, vec3 axis, float dis, float cosa, out vec3 normal1, out vec3 normal2)
{
    vec3 co = ro - center;

    float cos2 = cosa*cosa;

    float p1 = dot(rd, axis);
    float p2 = dot(co, axis);
    float p3 = dot(rd, co);
    float p4 = dot(co, co);

    float a = p1 * p1 - cos2;
    float b = (p1 * p2 - p3 * cos2) * 2.0;
    float c = p2 * p2 - p4 * cos2;

    float det = b*b - a*c;

    float det1 = sqrt(det);
    float t1 = (-b - det1) / a;
    float t2 = (-b + det1) / a;

    if (det < 0.0) return vec2(-1.0);

    if (det == 0.0) {
        vec3 cp = ro + t1*rd - center;
         if (cp.y >= center.y) {
            float h = dot(cp, axis);
            if (h < 0. || h > dis) return vec2(-1.0);

            normal1 = normalize(cp * dot(axis, cp) / dot(cp, cp) - axis);
            normal2 = normal1;
         } else {
            t1 = -1.0;
         }

        return vec2(t1, t2);
    }

    if (det > 0.0) {
         vec3 cp = ro + t1*rd - center;
         if (cp.y >= center.y) {
            float h = dot(cp, axis);
            if (h < 0. || h > dis) return vec2(-1.0);

            normal1 = normalize(cp * dot(axis, cp) / dot(cp, cp) - axis);
         } else {
            t1 = -1.0;
         }

         cp = ro + t2*rd - center;
         if (cp.y >= center.y) {
            float h = dot(cp, axis);
            if (h < 0. || h > dis) return vec2(-1.0);

            normal2 = normalize(cp * dot(axis, cp) / dot(cp, cp) - axis);
         } else {
            t2 = -1.0;
         }

         return vec2(t1, t2);
    }
}

vec4 intersectCone2( in vec3  ro, in vec3  rd, 
                  in vec3  pa, in vec3  pb, 
                  in float ra, in float rb )
{


    vec3  ba = pb - pa;
    vec3  oa = ro - pa;
    vec3  ob = ro - pb;
    
    float m0 = dot(ba,ba);
    float m1 = dot(oa,ba);
    float m2 = dot(ob,ba); 
    float m3 = dot(rd,ba);

    //caps
         if( m1<0.0 ) { if( dot2(oa*m3-rd*m1)<(ra*ra*m3*m3) ) return vec4(-m1/m3,-ba*inversesqrt(m0)); }
    else if( m2>0.0 ) { if( dot2(ob*m3-rd*m2)<(rb*rb*m3*m3) ) return vec4(-m2/m3, ba*inversesqrt(m0)); }
    
    vec3 O = vec3(0.0);
    vec3 axis = vec3(0.0);
    float H = length(pa - pb);
    float R = max(ra, rb);
    float alpha = H / sqrt(H * H + R * R);

    if (rb > ra) {
        O = pa;
        axis = normalize(pb - pa);
    } else {
        O = pb;
        axis = normalize(pa - pb);
    }


    vec4 tnor = intersectCone(ro, rd, O, axis, H, alpha);
    return tnor;
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


#define AA 3

void main(){
    vec3 ro = vOrigin;
    vec3 rd = normalize( vDirection );
    
    vec3 p = vec3(0.0);

    vec3 center = vec3(0.0, 0.0, -radius);
    // float azimuth = 0.5;
    // float elevation = 0.3;
    
    vec4 col = vec4(0.0);


    // vec2 NF = iSphere(ro, rd, center, radius);
    // p = ro + NF.x * rd;
    // float step = (NF.y - NF.x) / depthSampleCount;

    // for (float t = NF.x; t < NF.y; t += step) {
    //     vec3 pc = (p - center);

    //     float pitch =  pc.z / length(pc.xy);
    //     vec3 nor = normalize(pc);

    //     if (pitch > pitchRange.x && pitch <= pitchRange.y) {


    //         vec3 ref = reflect(SUN, nor);
    //         float light = abs(dot(ref, rd));
            
    //         col = vec4(vec3(0.7), 0.8 - light);

    //         if (length(pc) < radius * 0.9999) {
    //             if (abs(mod(pc.x, radius * 0.1)) < radius * 0.003)
    //             col = vec4(1.0, 1.0, 1.0, 0.5);

    //             if (abs(mod(pc.y, radius * 0.1)) < radius * 0.003)
    //                 col = vec4(1.0, 1.0, 1.0, 0.5);
    //         }

    //         if (length(pc) > radius * 0.9999 && abs(pitch - pitchRange.y) < 0.01) { 
    //             col = vec4(1.0, 1.0, 1.0, 0.5);
    //         }

    //         break;
    //     }
        
    //     p = p + step * rd;
    // }

    // sphere intersection
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {
        vec2 NF = iSphere(ro, rd, center, radius);
        vec3 pos = ro + NF.x * rd;
        vec3 pc = (pos - center);

        vec3 nor = normalize(pc);

        float pitch =  pc.z / length(pc.xy);

        if (pitch >= pitchRange.x && pitch <= pitchRange.y && length(pc) <= radius * 1.001) {

            vec3 ref = reflect(SUN, nor);
            float light = abs(dot(ref, rd));

            col = vec4(vec3(0.8), 0.8 - light);


            if (length(pc) > radius * 0.9999 && abs(pitch - pitchRange.y) < 0.01) { 
                col = vec4(1.0, 1.0, 1.0, 1.0);
            }
        }

        // vec3 pos1 = ro + NF.y * rd;
        // vec3 pc1 = (pos1 - center);

        // vec3 nor1 = normalize(pc1);

        // float pitch1 =  pc1.z / length(pc1.xy);

        // if (pitch1 >= pitchRange.x && pitch1 <= pitchRange.y && length(pc1) <= radius * 1.001) {

        //     vec3 ref = reflect(SUN, nor1);
        //     float light = abs(dot(ref, rd));

        //     col = vec4(vec3(0.8), 0.7 - light);

        //     if (length(pc1) > radius * 0.9999 && abs(pitch1 - pitchRange.y) < 0.01) { 
        //         col = vec4(1.0, 1.0, 1.0, 0.5);
        //     }
        // }

        float H = radius * sin(atan(pitchRange.y));
        float beta = H / radius;
        vec4 tnor = intersectCone(ro, rd, center, vec3(0, 0, 1), H, beta);
        float t = tnor.x;

        if (t > 0.0) {
            vec3 pos = ro + t * rd;
            vec3 nor = tnor.yzw;

            vec3 ref = reflect(SUN, nor);
            float light = abs(dot(ref, rd));

            col = vec4(vec3(0.7), light);

            vec3 pc = pos - center;

            if (length(pc) < radius * 0.9999) {
                if (abs(mod(pc.x, radius * 0.1)) < radius * 0.003)
                    col = vec4(1.0, 1.0, 1.0, 0.8);

                if (abs(mod(pc.y, radius * 0.1)) < radius * 0.003)
                    col = vec4(1.0, 1.0, 1.0, 0.8);
            }
        }
    }

    // float azimuth = 0.5;
    // float elevation = 0.3;

    // cone intersect
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {

        vec3  pa = vec3(radius * cos(azimuth) * cos(elevation), radius * sin(azimuth)* cos(elevation), radius * sin(elevation) - radius);
        vec3  pb = center + vec3(0.0, 0.0, 2000.0);
        float ra = 1000.0;
        float rb = 0.0;

        vec4 tnor = intersectCone2( ro, rd, pa, pb, ra, rb );

        float t = tnor.x;

        if (t > 0.0) {
            vec3 pos = ro + t*rd;
            vec3 nor = tnor.yzw;
            // vec3 lig = SUN;
            vec3 lig = normalize(vec3(0.7,-0.6,0.3));
            vec3 hal = normalize(-rd+lig);
            float dif = clamp( dot(nor,lig), 0.0, 1.0 );
            float amb = clamp( 0.5 + 0.5*dot(nor,vec3(0.0,1.0,0.0)), 0.0, 1.0 );
            
            vec3 w = normalize(pb-pa);
            vec3 u = normalize(cross(w,vec3(0,0,1)));
            vec3 v = normalize(cross(u,w) );
            vec3 q = (pos-pa)*mat3(u,v,w);
            col.rgb = pattern( vec2(32.0,64.0)*vec2(atan(q.y,q.x), q.z / radius) );

            col.rgb *= vec3(0.2,0.3,0.4)*amb + vec3(1.0,0.9,0.7)*dif;
            
            col.rgb += 0.4*pow(clamp(dot(hal,nor),0.0,1.0),12.0)*dif;
            col.a = 1.0;

            // col = vec4(0.28, 0.64, 0.91, 1.0);
            // col = vec4(nor, 1.0);
        }
    }

    // cap intersect
    vec3  pa = vec3(radius * cos(azimuth) * cos(elevation), radius * sin(azimuth)* cos(elevation), radius * sin(elevation) - radius);
    vec3  pb = center + vec3(0.0, 0.0, 2000.0);;
    float crr = 100.0;
    
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