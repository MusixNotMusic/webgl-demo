in vec3 position;
in vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
out vec3 vOrigin;
out vec3 vDirection;
out vec3 vPosition;
out vec2 vUv;
void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;
    vDirection = position - vOrigin;
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * mvPosition;
}