# Exercise videos

The 13 clips below are **clinically approved** dynamic remakes (Grok, 2026-11-01). They are the live
source for the central library. The files ship in the repo at `server/db/seed-data/library-videos/`
and are listed in `server/db/seed-data/videos.ts`.

On start, `server/db/import-videos.ts` copies those files into private storage — a host with an
ephemeral disk (Render free) refills from the deploy artifact, with no CDN — and **replaces**
`exercises.video_media_id` on the matching central exercise. Practice copies matched by `sourceKeys`
are updated the same way. A practice can still show its own file via "Video van je praktijk"
(`exercise_media_overrides` on a central exercise); that override takes precedence in the app.

| Exercise (`name_nl`) | Seed file | Clinical | In the app |
|---|---|---|---|
| Bekkenbrug | `bekkenbrug.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Kinintrekking | `kinintrekking.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Kat-koe | `kat-koe.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Viervoetsstand diagonaal (bird dog) | `bird-dog.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Dead bug | `deadbug.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Zijplank op knieën | `zijplank.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Schelp met weerstandsband | `schelp.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Heupabductie in zijlig | `heupabductie.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Squat naar stoel | `squat-stoel.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Muurzit | `muurzit.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Hielheffen staand | `hielheffen.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Eenbeensstand | `eenbeensstand.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |
| Opstappen | `opstappen.mp4` | ✅ clinically approved 2026-11-01 (dynamic Grok remake) | ✅ seeded |

## Seedance 2.0 clips (2026-11-01) — live

Text-to-video with Seedance 2.0 via Higgsfield (720p std, 12 s, side view, same male instructor in
olive sportswear, 2 reps, no sound). The squat was approved by the practice owner before the other two
were made. They hang on **practice-library** exercises (by source key) and are listed in
`SEEDANCE_VIDEOS` in `server/db/seed-data/videos.ts`. The host downloads each once into private
storage after the library import. The bodyweight squat and forward lunge were added to the library
for this (bundle `fp-videos-v1.json`).

| Exercise | Source key | Video |
|---|---|---|
| Squat met lichaamsgewicht | `kr_bodyweight_squat` | [66bb90c8](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261101_100113_66bb90c8-b419-40c3-bca9-f798ef61c7ec.mp4) |
| Voorwaartse uitvalspas | `kr_forward_lunge` | [070fb383](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261101_115959_070fb383-fc07-42e3-bfc4-cfebe8547e4b.mp4) |
| Conventional deadlift | `kr_conventional_deadlift` | [397d6443](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261101_120000_397d6443-cce6-4150-a60d-9a89e6176ac1.mp4) |

## Deprecated — October 2026 Higgsfield / CloudFront clips

**Not the live source. Do not point `LIBRARY_VIDEOS` at these URLs.** They were the first
text-to-video batch (Kling 3.0 via Higgsfield: same woman, dark olive sportswear, beige mat,
static camera, 8 s, 2 slow reps, no sound). Most were clinically rejected. The Bekkenbrug clip
that the owner had approved is also replaced by the 2026-11-01 remake. Kept here only as an archive.

| Exercise (app name) | Old CloudFront file (deprecated) | Status |
|---|---|---|
| Bekkenbrug | [0ae541b1](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_164233_0ae541b1-201c-4311-8ee0-fa123b298af1.mp4) | superseded 2026-11-01 |
| Kinintrekking | [e59bc937](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_e59bc937-f7d9-4735-9bb6-b879a03b1786.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Kat-koe | [1b6d0976](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_1b6d0976-a02a-41b4-9645-e4587750913e.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Viervoetsstand diagonaal (bird dog) | [1cef99a6](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_1cef99a6-add4-4392-842c-8325a51c9102.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Dead bug | [0660f6e6](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171152_0660f6e6-4cee-409d-9aef-bc54ee9af128.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Zijplank op knieën | [72c2f428](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_72c2f428-abee-4a2d-ae62-da90ef144fd4.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Schelp met weerstandsband | [16d68011](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_16d68011-0dc0-4dda-ad29-159baf5b0071.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Heupabductie in zijlig | [3faff468](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_3faff468-01c2-4fe7-ae89-6d6fd79d6400.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Squat naar stoel | [782983ff](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_782983ff-1c52-426d-9561-92af3501e00f.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Muurzit | [6ae28759](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_6ae28759-2731-494d-a22c-eae75f6e0aac.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Hielheffen staand | [5ae8e4b5](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_5ae8e4b5-1bb2-4f96-a5ac-8bd2d8d4bd2c.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Eenbeensstand | [26107ea4](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171151_26107ea4-c345-42b9-afff-539b258dbe79.mp4) | ❌ afgekeurd, superseded 2026-11-01 |
| Opstappen | [7b16c0a5](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261022_171152_7b16c0a5-7515-4cc2-bd13-eb548fbd76c2.mp4) | ❌ afgekeurd, superseded 2026-11-01 |

## Batch 2 (2026-10-23) — AFGEKEURD, niet gebruikt

Tekst-naar-video (Kling 3.0, zonder geluid, 168 credits). Door de praktijkeigenaar afgekeurd: de oefeningen werden niet correct uitgevoerd. Niet gekoppeld in de app. De CloudFront-links hieronder zijn archief en worden niet geïmporteerd. Conclusie: precieze oefenuitvoering lukt niet betrouwbaar met tekst-naar-video; gebruik eigen opnames ("Media beheren") of een andere aanpak.

| Oefening | Video (deprecated, not imported) | Status |
|---|---|---|
| Kniebuiging tegen muur (dorsaalflexie) — praktijk | [58b999b7](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105522_58b999b7-66cd-4a40-92b1-7abc566be8b8.mp4) | ❌ afgekeurd |
| Externe rotatie met band — praktijk (beide armen; niet gekoppeld aan centrale eenarmige variant) | [fe941100](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105525_fe941100-86db-4558-bbe5-2bc677f71fa5.mp4) | ❌ afgekeurd |
| Thoracale rotatie in zijligging — praktijk + centraal "Open boek" | [071c25b2](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105524_071c25b2-89dd-4793-89a3-7d572cb367a2.mp4) | ❌ afgekeurd |
| Schouderbladen samentrekken — praktijk | [ca3ae2da](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105522_ca3ae2da-b75a-481f-acd9-cb88e63dcf74.mp4) | ❌ afgekeurd |
| Diepe squat hold — praktijk | [3aff1ffc](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105523_3aff1ffc-c853-4b8f-8930-5b8ea9d258aa.mp4) | ❌ afgekeurd |
| Nordic hamstring — praktijk | [9c2afc44](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105523_9c2afc44-366b-421b-a1c0-8426a9c02f9c.mp4) | ❌ afgekeurd |
| Eenbenige romp-heup — praktijk + centraal "Eenbenige Roemeense deadlift" (video zonder gewicht) | [b8092411](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105524_b8092411-ae64-41f1-bd51-32873f33f876.mp4) | ❌ afgekeurd |
| Medianus slider — praktijk | [ab6cecf9](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105523_ab6cecf9-d068-4282-9716-1626ed705b03.mp4) | ❌ afgekeurd |
| Borstspier rek in deuropening — praktijk | [8416ce1a](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105525_8416ce1a-f736-45c3-84da-825e6aafe820.mp4) | ❌ afgekeurd |
| Zittend hielheffen (soleus) — centraal | [db421f11](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105524_db421f11-e8c5-45ef-8c47-b98b06bd1527.mp4) | ❌ afgekeurd |
| Eenbenige bekkenbrug — centraal | [fa00b9bd](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105524_fa00b9bd-f313-496c-80de-4e6e7a8337fa.mp4) | ❌ afgekeurd |
| Roeien met weerstandsband — centraal (video: band om de voeten; tekst: band vast voor je) | [7f149475](https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/hf_20261023_105524_7f149475-045d-41e9-bfd3-40e98765bc8a.mp4) | ❌ afgekeurd |

Rejected / not used: Seedance 2.5 glute bridge test (90b675b2-90b8-4bfb-b263-137f9a20b354).

## Check per video
- Correct end position and alignment (e.g. knees over feet, neutral spine where required)
- Matches the written instructions and the prescribed tempo (2 slow reps)
- No AI artefacts: extra/merging fingers, warping limbs, face changes, objects appearing
- Whole body visible, camera still
