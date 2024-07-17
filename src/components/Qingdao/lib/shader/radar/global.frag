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

// ellipsoid centered at the origin with radii ra
// vec2 eliIntersect( in vec3 ro, in vec3 rd, in vec3 ra )
// {
//     vec3 ocn = ro/ra;
//     vec3 rdn = rd/ra;
//     float a = dot( rdn, rdn );
//     float b = dot( ocn, rdn );
//     float c = dot( ocn, ocn );
//     float h = b*b - a*(c-1.0);
//     if( h<0.0 ) return vec2(-1.0); //no intersection
//     h = sqrt(h);
//     return vec2(-b-h,-b+h)/a;
// }

// float sdCone( vec3 p, vec2 c, float h )
// {
//   // c is the sin/cos of the angle, h is height
//   // Alternatively pass q instead of (c,h),
//   // which is the point at the base in 2D
//   vec2 q = h*vec2(c.x/c.y,-1.0);
    
//   vec2 w = vec2( length(p.xz), p.y );
//   vec2 a = w - q*clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
//   vec2 b = w - q*vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
//   float k = sign( q.y );
//   float d = min(dot( a, a ),dot(b, b));
//   float s = max( k*(w.x*q.y-w.y*q.x),k*(w.y-q.y)  );
//   return sqrt(d)*sign(s);
// }

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

    // for (float t = NF.x; t < NF.y; t += step) {
    //     vec3 pc = (p - center);

    //     float pitch =  pc.z / length(pc.xy);

    //     if (pitch > pitchRange.x && pitch <= pitchRange.y) {

    //         vec3 left = cross(pc, p);
    //         vec3 normal = normalize(cross(pc, left));

    //         vec3 ref = reflect(SUN, normal);
    //         float light = abs(dot(ref, rd));
            

    //         col = vec4(vec3(0.7), 0.8 - light);
    //         // col = vec4(light);

    //         if (length(pc) < radius * 0.9999) {
    //             if (abs(mod(pc.x, rr * 0.1)) < rr * 0.003)
    //             col = vec4(1.0, 1.0, 1.0, 0.5);

    //             if (abs(mod(pc.y, rr * 0.1)) < rr * 0.003)
    //                 col = vec4(1.0, 1.0, 1.0, 0.5);
    //         }

    //         if (length(pc) > radius * 0.9999 && abs(pitch - pitchRange.y) < 0.01) { 
    //             col = vec4(1.0, 1.0, 1.0, 0.5);
    //         }

    //         break;
    //     }
        
    //     p = p + step * rd;
    // }

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
        float rb = 1000.0;


        // raytrace
        vec4 tnor = iCappedCone( ro, rd, pa, pb, ra, rb );

        float t = tnor.x / r;

        if (t > 0.0 ) {
            // vec3 pos = ro + t*rd;
            vec3 nor = tnor.yzw;
            // vec3 lig = SUN;
            // vec3 lig = normalize(vec3(0.7,0.6,0.3));
            // vec3 hal = normalize(-rd+lig);
            // float dif = clamp( dot(nor,lig), 0.0, 1.0 );
            // float amb = clamp( 0.5 + 0.5*dot(nor,vec3(0.0,1.0,0.0)), 0.0, 1.0 );
            
            // vec3 w = normalize(pb-pa);
            // vec3 u = normalize(cross(w,vec3(0,0,1)));
            // vec3 v = normalize(cross(u,w) );
            // vec3 q = (pos-pa)*mat3(u,v,w);
            // col.rgb = pattern( vec2(16.0,64.0)*vec2(atan(q.y,q.x),q.z) );

            // col.rgb *= vec3(0.2,0.3,0.4)*amb + vec3(1.0,0.9,0.7)*dif;
            
            // col.rgb += 0.4*pow(clamp(dot(hal,nor),0.0,1.0),12.0)*dif;
            // col.a = 1.0;

            // col = vec4(0.28, 0.64, 0.91, 1.0);
            // col = vec4(nor, 1.0);
            col = vec4(vec3( t), 1.0);
        }
    }

    // col.rgb = sqrt( col.rgb );
	// tot += col.rgb;
    color = col;
    
    if ( color.a == 0.0 ) discard;
}