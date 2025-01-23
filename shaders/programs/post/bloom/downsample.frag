#include "/programs/lib/header.glsl"
#include "/programs/lib/frex/filter.glsl"

uniform sampler2D bloomDownsampleTexture;

in vec2 uv;

layout(location = 0) out vec4 t_color;

void main() {
    ivec2 effectiveScreenSize = def_screenSize >> def_currentLod;
    vec2 offset = 1.0 / vec2(effectiveScreenSize);

    t_color = frx_sample13(bloomDownsampleTexture, uv, offset, def_currentLod - 1);
}
