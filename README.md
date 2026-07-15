# Delta Green 2 — Modified System for Foundry VTT

A modified fork of the official _Delta Green: The Role-Playing Game_ Foundry VTT system (v1.7.0 base), focused on GM automation at the table. Maintained at [slaguru666/DeltaGreen2](https://github.com/slaguru666/DeltaGreen2); not affiliated with the upstream project.

## What Delta Green 2 adds

- **Readable roll cards** — percentile rolls get clear CRITICAL SUCCESS / SUCCESS / FAILURE / CRITICAL FAILURE banners with icons and a margin-of-success line ("made it by 23"), instead of colour-only text.
- **Apply Damage buttons** — damage and lethality chat cards apply their result to targeted or selected tokens with one click. Equipped armor protection (reduced by the weapon's Armor Piercing) is subtracted automatically, and the GM gets a whispered summary of the math.
- **Apply Lethality** — a successful lethality roll offers a one-click "reduce target to 0 HP" button.
- **Sanity application** — SAN damage cards offer success/failure apply buttons. The GM is whispered alerts for temporary insanity (5+ SAN in one hit), breaking-point crossings, and 0 SAN.
- **Ammo tracking** — weapon ammo is numeric with a magazine capacity; attack rolls expend a round, the Equipment tab shows an ammo column with a reload control, and the chat card shows remaining rounds / out-of-ammo warnings. Toggleable via the Automation settings (on by default).
- **Offline reliability** — the live Google Fonts imports were removed; the system now uses only bundled fonts.

Install by pointing Foundry at this repo, or copy the folder into `Data/systems/deltagreen2`. The system id is `deltagreen2`, so it installs alongside the original without conflict.

---

# Original README: _Delta Green: The Role-Playing Game_ System for Foundry VTT

Officially supported rules implementation for [Delta Green: The Role-Playing Game](https://www.deltagreen.com), based on the _Agent's Handbook_ rule set from Arc Dream Publishing, for [Foundry Virtual Tabletop](https://foundryvtt.com/).

> ## Disclaimers
>
> ### Delta Green Community License
>
> Published by Arc Dream Publishing by arrangement with the Delta Green Partnership. The intellectual property known as Delta Green is a trademark and copyright owned by the Delta Green Parternship, who has licensed its use here.
>
> The contents of this system are licensed under the terms of the included [license](LICENSE.txt) file, excepting those elements that are components of the Delta Green intellectual property.
>
> **Please support Arc Dream by purchasing one of their publications:**
>
> - [All publications](https://www.delta-green.com/publications/)
> - [Agent's Handbook (Hardback)](https://shop.arcdream.com/collections/role-playing-games/products/delta-green-agents-handbook)
> - [Agent's Handbook (PDF)](https://www.drivethrurpg.com/product/181674/Delta-Green-Agents-Handbook)
> - [Agent's Handbook (with _The Complex_) **for Foundry VTT**](https://www.drivethrurpg.com/product/181674/Delta-Green-Agents-Handbook)
>
> ---
>
> ### Foundry VTT License
>
> This code uses the Foundry VTT and its API under the terms of the Limited License Agreement for Module Development.
>
> Foundry VTT is a Copyright of Foundry Gaming, LLC.

## Installation Guide

The system is included in the list of official Foundry VTT game systems, and as such can be installed directly from within Foundry.

If there is a need to manually install the system, go to _Game Systems_ and click _Install System_. Then in the _Manifest URL_ input field, paste the following link. Finally, click _Install_:

<https://github.com/deltagreen-foundryvtt/delta-green-foundry-vtt-system/releases/latest/download/system.json>

## System Documentation

You may find documentation for the system in [this folder](https://github.com/TheLastScrub/delta-green-foundry-vtt-system/blob/master/documentation/home.md).
