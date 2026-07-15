# Field Agent portraits

Drop the eight agent portraits here as **512×512 (or larger square) WebP or PNG**,
named exactly as below, then rebuild the pack:

    node build/gen-field-agents.mjs

The build auto-detects each file and wires it to the matching agent as both the
character-sheet portrait and the token image. Until a file is present, that agent
uses the neutral placeholder.

| File                    | Agent              | Profession                |
|-------------------------|--------------------|---------------------------|
| agent-operator.webp     | SITKA, MARCUS      | Special Operator          |
| agent-marine.webp       | HOLLOWAY, DIANA    | Force Recon Marine        |
| agent-fed.webp          | VANCE, THEODORE    | FBI Special Agent         |
| agent-detective.webp    | ROURKE, BERNADETTE | Homicide Detective        |
| agent-medic.webp        | ELLARD, JONAH      | Emergency Physician       |
| agent-intel.webp        | KAPLAN, SIMONE     | Intelligence Case Officer |
| agent-scientist.webp    | MERCER, ELLIOT     | Forensic Scientist        |
| agent-pilot.webp        | CALLOWAY, REGINA   | Contract Pilot            |

WebP is preferred (smaller). PNG also works — if you use PNG, change the
extension in `build/gen-field-agents.mjs` (`assets/tokens/${a.token}.webp`).
