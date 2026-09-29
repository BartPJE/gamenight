const state = {
  category: "",
  qualityFields: new Set(),
  onlyIncomplete: false,
};

let games = [];
let unavailableImages = new Set();

const qualityFields = [
  ["image", "Coverbild", (game) => !game.image || unavailableImages.has(game.image)],
  ["description", "Beschreibung", (game) => !game.description?.trim()],
  ["rules", "Spielregeln", (game) => !game.rules],
  ["contents", "Spiel-Inhalte", (game) => !Array.isArray(game.contents) || !game.contents.length],
  ["publisher", "Verlag", (game) => !game.publisher?.trim()],
  ["year", "Erscheinungsjahr", (game) => !Number.isFinite(game.year)],
  ["rating", "Bewertung", (game) => !Number.isFinite(game.rating)],
  ["players", "Spieleranzahl", (game) => !Number.isFinite(game.playersMin) || !Number.isFinite(game.playersMax)],
  ["duration", "Spieldauer", (game) => !Number.isFinite(game.duration)],
  ["age", "Altersempfehlung", (game) => !Number.isFinite(game.age)],
  ["location", "Lagerort", (game) => !game.location?.trim()],
  ["bgg", "BoardGameGeek", (game) => !game.bgg?.found],
];

const $ = (id) => document.getElementById(id);

function badgeClass(type) {
  if (type === "Brettspiel") return "board";
  if (type === "Kartenspiel") return "card";
  if (type === "Computerspiel") return "video";
  return "role";
}

function renderCategories() {
  const types = ["", ...new Set(games.map((game) => game.type))];
  $("categoryChips").innerHTML = types
    .map(
      (type) =>
        `<button class="chip ${type === state.category ? "active" : ""}" data-category="${type}">${
          type || "Alle"
        }</button>`,
    )
    .join("");

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderCategories();
      renderGames();
    });
  });
}

function filteredGames() {
  const query = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value || state.category;
  const players = Number($("playersFilter").value || 0);
  const age = Number($("ageFilter").value || 0);
  const location = $("locationFilter").value;
  const sort = $("sortFilter").value;

  const list = games.filter((game) => {
    if (game.hiddenFromOverview) {
      return false;
    }

    const collectionTitle = game.collectionId
      ? (games.find((entry) => entry.id === game.collectionId)?.title ?? "")
      : "";
    const haystack = [
      game.title,
      game.type,
      game.publisher,
      game.platform,
      game.location,
      collectionTitle,
      ...game.tags,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !query || haystack.includes(query);
    const matchesType = !type || game.type === type;
    const matchesPlayers =
      !players ||
      (players === 6
        ? game.playersMax >= 6
        : game.playersMin <= players && game.playersMax >= players);
    const matchesAge = !age || game.age <= age;
    const matchesLocation = !location || game.location === location;
    return (
      matchesSearch &&
      matchesType &&
      matchesPlayers &&
      matchesAge &&
      matchesLocation
    );
  });

  list.sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "newest") return b.year - a.year;
    if (sort === "duration") return a.duration - b.duration;
    return a.title.localeCompare(b.title, "de");
  });

  return list;
}

function renderGames() {
  const list = filteredGames();

  $("gameCards").innerHTML = list
    .map((game) => {
      const linkedGameId = game.collectionId || game.id;
      const selectedGameParam = game.collectionId
        ? `?auswahl=${encodeURIComponent(game.id)}`
        : "";
      return `
        <a class="game-card" href="#spiel/${linkedGameId}${selectedGameParam}" aria-label="Details zu ${game.title}">
          <div class="cover">
            ${
              game.image
                ? `<img src="${game.image}" alt="Cover von ${game.title}" loading="lazy" />`
                : game.icon
            }
          </div>
          <div class="game-body">
            <div class="type-row">
              <span class="badge ${badgeClass(game.type)}">${game.type}</span>
              <span class="rating">★ ${game.rating.toFixed(1)}</span>
            </div>
            <h4>${game.title}</h4>
            <div class="facts">
              <div class="fact"><small>Spieler</small><b>${game.playersMin}-${game.playersMax}</b></div>
              <div class="fact"><small>Alter</small><b>ab ${game.age}</b></div>
              <div class="fact"><small>Dauer</small><b>${game.duration} Min.</b></div>
            </div>
            <div class="tags">
              <span class="tag">${game.platform}</span>
              <span class="tag">${game.location}</span>
              <span class="tag">${game.publisher}</span>
              ${game.bgg?.found ? '<span class="tag">BGG</span>' : '<span class="tag">BGG: Nicht gefunden</span>'}
              ${
                game.collectionId
                  ? `<span class="tag">Sammlung: ${games.find((entry) => entry.id === game.collectionId)?.title ?? "Unbekannt"}</span>`
                  : ""
              }
              ${game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>
          </div>
        </a>
      `;
    })
    .join("");

  $("emptyState").style.display = list.length ? "none" : "block";
  $("resultInfo").textContent =
    `${list.length} von ${games.length} Spielen werden angezeigt.`;
}

function renderStats() {
  $("statTotal").textContent = games.length;
  $("statTypes").textContent = new Set(games.map((game) => game.type)).size;
  $("statFavs").textContent = games.filter((game) => game.favorite).length;
  $("lastAdded").textContent = games.toSorted(
    (a, b) => b.year - a.year,
  )[0].title;
  $("topRated").textContent = games.toSorted(
    (a, b) => b.rating - a.rating,
  )[0].title;
  $("soloCount").textContent = games.filter(
    (game) => game.playersMin === 1,
  ).length;
}

function missingFields(game) {
  return qualityFields
    .filter(([, , isMissing]) => isMissing(game))
    .map(([id, label]) => ({ id, label }));
}

function renderQualityFilters() {
  const counts = Object.fromEntries(
    qualityFields.map(([id, , isMissing]) => [
      id,
      games.filter((game) => isMissing(game)).length,
    ]),
  );

  $("qualityFilters").innerHTML = qualityFields
    .map(
      ([id, label]) => `
        <label class="quality-filter">
          <span><input type="checkbox" data-quality-field="${id}" ${state.qualityFields.has(id) ? "checked" : ""} /> ${label}</span>
          <b>${counts[id]}</b>
        </label>`,
    )
    .join("");

  document.querySelectorAll("[data-quality-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const { qualityField } = input.dataset;
      if (input.checked) state.qualityFields.add(qualityField);
      else state.qualityFields.delete(qualityField);
      renderQualityFilters();
      renderQualityResults();
    });
  });
}

function filteredQualityGames() {
  const query = $("qualitySearch").value.trim().toLowerCase();
  return games
    .map((game) => ({ game, missing: missingFields(game) }))
    .filter(({ game, missing }) => {
      const matchesQuery = !query || [game.title, game.type, game.publisher]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const matchesIncomplete = !state.onlyIncomplete || missing.length > 0;
      const matchesFields = !state.qualityFields.size || missing.some(({ id }) => state.qualityFields.has(id));
      return matchesQuery && matchesIncomplete && matchesFields;
    })
    .toSorted((a, b) => a.game.title.localeCompare(b.game.title, "de"));
}

function renderQualityResults() {
  const list = filteredQualityGames();
  const incomplete = games.filter((game) => missingFields(game).length > 0);
  const ratedGames = games.filter((game) => Number.isFinite(game.rating));
  const averageRating = ratedGames.length
    ? ratedGames.reduce((sum, game) => sum + game.rating, 0) / ratedGames.length
    : null;

  $("qualityTotal").textContent = games.length;
  $("qualityComplete").textContent = games.length - incomplete.length;
  $("qualityIncomplete").textContent = incomplete.length;
  $("qualityRating").textContent = averageRating ? averageRating.toFixed(1) : "–";
  $("onlyIncomplete").checked = state.onlyIncomplete;

  const activeFilters = [...state.qualityFields]
    .map((id) => qualityFields.find(([fieldId]) => fieldId === id)?.[1])
    .filter(Boolean);
  $("missingSummary").innerHTML = activeFilters.length
    ? activeFilters.map((label) => `<span class="tag">Fehlt: ${label}</span>`).join("")
    : '<span class="tag">Alle Angaben prüfen</span>';
  $("qualityResultInfo").textContent = `${list.length} von ${games.length} Spielen werden angezeigt.`;
  $("qualityRows").innerHTML = list
    .map(({ game, missing }) => `
      <tr>
        <td><div class="quality-game"><span class="quality-cover">${game.image ? `<img src="${game.image}" alt="" loading="lazy" />` : game.icon || "🎲"}</span><span>${game.title}</span></div></td>
        <td><span class="badge ${badgeClass(game.type)}">${game.type || "–"}</span></td>
        <td>${missing.length ? `<div class="missing-tags">${missing.map(({ label }) => `<span class="missing-tag">${label}</span>`).join("")}</div>` : '<span class="complete">✓ Vollständig</span>'}</td>
        <td><a class="quality-link" href="#spiel/${encodeURIComponent(game.collectionId || game.id)}${game.collectionId ? `?auswahl=${encodeURIComponent(game.id)}` : ""}">Öffnen</a></td>
      </tr>`,
    )
    .join("");
  $("qualityEmpty").style.display = list.length ? "none" : "block";
}

async function checkImageAvailability() {
  const imagePaths = [...new Set(games.map((game) => game.image).filter(Boolean))];
  const checks = await Promise.all(
    imagePaths.map(async (path) => {
      try {
        const response = await fetch(path, { method: "HEAD" });
        return response.ok ? null : path;
      } catch {
        return path;
      }
    }),
  );
  unavailableImages = new Set(checks.filter(Boolean));
  renderQualityFilters();
  renderQualityResults();
}

function focusSearch() {
  $("searchInput").focus();
}

function renderLocationFilter() {
  const locations = [...new Set(games.map((game) => game.location))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));

  const currentValue = $("locationFilter").value;
  $("locationFilter").innerHTML = [
    '<option value="">Lagerort</option>',
    ...locations.map(
      (location) => `<option value="${location}">${location}</option>`,
    ),
  ].join("");
  $("locationFilter").value = currentValue;
}

function resetFilters() {
  $("searchInput").value = "";
  $("typeFilter").value = "";
  $("playersFilter").value = "";
  $("ageFilter").value = "";
  $("locationFilter").value = "";
  $("sortFilter").value = "title";
  state.category = "";
  renderCategories();
  renderGames();
}

function renderDetailCard(game, options = {}) {
  const { title = game.title, subtitle = "", collectionLink = "" } = options;
  const gameContents =
    Array.isArray(game.contents) && game.contents.length
      ? game.contents
      : ["Keine Spiel-Inhalte hinterlegt."];

  return `
    <article class="detail-card">
      <div class="detail-cover">
        ${game.image ? `<img src="${game.image}" alt="Cover von ${game.title}" loading="lazy" />` : game.icon}
      </div>
      <div class="detail-body">
        <div class="type-row">
          <span class="badge ${badgeClass(game.type)}">${game.type}</span>
          <span class="rating">★ ${game.rating.toFixed(1)}</span>
        </div>
        <h3>${title}</h3>
        ${subtitle ? `<p class="detail-subtitle">${subtitle}</p>` : ""}
        <p class="desc">${game.description}</p>

        <div class="detail-facts">
          <div class="fact"><small>Spieleranzahl</small><b>${game.playersMin}-${game.playersMax}</b></div>
          <div class="fact"><small>Empfohlenes Alter</small><b>ab ${game.age}</b></div>
          <div class="fact"><small>Spieldauer</small><b>${game.duration} Min.</b></div>
          <div class="fact"><small>Erscheinungsjahr</small><b>${game.year}</b></div>
          <div class="fact"><small>Verlag</small><b>${game.publisher}</b></div>
          <div class="fact"><small>Lagerort</small><b>${game.location}</b></div>
        </div>

        <div class="detail-section">
          <h4>Spiel-Inhalte</h4>
          <ul class="content-list">
            ${gameContents.map((content) => `<li>${content}</li>`).join("")}
          </ul>
        </div>

        <div class="tags">
          <span class="tag">${game.platform}</span>
          <span class="tag">${game.location}</span>
          ${game.favorite ? '<span class="tag">Favorit</span>' : ""}
          ${
            game.bgg?.found
              ? `<span class="tag"><a href="${game.bgg.url}" target="_blank" rel="noopener noreferrer">BoardGameGeek</a></span>`
              : '<span class="tag">BGG: Nicht gefunden</span>'
          }
          ${collectionLink}
          ${game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderGameDetail(game, selectedGame) {
  if (!game) {
    $("detailContent").innerHTML = `
      <div class="detail-empty">
        <h3>Spiel nicht gefunden</h3>
        <p>Das gesuchte Spiel existiert nicht oder wurde aus dem Archiv entfernt.</p>
      </div>
    `;
    return;
  }

  const containedGames = games
    .filter((entry) => entry.collectionId === game.id)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      rating: entry.rating,
      image: entry.image,
      icon: entry.icon,
      year: entry.year,
      playersMin: entry.playersMin,
      playersMax: entry.playersMax,
    }))
    .toSorted((a, b) => a.title.localeCompare(b.title, "de"));

  const detailSections = [];

  detailSections.push(
    renderDetailCard(game, {
      title: game.title,
    }),
  );

  if (containedGames.length) {
    detailSections.push(`
      <section class="detail-section">
        <h4>Erweiterungen (${containedGames.length})</h4>
        <div class="detail-cards">
          ${containedGames
            .map(
              (entry) =>
                `<a class="game-card detail-game-card" href="#spiel/${game.id}?auswahl=${encodeURIComponent(entry.id)}" aria-label="Details zu ${entry.title}">
                  <div class="cover">
                    ${entry.image ? `<img src="${entry.image}" alt="Cover von ${entry.title}" loading="lazy" />` : entry.icon}
                  </div>
                  <div class="game-body">
                    <div class="type-row">
                      <span class="badge ${badgeClass(entry.type)}">${entry.type}</span>
                      <span class="rating">★ ${entry.rating.toFixed(1)}</span>
                    </div>
                    <h4>${entry.title}</h4>
                    <div class="facts">
                      <div class="fact"><small>Spieler</small><b>${entry.playersMin}-${entry.playersMax}</b></div>
                      <div class="fact"><small>Jahr</small><b>${entry.year}</b></div>
                      <div class="fact"><small>Typ</small><b>Erweiterung</b></div>
                    </div>
                  </div>
                </a>`,
            )
            .join("")}
        </div>
      </section>
    `);
  }

  if (selectedGame && selectedGame.id !== game.id) {
    detailSections.push(
      renderDetailCard(selectedGame, {
        title: `${selectedGame.title}`,
        subtitle: `Dieses Spiel gehört zur Sammlung ${game.title}.`,
        collectionLink: `<span class="tag"><a href="#spiel/${game.id}">Zur Sammlung</a></span>`,
      }),
    );
  }

  const activeGame =
    selectedGame && selectedGame.id !== game.id ? selectedGame : game;
  const sortedGames = games.toSorted((a, b) =>
    a.title.localeCompare(b.title, "de"),
  );
  const activeIndex = sortedGames.findIndex(
    (entry) => entry.id === activeGame.id,
  );

  const previousGame = activeIndex > 0 ? sortedGames[activeIndex - 1] : null;
  const nextGame =
    activeIndex >= 0 && activeIndex < sortedGames.length - 1
      ? sortedGames[activeIndex + 1]
      : null;

  const navigation = `
    <nav class="detail-pagination" aria-label="Spielnavigation">
      ${
        previousGame
          ? `<a class="btn secondary detail-nav-link" href="#spiel/${encodeURIComponent(previousGame.id)}">← Vorheriges Spiel: ${previousGame.title}</a>`
          : `<span class="btn secondary detail-nav-link disabled" aria-disabled="true">← Vorheriges Spiel</span>`
      }
      ${
        nextGame
          ? `<a class="btn secondary detail-nav-link" href="#spiel/${encodeURIComponent(nextGame.id)}">Nächstes Spiel: ${nextGame.title} →</a>`
          : `<span class="btn secondary detail-nav-link disabled" aria-disabled="true">Nächstes Spiel →</span>`
      }
    </nav>
  `;

  $("detailContent").innerHTML =
    `<div class="detail-stack">${detailSections.join("")}${navigation}</div>`;
}

function syncViewWithHash() {
  const match = window.location.hash.match(/^#spiel\/([^?]+)(?:\?(.+))?$/);
  const isDetail = Boolean(match);
  const isStatistics = window.location.hash === "#statistik";

  $("archiveView").style.display = isDetail || isStatistics ? "none" : "grid";
  $("detailView").style.display = isDetail ? "block" : "none";
  $("statisticsView").style.display = isStatistics ? "grid" : "none";
  document.querySelectorAll(".nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === (isStatistics ? "#statistik" : "#archiv"));
  });

  if (isDetail) {
    const gameId = decodeURIComponent(match[1]);
    const params = new URLSearchParams(match[2] || "");
    const selectedGameId = params.get("auswahl");
    const game = games.find((entry) => entry.id === gameId);
    const selectedGame = selectedGameId
      ? games.find((entry) => entry.id === selectedGameId)
      : null;
    renderGameDetail(game, selectedGame);
  }
  if (isStatistics) renderQualityResults();
}

function bindEvents() {
  [
    "searchInput",
    "typeFilter",
    "playersFilter",
    "ageFilter",
    "locationFilter",
    "sortFilter",
  ].forEach((id) => {
    $(id).addEventListener("input", renderGames);
  });

  $("focusSearchButton")?.addEventListener("click", focusSearch);
  $("resetFiltersButton")?.addEventListener("click", resetFilters);
  $("qualitySearch").addEventListener("input", renderQualityResults);
  $("onlyIncomplete").addEventListener("change", (event) => {
    state.onlyIncomplete = event.target.checked;
    renderQualityResults();
  });
  $("resetQualityFilters").addEventListener("click", () => {
    state.qualityFields.clear();
    state.onlyIncomplete = false;
    $("qualitySearch").value = "";
    renderQualityFilters();
    renderQualityResults();
  });
  $("backToArchive").addEventListener("click", () => {
    window.location.hash = "#archiv";
  });

  window.addEventListener("hashchange", syncViewWithHash);
}

async function initialize() {
  const [layoutResponse, catalogResponse] = await Promise.all([
    fetch("html/content.html"),
    fetch("json/games.catalog.json"),
  ]);

  const [layoutHtml, gameFiles] = await Promise.all([
    layoutResponse.text(),
    catalogResponse.json(),
  ]);
  const gameLists = await Promise.all(
    gameFiles.map(async (file) => {
      const response = await fetch(file);
      return response.json();
    }),
  );

  games = gameLists.flatMap((entry) =>
    Array.isArray(entry) ? entry : [entry],
  );
  $("app").innerHTML = layoutHtml;

  renderLocationFilter();
  bindEvents();
  renderCategories();
  renderStats();
  renderQualityFilters();
  renderQualityResults();
  renderGames();
  syncViewWithHash();
  checkImageAvailability();
}

initialize();
