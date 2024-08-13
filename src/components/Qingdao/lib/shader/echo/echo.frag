precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform sampler3D tex;
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


float f(vec3 pos) {
    return texture(tex, pos).x;
}

vec3 calcNormal( in vec3 p ) // for function f(p)
{
    const float h = 0.01; // replace by an appropriate value
    const vec2 k = vec2(1,-1);
    return normalize( k.xyy*f( p + k.xyy*h ) + 
                      k.yyx*f( p + k.yyx*h ) + 
                      k.yxy*f( p + k.yxy*h ) + 
                      k.xxx*f( p + k.xxx*h ) );
}

#define AA 3

void main(){
    vec3 ro = vOrigin;
    vec3 rd = normalize( vDirection );
    
    vec4 col = vec4(0.0);

    vec3 nor = vec3(0.0);

    vec2 NF = iBox(ro, rd, boxSize, nor);

    float step = (NF.y - NF.x) / depthSampleCount;

    vec3 p = ro + rd * NF.x;

// ==================Echo =========================
    vec3 sumColor = vec3(1.0);
    float val = 0.0;
    float maxVal = 0.0;
    float sumA = 0.0;
    float n = 0.0;

    for (float t = NF.x; t < NF.y; t += step) {

        vec3 pos = p / boxSize + 0.5;
        val = texture(tex, pos).r;

        if (val > 0.2 && val < 0.99) {
            nor = calcNormal(pos);

            vec3 ref = reflect(SUN, nor);
            float light = max(abs(dot(ref, rd)), 0.1);

            maxVal = max(maxVal, val);
            // sumA += val;
            sumA += light;
            sumColor = sumColor + light * (texture(colorTex, vec2(light, 0.0)).rgb);
            n = n + 1.0;
        }
        
        p = p + step * rd;
    }

    vec4 colorMax = texture(colorTex, vec2(maxVal , 0.0));
    vec3 colorW = sumColor.rgb / sumA;
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