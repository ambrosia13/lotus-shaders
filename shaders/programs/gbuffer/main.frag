#include "/programs/lib/header.glsl"
#include "/programs/lib/frex/color.glsl"

layout(location = 0) out vec4 t_albedo;
layout(location = 1) out vec4 t_normal;
layout(location = 2) out vec4 t_light;
layout(location = 3) out vec4 t_material;

in vec2 v_atlasCoord;
in vec3 v_lightCoord;
in vec4 v_vertexColor;

void iris_emitFragment() {
    vec2 atlasCoord = v_atlasCoord;
    vec2 lightUv = v_lightCoord.xy;
    float ao = v_lightCoord.z;
    vec4 vertexColor = v_vertexColor;

    iris_modifyBase(atlasCoord, vertexColor, lightUv);

    vec4 albedo = iris_sampleBaseTex(atlasCoord) * vertexColor;

    // Alpha testing
    if (iris_discardFragment(albedo)) {
        discard;
    }

    albedo.rgb = frx_fromGamma(albedo.rgb);

    t_albedo = albedo;
    t_normal = vec4(0.0);
    t_light = vec4(lightUv, ao, 0.0);
    t_material = vec4(atlasCoord, 0.0, 0.0);
}