// config.ts

function configure() {
    worldSettings.ambientOcclusionLevel = 1.0;
    worldSettings.disableShade = true;
    worldSettings.renderEntityShadow = true;
}

// bloom.ts
class Bloom {
    static downsampleTexture: BuiltTexture;
    static upsampleTexture: BuiltTexture;
    static mergeTexture: BuiltTexture;

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
        let textureFormat = Format.R11F_G11F_B10F;

        let downsampleTexture = new Texture("bloomDownsampleTexture")
            .format(textureFormat)
            .clear(false)
            .mipmap(true)
            .build();

        let upsampleTexture = new Texture("bloomUpsampleTexture")
            .format(textureFormat)
            .clear(false)
            .mipmap(true)
            .build();

        let mergeTexture = new Texture("bloomMergeTexture")
            .format(textureFormat)
            .clear(false)
            .mipmap(true)
            .build();

        Bloom.downsampleTexture = downsampleTexture;
        Bloom.upsampleTexture = upsampleTexture;
        Bloom.mergeTexture = mergeTexture;
    }

    private static setupDownsampleChain(inputTexture: BuiltTexture, inputTextureName: string) {
        let mipCount = Bloom.calculateMipCount();

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
        let mipCount = Bloom.calculateMipCount();

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
        let mipCount = Bloom.calculateMipCount();

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
            .build();

        this.normalTexture = new Texture(prefix + "NormalTexture")
            .format(Format.RGBA8)
            .clear(true)
            .build();

        this.lightTexture = new Texture(prefix + "LightTexture")
            .format(Format.RGBA8)
            .clear(true)
            .build();

        this.materialTexture = new Texture(prefix + "MaterialTexture")
            .format(Format.RGBA8)
            .clear(true)
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
    static basic: GbufferTextures;

    static setup() {
        print("Gbuffer init");

        Gbuffer.solid = new GbufferTextures("solid", Usage.TERRAIN_SOLID);
        Gbuffer.translucent = new GbufferTextures("translucent", Usage.TERRAIN_TRANSLUCENT);
        Gbuffer.basic = new GbufferTextures("basic", Usage.BASIC);

        let solidShader = Gbuffer.solid.shader();
        let translucentShader = Gbuffer.translucent.shader();
        let basicShader = Gbuffer.basic.shader();

        registerShader(solidShader);
        registerShader(translucentShader);
        registerShader(basicShader);

        print("Gbuffer finish init");
    }
}

// post.ts ----------------------------------------------------------------------------

function setupFinalPass() {
    let combinationPass = new CombinationPass("programs/post/final.frag").build();
    setCombinationPass(combinationPass);
}

// pack.ts ----------------------------------------------------------------------------

function setupShader() {
    configure();

    Gbuffer.setup();
    Bloom.setup(Gbuffer.solid.albedoTexture, Gbuffer.solid.albedoTextureName());

    setupFinalPass();
}