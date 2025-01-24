// --------------------------------------------------------------------------------------------------------
// Most code from this file is copied or referenced from "Production Sky Rendering" at https://www.shadertoy.com/view/slSXRW, 
// which references "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", Hillaire (2020).
//
// Minimal code changes; modified for my use case. Original Shadertoy code released under the MIT License.
// --------------------------------------------------------------------------------------------------------

#ifndef INCLUDE_LIB_HILLAIRE
#define INCLUDE_LIB_HILLAIRE

#include "/programs/lib/frex/math.glsl"

vec3 getSkyViewPos() {
	if (def_playerRelative) {
		float altitudeMeters = 500.0 + (ap.camera.pos.y - 128.0);
		return vec3(0.0, def_groundRadiusMM + altitudeMeters * 1e-6, 0.0);
	} else {
		return (ap.camera.pos - def_atmosphereOrigin) * 1e-6;
	}
}

vec3 getSkyViewPos(vec3 cameraPosition) {
	if (def_playerRelative) {
		float altitudeMeters = 500.0 + (cameraPosition.y - 128.0);
		return vec3(0.0, def_groundRadiusMM + altitudeMeters * 1e-6, 0.0);
	} else {
		return (cameraPosition - def_atmosphereOrigin) * 1e-6;
	}
}

// Phase function from Jessie
// https://www.patreon.com/user?u=49201970
float kleinNishinaPhase(float cosTheta, float g) {
	float e = 1.0;
	for (int i = 0; i < 8; ++i) {
		float gFromE = 1.0 / e - 2.0 / log(2.0 * e + 1.0) + 1.0;
		float deriv = 4.0 / ((2.0 * e + 1.0) * pow2(log(2.0 * e + 1.0))) - 1.0 / pow2(e);
		if (abs(deriv) < 0.00000001) break;
		e = e - (gFromE - g) / deriv;
	}

	return e / (2.0 * PI * (e * (1.0 - cosTheta) + 1.0) * log(2.0 * e + 1.0));
}

float getMiePhase(float cosTheta) {
	return kleinNishinaPhase(cosTheta, 0.76385);
}

float getRayleighPhase(float cosTheta) {
	return 0.05968310365 * (1.0 + cosTheta * cosTheta);
}

float getDistanceToPlanetCenter(vec3 positionMM) {
    return length(positionMM);
}

float getAltitude(vec3 position) {
    return getDistanceToPlanetCenter(position) - def_groundRadiusMM;
}

void getScatteringValues(
    // position in megameters
	vec3 pos, 
	out vec3 rayleighScattering, 
	out float mieScattering,
	out vec3 extinction
) {
	float altitudeKM = getAltitude(pos) * 1000.0;

	// Note: Paper gets these switched up.
	float rayleighDensity = exp(-altitudeKM / 8.0);
	float mieDensity = exp(-altitudeKM / 1.2);
	
	rayleighScattering = def_rayleighScatteringBase * rayleighDensity;
	float rayleighAbsorption = def_rayleighAbsorptionBase * rayleighDensity;
	
	mieScattering = def_mieScatteringBase * mieDensity;
	float mieAbsorption = def_mieAbsorptionBase * mieDensity;
	
	vec3 ozoneAbsorption = def_ozoneAbsorptionBase * max(0.0, 1.0 - abs(altitudeKM - 25.0) / 15.0);
	
	extinction = rayleighScattering + rayleighAbsorption + mieScattering + mieAbsorption + ozoneAbsorption;
}

float safeacos(float x) {
	return acos(clamp(x, -1.0, 1.0));
}

// From https://gamedev.stackexchange.com/questions/96459/fast-ray-sphere-collision-code.
float rayIntersectSphere(vec3 ro, vec3 rd, float rad) {
	float b = dot(ro, rd);
	float c = dot(ro, ro) - rad * rad;
	if (c > 0.0 && b > 0.0) return -1.0;
	float discr = b * b - c;
	if (discr < 0.0) return -1.0;
	// Special case: inside sphere, use far discriminant
	if (discr > b * b) return (-b + sqrt(discr));
	return -b - sqrt(discr);
}

vec3 getValFromTLUT(sampler2D tex, vec3 pos, vec3 sunDir) {
	float height = getDistanceToPlanetCenter(pos);
	vec3 up = normalize(pos);
    
	float sunCosZenithAngle = dot(sunDir, up);

	vec2 uv = vec2(clamp(0.5 + 0.5 * sunCosZenithAngle, 0.0, 1.0),
				max(0.0, min(1.0, (height - def_groundRadiusMM) / (def_atmosphereRadiusMM - def_groundRadiusMM))));
				
	return texture(tex, uv).rgb;
}

vec3 getValFromMultiScattLUT(sampler2D tex, vec3 pos, vec3 sunDir) {
	float height = getDistanceToPlanetCenter(pos);
	vec3 up = normalize(pos);
    
	float sunCosZenithAngle = dot(sunDir, up);
	
    vec2 uv = vec2(clamp(0.5 + 0.5 * sunCosZenithAngle, 0.0, 1.0),
				max(0.0, min(1.0, (height - def_groundRadiusMM) / (def_atmosphereRadiusMM - def_groundRadiusMM))));
	
	return texture(tex, uv).rgb;
}

// Calculates the actual sky-view! It's a lat-long map (or maybe altitude-azimuth is the better term),
// but the latitude/altitude is non-linear to get more resolution near the horizon.
const int numScatteringSteps = 32;
vec3 raymarchScattering(
	vec3 pos, 
	vec3 rayDir, 
	vec3 sunDir,
	float tMax,
	float numSteps,
	float mieScatteringAmount,
	sampler2D transmittanceLut,
	sampler2D multiscatteringLut,
	vec3 sunColor
) {
	float cosTheta = dot(rayDir, sunDir);
	
	float miePhaseValue = getMiePhase(cosTheta);
	float rayleighPhaseValue = getRayleighPhase(-cosTheta);
	
	vec3 lum = vec3(0.0);
	vec3 transmittance = vec3(1.0);
	float t = 0.0;
	for (float i = 0.0; i < numSteps; i += 1.0) {
		float newT = ((i + 0.3) / numSteps) * tMax;
		float dt = newT - t;
		t = newT;
		
		vec3 newPos = pos + t * rayDir;
		
		vec3 rayleighScattering, extinction;
		float mieScattering;
		getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);
		
		vec3 sampleTransmittance = exp(-dt * extinction);

		vec3 sunTransmittance = getValFromTLUT(transmittanceLut, newPos, sunDir) * sunColor;
		vec3 psiMS = getValFromMultiScattLUT(multiscatteringLut, newPos, sunDir);
		
		vec3 rayleighInScattering = rayleighScattering * (rayleighPhaseValue * sunTransmittance + psiMS);
		vec3 mieInScattering = mieScattering * (miePhaseValue * sunTransmittance + psiMS);
		vec3 inScattering = (rayleighInScattering + mieInScattering * mieScatteringAmount);

		// Integrated scattering within path segment.
		vec3 scatteringIntegral = (inScattering - inScattering * sampleTransmittance) / extinction;

		lum += scatteringIntegral * transmittance;
		
		transmittance *= sampleTransmittance;
	}
    
	return lum;
}

vec3 getValFromSkyLUT(vec3 rayDir, vec3 sunDir, sampler2D skyLut) {
	vec3 skyViewPos = getSkyViewPos();

	float height = length(skyViewPos);
	vec3 up = skyViewPos * rcp(height);
	
	float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height);
	float altitudeAngle = horizonAngle - acos(dot(rayDir, up)); // Between -PI/2 and PI/2
	float azimuthAngle; // Between 0 and 2*PI
	if (abs(altitudeAngle) > (HALF_PI - .0001)) {
		// Looking nearly straight up or down.
		azimuthAngle = 0.0;
	} else {
		vec3 right = cross(sunDir, up);
		vec3 forward = cross(up, right);
		
		vec3 projectedDir = normalize(rayDir - up*(dot(rayDir, up)));
		float sinTheta = dot(projectedDir, right);
		float cosTheta = dot(projectedDir, forward);
		azimuthAngle = atan(sinTheta, cosTheta) + PI;
	}
	
	// Non-linear mapping of altitude angle. See Section 5.3 of the paper.
	float v = 0.5 + 0.5*sign(altitudeAngle)*sqrt(abs(altitudeAngle)*2.0/PI);
	vec2 uv = vec2(azimuthAngle / (TAU), v);
	
	return texture(skyLut, uv).rgb;
}

#endif
