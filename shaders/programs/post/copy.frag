#include "/programs/lib/header.glsl"

uniform sampler2D def_inputTexture;

in vec2 uv;

layout(location = 0) out vec4 fragColor;

void main() {
    fragColor = texture(def_inputTexture, uv);
}
