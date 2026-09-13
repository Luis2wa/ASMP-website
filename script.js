(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* YEAR */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* MISSING IMAGES → show archive placeholders */
  document.querySelectorAll("img").forEach(function (img) {
    img.addEventListener("error", function () {
      img.classList.add("is-missing");

      if (img.parentElement) {
        img.parentElement.classList.add("has-missing-media");
      }
    });
  });

  /* DUST */
  var dust = document.getElementById("dust-field");

  if (dust && !reduced) {
    var n = 18;

    for (var i = 0; i < n; i += 1) {
      var spec = document.createElement("span");

      spec.style.left = Math.random() * 100 + "%";
      spec.style.bottom = Math.random() * 20 + "%";
      spec.style.animationDuration = 14 + Math.random() * 18 + "s";
      spec.style.animationDelay = -Math.random() * 20 + "s";
      spec.style.opacity = String(0.2 + Math.random() * 0.5);

      dust.appendChild(spec);
    }
  }

  /* NAV */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-menu");

  function setMenu(open) {
    if (!nav || !toggle) return;

    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      open ? "Fechar menu" : "Abrir menu"
    );
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });
  }

  if (menu) {
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setMenu(false);
    }
  });

  /* ACTIVE SECTION */
  var links = Array.prototype.slice.call(
    document.querySelectorAll(".nav__link")
  );

  var sections = ["home", "wiki", "players", "download"]
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (link) {
      var match = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", match);
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-40% 0px -50% 0px",
        threshold: 0
      }
    );

    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* =========================================================
     WIKI
     ========================================================= */

  var PREVIEW_COUNT = 6;

  var query = document.getElementById("wiki-query");
  var clearBtn = document.getElementById("wiki-clear");

  var cards = Array.prototype.slice.call(
    document.querySelectorAll("#wiki-grid .wiki-card")
  );

  var empty = document.getElementById("wiki-empty");
  var count = document.getElementById("wiki-count");

  var shelf = document.getElementById("wiki-shelf");
  var moreBtn = document.getElementById("wiki-more");
  var moreWrap = document.querySelector(".wiki-more-wrap");

  var wikiExpanded = false;
  var activeCategory = "TODOS";

  /* NORMALIZE */
  function normalize(value) {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /* =========================================================
     CATEGORY FILTER
     ========================================================= */

  var filterBar = document.createElement("div");

  filterBar.className = "wiki-filters";
  filterBar.setAttribute("aria-label", "Filtrar por categoria");

  if (query) {
    var searchForm = query.closest(".wiki-search");

    if (searchForm) {
      searchForm.insertAdjacentElement("afterend", filterBar);
    }
  }

  /*
   * Pega automaticamente as categorias existentes
   * no <span class="wiki-card__code">...</span>
   */
  var categories = [];

  cards.forEach(function (card) {
    var categoryEl = card.querySelector(".wiki-card__code");

    if (!categoryEl) return;

    var category = categoryEl.textContent.trim();

    if (
      category &&
      categories.indexOf(category) === -1
    ) {
      categories.push(category);
    }
  });

  categories.sort(function (a, b) {
    return a.localeCompare(b, "pt-BR");
  });

  categories.unshift("TODOS");

  categories.forEach(function (category) {
    var button = document.createElement("button");

    button.type = "button";
    button.className = "wiki-filter";
    button.textContent = category;

    button.setAttribute(
      "aria-pressed",
      category === "TODOS" ? "true" : "false"
    );

    if (category === "TODOS") {
      button.classList.add("is-active");
    }

    button.addEventListener("click", function () {
      activeCategory = category;

      filterBar
        .querySelectorAll(".wiki-filter")
        .forEach(function (btn) {
          var active = btn.textContent === activeCategory;

          btn.classList.toggle("is-active", active);
          btn.setAttribute(
            "aria-pressed",
            active ? "true" : "false"
          );
        });

      /*
       * Quando troca de categoria, volta para o começo
       * da lista e recolhe novamente.
       */
      wikiExpanded = false;

      filterWiki();
    });

    filterBar.appendChild(button);
  });

  /* =========================================================
     FILTER + SEARCH + MORE
     ========================================================= */

  function filterWiki() {
    var term = normalize(
      query ? query.value.trim() : ""
    );

    var searching = term.length > 0;

    var matches = 0;

    cards.forEach(function (card) {
      var categoryEl = card.querySelector(".wiki-card__code");

      var category = categoryEl
        ? categoryEl.textContent.trim()
        : "";

      var categoryMatch =
        activeCategory === "TODOS" ||
        category === activeCategory;

      var hay = normalize(
        card.textContent +
        " " +
        (card.getAttribute("data-keys") || "")
      );

      var searchMatch =
        !searching ||
        hay.indexOf(term) !== -1;

      var match =
        categoryMatch &&
        searchMatch;

      card.classList.toggle(
        "is-hidden",
        !match
      );

      if (match) {
        matches += 1;
      }
    });

    /*
     * Aplica o limite de visualização.
     *
     * Pesquisa ou filtro ativo:
     * mostra todos os resultados.
     *
     * Sem filtro/pesquisa:
     * mostra apenas PREVIEW_COUNT.
     */
    var seen = 0;

    var filtering =
      activeCategory !== "TODOS";

    cards.forEach(function (card) {
      if (card.classList.contains("is-hidden")) {
        card.classList.remove("is-folded");
        return;
      }

      var folded =
        !searching &&
        !filtering &&
        !wikiExpanded &&
        seen >= PREVIEW_COUNT;

      card.classList.toggle(
        "is-folded",
        folded
      );

      seen += 1;
    });

    /* EMPTY STATE */
    if (empty) {
      empty.hidden = matches !== 0;
    }

    /* CLEAR BUTTON */
    if (clearBtn) {
      clearBtn.hidden = !searching;
    }

    /* COUNTER */
    if (count) {
      if (searching || filtering) {
        count.textContent =
          matches +
          " ficha(s) encontrada(s)";
      } else {
        count.textContent =
          cards.length +
          " fichas catalogadas";
      }
    }

    /* SHELF STATES */
    if (shelf) {
      shelf.classList.toggle(
        "is-searching",
        searching || filtering
      );

      shelf.classList.toggle(
        "is-expanded",
        wikiExpanded &&
        !searching &&
        !filtering
      );

      shelf.classList.toggle(
        "is-collapsed",
        !wikiExpanded &&
        !searching &&
        !filtering &&
        matches > PREVIEW_COUNT
      );
    }

/* MORE BUTTON */
if (moreBtn) {

  var showMore =
    activeCategory === "TODOS" &&
    !searching &&
    matches > PREVIEW_COUNT;

  moreBtn.hidden = !showMore;

  moreBtn.textContent =
    wikiExpanded ? "RECOLHER" : "... MAIS";

  moreBtn.setAttribute(
    "aria-expanded",
    wikiExpanded ? "true" : "false"
  );

  if (moreWrap) {
    moreWrap.hidden = !showMore;
  }
}
  }

  /* SEARCH */
  if (query) {
    query.addEventListener(
      "input",
      filterWiki
    );

    filterWiki();
  }

  /* CLEAR SEARCH */
  if (clearBtn) {
    clearBtn.addEventListener(
      "click",
      function () {
        if (query) {
          query.value = "";
        }

        filterWiki();

        if (query) {
          query.focus();
        }
      }
    );
  }

  /* MORE */
  if (moreBtn) {
    moreBtn.addEventListener(
      "click",
      function () {
        wikiExpanded = !wikiExpanded;
  
        filterWiki();
  
        if (
          wikiExpanded &&
          !reduced
        ) {
          var opened = 0;
  
          cards.forEach(function (card) {
            if (
              card.classList.contains("is-hidden")
            ) {
              return;
            }
  
            if (
              opened >= PREVIEW_COUNT
            ) {
              card.classList.add(
                "is-just-opened"
              );
            }
  
            opened += 1;
          });
        }
      }
    );
  }

  /* WIKI FORM */
  var wikiForm =
    document.querySelector(
      ".wiki-search"
    );

  if (wikiForm) {
    wikiForm.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();
      }
    );
  }

  /* =========================================================
     SCROLL REVEAL
     ========================================================= */

  var reveals =
    document.querySelectorAll(
      ".reveal"
    );

  if (
    !reduced &&
    "IntersectionObserver" in window
  ) {
    var rev =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(
            function (entry) {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "is-visible"
                );

                rev.unobserve(
                  entry.target
                );
              }
            }
          );
        },
        {
          threshold: 0.14,
          rootMargin:
            "0px 0px -6% 0px"
        }
      );

    reveals.forEach(function (el) {
      rev.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add(
        "is-visible"
      );
    });
  }

  // ========================================
  // ASMP SERVER STATUS + PLAYER REGISTRY
  // ========================================

  var SERVER_ADDRESS = "enx-cirion-98.enx.host:10447";
  var SERVER_API = "https://api.mcsrvstat.us/3/" + SERVER_ADDRESS;

  var WHITELIST_PLAYERS = [
    "GabrielVMSU",
    "N0xilium_0",
    "Tonebas",
    "marconato",
    "Bruninhummel",
    "notorius_pig",
    "etbilu"
  ];

  var statusItems = document.querySelectorAll(".status-panel__grid li");
  var playerList = document.querySelector(".player-list");

  function getStatusValue(index) {
    return statusItems[index]
      ? statusItems[index].querySelector("strong")
      : null;
  }

  var serverStatusEl = getStatusValue(0);
  var versionEl = getStatusValue(1);
  var modpackEl = getStatusValue(2);
  var playersEl = getStatusValue(3);


  // ========================================
  // STATUS DO SERVIDOR
  // ========================================

  function setServerStatus(online) {
    if (!serverStatusEl) return;

    serverStatusEl.innerHTML =
      '<i class="dot ' +
      (online ? "dot--online" : "dot--offline") +
      '" aria-hidden="true"></i> ' +
      (online ? "ONLINE" : "OFFLINE");
  }


  // ========================================
  // OBTER PERFIL E SKIN
  // ========================================

  function getPlayerProfile(name) {
    return fetch(
      "https://skinrender.dev/api/profile/" +
      encodeURIComponent(name)
    )
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Perfil não encontrado: " + name);
        }

        return response.json();
      })
      .then(function (profile) {
        return {
          uuid: profile.uuid || null,
          name: profile.name || name,
          skinUrl: profile.skinUrl || null,
          skinHash: profile.skinHash || null
        };
      })
      .catch(function (error) {
        console.warn(
          "ASMP: não foi possível encontrar a skin de " + name,
          error
        );

        return {
          uuid: null,
          name: name,
          skinUrl: null,
          skinHash: null
        };
      });
  }


  // ========================================
  // CRIAR CARD DO JOGADOR
  // ========================================

  function createPlayerCard(name, online, profile) {
    var article = document.createElement("article");

    article.className =
      "player-card " +
      (online
        ? "player-card--online"
        : "player-card--offline") +
      " reveal is-visible";

    /*
     * Render de cabeça usando UUID.
     *
     * Isso acompanha automaticamente a skin atual
     * do jogador.
     */
    var skinUrl = profile && profile.uuid
      ? "https://skinrender.dev/render/" +
        profile.uuid +
        "/head?size=128"
      : null;

    article.innerHTML =
      '<div class="player-card__mark player-card__skin" aria-hidden="true">' +
        (
          skinUrl
            ? '<img src="' +
              skinUrl +
              '" alt="" loading="lazy">'
            : '<span>?</span>'
        ) +
      "</div>" +

'<div class="player-card__info">' +
  '<div class="player-card__name-row">' +

    "<h3>" +
    name +
    "</h3>" +

    '<p class="player-card__status">' +
      '<i class="dot ' +
      (online
        ? "dot--online"
        : "dot--offline") +
      '"></i> ' +

      "<span>" +
      (online
        ? "ONLINE"
        : "OFFLINE") +
      "</span>" +

    "</p>" +

  "</div>" +

"</div>";

    /*
     * Caso o render principal falhe,
     * tenta usar a textura original da skin.
     */
    var image = article.querySelector("img");

    if (image && profile && profile.skinUrl) {
      image.addEventListener("error", function () {
        if (image.src !== profile.skinUrl) {
          image.src = profile.skinUrl;
        }
      });
    }

    return article;
  }


  // ========================================
  // ATUALIZAR PLAYER REGISTRY
  // ========================================

  function updatePlayerList(onlinePlayers, serverOnline) {
    if (!playerList) return;

    playerList.innerHTML = "";

    /*
     * Cria mapa dos jogadores online.
     */
    var onlineNames = {};

    if (Array.isArray(onlinePlayers)) {
      onlinePlayers.forEach(function (player) {
        var name =
          typeof player === "string"
            ? player
            : player && player.name
            ? player.name
            : null;

        if (name) {
          onlineNames[name.toLowerCase()] = true;
        }
      });
    }


    /*
     * Busca o perfil/skin dos 7 jogadores.
     */
    WHITELIST_PLAYERS.forEach(function (whitelistName) {
      var isOnline =
        serverOnline &&
        !!onlineNames[whitelistName.toLowerCase()];

      getPlayerProfile(whitelistName)
        .then(function (profile) {

          var displayName =
            profile.name || whitelistName;

          var card = createPlayerCard(
            displayName,
            isOnline,
            profile
          );

          playerList.appendChild(card);
        });
    });
  }


  // ========================================
  // CONSULTAR SERVIDOR
  // ========================================

  function updateServerStatus() {
    fetch(SERVER_API, {
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Falha na API do servidor"
          );
        }

        return response.json();
      })

      .then(function (data) {

        var online =
          data.online === true;


        // SERVER
        setServerStatus(online);


        // VERSION
        if (versionEl) {
          versionEl.textContent =
            data.version ||
            "DESCONHECIDA";
        }


        // MODPACK
        if (modpackEl) {
          modpackEl.textContent =
            "NeoASMP";
        }


        // PLAYERS
        var onlineCount =
          data.players &&
          typeof data.players.online === "number"
            ? data.players.online
            : 0;

        var maxPlayers =
          data.players &&
          typeof data.players.max === "number"
            ? data.players.max
            : 0;

        if (playersEl) {
          playersEl.textContent =
            onlineCount +
            (
              maxPlayers
                ? " / " + maxPlayers
                : ""
            );
        }


        // LISTA DE JOGADORES ONLINE
        var players =
          data.players &&
          Array.isArray(data.players.list)
            ? data.players.list
            : [];


        updatePlayerList(
          players,
          online
        );
      })

      .catch(function (error) {

        console.warn(
          "ASMP: não foi possível consultar o servidor.",
          error
        );


        setServerStatus(false);


        if (versionEl) {
          versionEl.textContent =
            "INDISPONÍVEL";
        }


        if (playersEl) {
          playersEl.textContent =
            "—";
        }


        updatePlayerList(
          [],
          false
        );
      });
  }


  // ========================================
  // INICIALIZAÇÃO
  // ========================================

  updateServerStatus();


  // Atualiza o status a cada 1 minuto
  setInterval(
    updateServerStatus,
    60000
  );
})();

// ========================================
// DISCORD FLUTUANTE
// ========================================

var discordFloat = document.getElementById("discord-float");

if (discordFloat) {
  var lastScrollY = window.scrollY;
  var scrollTicking = false;

  function updateDiscordFloat() {
    var currentScrollY = window.scrollY;

    // Sempre aparece no topo
    if (currentScrollY <= 20) {
      discordFloat.classList.remove("is-hidden");
    }

    // Descendo = esconde
    else if (currentScrollY > lastScrollY) {
      discordFloat.classList.add("is-hidden");
    }

    // Subindo = aparece
    else if (currentScrollY < lastScrollY) {
      discordFloat.classList.remove("is-hidden");
    }

    lastScrollY = currentScrollY;
    scrollTicking = false;
  }

  window.addEventListener("scroll", function () {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateDiscordFloat);
      scrollTicking = true;
    }
  });
}