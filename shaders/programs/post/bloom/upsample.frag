#include "/programs/lib/header.glsl"
#include "/programs/lib/frex/filter.glsl"

uniform sampler2D bloomDownsampleTexture;
uniform sampler2D bloomUpsampleTexture;

in vec2 uv;

layout(location = 0) out vec4 t_color;

void main() {
    ivec2 effectiveScreenSize = def_screenSize >> def_currentLod;
    vec2 offset = 1.0 / vec2(effectiveScreenSize);

    vec4 previous = frx_sampleTent(bloomUpsampleTexture, uv, offset, def_currentLod + 1);
    vec4 current = textureLod(bloomDownsampleTexture, uv, def_currentLod);
    t_color = current + previous;
}
