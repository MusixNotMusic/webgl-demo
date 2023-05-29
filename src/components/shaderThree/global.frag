precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
in vec4 vRadarOrigin;
in vec3 horizon;

in vec3 normal;

out vec4 color;

uniform float threshold0;
uniform float threshold;
uniform float depthSampleCount;

uniform sampler3D tex;
uniform sampler2D colorMap;
uniform vec3 cameraPosition;
uniform float brightness;

vec4 pos = vec4(0.2, 0.1, -0.5, 0.03);

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

float sample1( vec3 p ) {
    return texture( tex, p ).r;
}

vec4 colorSimple( float val ) {
    return texture(colorMap, vec2(val, 0.0));
}

float sdCone( vec3 p, vec2 c, float h )
{
  float q = length(p.xz);
  return max(dot(c.xy,vec2(q,p.y)),-h-p.y);
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

    float val = 0.0;
    float maxVal = 0.0;

    vec4 sumColor = vec4(1.0);
    float sumA = 0.0;
    float n = 0.0;

    vec3 maxP = vec3(1.0);
    vec4 pxColor = vec4(0.0);

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        val = sample1( p + 0.5 );

        if (val > threshold0 && val < threshold) {

            if (maxVal < val) {
                maxVal = val;
                maxP = p;
            }
            sumA += val;

            sumColor = sumColor + val * colorSimple(val);

            n = n + 1.0;
        }

        if (length(p.xy - pos.xy) < pos.w) {
                vec3 horizonZ = normalize(horizon);
                vec3 dir = normalize(pos.xyz - p);
                // // vec3 dir = normalize(vec3(p.x - pos.x, p.y - pos.y, p.z - pos.z));
                vec3 dx = normalize(vec3(1.0, 0.0, 0.0));
                // vec3 dy = normalize(vec3(0.0, 1.0, 0.0));
                float deg = abs(dot(dir, dx));
                if (deg > 0.2 && deg < 0.5) {
                    // maxVal = clamp(val, 0.7, 1.0);
                    maxVal = val;
                    // break;
                }
                // maxVal = val;
                // if (maxVal < val) {
                //     maxVal = val;
                // } 
                // break;
         }
		
        p += rayDir * delta;
    }

    if(maxVal < 0.01 || maxVal > 0.99) discard;

    // pxColor = vec4(normalize(maxP), 1.0);

    pxColor = colorSimple(maxVal);
    
    // if (length(p.xy - vRadarOrigin.xy) < vRadarOrigin.w) {
    //     pxColor = colorSimple(maxVal);
    // } else {
    //     vec4 colorMax = colorSimple(maxVal);
    //     vec3 colorW = sumColor.rgb / sumA;
    //     float avgA = sumA / n;
    //     float u = pow(1.0 - avgA, n);
    //      if (maxVal > 0.2) {
    //         pxColor.rgb  = u * colorW + (1.0 - u) * colorMax.rgb;
    //         pxColor.a = pow( avgA, 1.0/ 3.3 );
    //     } else {
    //         pxColor.rgb  = (1.0 - u) * colorW + u * colorMax.rgb;
    //         pxColor.a = pow( avgA, 1.0/ 2.5 );
    //     } 
    // }

    vec4 colorMax = colorSimple(maxVal);
    vec3 colorW = sumColor.rgb / sumA;
    float avgA = sumA / n;
    float u = pow(1.0 - avgA, n);
        if (maxVal > 0.2) {
        pxColor.rgb  = u * colorW + (1.0 - u) * colorMax.rgb;
        pxColor.a = pow( avgA, 1.0/ 3.3 );
    } else {
        pxColor.rgb  = (1.0 - u) * colorW + u * colorMax.rgb;
        pxColor.a = pow( avgA, 1.0/ 2.5 );
    } 

    // if (length(p.xy - vRadarOrigin.xy) < 0.01) pxColor = vec4(1.0, 0.0, 0.0, 1.0);

    if (length(p.xy - vec2(-0.5)) < 0.01) pxColor = vec4(1.0, 0.0, 0.0, 1.0);
    if (length(p.xy - vec2(-0.5, -0.4)) < 0.01) pxColor = vec4(1.0, 0.0, 0.0, 1.0);
    if (length(p.xy - vec2(-0.4)) < 0.01) pxColor = vec4(1.0, 0.0, 0.0, 1.0);

    color = pxColor * brightness;

    if ( color.a == 0.0 ) discard;
}