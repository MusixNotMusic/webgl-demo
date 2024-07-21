precision highp float;
precision highp sampler2D;
in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform float depthSampleCount;

uniform vec2 pitchRange;

uniform float radius;

#define SUN normalize(vec3(0.0, 0.5, -0.5))

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

vec4 iCappedCone( in vec3  ro, in vec3  rd, 
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
    
    // body
    float m4 = dot(rd,oa);
    float m5 = dot(oa,oa);
    float rr = ra - rb;
    float hy = m0 + rr*rr;
    
    float k2 = m0*m0    - m3*m3*hy;
    float k1 = m0*m0*m4 - m1*m3*hy + m0*ra*(rr*m3*1.0        );
    float k0 = m0*m0*m5 - m1*m1*hy + m0*ra*(rr*m1*2.0 - m0*ra);
    
    float h = k1*k1 - k2*k0;
    if( h<0.0 ) return vec4(-1.0);

    float t = (-k1-sqrt(h))/k2;

    float y = m1 + t*m3;
    if( y>0.0 && y<m0 ) 
    {
        return vec4(t, normalize(m0*(m0*(oa+t*rd)+rr*ba*ra)-ba*hy*y));
    }
    
    return vec4(-1.0);
}

vec4 coneIntersect( in vec3 ro, in vec3 rd, in vec3 pa, in vec3 pb, in float ra, in float rb )
{
    vec3  ba = pb - pa;
    vec3  oa = ro - pa;
    vec3  ob = ro - pb;
    float m0 = dot(ba,ba);
    float m1 = dot(oa,ba);
    float m2 = dot(rd,ba);
    float m3 = dot(rd,oa);
    float m5 = dot(oa,oa);
    float m9 = dot(ob,ba); 
    
    // caps
    if( m1<0.0 )
    {
        if( dot2(oa*m2-rd*m1)<(ra*ra*m2*m2) ) // delayed division
            return vec4(-m1/m2,-ba*inversesqrt(m0));
    }
    else if( m9>0.0 )
    {
    	float t = -m9/m2;                     // NOT delayed division
        if( dot2(ob+rd*t)<(rb*rb) )
            return vec4(t,ba*inversesqrt(m0));
    }
    
    // body
    float rr = ra - rb;
    float hy = m0 + rr*rr;
    float k2 = m0*m0    - m2*m2*hy;
    float k1 = m0*m0*m3 - m1*m2*hy + m0*ra*(rr*m2*1.0        );
    float k0 = m0*m0*m5 - m1*m1*hy + m0*ra*(rr*m1*2.0 - m0*ra);
    float h = k1*k1 - k2*k0;
    if( h<0.0 ) return vec4(-1.0); //no intersection
    float t = (-k1-sqrt(h))/k2;
    float y = m1 + t*m2;
    if( y<0.0 || y>m0 ) return vec4(-1.0); //no intersection
    return vec4(t, normalize(m0*(m0*(oa+t*rd)+rr*ba*ra)-ba*hy*y));
}


vec4 coneIntersect2( in vec3 ro, in vec3 rd, in vec3 pa, in vec3 pb, in float ra, in float rb )
{
    vec3  ba = pb - pa;
    vec3  oa = ro - pa;
    vec3  ob = ro - pb;
    float m0 = dot(ba,ba);
    float m1 = dot(oa,ba);
    float m2 = dot(rd,ba);
    float m3 = dot(rd,oa);
    float m5 = dot(oa,oa);
    float m9 = dot(ob,ba); 
    
    // caps
    if( m1<0.0 )
    {
        if( dot2(oa*m2-rd*m1)<(ra*ra*m2*m2) ) // delayed division
            return vec4(-m1/m2,-ba*inversesqrt(m0));
    }
    else if( m9>0.0 )
    {
    	float t = -m9/m2;                     // NOT delayed division
        if( dot2(ob+rd*t)<(rb*rb) )
            return vec4(t,ba*inversesqrt(m0));
    }
    
    
    float h = length(pb - pa);
    // vec3 a = normalize(pb - pa);
    vec3 a = pb - pa;
    float r0 = ra;
    float r1 = (rb - ra) / h;

    float z1 = dot(rd, a);
    float z0 = dot(ro, a);

    vec3 p = rd - z1 * a;
    vec3 q = ro - z0 * a;

    float b2 = dot(p, p) -  r1 * r1 * z1 * z1;
    float b1 = z1 * r1 * (r1 * z0 + r0) - dot(p, q);
    float b0 = dot(q, q) - (r1 * z0 + r0) * (r1 * z0 + r0);

    float dalte = b1 * b1 - b0 * b2;

    if(b2 == 0.0) {
        float t = b0 / b1 * 0.5;
        return vec4(t, normalize(vec3(1.0)));
    } else if(dalte > 0.0){
        float t = (b1-sqrt(dalte))/b2;
        return vec4(t, normalize(vec3(1.0)));
    }

    return vec4(-1.0);
}


vec4 intersectCone(vec3 ro, vec3 rd, vec3 center, vec3 axis, float dis, float cosa)
{
    // vec3 co = r.o - s.c;

    // float a = dot(r.d,axis)*dot(r.d,axis) - s.cosa*s.cosa;
    // float b = 2. * (dot(r.d,axis)*dot(co,axis) - dot(r.d,co)*s.cosa*s.cosa);
    // float c = dot(co,axis)*dot(co,axis) - dot(co,co)*s.cosa*s.cosa;

    vec3 co = ro - center;

    float cosa2 = cosa*cosa;

    float a = dot(rd, axis)*dot(rd, axis) - cosa2;
    float b = 2. * (dot(rd, axis)*dot(co, axis) - dot(rd,co)*cosa2);
    float c = dot(co,axis)*dot(co,axis) - dot(co,co)*cosa2;

    float det = b*b - 4.*a*c;
    if (det < 0.) return vec4(-1.0);

    det = sqrt(det);
    float t1 = (-b - det) / (2. * a);
    float t2 = (-b + det) / (2. * a);

    // This is a bit messy; there ought to be a more elegant solution.
    float t = t1;
    if (t < 0. || t2 > 0. && t2 < t) t = t2;
    if (t < 0.) return vec4(-1.0);

    vec3 cp = ro + t*rd - center;
    float h = dot(cp, axis);
    if (h < 0. || h > dis) return vec4(-1.0);

    vec3 n = normalize(cp * dot(axis, cp) / dot(cp, cp) - axis);

    return vec4(t, n);
}

// axis aligned box centered at the origin, with size boxSize
vec2 boxIntersection( in vec3 ro, in vec3 rd, vec3 boxSize, out vec3 outNormal ) 
{
    vec3 m = 1.0/rd; // can precompute if traversing a set of aligned boxes
    vec3 n = m*ro;   // can precompute if traversing a set of aligned boxes
    vec3 k = abs(m)*boxSize;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max( max( t1.x, t1.y ), t1.z );
    float tF = min( min( t2.x, t2.y ), t2.z );
    if( tN>tF || tF<0.0) return vec2(-1.0); // no intersection
    outNormal = (tN>0.0) ? step(vec3(tN),t1) : // ro ouside the box
                           step(t2,vec3(tF));  // ro inside the box
    outNormal *= -sign(rd);
    return vec2( tN, tF );
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

#define AA 3

void main(){
    vec3 ro = vOrigin;
    vec3 rd = normalize( vDirection );
    
    vec3 p = vec3(0.0);

    vec3 center = vec3(0.0, 0.0, -radius);

    float rr = radius;
    
    // vec2 NF = eliIntersect(ro - center, rd, vec3(rr));

    vec2 NF = iSphere(ro, rd, center, rr);

    vec4 col = vec4(0.0);


    float step = (NF.y - NF.x) / depthSampleCount;

    p = ro + NF.x * rd;

    for (float t = NF.x; t < NF.y; t += step) {
        vec3 pc = (p - center);

        float pitch =  pc.z / length(pc.xy);

        if (pitch > pitchRange.x && pitch <= pitchRange.y) {

            vec3 left = cross(pc, p);
            vec3 normal = normalize(cross(pc, left));

            vec3 ref = reflect(SUN, normal);
            float light = abs(dot(ref, rd));
            

            col = vec4(vec3(0.7), 0.8 - light);
            // col = vec4(light);

            if (length(pc) < radius * 0.9999) {
                if (abs(mod(pc.x, rr * 0.1)) < rr * 0.003)
                col = vec4(1.0, 1.0, 1.0, 0.5);

                if (abs(mod(pc.y, rr * 0.1)) < rr * 0.003)
                    col = vec4(1.0, 1.0, 1.0, 0.5);
            }

            if (length(pc) > radius * 0.9999 && abs(pitch - pitchRange.y) < 0.01) { 
                col = vec4(1.0, 1.0, 1.0, 0.5);
            }

            break;
        }
        
        p = p + step * rd;
    }

    float azimuth = 0.5;
    float elevation = 0.3;
    float r = radius;

    // render
    vec3 tot = vec3(0.0);

    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {

        vec3  pa = vec3(r * cos(azimuth) * cos(elevation), r * sin(azimuth)* cos(elevation), r * sin(elevation) - radius);
        vec3  pb = center;
        float ra = 10000.0;
        float rb = 10000.0;

        vec4 tnor = coneIntersect2( ro, rd, pa, pb, ra, rb );
        
        // vec3 axis = normalize(vec3(0.05, 0.2, 0.05));
        // float len = radius * 0.5;
        // float cosa = 0.9995;
        // vec4 tnor = intersectCone(ro, rd, center, normalize(vec3(0.05, 0.2, 0.05)), len, cosa);

        // vec3  pa = ro + axis * len;
        // vec3  pb = center;

        // float ra = 0.0;
        // float rb = radius * cos(0.9995);

        float t = tnor.x;

        if (t > 0.0) {
            vec3 pos = ro + t*rd;
            vec3 nor = tnor.yzw;
            // vec3 lig = SUN;
            vec3 lig = normalize(vec3(0.7,0.6,0.3));
            vec3 hal = normalize(-rd+lig);
            float dif = clamp( dot(nor,lig), 0.0, 1.0 );
            float amb = clamp( 0.5 + 0.5*dot(nor,vec3(0.0,1.0,0.0)), 0.0, 1.0 );
            
            vec3 w = normalize(pb-pa);
            vec3 u = normalize(cross(w,vec3(0,0,1)));
            vec3 v = normalize(cross(u,w) );
            vec3 q = (pos-pa)*mat3(u,v,w);
            col.rgb = pattern( vec2(16.0,64.0)*vec2(atan(q.y,q.x),q.z) );

            col.rgb *= vec3(0.2,0.3,0.4)*amb + vec3(1.0,0.9,0.7)*dif;
            
            col.rgb += 0.4*pow(clamp(dot(hal,nor),0.0,1.0),12.0)*dif;
            col.a = 1.0;

            // col = vec4(0.28, 0.64, 0.91, 1.0);
            // col = vec4(nor, 1.0);
        }
    }

    vec3 boxNormal = vec3(0.0);
    // box 
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {
        // raytrace
        vec2 NF = boxIntersection( ro, rd, vec3(10000.0), boxNormal);
        float t = NF.x;
        if (t > 0.0 ) {
            col = vec4(boxNormal, 1.0);
        }
    }

    vec3  pa = vec3(r * cos(azimuth) * cos(elevation), r * sin(azimuth)* cos(elevation), r * sin(elevation) - radius);
    vec3  pb = center;
    float crr = 1000.0;
    
    // cap 
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {
        // raytrace
        float t = capIntersect( ro, rd, pa, pb, crr);
        if (t > 0.0 ) {
            col = vec4(vec3(0.3), 1.0);
        }
    }

    // col.rgb = sqrt( col.rgb );
	// tot += col.rgb;
    color = col;
    
    if ( color.a == 0.0 ) discard;
}