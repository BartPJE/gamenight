# gamenight

Spielesammlung PJE

## Datenstruktur

- Die Spiele sind jetzt in mehrere JSON-Dateien unter `json/` aufgeteilt (`games-board.json`, `games-card.json`, `games-video.json`, `games-role.json`).
- `json/games.catalog.json` enthält die Liste der JSON-Dateien, die beim Start geladen und zusammengeführt werden.
- Lokale Coverbilder liegen unter `images/` und werden in den Spielobjekten über `image` (z. B. `images/uno.svg`) referenziert.
