const state = {
  category: "",
  status: "",
};

let games = [];

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
  const sort = $("sortFilter").value;

  const list = games.filter((game) => {
    const haystack = [game.title, game.type, game.publisher, game.platform, game.status, ...game.tags]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !query || haystack.includes(query);
    const matchesType = !type || game.type === type;
    const matchesPlayers =
      !players || (players === 6 ? game.playersMax >= 6 : game.playersMin <= players && game.playersMax >= players);
    const matchesAge = !age || game.age <= age;
    const matchesStatus = !state.status || game.status === state.status;

    return matchesSearch && matchesType && matchesPlayers && matchesAge && matchesStatus;
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
    .map(
      (game) => `
        <article class="game-card">
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
            <p class="desc">${game.description}</p>
            <div class="facts">
              <div class="fact"><small>Spieler</small><b>${game.playersMin}-${game.playersMax}</b></div>
              <div class="fact"><small>Alter</small><b>ab ${game.age}</b></div>
              <div class="fact"><small>Dauer</small><b>${game.duration} Min.</b></div>
            </div>
            <div class="tags">
              <span class="tag">${game.platform}</span>
              <span class="tag">${game.publisher}</span>
              <span class="tag">${game.status}</span>
              ${game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  $("emptyState").style.display = list.length ? "none" : "block";
  $("resultInfo").textContent = `${list.length} von ${games.length} Spielen werden angezeigt.`;
}

function renderStats() {
  $("statTotal").textContent = games.length;
  $("statTypes").textContent = new Set(games.map((game) => game.type)).size;
  $("statFavs").textContent = games.filter((game) => game.favorite).length;
  $("lastAdded").textContent = games.toSorted((a, b) => b.year - a.year)[0].title;
  $("topRated").textContent = games.toSorted((a, b) => b.rating - a.rating)[0].title;
  $("soloCount").textContent = games.filter((game) => game.playersMin === 1).length;
}

function focusSearch() {
  $("searchInput").focus();
}

function resetFilters() {
  $("searchInput").value = "";
  $("typeFilter").value = "";
  $("playersFilter").value = "";
  $("ageFilter").value = "";
  $("sortFilter").value = "title";
  state.category = "";
  state.status = "";

  document.querySelectorAll("[data-status]").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === "");
  });

  renderCategories();
  renderGames();
}

function bindEvents() {
  ["searchInput", "typeFilter", "playersFilter", "ageFilter", "sortFilter"].forEach((id) => {
    $(id).addEventListener("input", renderGames);
  });

  document.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      state.status = button.dataset.status;

      document.querySelectorAll("[data-status]").forEach((chip) => {
        chip.classList.toggle("active", chip === button);
      });

      renderGames();
    });
  });

  $("focusSearchButton").addEventListener("click", focusSearch);
  $("resetFiltersButton").addEventListener("click", resetFilters);
}

async function initialize() {
  const [layoutResponse, dataResponse] = await Promise.all([
    fetch("html/content.html"),
    fetch("json/games.json"),
  ]);

  const layoutHtml = await layoutResponse.text();
  games = await dataResponse.json();

  $("app").innerHTML = layoutHtml;

  bindEvents();
  renderCategories();
  renderStats();
  renderGames();
}

initialize();
