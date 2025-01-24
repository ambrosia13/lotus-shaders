#include "/programs/lib/header.glsl"
#include "/programs/lib/sky/hillaire.glsl"

in vec2 uv;

layout(location = 0) out vec4 t_color;

// Generates the Transmittance LUT. Each pixel coordinate corresponds to a height and sun zenith angle, and
// the value is the transmittance from that point to sun, through the atmosphere.
const float sunTransmittanceSteps = 80.0;

vec3 getSunTransmittance(vec3 pos, vec3 sunDir) {
	if (rayIntersectSphere(pos, sunDir, def_groundRadiusMM) > 0.0) {
		return vec3(0.0);
	}
	
	float atmoDist = rayIntersectSphere(pos, sunDir, def_atmosphereRadiusMM);
	float t = 0.0;
	
	vec3 transmittance = vec3(1.0);
	for (float i = 0.0; i < sunTransmittanceSteps; i += 1.0) {
		float newT = ((i + 0.3) / sunTransmittanceSteps) * atmoDist;
		float dt = newT - t;
		t = newT;
		
		vec3 newPos = pos + t * sunDir;
		
		vec3 rayleighScattering, extinction;
		float mieScattering;
		getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);
		
		transmittance *= exp(-dt * extinction);
	}

	return transmittance;
}

void main() {
	float u = uv.x;
	float v = uv.y;
	
	float sunCosTheta = 2.0 * u - 1.0;
	float sunTheta = safeacos(sunCosTheta);
	float height = mix(def_groundRadiusMM, def_atmosphereRadiusMM, v);
	
	vec3 pos = vec3(0.0, height, 0.0); 
	vec3 sunDir = normalize(vec3(0.0, sunCosTheta, -sin(sunTheta)));
	
    t_color = vec4(getSunTransmittance(pos, sunDir), 1.0);
}
