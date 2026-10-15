// SR-71 J58: 3D renderer hooks (plume, particles, thermal lens, flame light, tracers).
import { jetEmit, jetFlame, jetFlowSpeed, jetInner, jetPlume, jetThFh, jetThermal } from '../shared/jet3d.js';

export default {
plume:(u,fl)=>jetPlume(u,fl,true),
emit:jetEmit,
thermal:jetThermal,
thFh:jetThFh,
thR:[5,4.5],
flame:jetFlame,
inner:jetInner,
flowSpeed:jetFlowSpeed,
flowSize:.011,
portrait:true,
burst:true,
};
