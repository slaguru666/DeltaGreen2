# Field Agent portraits

Drop the eight agent portraits here as **512×512 (or larger square) WebP or PNG**,
named exactly as below, then rebuild the pack:

    node build/gen-field-agents.mjs

The build auto-detects each file and wires it to the matching agent as both the
character-sheet portrait and the token image. Until a file is present, that agent
uses the neutral placeholder.

| File                    | Agent              | Profession                |
|-------------------------|--------------------|---------------------------|
| agent-operator.png     | SITKA, MARCUS      | Special Operator          |
| agent-marine.png       | HOLLOWAY, DIANA    | Force Recon Marine        |
| agent-fed.png          | VANCE, THEODORE    | FBI Special Agent         |
| agent-detective.png    | ROURKE, BERNADETTE | Homicide Detective        |
| agent-medic.png        | ELLARD, JONAH      | Emergency Physician       |
| agent-intel.png        | KAPLAN, SIMONE     | Intelligence Case Officer |
| agent-scientist.png    | MERCER, ELLIOT     | Forensic Scientist        |
| agent-pilot.png        | CALLOWAY, REGINA   | Contract Pilot            |

PNG is used here (sips could not emit WebP). If you switch to WebP, change the
extension in `build/gen-field-agents.mjs`.
