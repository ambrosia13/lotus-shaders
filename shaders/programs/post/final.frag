#include "/programs/lib/header.glsl"
#include "/programs/lib/frex/color.glsl"

// TODO: workaround because iris doesn't currently support defines in combination pass
#define def_inputTexture sortTexture

uniform sampler2D def_inputTexture;

in vec2 uv;
out vec4 t_color;

void main() {
    vec3 color = textureLod(def_inputTexture, uv, 0).rgb;
    
    color = frx_toneMap(color);
    color = frx_toGamma(color);

    t_color = vec4(color, 1.0);
}
