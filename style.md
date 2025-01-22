# disclaimer

I have no experience in typescript before this project. My coding style is just based on the other languages I've used, and for convenience (e.g. globals are fine in my opionion since this is a pretty small codebase). Therefore, I don't have a particular style for the scripts in this project.

***

For shaders, I have the following naming conventions
- `camelCase` for all variables and functions (lenient)
- for defines that will be set from a script, use the `def_` prefix. For example, if the script will define an input texture, the shader will use `def_inputTexture`.
- for texture targets, use the `t_` prefix.
- for in & out variables in the gbuffer program, use the `v_` prefix.