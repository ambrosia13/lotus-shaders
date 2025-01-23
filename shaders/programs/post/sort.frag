#include "/programs/lib/header.glsl"

uniform sampler2D solidAlbedoTexture;
uniform sampler2D translucentAlbedoTexture;

uniform sampler2D solidDepthTex;
uniform sampler2D mainDepthTex;

in vec2 uv;

layout(location = 0) out vec4 t_color;

void main() {
    vec4 solidColor = texture(solidAlbedoTexture, uv);
    float solidDepth = texture(solidDepthTex, uv).r;

    vec4 translucentColor = texture(translucentAlbedoTexture, uv);
    float translucentDepth = texture(mainDepthTex, uv).r;

    vec3 composite = solidColor.rgb;

    // lonely sad little composite "sort"
    if (translucentDepth < solidDepth) {
        // composite = vec3(1.0, 0.0, 0.0);
        composite = mix(composite, translucentColor.rgb, translucentColor.a);
    }

    // composite = vec3(translucentDepth);

    t_color = vec4(composite, 1.0);
}
