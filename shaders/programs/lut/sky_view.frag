#include "/programs/lib/header.glsl"
#include "/programs/lib/sky/hillaire.glsl"

uniform sampler2D def_transmittanceTexture;
uniform sampler2D def_scatteringTexture;

in vec2 uv;

layout(location = 0) out vec4 t_color;

void main() {
	float u = uv.x;
	float v = uv.y;

	float clipV = v * 2.0 - 1.0;
	
	float azimuthAngle = (u - 0.5)*2.0*PI;
	// Non-linear mapping of altitude. See Section 5.3 of the paper.
	float adjV;
	if (v < 0.5) {
		float coord = -clipV;
		adjV = -coord*coord;
	} else {
		float coord = clipV;
		adjV = coord*coord;
	}
	
	vec3 skyViewPos = getSkyViewPos();

	float height = length(skyViewPos);
	vec3 up = skyViewPos / height;
	float horizonAngle = safeacos(sqrt(height * height - def_groundRadiusMM * def_groundRadiusMM) / height) - 0.5*PI;
	float altitudeAngle = adjV*0.5*PI - horizonAngle;

    float cosAltitude = cos(altitudeAngle);
	vec3 rayDir = vec3(cosAltitude*sin(azimuthAngle), sin(altitudeAngle), -cosAltitude*cos(azimuthAngle));
	
	float sunAltitude = (0.5*PI) - acos(dot(getSunVector(), up));
	vec3 sunDir = vec3(0.0, sin(sunAltitude), -cos(sunAltitude));

	float sunAltitudeMoon = (0.5*PI) - acos(dot(getMoonVector(), up));
	vec3 sunDirMoon = vec3(0.0, sin(sunAltitudeMoon), -cos(sunAltitudeMoon));
	
	float atmoDist = rayIntersectSphere(skyViewPos, rayDir, def_atmosphereRadiusMM);
	float groundDist = rayIntersectSphere(skyViewPos, rayDir, def_groundRadiusMM);
	
    float tMax = (groundDist < 0.0) ? atmoDist : groundDist;

    t_color = vec4(
        raymarchScattering(
            skyViewPos,
            rayDir,
            sunDir,
            tMax,
            float(numScatteringSteps),
            def_transmittanceTexture,
            def_scatteringTexture,
            vec3(1.0)
        ), 
        1.0
    );
}
