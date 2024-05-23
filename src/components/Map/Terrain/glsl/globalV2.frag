precision highp float;
precision highp sampler2D;
in vec3 vOrigin;
in vec3 vDirection;
in vec3 vPosition;

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

#define PI 3.141592653589793
#define QPI 0.7853981633974483

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

float latMercatorNormalize (float lat) {
    return ((180.0 / PI) * log(tan(QPI + (lat * PI) / 360.0))) / 360.0;
}

float sample1( vec2 p ) {
    // p.x = (latMercatorNormalize(maxLat) - latMercatorNormalize(minLat + p.x * (maxLat - minLat))) / (latMercatorNormalize(maxLat) - latMercatorNormalize(minLat));
    // p.x = p.x - 0.1;
    return texture( tex, p ).r;
}

float epsilon = 0.0005;
float sample2( vec2 p ) {
    vec2 top = vec2(0.0, epsilon);
    vec2 right = vec2(epsilon, 0.0);

    float c = texture( tex, p ).r;
    float t = texture( tex, p + top).r;
    float b = texture( tex, p - top).r;
    float l = texture( tex, p - right ).r;
    float r = texture( tex, p + right).r;
    
    return (c + t + b + l + r) * 0.2;
}

// vec4 colorSimple( float val ) {
//     return texture(colorMap, vec2(val, 0.0));
// }

float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

vec2 iBox( vec3 ro, vec3 rd, vec3 boxSize ) 
{
    vec3 m = 1.0/rd; // can precompute if traversing a set of aligned boxes
    vec3 n = m*ro;   // can precompute if traversing a set of aligned boxes
    vec3 k = abs(m)*boxSize;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max( max( t1.x, t1.y ), t1.z );
    float tF = min( min( t2.x, t2.y ), t2.z );
    if( tN>tF || tF<0.0) return vec2(-1.0); // no intersection
    // outNormal = (tN>0.0) ? step(vec3(tN),t1) : // ro ouside the box
    //                        step(t2,vec3(tF));  // ro inside the box
    // outNormal *= -sign(rd);
    return vec2( tN, tF );
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

float sdSolidAngle(vec3 p, vec2 c, float ra)
{
    vec2 q = vec2( length(p.xz), p.y );
    
    float l = length(q) - ra;
	float m = length(q - c*clamp(dot(q,c),0.0,ra) );
    return max(l,m*sign(c.y*q.x-c.x*q.y));
}

float map( in vec3 pos )
{
    pos.xy = (mat2(4,3,-3,4)/5.0)*pos.xy;
    
    return sdSolidAngle(pos, vec2(3,4)/5.0, 0.7 );
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
    // float delta = 0.0002;

    float height = 0.0;
    float maxHeight = 0.0;
    float th1 = threshold * scale;

    vec4 surface = vec4(0.0);
    vec4 other = vec4(0.0);

    ivec2 size = textureSize(tex, 0);

    vec3 inv_size = float(size.x) / vec3(size, size.x);

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        float h = sample1(p.xy + 0.5);

        if ( h < 0.01 || h > 0.99) {
            p += rayDir * delta;
            continue;
        };

        height = pow(h * scale, 0.5);

        float d = 0.5 + p.z - h;

        if(d < 0.01) {
            other = vec4(0.0, 0.0, 0.0, 1.0);
            if (abs(d) < 0.01) {
                // color = vec4(height, height, height, clamp(0.6, 0.9, height));
                surface = vec4(height, height, height,  clamp(height, 0.8, 0.99));
                maxHeight = max(maxHeight, height);
                break;
            }
        }


        p += rayDir * delta;
    }

    vec3 outNormal = vec3(0.0);
    
    vec3 center = terrainPoint;

    float h = sample1(center.xy + 0.5);
    vec3 box = vec3(0.01, 0.01, .4) * inv_size;
    center.z = 1.0 - pow(h * scale, 0.5) + box.z;
    vec2 NF = iBox(vOrigin + 0.5 - center, rayDir, box);
    vec4 boxColor = vec4(0.0);

    p = vOrigin + NF.x * rayDir + 0.5;
    

    for ( float t = NF.x; t < NF.y; t += delta ) {
        float dd = length(p.xy - center.xy);

        if (dd <= 0.01) {
            vec3 dir = normalize(p - center);
            float distance = length(p - center);
            vec3 cp = center;
            float total = 32.0;
            float step = distance / total;

            for(float i = 0.0; i < total; i++) {
                float h = sample1(cp.xy);
                float len = length(center.xy - cp.xy);
                if (cp.z > h) {
                    boxColor = vec4(cp, 1.0 - cp.z );
                } else {
                    // boxColor = vec4(0.0, 1.0,1.0, 0.0);
                    break;
                }

                cp += step * dir;
            }
        }

        p += rayDir * delta;
    }

    if(showTerrain) {
        color = max(surface, other);
    }

    if (showBox) {
        color = color + boxColor; 
    }
    
    if ( color.a == 0.0 ) discard;
}