#include "/programs/lib/header.glsl"

void iris_emitVertex(inout VertexData data) {
    // It's that simple.
    data.clipPos = iris_projectionMatrix * iris_modelViewMatrix * data.modelPos;
}

out vec2 v_atlasCoord;
out vec3 v_lightCoord;
out vec4 v_vertexColor;

void iris_sendParameters(VertexData data) {
    vec4 color = data.color;
    color.rgb = mix(color.rgb, data.overlayColor.rgb, data.overlayColor.a);

    v_atlasCoord = data.uv;
    v_lightCoord = vec3(data.light, data.ao);
    v_vertexColor = color;
}