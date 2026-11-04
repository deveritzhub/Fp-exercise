"""Offline geometry extraction from the fixed, generated asset catalog; never patient photos.
Requires mediapipe, opencv and numpy plus official MediaPipe pose/selfie models.
Usage: python scripts/measure-photo-fit.py --pose-model PATH --hair-model PATH
Download the catalog first with download-photo-review.py --all.
Only normalized geometry is exported; no models or image processing run in the app.
"""
import argparse, json, pathlib, re
import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import vision

args=argparse.ArgumentParser()
args.add_argument('--pose-model',required=True)
args.add_argument('--hair-model',required=True)
args=args.parse_args()
cache=pathlib.Path('.local-photo-review')
output=pathlib.Path('web/src/components/hero/photoFitProfiles.json')
profiles={}
if output.exists(): profiles=json.loads(output.read_text())

def contour_path(mask):
    mask=cv2.resize(mask.astype(np.uint8),(750,1000),interpolation=cv2.INTER_NEAREST)
    contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    paths=[]
    for c in contours:
        if cv2.contourArea(c)<30: continue
        c=cv2.approxPolyDP(c,1.3,True).reshape(-1,2)
        coords=[f'{round(float(x)*1000/750,1)},{round(float(y)*1333.33/1000,1)}' for x,y in c]
        paths.append('M'+' L'.join(coords)+'Z')
    return ' '.join(paths)

with vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=args.pose_model),
    output_segmentation_masks=True)) as model, vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=args.hair_model),
    output_category_mask=True,output_confidence_masks=False)) as hair_model:
    files=[p for p in sorted(cache.glob('*.png')) if re.fullmatch(r'[fm]_s[13579]_(?:lean|average|athletic|muscular|soft|full)(?:_h[234]|__(?:tracksuit|team_kit|champion))?',p.stem)]
    for i,p in enumerate(files):
        if p.stem in profiles: continue
        a=cv2.imread(str(p))
        image=mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(a,cv2.COLOR_BGR2RGB))
        r=model.detect(image)
        if not r.pose_landmarks: raise ValueError('No pose: '+p.stem)
        landmarks=r.pose_landmarks[0]
        hair=hair_model.segment(image).category_mask.numpy_view()
        profiles[p.stem]={
            'points':[[round(v.x,5),round(v.y,5)] for v in landmarks],
            'silhouette':contour_path(r.segmentation_masks[0].numpy_view()>.5),
            'hair':contour_path(hair==1),
        }
        if i%20==0: print(i,len(files),p.stem,flush=True)
        output.write_text(json.dumps(profiles,separators=(',',':'))+'\n')
print('Profiles:',len(profiles))

# Outline measurements supplement joint landmarks for bald heads and turned-out feet.
for profile in profiles.values():
    contour=np.array([[float(x),float(y)] for x,y in re.findall(r'([\d.]+),([\d.]+)',profile['silhouette'])])
    contour[:,0]/=1000
    contour[:,1]/=1333.33
    profile['headTop']=round(float(contour[:,1].min()),5)
    points=profile['points']
    centre=(points[23][0]+points[24][0])/2
    profile['feet']=[]
    for mirror in [False,True]:
        ankle=points[27 if mirror else 28]
        foot=contour[(contour[:,1]>=ankle[1]-.023)&((contour[:,0]>=centre) if mirror else (contour[:,0]<centre))]
        x0,y0=foot.min(axis=0);x1,y1=foot.max(axis=0)
        profile['feet'].append([round(float(v),5) for v in [(x0+x1)/2,ankle[1]-.023,x1-x0+.012,y1-ankle[1]+.028]])
output.write_text(json.dumps(profiles,separators=(',',':'))+'\n')
