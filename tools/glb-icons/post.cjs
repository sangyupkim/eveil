// 찍은 그림 → 64칸 아이콘: 45도로 기울여(머리가 오른쪽 위) 칸에 맞추고, 밝히고, 옅은 테두리
const s=require('/home/user/eveil/node_modules/sharp'),fs=require('fs');const O=process.argv[2],OUT=process.argv[3];fs.mkdirSync(OUT,{recursive:true});
// 알파로 실제 그림 테두리만 잘라낸다 (trim은 배경 판단이 어긋날 때가 있어서)
const crop=async(buf)=>{const {data,info}=await s(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});let L=info.width,T=info.height,R=-1,B=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>24){if(x<L)L=x;if(x>R)R=x;if(y<T)T=y;if(y>B)B=y}
 return s(buf).extract({left:L,top:T,width:R-L+1,height:B-T+1}).png().toBuffer({resolveWithObject:true});};
// 머리(칼끝 · 도끼날)가 오른쪽 위로: 좌우 뒤집기(flop) · 돌리기(rot)
const FIX={elven_leaf_blade:{flop:1},jeweled_dagger:{flop:1},katana:{flop:1},orcish_cleaver:{flop:1},hunting_spear:{flop:1},wizards_staff:{flop:1},spiked_mace:{flop:1},duelists_rapier:{flop:1},giants_maul:{flop:1},highland_claymore:{rot:180,flop:1},knights_longsword:{rot:225},reapers_scythe:{rot:45}};
(async()=>{for(const x of fs.readdirSync(O).filter(x=>x.endsWith('.png'))){const n=x.replace('.png','');
 let t=await crop(await s(O+'/'+x).png().toBuffer());
 const F=FIX[n]||{}; let r=t.data; if(F.flop) r=await s(r).flop().png().toBuffer(); if(F.rot) r=await s(r).rotate(F.rot,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(); r=(await crop(r)).data; r=await s(r).modulate({brightness:1.2,saturation:1.08}).png().toBuffer();
 r=await s(r).resize(56,56,{fit:'contain',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'}).extend({top:4,bottom:4,left:4,right:4,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
 // 테두리: 알파를 번지게 한 옅은 금빛 그림자
 const a=await s(r).extractChannel('alpha').blur(0.8).linear(1.4,0).toBuffer();
 const glow=await s({create:{width:64,height:64,channels:3,background:{r:40,g:30,b:20}}}).joinChannel(a).png().toBuffer();
 const g2=await s(glow).ensureAlpha(0.55).png().toBuffer();
 await s({create:{width:64,height:64,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:glow,blend:'over'},{input:r}]).png().toFile(OUT+'/'+x);}})()
