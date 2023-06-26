// in vec3 position;
// uniform mat4 modelMatrix;
// uniform mat4 modelViewMatrix;
// uniform mat4 projectionMatrix;
// uniform vec3 cameraPosition;

out vec3 vOrigin;
out vec3 vDirection;

out vec3 texCoord;
out vec2 texCoord2D;

void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;
    vDirection = position - vOrigin;

    texCoord = position;
	texCoord2D = uv;
    
    gl_Position = projectionMatrix * mvPosition;
}