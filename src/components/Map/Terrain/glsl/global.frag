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

    vec3 center = vec3(0.5, 0.5, 0.2);

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

    
    color = max(surface, other);
    
    if ( color.a == 0.0 ) discard;
}