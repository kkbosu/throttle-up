// The postprocessing addons the composite pass uses (the same modules core/loader3d.js fetches).
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const X = { EffectComposer, ShaderPass, UnrealBloomPass, OutputPass };
