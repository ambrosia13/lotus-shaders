#include "/programs/lib/header.glsl"
#include "/programs/lib/sky/hillaire.glsl"

in vec2 uv;

layout(location = 0) out vec4 t_color;

void main() {
    t_color = vec4(0.5, 0.0, 0.0, 1.0);
}
