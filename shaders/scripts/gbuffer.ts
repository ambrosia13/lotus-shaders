class GbufferTextures {
    prefix: string;
    usage: ProgramUsage;

    // RGBA8
    // r, g, b atlas texture u
    albedoTexture: BuiltTexture;
    // RGBA8
    // vertex normal x, y, z, atlas texture v
    normalTexture: BuiltTexture;
    // todo
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
            .target(2, this.materialTexture)
            .build();
    }
}

class Gbuffer {
    static solid: GbufferTextures;
    static translucent: GbufferTextures;
    static basic: GbufferTextures;

    static setup() {
        Gbuffer.solid = new GbufferTextures("solid", Usage.TERRAIN_SOLID);
        Gbuffer.translucent = new GbufferTextures("translucent", Usage.TERRAIN_TRANSLUCENT);
        Gbuffer.basic = new GbufferTextures("basic", Usage.BASIC);

        let solidShader = Gbuffer.solid.shader();
        let translucentShader = Gbuffer.translucent.shader();
        let basicShader = Gbuffer.basic.shader();

        registerShader(solidShader);
        registerShader(translucentShader);
        registerShader(basicShader);
    }
}