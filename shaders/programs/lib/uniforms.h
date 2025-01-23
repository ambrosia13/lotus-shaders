// Uniform data for reference; uses C header file extension to prevent confusion with .glsl files

struct GameData {
    vec2 screenSize; // 0
    bool guiHidden; // 8
};

struct FrameData {
    float millis; // 0
    float time; // 4
    int counter; // 8
};

struct WorldData {
    vec3 skyColor; // 0
    float rainStrength; // 12
    float fogStart; // 16
    float fogEnd; // 20
    vec4 fogColor; // 32
    int time; // 48
};

struct CelestialData {
    vec3 pos; // 0
    float angle; // 12
    vec3 sunPos; // 16
    vec3 moonPos; // 32
    mat4 view; // 48
    mat4[4] projection; // 112
};

struct CameraData {
    vec3 pos; // 0
    float near; // 12
    float far; // 16
    vec2 brightness; // 24
    int fluid; // 32
    mat4 view; // 48
    mat4 viewInv; // 112
    mat4 projection; // 176
    mat4 projectionInv; // 240
};

struct TemporalData {
    vec3 pos; // 0
    mat4 view; // 16
    mat4 viewInv; // 80
    mat4 projection; // 144
    mat4 projectionInv; // 208
};