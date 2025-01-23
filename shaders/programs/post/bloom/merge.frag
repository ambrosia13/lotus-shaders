#include "/programs/lib/header.glsl"

uniform sampler2D def_inputTexture;
uniform sampler2D bloomUpsampleTexture;

in vec2 uv;

layout(location = 0) out vec4 t_color;

void main() {
    vec4 bloomColor = textureLod(bloomUpsampleTexture, uv, 0);
    bloomColor *= 1.0 / def_maxLod;

    vec4 mainColor = texture(def_inputTexture, uv);

    t_color = mix(mainColor, bloomColor, 0.5);
}
