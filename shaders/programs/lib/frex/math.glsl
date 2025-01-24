#ifndef INCLUDE_LIB_MATH
#define INCLUDE_LIB_MATH

#define PI            3.1415926535897932384626433832795
#define HALF_PI    	  1.57079632679489661923 // I prefer a whole pi when I can get it, but I won't say no to half.
#define TAU           6.2831853071795864769252867665590 // two PI

float pow2(float x) {
    return x * x;
}

/*
 * Converts RGB to grayscale.
 */
float frx_luminance(vec3 color) {
	return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

#endif