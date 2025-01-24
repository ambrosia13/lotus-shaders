vec3 sampleAtmosphere(
	in vec3 pos,
	in vec3 viewDir, 
	in sampler2D skyViewLut,
	in sampler2D transmittanceLut, 
	in sampler2D multiscatteringLut
) {
	vec3 skyViewPos = getSkyViewPos(pos);
	vec3 skyColor;

	if (length(skyViewPos) < def_atmosphereRadiusMM) {
		skyColor = getValFromSkyLUT(viewDir, getSunVector(), skyViewLut);
	} else {
		float atmoDist = rayIntersectSphere(skyViewPos, viewDir, def_atmosphereRadiusMM);
		float groundDist = rayIntersectSphere(skyViewPos, viewDir, def_groundRadiusMM);

		float tMax = (groundDist < 0.0) ? atmoDist : groundDist;

		skyColor =
			raymarchScattering(skyViewPos, viewDir, getSunVector(), tMax, float(numScatteringSteps), transmittanceLut, multiscatteringLut, vec3(1.0));
	}

	return skyColor;
}