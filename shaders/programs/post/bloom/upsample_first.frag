#include "/programs/lib/header.glsl"
#include "/programs/lib/frex/filter.glsl"

uniform sampler2D bloomDownsampleTexture;

in vec2 uv;

layout(location = 0) out vec4 t_color;

void main() {
    // ivec2 effectiveScreenSize = def_screenSize >> def_currentLod;
    // vec2 offset = 1.0 / vec2(effectiveScreenSize);
    //t_color = frx_sampleTent(bloomDownsampleTexture, uv, offset, def_currentLod);

    // regular filter makes no difference at this resolution
    t_color = textureLod(bloomDownsampleTexture, uv, def_currentLod);
}
