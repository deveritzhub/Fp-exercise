# MakeHuman source assets (CC0)

Selected, unmodified source files from the official CC0 packs:

- `system/`: [MakeHuman system assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html), archive `https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip`.
- `hair/`: [Hair pack 01](https://static.makehumancommunity.org/assets/assetpacks/hair01.html), archive `https://files.makehumancommunity.org/asset_packs/hair01/hair01_cc0.zip`.

Downloaded 8 November 2026. The pack pages explicitly list these assets as CC0. Original authors: MakeHuman team (system meshes), Cortu Johnstone (strawberry cloud / curly hair), RehmanPolanski (hair bun). Original source headers are retained. The bun MHCLO contains a legacy MakeClothes AGPL3 header; the official CC0 pack and its asset listing explicitly distribute this asset as CC0.

Licence: https://creativecommons.org/publicdomain/zero/1.0/

The generator fits these source meshes through `HumanService.add_mhclo_asset`, bakes the static pose, and creates colour-neutral strand textures. Buzz hair is a close-cropped derivative of short01 fitted to the head with a shrinkwrap modifier. Exported textures are 160px to keep each complete model below 2.5 MB gzip. The original high-resolution source files remain here for reproducibility.

The style study additionally uses `system/skins/young_caucasian_female/` from the same official
CC0 system archive, downloaded 13 November 2026. The original MHMAT includes the explicit September
2020 CC0 release. The generator neutralises its diffuse shading for the selectable skin tint.
The study's bun texture uses 256px; the skin shading uses 512px. Original source PNGs are preserved.

Approved-finish rollout (14 November 2026): the matching `young_caucasian_male` CC0 material and
source diffuse PNG are also included from the official system archive. Production skin shading
uses neutralised 448px maps; the original source files and release headers remain unmodified.
