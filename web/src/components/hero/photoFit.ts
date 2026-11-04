import profiles from './photoFitProfiles.json';

export type PhotoFit = { points: number[][]; silhouette: string; hair: string; headTop: number; feet: number[][] };
export type PhotoPlacement = { x:number; y:number; width:number; height:number; angle?:number };
export const photoFitProfiles = profiles as Record<string, PhotoFit>;
export const sourcePhotoKey = (source:string) => source.split('/').at(-1) ?? '';
export const photoFit = (source:string) => photoFitProfiles[sourcePhotoKey(source)];
export function identityAlignment(source:string,originalKey:string){
 const original=photoFit(originalKey),outfit=photoFit(source);
 if(!original || !outfit)return null;
 const a=original.points,b=outfit.points;
 const scale=Math.abs(b[7][0]-b[8][0])/Math.abs(a[7][0]-a[8][0]);
 const dx=((b[7][0]+b[8][0])-(a[7][0]+a[8][0])*scale)/2;
 const dy=((b[7][1]+b[8][1])-(a[7][1]+a[8][1])*scale)/2;
 return {scale,dx,dy};
}
const mix=(a:number[],b:number[],t:number)=>a.map((v,i)=>v+(b[i]-v)*t);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

// Intersect the measured silhouette at the garment height. Pick the limb nearest
// its pose landmark rather than scaling every limb from overall torso height.
export function limbSpan(fit:PhotoFit,y:number,x:number){
 const divider=(fit.points[25][0]+fit.points[26][0])/2;
 const vertices=Array.from(fit.silhouette.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g),m=>[Number(m[1])/1000,Number(m[2])/1333.33]);
 const cuts:number[]=[];
 for(let i=0;i<vertices.length;i++){
  const a=vertices[i],b=vertices[(i+1)%vertices.length];
  if((a[1]>y)!==(b[1]>y))cuts.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
 }
 cuts.sort((a,b)=>a-b);
 const spans=[];
 for(let i=0;i+1<cuts.length;i+=2){
  const left=x<divider?cuts[i]:Math.max(cuts[i],divider);
  const right=x<divider?Math.min(cuts[i+1],divider):cuts[i+1];
  if(right>left)spans.push({x:(left+right)/2,width:right-left});
 }
 return spans.sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
}

/** Measured anchors in each generated image. x is the item's centre, y its top. */
export function measuredPlacement(source:string,key:string,mirror:boolean,originalKey?:string):PhotoPlacement|null {
  const fit=photoFit(source);
  if(!fit)return null;
  const p=fit.points;
  const shoulders=mix(p[11],p[12],.5), hips=mix(p[23],p[24],.5);
  const shoulderWidth=Math.abs(p[11][0]-p[12][0]);
  const size=clamp((hips[1]-shoulders[1])/.253,.85,1.2);
  const eye=mix(p[2],p[5],.5), ears=mix(p[7],p[8],.5);
  const headScale=clamp(Math.abs(p[7][0]-p[8][0])/.087,.8,1.25);
  const heads:Record<string,number[]>={cap:[.028,.145,.067],visor:[.052,.155,.035],headband:[.068,.13,.018],crown:[.005,.17,.063],headphones:[.027,.18,.11]};
  if(heads[key]){
    const [y,w,h]=heads[key];
    const alignment=originalKey && source.includes('__') ? identityAlignment(source,originalKey) : null;
    const headTop=alignment ? photoFit(originalKey!)!.headTop*alignment.scale+alignment.dy : fit.headTop;
    if(key==='crown')return {x:ears[0],y:headTop-.042*headScale,width:w*headScale,height:h*headScale};
    return {x:ears[0],y:eye[1]+(y-.104)*headScale,width:w*headScale,height:h*headScale};
  }
  const wrist=p[mirror?15:16], fingers=mix(p[mirror?17:18],p[mirror?19:20],.5);
  const ankle=p[mirror?27:28];
  const knee=p[mirror?25:26], hip=p[mirror?23:24];
  switch(key){
    case 'gloves': return {x:(wrist[0]+fingers[0])*.5,y:wrist[1]-.007*size,width:.055*size,height:(fingers[1]-wrist[1])+.027*size};
    case 'watch': case 'wristbands': return {x:wrist[0],y:wrist[1]-.023*size,width:(key==='watch'?.041:.047)*size,height:(key==='watch'?.036:.027)*size};
    case 'gold_shoes': case 'balance_shoes': case 'spikes': {const [x,y,width,height]=fit.feet[mirror?1:0];return {x,y,width,height};}
    case 'crew_socks': {
      const y=ankle[1]-.075*size, height=.09*size;
      const t=(y+height/2-knee[1])/(ankle[1]-knee[1]);
      const axis=mix(knee,ankle,t), span=limbSpan(fit,y+height/2,axis[0]);
      const top=limbSpan(fit,y+.006,axis[0]);
      return {x:span?.x ?? axis[0],y,width:clamp(Math.max(span?.width ?? .052,top?.width ?? .052)*1.08,.045,.115),height};
    }
    case 'shin_guards': {const mid=mix(knee,ankle,.44);return {x:mid[0],y:knee[1]+.018*size,width:.066*size,height:(ankle[1]-knee[1])*.66};}
    case 'sleeve': {
      const height=(knee[1]-hip[1])*.66, y=knee[1]-height*.55;
      const span=limbSpan(fit,knee[1],knee[0]), top=limbSpan(fit,y+.008,knee[0]);
      return {x:knee[0],y,width:clamp(Math.max(span?.width ?? .095,Math.min(top?.width ?? .095,(span?.width ?? .095)*1.15))*1.02,.07,.18),height};
    }
    case 'belt': return {x:hips[0],y:hips[1]-.04*size,width:Math.abs(p[23][0]-p[24][0])*1.85,height:.033*size};
    case 'hr_band': return {x:shoulders[0],y:shoulders[1]+.065*size,width:shoulderWidth*1.12,height:.027*size};
    case 'captain': {const mid=mix(p[11],p[13],.42);return {x:mid[0],y:mid[1]-.01,width:.061*size,height:.034*size};}
    case 'pin': return {x:shoulders[0]+shoulderWidth*.25,y:shoulders[1]+.01,width:.035*size,height:.025*size};
    case 'scarf': case 'towel': case 'medal': return {x:shoulders[0],y:shoulders[1]-.044*size,width:({scarf:.15,towel:.18,medal:.12}[key]!)*size,height:({scarf:.14,towel:.19,medal:.12}[key]!)*size};
    case 'sport_item': return {x:p[19][0]+.024*size,y:p[19][1]-.012*size,width:.09*size,height:.075*size};
    case 'yoga_mat': return {x:p[11][0]+.035*size,y:shoulders[1]-.065*size,width:.17*size,height:.28*size};
    default:return null;
  }
}
