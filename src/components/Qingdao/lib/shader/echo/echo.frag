precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform sampler3D tex1;
uniform sampler3D tex2;

uniform float delta;

uniform sampler2D colorTex;

uniform float depthSampleCount;

uniform float radius;

uniform vec3 boxSize;

uniform vec2 iResolution;


#define SUN normalize(vec3(0.0, 1.0, -1.0))
#define PI 3.141592653589793


// axis aligned box centered at the origin, with size boxSize
vec2 iBox( in vec3 ro, in vec3 rd, vec3 boxSize, out vec3 outNormal ) 
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


vec2 hitBox( vec3 ro, vec3 rd, vec3 size ) {
    vec3 box_min = vec3( - 0.5 ) * size;
    vec3 box_max = vec3( 0.5 ) * size;

    vec3 inv_dir = 1.0 / rd;
    vec3 tmin_tmp = ( box_min - ro ) * inv_dir;
    vec3 tmax_tmp = ( box_max - ro ) * inv_dir;
    vec3 tmin = min( tmin_tmp, tmax_tmp );
    vec3 tmax = max( tmin_tmp, tmax_tmp );
    float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
    float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
    return vec2( t0, t1 );
}


float map(vec3 pos) {
    return mix(texture(tex1, pos).x, texture(tex2, pos).x, delta);
}

vec3 calcNormal( in vec3 p ) // for function f(p)
{
    const float h = 0.0005; // replace by an appropriate value
    const vec2 k = vec2(1,-1);
    return normalize( k.xyy*map( p + k.xyy*h ) + 
                      k.yyx*map( p + k.yyx*h ) + 
                      k.yxy*map( p + k.yxy*h ) + 
                      k.xxx*map( p + k.xxx*h ) );
}

void main(){
    vec3 ro = vOrigin;
    vec3 rd = normalize( vDirection );
    
    vec3 nor = vec3(0.0);
    vec4 col = vec4(0.0);

    // 1.
    // vec2 NF = iBox(ro - vec3(0.0, 0.0, boxSize.z * 0.5), rd, boxSize, nor);
    // if ( NF.x > NF.y ) discard;
    // NF.x = max( NF.x, 0.0 );
    // vec3 inc = 1.0 / abs( rd ) * boxSize;
    // float step = min( inc.x, min( inc.y, inc.z ) );
    // step /= depthSampleCount;

    // 2.
    vec2 NF = hitBox( ro, rd, boxSize);
    if ( NF.x > NF.y ) discard;
    NF.x = max( NF.x, 0.0 );

    vec3 inc = 1.0 / abs( rd ) * boxSize;
    float step = min( inc.x, min( inc.y, inc.z ) );
    step /= depthSampleCount;


    vec3 p = ro + rd * NF.x;
    // float step = (NF.y - NF.x) / depthSampleCount;

// ==================Echo =========================
    vec3 sumColor = vec3(0.0);
    float val = 0.0;
    float maxVal = 0.0;
    float sumA = 0.0;
    float n = 0.0;

    for (float t = NF.x; t < NF.y; t += step) {

        vec3 pos = p / boxSize + 0.5;
        val = map(pos);

        if (val > 0.23 && val < 0.99) {
            nor = calcNormal(pos);

            vec3 ref = reflect(SUN, nor);
            float light = max(abs(dot(ref, rd)), 0.1);

            maxVal = max(maxVal, val);
            // sumA += val;
            sumA += light;
            sumColor = sumColor + val * (texture(colorTex, vec2(val, 0.0)).rgb);
            n = n + 1.0;
        }
        
        p = p + step * rd;
    }
    
    vec4 colorMax = texture(colorTex, vec2(maxVal , 0.0));
    vec3 colorW = min(sumColor.rgb / sumA, colorMax.rgb);
    float avgA = sumA / n;
    float u = pow(1.0 - avgA, n);

    float limit = 0.5;
    if (maxVal > limit) {
        col.rgb  = u * colorW + (1.0 - u) * colorMax.rgb;
        col.a = pow( maxVal, 1.0/ 4.2 );
    } else {
        col.rgb  = (1.0 - u) * colorW + u * colorMax.rgb;
        col.a = pow(maxVal, 1.0/ 3.3);
    }

    color = col;

    // color = vec4(p, 1.0);
    
    if ( color.a == 0.0 ) discard;
}