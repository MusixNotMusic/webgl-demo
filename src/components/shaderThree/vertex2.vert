// #version 300 es
 
uniform float aspect;
//uniform float zScale;
//uniform mat4 transform;
in vec2 coordinates;
out vec2 texCoord;

// = camera.matrixWorldInverse * object.matrixWorld
// uniform mat4 modelViewMatrix;

// = camera.projectionMatrix
// uniform mat4 projectionMatrix;

//out vec4 origin;
//out vec4 direction;
 
void main() {
   	texCoord = coordinates;
    //texCoord.x = texCoord.x*(-1.0);
    //texCoord.y = texCoord.y*(-1.0);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(coordinates, 1.0, 1.0);
}
