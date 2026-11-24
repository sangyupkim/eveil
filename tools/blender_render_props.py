# 옛 Blender 소품 파일을 낱개로 렌더 (재질 다시 입힘 · 투명 배경). 사용: <bpy 파이썬> tools/blender_render_props.py -- <파일.blend> <출력 폴더>  (pip install bpy)
import bpy, sys, os, math
f, outdir = sys.argv[-2], sys.argv[-1]
D=os.path.dirname(f)
bpy.ops.wm.open_mainfile(filepath=f)
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=48
sc.render.film_transparent=True; sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'
sc.render.resolution_percentage=200
def mat(name, img, rough=0.9):
  m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; b=nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value=rough
  if img and os.path.exists(os.path.join(D,img)):
    t=nt.nodes.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(os.path.join(D,img)); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
  return m
M={'Cave':mat('Cave2','461223183.jpg'),'CaveFade':mat('CaveFade2','461223183.jpg'),'shroom':mat('Shroom2','shroom_color.png',0.6)}
for o in bpy.data.objects:
  if o.type!='MESH': continue
  if not o.data.uv_layers:
    bpy.context.view_layer.objects.active=o; o.select_set(True)
  for i,m in enumerate(o.data.materials):
    n=(m.name if m else '').lower()
    if 'shadow' in n: continue
    o.data.materials[i] = M['shroom'] if 'shroom' in n or 'shroom' in o.name.lower() else M['CaveFade'] if 'fade' in n else M['Cave']
for l in [o for o in bpy.data.objects if o.type=='LIGHT']: bpy.data.objects.remove(l)
sun=bpy.data.lights.new('sun','SUN'); sun.energy=3.5; so=bpy.data.objects.new('sun',sun); sc.collection.objects.link(so); so.rotation_euler=(math.radians(45),0,math.radians(-35))
fill=bpy.data.lights.new('fill','SUN'); fill.energy=1.0; fo=bpy.data.objects.new('fill',fill); sc.collection.objects.link(fo); fo.rotation_euler=(math.radians(60),0,math.radians(140))
sc.world.color=(0.25,0.25,0.28) if sc.world else None
cam=sc.camera; base=cam.location.copy()
objs=[o for o in bpy.data.objects if o.type=='MESH' and o.name!='Plane' and 'floor' not in o.name.lower()]
ref=min(objs,key=lambda o:abs(o.location.x)+abs(o.location.y))
for o in bpy.data.objects:
  if o.type=='MESH' and (o.name=='Plane' or 'floor' in o.name.lower()): o.hide_render=True
for o in objs:
  for p in objs: p.hide_render=(p is not o)
  cam.location = base + (o.location - ref.location)
  sc.render.filepath=os.path.join(outdir, os.path.basename(f).replace('.blend','')+'__'+o.name+'.png'); bpy.ops.render.render(write_still=True)
