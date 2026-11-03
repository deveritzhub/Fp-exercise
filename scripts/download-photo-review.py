import re,pathlib,urllib.request,concurrent.futures
pathlib.Path('.local-photo-review').mkdir(exist_ok=True)
s=pathlib.Path('server/db/seed-data/hero-assets.ts').read_text(); avatars=dict(re.findall(r'"([^"]+)": "([^"]+)"',s.split('export const HERO_AVATAR_FILES')[1].split('};')[0]))
keys=['f_s5_average','f_s5_average_h2','f_s1_lean','f_s7_full_h4','m_s3_athletic','m_s9_full_h2','m_s1_lean_h3']
def get(k):
 p=pathlib.Path('.local-photo-review/'+k+'.png')
 if not p.exists():p.write_bytes(urllib.request.urlopen('https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/'+avatars[k],timeout=45).read())
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:list(ex.map(get,keys))

wear=dict(re.findall(r'"([^"]+)": "([^"]+)"',s.split('export const HERO_WEAR_FILES')[1].split('};')[0]))
more={**wear,'avatar':avatars['f_s5_average'],'champion':'hf_20261101_214510_ae6a1f39-67f3-4d58-93af-ea5710841378.png'}
for key,file in more.items():
 p=pathlib.Path('.local-photo-review')/(key+'.png')
 if not p.exists():p.write_bytes(urllib.request.urlopen('https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/'+file,timeout=45).read())
