#include "/programs/lib/header.glsl"
#include "/programs/lib/sky/hillaire.glsl"

uniform sampler2D def_transmittanceTexture;

in vec2 uv;

layout(location = 0) out vec4 t_color;

// Generates the multiple-scattering LUT. Each pixel coordinate corresponds to a height and sun zenith angle, and
// the value is the multiple scattering approximation (Psi_ms from the paper, Eq. 10).
const float mulScattSteps = 40.0;
const int sqrtSamples = 16;


vec3 getSphericalDir(float theta, float phi) {
	float cosPhi = cos(phi);
	float sinPhi = sin(phi);
	float cosTheta = cos(theta);
	float sinTheta = sin(theta);
	return vec3(sinPhi*sinTheta, cosPhi, sinPhi*cosTheta);
}

// Calculates Equation (5) and (7) from the paper.
void getMulScattValues(vec3 pos, vec3 sunDir, out vec3 lumTotal, out vec3 fms) {
	lumTotal = vec3(0.0);
	fms = vec3(0.0);
	
	float invSamples = 1.0/float(sqrtSamples*sqrtSamples);
	for (int i = 0; i < sqrtSamples; i++) {
		for (int j = 0; j < sqrtSamples; j++) {
			// This integral is symmetric about theta = 0 (or theta = PI), so we
			// only need to integrate from zero to PI, not zero to 2*PI.
			float theta = PI * (float(i) + 0.5) / float(sqrtSamples);
			float phi = safeacos(1.0 - 2.0*(float(j) + 0.5) / float(sqrtSamples));
			vec3 rayDir = getSphericalDir(theta, phi);
			
			float atmoDist = rayIntersectSphere(pos, rayDir, def_atmosphereRadiusMM);
			float groundDist = rayIntersectSphere(pos, rayDir, def_groundRadiusMM);
			float tMax = atmoDist;
			if (groundDist > 0.0) {
				tMax = groundDist;
			}
			
			float cosTheta = dot(rayDir, sunDir);
	
			float miePhaseValue = getMiePhase(cosTheta);
			float rayleighPhaseValue = getRayleighPhase(-cosTheta);
			
			vec3 lum = vec3(0.0), lumFactor = vec3(0.0), transmittance = vec3(1.0);
			float t = 0.0;
			for (float stepI = 0.0; stepI < mulScattSteps; stepI += 1.0) {
				float newT = ((stepI + 0.3)/mulScattSteps)*tMax;
				float dt = newT - t;
				t = newT;

				vec3 newPos = pos + t*rayDir;

				vec3 rayleighScattering, extinction;
				float mieScattering;
				getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);

				vec3 sampleTransmittance = exp(-dt*extinction);
				
				// Integrate within each segment.
				vec3 scatteringNoPhase = rayleighScattering + mieScattering;
				vec3 scatteringF = (scatteringNoPhase - scatteringNoPhase * sampleTransmittance) / extinction;
				lumFactor += transmittance*scatteringF;
				
				// This is slightly different from the paper, but I think the paper has a mistake?
				// In equation (6), I think S(x,w_s) should be S(x-tv,w_s).
				vec3 sunTransmittance = getValFromTLUT(def_transmittanceTexture, newPos, sunDir);

				vec3 rayleighInScattering = rayleighScattering*rayleighPhaseValue;
				float mieInScattering = mieScattering*miePhaseValue;
				vec3 inScattering = (rayleighInScattering + mieInScattering)*sunTransmittance;

				// Integrated scattering within path segment.
				vec3 scatteringIntegral = (inScattering - inScattering * sampleTransmittance) / extinction;

				lum += scatteringIntegral*transmittance;
				transmittance *= sampleTransmittance;
			}
			
			if (groundDist > 0.0) {
				vec3 hitPos = pos + groundDist*rayDir;
				if (dot(pos, sunDir) > 0.0) {
					hitPos = normalize(hitPos)*def_groundRadiusMM;
					lum += transmittance*def_groundAlbedo*getValFromTLUT(def_transmittanceTexture, hitPos, sunDir);
				}
			}
			
			fms += lumFactor*invSamples;
			lumTotal += lum*invSamples;
		}
	}
}

void main() {
	float u = uv.x;
	float v = uv.y;
	
	float sunCosTheta = 2.0*u - 1.0;
	float sunTheta = safeacos(sunCosTheta);
	float height = mix(def_groundRadiusMM, def_atmosphereRadiusMM, v);
	
	vec3 pos = vec3(0.0, height, 0.0); 
	vec3 sunDir = normalize(vec3(0.0, sunCosTheta, -sin(sunTheta)));
	
	vec3 lum, f_ms;
	getMulScattValues(pos, sunDir, lum, f_ms);
	
	// Equation 10 from the paper.
	vec3 psi = lum  / (1.0 - f_ms); 

    t_color = vec4(psi, 1.0);
}
