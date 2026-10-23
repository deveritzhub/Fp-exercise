/**
 * AI-generated demonstration videos (Higgsfield / Kling 3.0) for central-library exercises.
 * Approved in style by the product owner; each still needs clinical approval per practice in the app.
 * See docs/VIDEOS.md.
 */
const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/';

export const LIBRARY_VIDEOS: Array<{ exercise?: string; sourceKeys?: string[]; file: string }> = [
  { exercise: 'Bekkenbrug', file: 'hf_20261022_164233_0ae541b1-201c-4311-8ee0-fa123b298af1.mp4' },
  { exercise: 'Kinintrekking', file: 'hf_20261022_171151_e59bc937-f7d9-4735-9bb6-b879a03b1786.mp4' },
  { exercise: 'Kat-koe', file: 'hf_20261022_171151_1b6d0976-a02a-41b4-9645-e4587750913e.mp4' },
  { exercise: 'Viervoetsstand diagonaal (bird dog)', file: 'hf_20261022_171151_1cef99a6-add4-4392-842c-8325a51c9102.mp4' },
  { exercise: 'Dead bug', file: 'hf_20261022_171152_0660f6e6-4cee-409d-9aef-bc54ee9af128.mp4' },
  { exercise: 'Zijplank op knieën', file: 'hf_20261022_171151_72c2f428-abee-4a2d-ae62-da90ef144fd4.mp4' },
  { exercise: 'Schelp met weerstandsband', file: 'hf_20261022_171151_16d68011-0dc0-4dda-ad29-159baf5b0071.mp4' },
  { exercise: 'Heupabductie in zijlig', file: 'hf_20261022_171151_3faff468-01c2-4fe7-ae89-6d6fd79d6400.mp4' },
  { exercise: 'Squat naar stoel', file: 'hf_20261022_171151_782983ff-1c52-426d-9561-92af3501e00f.mp4' },
  { exercise: 'Muurzit', file: 'hf_20261022_171151_6ae28759-2731-494d-a22c-eae75f6e0aac.mp4' },
  { exercise: 'Hielheffen staand', file: 'hf_20261022_171151_5ae8e4b5-1bb2-4f96-a5ac-8bd2d8d4bd2c.mp4' },
  { exercise: 'Eenbeensstand', file: 'hf_20261022_171151_26107ea4-c345-42b9-afff-539b258dbe79.mp4' },
  { exercise: 'Opstappen', file: 'hf_20261022_171152_7b16c0a5-7515-4cc2-bd13-eb548fbd76c2.mp4' },
  // Batch 2 (2026-10-23): mainly the practice's own FP library (linked by source key). Not yet clinically checked.
  { sourceKeys: ['ex_kniebuiging_muur'], file: 'hf_20261023_105522_58b999b7-66cd-4a40-92b1-7abc566be8b8.mp4' },
  { sourceKeys: ['ex_band_external_rotation'], file: 'hf_20261023_105525_fe941100-86db-4558-bbe5-2bc677f71fa5.mp4' },
  { exercise: 'Open boek', sourceKeys: ['ex_thoracic_rotatie'], file: 'hf_20261023_105524_071c25b2-89dd-4793-89a3-7d572cb367a2.mp4' },
  { sourceKeys: ['ex_scapular_retraction'], file: 'hf_20261023_105522_ca3ae2da-b75a-481f-acd9-cb88e63dcf74.mp4' },
  { sourceKeys: ['mb_deep_squat_hold'], file: 'hf_20261023_105523_3aff1ffc-c853-4b8f-8930-5b8ea9d258aa.mp4' },
  { sourceKeys: ['ex_nordic_hamstring'], file: 'hf_20261023_105523_9c2afc44-366b-421b-a1c0-8426a9c02f9c.mp4' },
  { exercise: 'Eenbenige Roemeense deadlift', sourceKeys: ['ex_single_leg_rdl'], file: 'hf_20261023_105524_b8092411-ae64-41f1-bd51-32873f33f876.mp4' },
  { sourceKeys: ['nd_median_slider'], file: 'hf_20261023_105523_ab6cecf9-d068-4282-9716-1626ed705b03.mp4' },
  { sourceKeys: ['mb_doorway_pec'], file: 'hf_20261023_105525_8416ce1a-f736-45c3-84da-825e6aafe820.mp4' },
  { exercise: 'Zittend hielheffen (soleus)', file: 'hf_20261023_105524_db421f11-e8c5-45ef-8c47-b98b06bd1527.mp4' },
  { exercise: 'Eenbenige bekkenbrug', file: 'hf_20261023_105524_fa00b9bd-f313-496c-80de-4e6e7a8337fa.mp4' },
  { exercise: 'Roeien met weerstandsband', file: 'hf_20261023_105524_7f149475-045d-41e9-bfd3-40e98765bc8a.mp4' },
].map((v) => ({ ...v, file: BASE + v.file }));
