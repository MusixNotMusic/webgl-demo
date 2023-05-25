in vec3 position;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform vec3 radarPosition;

out vec3 vOrigin;
out vec3 vDirection;
out vec4 vRadarOrigin;
out vec3 horizon;

void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;
    vRadarOrigin = inverse( modelMatrix ) * vec4( vec3(0.819, 0.383, 0.0), 1.0 );
    vRadarOrigin.w = 0.04;
    horizon = vec3( inverse( modelMatrix ) * vec4( vec3(1.0, 0.0, 0.0), 1.0 ) ).xyz;
    vDirection = position - vOrigin;
    gl_Position = projectionMatrix * mvPosition;
}