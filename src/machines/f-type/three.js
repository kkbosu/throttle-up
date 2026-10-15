// F-TYPE: 3D renderer hooks (plume, particles, thermal lens, flame light, tracers).
import { jetEmit, jetFlame, jetFlowSpeed, jetInner, jetPlume, jetThFh, jetThermal } from '../shared/jet3d.js';
import { state } from '../../core/state.js';

export default {
plume:(u,fl)=>jetPlume(u,fl,false),
emit:jetEmit,
thermal:jetThermal,
thFh:jetThFh,
thR:[5,4.5],
flame:jetFlame,
flap:()=>state.A*.05,
inner:jetInner,
flowSpeed:jetFlowSpeed,
flowSize:.011,
portrait:true,
burst:true,
};
