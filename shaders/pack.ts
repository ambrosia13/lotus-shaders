// util.ts

interface Vec3 {
    x: number,
    y: number,
    z: number
};

// config.ts

function configure() {
    worldSettings.ambientOcclusionLevel = 1.0;
    worldSettings.disableShade = true;
    worldSettings.renderEntityShadow = true;
}

// atmosphere.ts
interface AtmosphereSettings {
    origin: Vec3,
    unitScale: number,
    playerRelative: boolean,

    groundAlbedo: Vec3,

    groundRadiusMM: number,
    atmosphereRadiusMM: number,

    rayleighScatteringBase: Vec3,
    rayleighAbsorptionBase: number,

    mieScatteringBase: number,
    mieAbsorptionBase: number,

    ozoneAbsorptionBase: Vec3,
};

class AtmosphereData {
    settings: AtmosphereSettings;

    name: string;

    transmittanceTexture: BuiltTexture;
    scatteringTexture: BuiltTexture;
    skyViewTexture: BuiltTexture;

    transmittanceTextureName(): string {
        return this.name + "TransmittanceTexture";
    }

    scatteringTextureName(): string {
        return this.name + "ScatteringTexture";
    }

    skyViewTextureName(): string {
        return this.name + "SkyViewTexture";
    }

    constructor(
        name: string,
        settings: AtmosphereSettings,
    ) {
        // transmittance between 0 and 1
        const transmittanceTextureFormat = Format.RGB16;
        const scatteringTextureFormat = Format.RGB16F;
        const skyViewTextureFormat = Format.R11F_G11F_B10F;

        this.settings = settings;

        this.name = name;

        this.transmittanceTexture = new Texture(this.transmittanceTextureName())
            .format(transmittanceTextureFormat)
            .clear(false)
            .width(256)
            .height(64)
            .build();

        this.scatteringTexture = new Texture(this.scatteringTextureName())
            .format(scatteringTextureFormat)
            .clear(false)
            .width(32)
            .height(32)
            .build();

        this.skyViewTexture = new Texture(this.skyViewTextureName())
            .format(skyViewTextureFormat)
            .clear(false)
            .width(400)
            .height(400)
            .build();
    }

    defineAtmosphereSettingsInShader(pass: Composite) {
        pass.define("def_atmosphereOrigin", "vec3( +" + this.settings.origin.x + "," + this.settings.origin.y + "," + this.settings.origin.z + ")");
        pass.define("def_unitScale", this.settings.unitScale.toString());
        pass.define("def_playerRelative", this.settings.playerRelative.toString());

        pass.define("def_groundAlbedo", "vec3( +" + this.settings.groundAlbedo.x + "," + this.settings.groundAlbedo.y + "," + this.settings.groundAlbedo.z + ")");

        pass.define("def_groundRadiusMM", this.settings.groundRadiusMM.toString());
        pass.define("def_atmosphereRadiusMM", this.settings.atmosphereRadiusMM.toString());

        pass.define("def_rayleighScatteringBase", "vec3( +" + this.settings.rayleighScatteringBase.x + "," + this.settings.rayleighScatteringBase.y + "," + this.settings.rayleighScatteringBase.z + ")")
        pass.define("def_rayleighAbsorptionBase", this.settings.rayleighAbsorptionBase.toString());

        pass.define("def_mieScatteringBase", this.settings.mieScatteringBase.toString());
        pass.define("def_mieAbsorptionBase", this.settings.mieAbsorptionBase.toString());

        pass.define("def_ozoneAbsorptionBase", "vec3( +" + this.settings.ozoneAbsorptionBase.x + "," + this.settings.ozoneAbsorptionBase.y + "," + this.settings.ozoneAbsorptionBase.z + ")");
    }

    registerAtmosphereShaders() {
        const transmittancePass = new Composite(this.name + " Atmosphere Transmittance Pass")
            .fragment("programs/lut/transmittance.frag")
            .target(0, this.transmittanceTexture);

        this.defineAtmosphereSettingsInShader(transmittancePass);

        registerShader(
            Stage.SCREEN_SETUP,
            transmittancePass.build()
        );

        const scatteringPass = new Composite(this.name + " Atmosphere Scattering Pass")
            .fragment("programs/lut/scattering.frag")
            .target(0, this.scatteringTexture)
            .define("def_transmittanceTexture", this.transmittanceTextureName());

        this.defineAtmosphereSettingsInShader(scatteringPass);

        registerShader(
            Stage.SCREEN_SETUP,
            scatteringPass.build()
        );

        const skyViewPass = new Composite(this.name + " Atmosphere Sky-View Pass")
            .fragment("programs/lut/sky_view.frag")
            .target(0, this.skyViewTexture)
            .define("def_transmittanceTexture", this.transmittanceTextureName())
            .define("def_scatteringTexture", this.scatteringTextureName());

        this.defineAtmosphereSettingsInShader(skyViewPass);

        registerShader(
            Stage.PRE_RENDER,
            skyViewPass.build()
        );

    }
}

class Atmosphere {
    static earth: AtmosphereData;

    static setup() {
        Atmosphere.earth = new AtmosphereData(
            "earth",
            {
                origin: { x: 0.0, y: 0.0, z: 0.0 },
                unitScale: 1.0,
                playerRelative: true,

                groundAlbedo: { x: 0.0, y: 0.0, z: 0.0 },

                groundRadiusMM: 6.360,
                atmosphereRadiusMM: 6.460,

                rayleighScatteringBase: { x: 5.802, y: 13.558, z: 33.1 },
                rayleighAbsorptionBase: 0.0,

                mieScatteringBase: 25.996,
                mieAbsorptionBase: 4.4,

                ozoneAbsorptionBase: { x: 0.650, y: 1.881, z: 0.085 },
            }
        )

        Atmosphere.earth.registerAtmosphereShaders();
    }
}

// composite_sort.ts

class CompositeSort {
    static sortTexture: BuiltTexture;

    static sortTextureName(): string {
        return "sortTexture";
    }

    static setup() {
        const textureFormat = Format.R11F_G11F_B10F;

        const sortTexture = new Texture(CompositeSort.sortTextureName())
            .format(textureFormat)
            .clear(false)
            .build();

        CompositeSort.sortTexture = sortTexture;

        const pass = new Composite("Composite Sort Pass")
            .fragment("programs/post/sort.frag")
            .target(0, CompositeSort.sortTexture);

        registerShader(Stage.POST_RENDER, pass.build());
    }
}

// bloom.ts

class Bloom {
    static downsampleTexture: BuiltTexture;
    static upsampleTexture: BuiltTexture;
    static mergeTexture: BuiltTexture;

    static downsampleTextureName(): string {
        return "bloomDownsampleTexture";
    }

    static upsampleTextureName(): string {
        return "bloomUpsampleTexture";
    }

    static mergeTextureName(): string {
        return "bloomMergeTexture";
    }

    private static calculateMipCount(): number {
        return Math.floor(Math.log2(Math.max(screenWidth, screenHeight)));
    }

    private static calculateScreenWidth(lod: number): number {
        return screenWidth >> Bloom.calculateMipCount();
    }

    private static calculateScreenHeight(lod: number): number {
        return screenHeight >> Bloom.calculateMipCount();
    }

    private static setupTextures() {
        const textureFormat = Format.R11F_G11F_B10F;

        const downsampleTexture = new Texture(Bloom.downsampleTextureName())
            .format(textureFormat)
            .clear(false)
            .mipmap(true)
            .build();

        const upsampleTexture = new Texture(Bloom.upsampleTextureName())
            .format(textureFormat)
            .clear(false)
            .mipmap(true)
            .build();

        const mergeTexture = new Texture(Bloom.mergeTextureName())
            .format(textureFormat)
            .clear(false)
            .mipmap(true)
            .build();

        Bloom.downsampleTexture = downsampleTexture;
        Bloom.upsampleTexture = upsampleTexture;
        Bloom.mergeTexture = mergeTexture;
    }

    private static setupDownsampleChain(inputTexture: BuiltTexture, inputTextureName: string) {
        const mipCount = Bloom.calculateMipCount();

        // The initial copy from the input texture to the bloom downsample texture
        registerShader(
            Stage.POST_RENDER,
            new Composite("Bloom Downsample Pass 0")
                .fragment("programs/post/copy.frag")
                .target(0, Bloom.downsampleTexture)
                .define("def_inputTexture", inputTextureName)
                .build()
        );

        for (let i = 1; i < mipCount; i++) {
            registerShader(
                Stage.POST_RENDER,
                new Composite("Bloom Downsample Pass " + i)
                    .fragment("programs/post/bloom/downsample.frag")
                    .target(0, Bloom.downsampleTexture, i)
                    .define("def_currentLod", "" + i)
                    .define("def_maxLod", "" + mipCount)
                    .build()
            );
        }
    }

    private static setupUpsampleChain() {
        const mipCount = Bloom.calculateMipCount();

        // The initial upsample pass, that copies the highest-lod downsample texture to the
        // highest-lod upsample texture with some small filtering.
        registerShader(
            Stage.POST_RENDER,
            new Composite("Bloom Upsample Pass " + (mipCount - 1))
                .fragment("programs/post/bloom/upsample_first.frag")
                .target(0, Bloom.upsampleTexture, mipCount - 1)
                .define("def_currentLod", "" + (mipCount - 1))
                .define("def_maxLod", "" + mipCount)
                .build()
        );

        for (let i = mipCount - 2; i >= 0; i--) {
            registerShader(
                Stage.POST_RENDER,
                new Composite("Bloom Upsample Pass " + i)
                    .fragment("programs/post/bloom/upsample.frag")
                    .target(0, Bloom.upsampleTexture, i)
                    .define("def_currentLod", "" + i)
                    .define("def_maxLod", "" + mipCount)
                    .build()
            );
        }
    }

    private static setupMerge(inputTextureName: string) {
        const mipCount = Bloom.calculateMipCount();

        registerShader(
            Stage.POST_RENDER,
            new Composite("Bloom Merge Pass")
                .fragment("programs/post/bloom/merge.frag")
                .target(0, Bloom.mergeTexture)
                .define("def_maxLod", "" + mipCount)
                .define("def_inputTexture", inputTextureName)
                .build()
        );
    }

    static setup(inputTexture: BuiltTexture, inputTextureName: string) {
        Bloom.setupTextures();

        Bloom.setupDownsampleChain(inputTexture, inputTextureName);

        Bloom.setupUpsampleChain();

        Bloom.setupMerge(inputTextureName);

    }
}

// gbuffer.ts -------------------------------------------------------------------------

class GbufferTextures {
    prefix: string;
    usage: ProgramUsage;

    // RGBA8
    // r, g, b, a
    albedoTexture: BuiltTexture;
    // RGBA8
    // vertex normal x, y, z
    normalTexture: BuiltTexture;
    // RGBA8
    // block light, sky light, ao
    lightTexture: BuiltTexture;
    // RGBA8
    // atlas x, atlas y
    materialTexture: BuiltTexture;

    constructor(prefix: string, usage: ProgramUsage) {
        this.prefix = prefix;
        this.usage = usage;

        this.albedoTexture = new Texture(prefix + "AlbedoTexture")
            .format(Format.RGBA8)
            .clear(true)
            .clearColor(0, 0, 0, 0)
            .build();

        this.normalTexture = new Texture(prefix + "NormalTexture")
            .format(Format.RGBA8)
            .clear(true)
            .clearColor(0, 0, 0, 0)
            .build();

        this.lightTexture = new Texture(prefix + "LightTexture")
            .format(Format.RGBA8)
            .clear(true)
            .clearColor(0, 0, 0, 0)
            .build();

        this.materialTexture = new Texture(prefix + "MaterialTexture")
            .format(Format.RGBA8)
            .clear(true)
            .clearColor(0, 0, 0, 0)
            .build();
    }

    albedoTextureName(): string {
        return this.prefix + "AlbedoTexture";
    }

    normalTextureName(): string {
        return this.prefix + "NormalTexture";
    }

    materialTextureName(): string {
        return this.prefix + "MaterialTexture";
    }

    shader(): BuiltObjectShader {
        return new ObjectShader(this.prefix, this.usage)
            .vertex("programs/gbuffer/main.vert")
            .fragment("programs/gbuffer/main.frag")
            .target(0, this.albedoTexture)
            .target(1, this.normalTexture)
            .target(2, this.lightTexture)
            .target(3, this.materialTexture)
            .build();
    }
}

class Gbuffer {
    static solid: GbufferTextures;
    static translucent: GbufferTextures;

    static setup() {
        print("Gbuffer init");

        Gbuffer.solid = new GbufferTextures("solid", Usage.BASIC);
        Gbuffer.translucent = new GbufferTextures("translucent", Usage.TERRAIN_TRANSLUCENT);

        let solidShader = Gbuffer.solid.shader();
        let translucentShader = Gbuffer.translucent.shader();

        registerShader(solidShader);
        registerShader(translucentShader);

        print("Gbuffer finish init");
    }
}

// post.ts ----------------------------------------------------------------------------

function setupFinalPass() {
    const combinationPass = new CombinationPass("programs/post/final.frag").build();
    setCombinationPass(combinationPass);
}

// pack.ts ----------------------------------------------------------------------------

function setupShader() {
    configure();

    Atmosphere.setup();

    Gbuffer.setup();
    CompositeSort.setup();
    Bloom.setup(CompositeSort.sortTexture, CompositeSort.sortTextureName());

    setupFinalPass();
}