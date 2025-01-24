#ifndef INCLUDE_LIB_FILTER
#define INCLUDE_LIB_FILTER

// Temporally stable box filter, as described by Jorge Jiminez, 2014
// http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare
vec4 frx_sample13(sampler2D tex, vec2 uv, vec2 dist, int lod) {
	vec4 a = textureLod(tex, uv + dist * vec2(-1.0, -1.0), lod);
	vec4 b = textureLod(tex, uv + dist * vec2(0.0, -1.0), lod);
	vec4 c = textureLod(tex, uv + dist * vec2(1.0, -1.0), lod);
	vec4 d = textureLod(tex, uv + dist * vec2(-0.5, -0.5), lod);
	vec4 e = textureLod(tex, uv + dist * vec2(0.5, -0.5), lod);
	vec4 f = textureLod(tex, uv + dist * vec2(-1.0, 0.0), lod);
	vec4 g = textureLod(tex, uv, lod);
	vec4 h = textureLod(tex, uv + dist * vec2(1.0, 0.0), lod);
	vec4 i = textureLod(tex, uv + dist * vec2(-0.5, 0.5), lod);
	vec4 j = textureLod(tex, uv + dist * vec2(0.5, 0.5), lod);
	vec4 k = textureLod(tex, uv + dist * vec2(-1.0, 1.0), lod);
	vec4 l = textureLod(tex, uv + dist * vec2(0.0, 1.0), lod);
	vec4 m = textureLod(tex, uv + dist * vec2(1.0, 1.0), lod);

	vec2 div = (1.0 / 4.0) * vec2(0.5, 0.125);

	vec4 o = (d + e + i + j) * div.x;
	o += (a + b + g + f) * div.y;
	o += (b + c + h + g) * div.y;
	o += (f + g + l + k) * div.y;
	o += (g + h + m + l) * div.y;

	return o;
}

// Used for bloom upsample, as described by Jorge Jiminez, 2014
// http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare
vec4 frx_sampleTent(sampler2D tex, vec2 uv, vec2 dist, int lod) {
	vec4 d = dist.xyxy * vec4(1.0, 1.0, -1.0, 0.0);

	vec4 sum = textureLod(tex, uv - d.xy, lod)
	+ textureLod(tex, uv - d.wy, lod) * 2.0
	+ textureLod(tex, uv - d.zy, lod)
	+ textureLod(tex, uv + d.zw, lod) * 2.0
	+ textureLod(tex, uv, lod) * 4.0
	+ textureLod(tex, uv + d.xw, lod) * 2.0
	+ textureLod(tex, uv + d.zy, lod)
	+ textureLod(tex, uv + d.wy, lod) * 2.0
	+ textureLod(tex, uv + d.xy, lod);

	return sum * (1.0 / 16.0);
}

#endif