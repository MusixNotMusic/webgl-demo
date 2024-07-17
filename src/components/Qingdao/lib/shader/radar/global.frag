precision highp float;
precision highp sampler2D;
in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform float depthSampleCount;

uniform vec2 pitchRange;

uniform float radius;

#define SUN vec3(0.0, 0.5, -0.5)

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

float sdCone( vec3 p, vec2 c, float h )
{
  // c is the sin/cos of the angle, h is height
  // Alternatively pass q instead of (c,h),
  // which is the point at the base in 2D
  vec2 q = h*vec2(c.x/c.y,-1.0);
    
  vec2 w = vec2( length(p.xz), p.y );
  vec2 a = w - q*clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
  vec2 b = w - q*vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
  float k = sign( q.y );
  float d = min(dot( a, a ),dot(b, b));
  float s = max( k*(w.x*q.y-w.y*q.x),k*(w.y-q.y)  );
  return sqrt(d)*sign(s);
}



void main(){
    vec3 rayDir = normalize( vDirection );
    
    vec3 p = vec3(0.0);

    vec3 center = vec3(0.0, 0.0, -radius);

    float rr = radius;
    
    // vec2 NF = eliIntersect(vOrigin - center, rayDir, vec3(rr));

    vec2 NF = iSphere(vOrigin, rayDir, center, rr);

    vec4 outColor = vec4(0.0);


    float step = (NF.y - NF.x) / depthSampleCount;

    p = vOrigin + NF.x * rayDir;

    for (float t = NF.x; t < NF.y; t += step) {
        vec3 pc = (p - center);

        float pitch =  pc.z / length(pc.xy);

        if (pitch > pitchRange.x && pitch <= pitchRange.y) {

            vec3 left = cross(pc, p);
            vec3 normal = normalize(cross(pc, left));

            vec3 ref = reflect(SUN, normal);
            float light = abs(dot(ref, rayDir));
            

            outColor = vec4(vec3(0.7), 0.8 - light);
            // outColor = vec4(light);

            if (length(pc) < radius * 0.9999) {
                if (abs(mod(pc.x, rr * 0.1)) < rr * 0.005)
                outColor = vec4(1.0, 1.0, 1.0, 0.5);

                if (abs(mod(pc.y, rr * 0.1)) < rr * 0.005)
                    outColor = vec4(1.0, 1.0, 1.0, 0.5);
            }

            if (length(pc) > radius * 0.9999 && abs(pitch - pitchRange.y) < 0.01) { 
                outColor = vec4(1.0, 1.0, 1.0, 0.5);
            }

            break;
        }
        
        p = p + step * rayDir;
    }

    color = outColor;
    
    if ( color.a == 0.0 ) discard;
}