#version 450 

// =======================
// VARIABLES
// =======================
layout (location = 0) in vec2 ex_UV;
layout (location = 1) in vec4 ex_color;

layout (location = 0) out vec4 out_frag;

layout (binding = 0) uniform sampler2D texDiffuse; // screen display texture
layout (binding = 1) uniform RSDKBuffer {
    vec2 pixelSize;   // internal game resolution (usually 424x240 or smth)
    vec2 textureSize; // size of the internal framebuffer texture
    vec2 viewSize;    // window viewport size
#if RETRO_REV02  // if RETRO_REV02 is defined it assumes the engine is plus/rev02 RSDKv5, else it assumes pre-plus/Rev01 RSDKv5
    float screenDim; // screen dimming percent
#endif
};


// =======================
// DEFINITIONS
// =======================
#define viewSizeHD  720.0                    // how tall viewSize.y has to be before it simulates the dimming effect
#define intencity   vec3(1.2, 0.9, 0.9)   // how much to "dim" the screen when simulating a CRT effect
#define brightness  1.25                    // the brightness multipler of the colors

// In GLSL results are undefined if x < 0 (yet it works fine with OpenGL...).
// This hack is enough to make the shader work correctly on Vulkan.
#define pow(x,y) pow(abs(x),(y))

void main()
{
    vec2 texelPos = (textureSize.xy / pixelSize.xy) * ex_UV.xy;
    vec4 size     = (pixelSize.xy / textureSize.xy).xyxy * texelPos.xyxy;
    vec2 exp      = size.zw * textureSize.xy + -floor(size.zw * textureSize.xy) + -0.5;

    vec4 factor  = pow(vec4(2.0), pow(-exp.x + vec4(-1.0, 1.0, -2.0, 2.0), vec4(2.0)) * -3.0);
    float  factor2 = pow(2, pow(exp.x, 2) * -3); // used for the same stuff as 'factor', just doesn't fit in a vec4 :)

    vec3 power;
    power.x = pow(2, pow(exp.y, 2) * -8);
    power.y = pow(2, pow(-exp.y + -1, 2) * -8);
    power.z = pow(2, pow(-exp.y + 1, 2) * -8);

    vec2 viewPos      = floor(texelPos.xy * viewSize.xy) + 0.5;
    float intencityPos  = fract((viewPos.y * 3.0 + viewPos.x) * 0.166667);

    vec4 scanlineIntencity;
    if (intencityPos < 0.333)
        scanlineIntencity.rgb = intencity.xyz;
    else if (intencityPos < 0.666)
        scanlineIntencity.rgb = intencity.zxy;
    else
        scanlineIntencity.rgb = intencity.yzx;

    vec3 color1  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + vec2( 1, -1))   + 0.5)      / textureSize.xy).rgb * factor.y * brightness;
    vec3 color2  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + vec2(-2,  0))   + 0.5)      / textureSize.xy).rgb * factor.z * brightness;
    vec3 color3  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + vec2(-1,  0))   + 0.5)      / textureSize.xy).rgb * factor.x * brightness;
    vec3 color4  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + vec2( 1,  0))   + 0.5)      / textureSize.xy).rgb * factor.y * brightness;
    vec3 color5  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + 0)              + 0.5)      / textureSize.xy).rgb * factor2  * brightness;
    vec3 color6  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + vec2(-1,  1))   + 0.5)      / textureSize.xy).rgb * factor.x * brightness;
    vec3 color7  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + vec2( 2,  0))   + 0.5)      / textureSize.xy).rgb * factor.w * brightness;
    vec3 color8  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + -1)             + 0.5)      / textureSize.xy).rgb * factor.x * brightness;
    vec3 color9  = texture(texDiffuse, (floor(size.zw * textureSize.xy   + vec2( 0, -1))   + 0.5)      / textureSize.xy).rgb * factor2  * brightness;
    vec3 color10 = texture(texDiffuse, (floor(size.zw * textureSize.xy   + 1)              + 0.5)      / textureSize.xy).rgb * factor.y * brightness;
    vec3 color11 = texture(texDiffuse, (floor(size.xy * textureSize.xy   + vec2( 0,  1))   + 0.5)      / textureSize.xy).rgb * factor2  * brightness;

    vec3 final = 
        power.x * (color2 + color3 + color4 + color5 + color7) / (factor.z + factor.x + factor.y + factor2 + factor.w) +
        power.y * (color1 + color8 + color9)                   / (factor.y + factor.x + factor2)                       +
        power.z * (color10 + color6 + color11)                 / (factor.y + factor.x + factor2);

    out_frag.rgb = viewSizeHD < viewSize.y ? (scanlineIntencity.rgb * final.rgb) : final.rgb;
    out_frag.a = 1.0;
    
#if defined(RETRO_REV02) 
	out_frag *= screenDim;
#endif
}