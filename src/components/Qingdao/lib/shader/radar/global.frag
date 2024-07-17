precision highp float;
precision highp sampler2D;
in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform float depthSampleCount;

uniform vec3 cameraPosition;

uniform vec2 pitchRange;

// uniform float radius;

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
vec2 eliIntersect( in vec3 ro, in vec3 rd, in vec3 ra )
{
    vec3 ocn = ro/ra;
    vec3 rdn = rd/ra;
    float a = dot( rdn, rdn );
    float b = dot( ocn, rdn );
    float c = dot( ocn, ocn );
    float h = b*b - a*(c-1.0);
    if( h<0.0 ) return vec2(-1.0); //no intersection
    h = sqrt(h);
    return vec2(-b-h,-b+h)/a;
}



void main(){
    vec3 rayDir = normalize( vDirection );
    
    vec3 p = vec3(0.0);

    vec3 center = vec3(0.5, 0.5, 0.5);

    float rr = 0.5;

    // vec3 ra = vec3(rr) * boxResolution;
    
    // vec2 NF = eliIntersect(vOrigin + 0.5 - center, rayDir, ra);

    vec2 NF = iSphere(vOrigin + 0.5, rayDir, center, rr);

    vec4 outColor = vec4(0.0);

    vec3 dir = normalize((vOrigin + 0.5 + rayDir * NF.x - center));

    vec3 sun = vec3(0.3);

    if (NF.x != -1.0 && dir.z > 0.0) {

        float total = 128.0;
        float step = (NF.y - NF.x) / total;
        p = vOrigin + 0.5 + NF.x * rayDir;

        for (float t = NF.x; t < NF.y; t += step) {
            vec3 pc = (p - center);

            float pitch =  pc.z / length(pc.xy);
            float bearing = pc.x / pc.y;

            if (pitch > pitchRange.x && pitch < pitchRange.y) {

                vec3 left = cross(pc, p);
                vec3 normal = normalize(cross(pc, left));

                vec3 ref = reflect(sun, normal);
                float light = dot(ref, rayDir);

             
                // outColor = vec4(vec3(0.7), 1.0 - light);
                outColor = vec4(vec3(0.7), 1.0);

                if (abs(mod(pc.x, rr * 0.04)) < rr * 0.005)
                    outColor = vec4(0.0, 0.0, 0.0, 0.3);

                if (abs(mod(pc.y, rr * 0.04)) < rr * 0.005)
                    outColor = vec4(0.0, 0.0, 0.0, 0.3);

                
                break;
            }
            p = p + step * rayDir;
        }
    }

    color = outColor;

    // color= vec4(1.0, 1.0, 0.0, 1.0);
    
    if ( color.a == 0.0 ) discard;
}