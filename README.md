# gamenight

Spielesammlung PJE

## Datenstruktur

- Jedes Spiel liegt in einer eigenen Datei unter `json/games/` (z. B. `json/games/uno.json`).
- `json/games.catalog.json` enthält die vollständige Liste dieser Einzeldateien, die beim Start geladen und zusammengeführt werden.
- Die Daten enthalten ein `bgg`-Objekt mit BoardGameGeek-Status:
  - `found`: `true`/`false`
  - `url`: Link zum BGG-Eintrag (falls gefunden)
  - `note`: Hinweistext, wenn kein Eintrag gefunden wurde.
- Lokale Coverbilder liegen unter `images/` und werden in den Spielobjekten über `image` (z. B. `images/uno.svg`) referenziert.
