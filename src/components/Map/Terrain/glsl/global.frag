precision highp float;
precision highp sampler2D;
in vec3 vOrigin;
in vec3 vDirection;

in vec3 normal;

out vec4 color;

uniform float scale;
uniform float threshold;
uniform float depthSampleCount;

uniform sampler2D tex;
uniform vec3 cameraPosition;
uniform float brightness;

uniform float maxLat;
uniform float minLat;

uniform bool showTerrain;
uniform bool showBox;

uniform vec3 terrainPoint;
uniform vec3 boxResolution;

uniform vec2 pitchRange;

uniform float radius;


vec4 pos = vec4(0.0, 0.1, -0.5, 0.03);

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

/**
 * 地形数据采样
 */
float sampleTerrain( vec2 p ) {
    return texture( tex, p ).r;
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

bool castRay (vec3 ro, vec3 rd, float mint, float maxt, float step) {
    float dt = (maxt - mint) / step;
    float lh = 0.0;
    float ly = 0.0;
    float d = -1.0;
    for( float t = mint; t < maxt; t += dt )
    {
        vec3  p = ro + rd * t;
        float h = sampleTerrain( p.xy );
        if( p.z < h )
        {
            return true;
        }
    }
    return false;
}


void main(){
    vec3 rayDir = normalize( vDirection );
    vec2 bounds = hitBox( vOrigin, rayDir );
    if ( bounds.x > bounds.y ) discard;
    bounds.x = max( bounds.x, 0.0 );
    vec3 p = vOrigin + bounds.x * rayDir;
    
    vec3 inc = 1.0 / abs( rayDir );
    float delta = min( inc.x, min( inc.y, inc.z ) );
    delta /= depthSampleCount;

    float height = 0.0;
    float maxHeight = 0.0;
    float th1 = threshold * scale;

    vec4 surface = vec4(0.0);
    vec4 other = vec4(0.0);

    ivec2 size = textureSize(tex, 0);

    vec3 inv_size = float(size.x) / vec3(size, size.x);

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        float h = sampleTerrain(p.xy + 0.5);

        if ( h < 0.01 || h > 0.99) {
            p += rayDir * delta;
            continue;
        };

        height = h;

        float d = 0.5 + p.z - h;

        if(d < 0.01) {
            other = vec4(0.0, 0.0, 0.0, 1.0);
            if (abs(d) < 0.01) {
                surface = vec4(height, height, height,  clamp(height, 0.8, 0.99));
                maxHeight = max(maxHeight, height);
                break;
            }
        }


        p += rayDir * delta;
    }

    vec3 center = terrainPoint;
    center.z = sampleTerrain(center.xy) + 0.01;

    float rr = radius;

    vec3 ra = vec3(rr) * boxResolution;
    
    vec2 NF = eliIntersect(vOrigin + 0.5 - center, rayDir, ra);

    // vec2 NF = iSphere(vOrigin + 0.5, rayDir, center, rr);

    vec4 outColor = vec4(0.0);

    vec3 dir = normalize((vOrigin + 0.5 + rayDir * NF.x - center));

    vec3 sun = vec3(0.3);

    if (NF.x != -1.0 && dir.z > 0.0) {

        float total = 128.0;
        float step = (NF.y - NF.x) / total;
        p = vOrigin + 0.5 + NF.x * rayDir;

        for (float t = NF.x; t < NF.y; t += step) {
            vec3 pc = (p - center) / boxResolution;

            float pitch =  pc.z / length(pc.xy);
            float bearing = pc.x / pc.y;

            if (pitch > pitchRange.x && pitch < pitchRange.y) {

                vec3 left = cross(pc, p);
                vec3 normal = normalize(cross(pc, left));

                vec3 ref = reflect(sun, normal);
                float light = dot(ref, rayDir);
                float dpc = length(p - center);

                bool occ = castRay(center, normalize(p - center), 0.0, dpc, 64.0);

                if(occ) {
                    outColor = vec4(vec3(1.0, 0.0, 0.0), light);
                } else {
                    outColor = vec4(vec3(1.0), 1.0 - light);
                }

                if (abs(mod(pc.x, rr * 0.4)) < rr * 0.02)
                    outColor = vec4(1.0, 0.0, 0.0, 0.3);

                if (abs(mod(pc.y, rr * 0.4)) < rr * 0.02)
                    outColor = vec4(0.0, 1.0, 0.0, 0.3);


                // if (abs(dpc - rr) < 0.0002)
                //     outColor = vec4(0.0, 0.0, 0.0, 1.0);
                
                break;
            }
            p = p + step * rayDir;
        }
    }


    if(showTerrain) {
        color = max(surface, other);
    }

    if (showBox) {
        color = color + outColor; 
        // color = max(color, outColor); 
    }

    
    if ( color.a == 0.0 ) discard;
}