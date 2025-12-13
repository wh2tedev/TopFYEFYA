/* VERSIÓN CLEAN — script.js
   Con buscador, filtros y cálculo de Balón de Oro
*/

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const tableBody = document.querySelector("#tabla-jugadores tbody");
  const switchMedallas = document.getElementById("switch-medallas");
  const switchTema = document.getElementById("switch-tema");
  const selectOrden = document.getElementById("select-orden");
  const btnConfig = document.getElementById("btn-config");
  const sidebar = document.getElementById("sidebar-config");
  const btnVerMas = document.getElementById("btn-vermas");
  const elJugadorSemana = document.getElementById("jugador-semana");

  // Search & Filter elements
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const filtersContainer = document.querySelector(".filters");

  // Stats elements
  const totalGoles = document.getElementById("total-goles");
  const totalAsistencias = document.getElementById("total-asistencias");
  const totalJugadores = document.getElementById("total-jugadores");
  const totalHattricks = document.getElementById("total-hattricks");

  // Balón de Oro element
  const balonOroContent = document.getElementById("balon-oro-content");

  // Preferences
  const prefMedallas = localStorage.getItem("mostrarMedallas") === "true";
  const prefOrden = localStorage.getItem("ordenRanking") || "puntaje";
  const prefTema = localStorage.getItem("temaClaro") === "true";

  // Apply stored prefs
  switchMedallas.checked = prefMedallas;
  selectOrden.value = prefOrden;
  switchTema.checked = prefTema;
  if (prefTema) document.body.classList.add("light");

  // Sidebar open/close
  btnConfig.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    btnConfig.style.display = sidebar.classList.contains("open") ? "none" : "flex";
    sidebar.setAttribute("aria-hidden", String(!sidebar.classList.contains("open")));
  });

  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !btnConfig.contains(e.target) && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      btnConfig.style.display = "flex";
      sidebar.setAttribute("aria-hidden", "true");
    }
    
    // Cerrar filtros si se hace clic fuera
    const searchSection = document.querySelector(".search-filter-section");
    if (searchSection && !searchSection.contains(e.target)) {
      filtersContainer.classList.remove("show");
    }
  });

  // Partidos por equipo
  const PARTIDOS_FYE = 20;
  const PARTIDOS_FYA = 26;

  // Load JSON
  let jugadores = [];
  let jugadoresFiltrados = [];
  let filtroActual = "all";
  let busquedaActual = "";

  try {
    const res = await fetch(`data.json?nocache=${Date.now()}`);
    jugadores = await res.json();
  } catch (err) {
    console.error("Error al cargar data.json", err);
    tableBody.innerHTML = "<tr><td colspan='2'>Error al cargar datos.</td></tr>";
    return;
  }

  // Normalize & compute stats
  jugadores.forEach(j => {
    j.goles = j.goles ?? 0;
    j.asistencias = j.asistencias ?? 0;
    j.hattricks = j.hattricks ?? 0;
    j.salvadas = j.salvadas ?? 0;
    j.bloqueos = j.bloqueos ?? 0;
    j.entradas = j.entradas ?? 0;

    const partidos = j.equipo === "FYE" ? PARTIDOS_FYE : PARTIDOS_FYA;
    j.partidos = partidos;

    j.gp = partidos > 0 ? (j.goles / partidos) : 0;
    j.ap = partidos > 0 ? (j.asistencias / partidos) : 0;
    j.ga = j.goles + j.asistencias;

    if (j.nombre.includes("(POR)")) {
      j.puntaje = (j.goles * 2) + (j.asistencias) + (j.salvadas * 0.5);
    } else if (j.nombre.includes("(DFC)")) {
      j.puntaje = (j.goles * 2) + (j.asistencias) + (j.bloqueos * 0.5);
    } else {
      j.puntaje = (j.goles * 2) + (j.asistencias) + (j.hattricks * 3);
    }
    j.puntaje = Number(j.puntaje.toFixed(2));
  });

  jugadoresFiltrados = [...jugadores];

  /* ---------- SEARCH & FILTER ---------- */
  searchInput.addEventListener("focus", () => {
    filtersContainer.classList.add("show");
  });

  function aplicarFiltros() {
    jugadoresFiltrados = jugadores.filter(j => {
      // Filtro de búsqueda
      const nombreMatch = j.nombre.toLowerCase().includes(busquedaActual.toLowerCase());
      
      // Filtro de categoría
      let categoriaMatch = true;
      if (filtroActual === "FYE" || filtroActual === "FYA") {
        categoriaMatch = j.equipo === filtroActual;
      } else if (filtroActual === "POR") {
        categoriaMatch = j.nombre.includes("(POR)");
      } else if (filtroActual === "DFC") {
        categoriaMatch = j.nombre.includes("(DFC)");
      } else if (filtroActual === "DEL") {
        categoriaMatch = j.nombre.includes("(DEL)") || j.nombre.includes("(MC/DEL)") || 
                        (!j.nombre.includes("(POR)") && !j.nombre.includes("(DFC)") && !j.nombre.includes("(DC)"));
      }
      
      return nombreMatch && categoriaMatch;
    });

    ordenarRanking(selectOrden.value);
  }

  searchInput.addEventListener("input", (e) => {
    busquedaActual = e.target.value;
    clearSearchBtn.style.display = busquedaActual ? "flex" : "none";
    aplicarFiltros();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    busquedaActual = "";
    clearSearchBtn.style.display = "none";
    aplicarFiltros();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filtroActual = btn.dataset.filter;
      aplicarFiltros();
    });
  });

  /* ---------- BALÓN DE ORO CALCULATOR ---------- */
  function calcularBalonDeOro() {
    const candidatos = jugadores.map(j => {
      const partidosMinimos = j.partidos * 0.6;
      const jugados = j.partidos;
      
      const cumpleRequisitos = jugados >= partidosMinimos && j.ga >= 25;
      
      if (!cumpleRequisitos) {
        return { ...j, puntuacionBO: 0, probabilidad: 0, cumpleRequisitos: false };
      }

      const puntajeBase = j.puntaje * 0.4;
      const consistencia = (j.ga / j.partidos) * 25;
      const impacto = (j.hattricks * 5) * 0.2;
      const minimo = Math.min(j.goles, j.asistencias);
      const versatilidad = minimo * 0.15;

      const puntuacionBO = puntajeBase + consistencia + impacto + versatilidad;

      return { 
        ...j, 
        puntuacionBO: Number(puntuacionBO.toFixed(2)),
        cumpleRequisitos: true
      };
    });

    const candidatosValidos = candidatos
      .filter(c => c.cumpleRequisitos)
      .sort((a, b) => b.puntuacionBO - a.puntuacionBO)
      .slice(0, 5);

    const totalPuntuacion = candidatosValidos.reduce((sum, c) => sum + c.puntuacionBO, 0);
    candidatosValidos.forEach(c => {
      c.probabilidad = totalPuntuacion > 0 ? (c.puntuacionBO / totalPuntuacion) * 100 : 0;
    });

    return candidatosValidos;
  }

  function renderBalonDeOro() {
    const candidatos = calcularBalonDeOro();

    if (candidatos.length === 0) {
      balonOroContent.innerHTML = `
        <div class="no-results">
          <i data-lucide="trophy"></i>
          <p>Aún no hay candidatos que cumplan los requisitos mínimos</p>
          <p class="muted" style="font-size:13px;">Se requiere: 60% de partidos, Top 5 ranking, 25+ G/A</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    balonOroContent.innerHTML = candidatos.map((c, index) => `
      <div class="candidate-card ${index === 0 ? 'top-candidate' : ''}">
        <div class="candidate-rank">${index === 0 ? '👑' : `#${index + 1}`}</div>
        <div class="candidate-info">
          <div class="candidate-name">${c.nombre}</div>
          <div class="candidate-stats">
            <span>⚽ ${c.goles} goles</span>
            <span>🎯 ${c.asistencias} asistencias</span>
            <span>⭐ ${c.puntaje} pts</span>
            <span>🎩 ${c.hattricks} hat-tricks</span>
          </div>
          <div class="probability-bar">
            <div class="probability-fill" style="width: ${c.probabilidad}%"></div>
          </div>
        </div>
        <div class="candidate-probability">
          <div class="probability-text">${c.probabilidad.toFixed(1)}%</div>
          <div class="probability-label">Probabilidad</div>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* ---------- STATS GLOBALES ---------- */
  function actualizarStatsGlobales() {
    const stats = {
      goles: jugadores.reduce((sum, j) => sum + j.goles, 0),
      asistencias: jugadores.reduce((sum, j) => sum + j.asistencias, 0),
      jugadores: jugadores.length,
      hattricks: jugadores.reduce((sum, j) => sum + (j.hattricks || 0), 0)
    };

    animateValue(totalGoles, 0, stats.goles, 1000);
    animateValue(totalAsistencias, 0, stats.asistencias, 1000);
    animateValue(totalJugadores, 0, stats.jugadores, 800);
    animateValue(totalHattricks, 0, stats.hattricks, 1200);
  }

  function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current);
    }, 16);
  }

  /* ---------- RENDER ---------- */
  function renderTabla() {
    tableBody.innerHTML = "";
    
    if (jugadoresFiltrados.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2">
            <div class="no-results">
              <i data-lucide="search-x"></i>
              <p>No se encontraron jugadores</p>
              <p class="muted" style="font-size:13px;">Intenta con otro filtro o búsqueda</p>
            </div>
          </td>
        </tr>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    jugadoresFiltrados.forEach((j, idx) => {
      const tr = document.createElement("tr");
      tr.className = "player";
      tr.tabIndex = 0;
      tr.dataset.index = idx;

      const tdRank = document.createElement("td");
      tdRank.innerText = idx + 1;

      const tdName = document.createElement("td");
      const wrap = document.createElement("div");
      wrap.className = "name-wrap";
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "puntaje-inline";
      const niceScore = Number.isInteger(j.puntaje) ? j.puntaje : j.puntaje.toFixed(1);
      scoreSpan.innerText = `⭐ ${niceScore}`;
      const nameSpan = document.createElement("span");
      nameSpan.className = "nombre-jugador";
      nameSpan.innerText = j.nombre;

      wrap.appendChild(scoreSpan);
      wrap.appendChild(nameSpan);
      tdName.appendChild(wrap);

      tr.appendChild(tdRank);
      tr.appendChild(tdName);

      const trStats = document.createElement("tr");
      trStats.className = "stats-row";
      trStats.setAttribute("aria-hidden", "true");

      let extraStats = "";
      if (j.nombre.includes("(POR)")) {
        extraStats = `🧤 <strong>Salvadas:</strong> ${j.salvadas}`;
      } else if (j.nombre.includes("(DFC)")) {
        extraStats = `🛡️ <strong>Bloqueos:</strong> ${j.bloqueos} &nbsp;|&nbsp; ⚔️ <strong>Entradas:</strong> ${j.entradas}`;
      } else {
        extraStats = `🎩 <strong>Hat-tricks:</strong> ${j.hattricks}`;
      }

      trStats.innerHTML = `
        <td colspan="2">
          <div class="stats-content">
            ⚽ <strong>Goles:</strong> ${j.goles} &nbsp;|&nbsp;
            🎯 <strong>Asistencias:</strong> ${j.asistencias} &nbsp;|&nbsp;
            🔥 <strong>G/A:</strong> ${j.ga} &nbsp;|&nbsp;
            📊 <strong>G/P:</strong> ${j.gp.toFixed(2)} &nbsp;|&nbsp;
            📈 <strong>A/P:</strong> ${j.ap.toFixed(2)} &nbsp;|&nbsp;
            ${extraStats}
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
      tableBody.appendChild(trStats);
    });

    aplicarMedallas();
    attachRowEvents();
  }

  /* ---------- MEDALS ---------- */
  function aplicarMedallas() {
    if (!switchMedallas.checked) return;
    document.querySelectorAll(".player").forEach((tr, i) => {
      const nameSpan = tr.querySelector(".nombre-jugador");
      if (!nameSpan) return;
      const baseName = jugadoresFiltrados[i].nombre;
      if (i === 0) nameSpan.innerText = `🥇 ${baseName}`;
      else if (i === 1) nameSpan.innerText = `🥈 ${baseName}`;
      else if (i === 2) nameSpan.innerText = `🥉 ${baseName}`;
      else nameSpan.innerText = baseName;
    });
  }

  /* ---------- SORT ---------- */
  function ordenarRanking(criterio) {
    jugadoresFiltrados.sort((a, b) => ((b[criterio] || 0) - (a[criterio] || 0)));
    renderTabla();
    mostrarJugadorSemana();
  }

  /* ---------- STATS ROWS ---------- */
  function attachRowEvents(){
    const rows = document.querySelectorAll(".tabla-jugadores .player");
    rows.forEach(row => {
      row.addEventListener("click", () => toggleStats(row));
      row.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          toggleStats(row);
        }
      });
    });
  }

  function closeAllStats(){
    document.querySelectorAll(".stats-row.open").forEach(row => {
      const content = row.querySelector(".stats-content");
      if (content) {
        content.style.maxHeight = content.scrollHeight + "px";
        requestAnimationFrame(() => {
          content.style.maxHeight = "0px";
        });
      }
      row.classList.remove("open");
      row.setAttribute("aria-hidden","true");
    });
  }

  function openStatsRow(statsRow){
    const content = statsRow.querySelector(".stats-content");
    if (!content) return;
    statsRow.classList.add("open");
    statsRow.setAttribute("aria-hidden","false");
    content.style.maxHeight = "0px";
    requestAnimationFrame(()=> {
      content.style.maxHeight = content.scrollHeight + "px";
    });
  }

  function toggleStats(playerRow){
    const statsRow = playerRow.nextElementSibling;
    if (!statsRow || !statsRow.classList.contains("stats-row")) return;
    if (statsRow.classList.contains("open")) {
      const content = statsRow.querySelector(".stats-content");
      if (content) {
        content.style.maxHeight = content.scrollHeight + "px";
        requestAnimationFrame(()=> content.style.maxHeight = "0px");
      }
      statsRow.classList.remove("open");
      statsRow.setAttribute("aria-hidden","true");
      return;
    }
    closeAllStats();
    openStatsRow(statsRow);
    setTimeout(()=> playerRow.scrollIntoView({behavior:"smooth", block:"nearest"}), 360);
  }

  /* ---------- CONFIG EVENTS ---------- */
  switchMedallas.addEventListener("change", () => {
    localStorage.setItem("mostrarMedallas", switchMedallas.checked);
    renderTabla();
  });

  selectOrden.addEventListener("change", () => {
    localStorage.setItem("ordenRanking", selectOrden.value);
    ordenarRanking(selectOrden.value);
  });

  switchTema.addEventListener("change", () => {
    const light = switchTema.checked;
    localStorage.setItem("temaClaro", light);
    document.body.classList.add("transicion-tema");
    requestAnimationFrame(()=> {
      if (light) document.body.classList.add("light");
      else document.body.classList.remove("light");
      setTimeout(()=> document.body.classList.remove("transicion-tema"), 340);
    });
  });

  /* ---------- JUGADOR DE LA SEMANA ---------- */
  function mostrarJugadorSemana(){
    if (!elJugadorSemana) return;
    if (!jugadores.length) {
      elJugadorSemana.innerHTML = `<div class="jugador-placeholder"><p>No hay jugadores</p></div>`;
      return;
    }

    const withSemana = jugadores.map(j => {
      const s = j.semana || {};
      const golesS = s.goles || 0;
      const asiS = s.asistencias || 0;
      const hatS = s.hattricks || 0;
      const salvS = s.salvadas || 0;
      const bloqS = s.bloqueos || 0;
      let puntajeSemana = 0;
      if (j.nombre.includes("(POR)")) puntajeSemana = (golesS * 2) + (asiS) + (salvS * 0.5);
      else if (j.nombre.includes("(DFC)")) puntajeSemana = (golesS * 2) + (asiS) + (bloqS * 0.5);
      else puntajeSemana = (golesS * 2) + (asiS) + (hatS * 3);
      return {...j, puntajeSemana: Number(puntajeSemana.toFixed(2)), semanaObj: s};
    });

    const top = withSemana.sort((a,b) => (b.puntajeSemana || 0) - (a.puntajeSemana || 0))[0];
    if (!top) {
      elJugadorSemana.innerHTML = `<div class="jugador-placeholder"><p>No hay datos de la semana</p></div>`;
      return;
    }

    elJugadorSemana.innerHTML = `
      <div class="jugador-info">
        <div><i data-lucide="medal" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;"></i>Jugador de la semana</div>
        <strong>${top.nombre}</strong>
        <div class="meta">⭐ ${top.puntajeSemana} pts (semana)</div>
        <div class="meta">
          ⚽ ${top.semanaObj?.goles || 0} &nbsp;|&nbsp;
          🎯 ${top.semanaObj?.asistencias || 0}
        </div>
      </div>
    `;
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /* ---------- BOTÓN VER MÁS ---------- */
  if (btnVerMas) {
    btnVerMas.addEventListener("click", () => {
      const balonOroSection = document.getElementById("balon-oro-section");
      if (balonOroSection) {
        balonOroSection.scrollIntoView({behavior:"smooth"});
      }
    });
    function updateVerMas(){
      const st = window.scrollY || document.documentElement.scrollTop;
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      const atBottom = st + winH >= docH - 120;
      if (st < 120) btnVerMas.classList.remove("oculto");
      else btnVerMas.classList.add("oculto");
      if (atBottom) btnVerMas.classList.add("oculto");
    }
    window.addEventListener("scroll", updateVerMas);
    updateVerMas();
  }

  /* ---------- INITIALIZE ---------- */
  ordenarRanking(prefOrden);
  mostrarJugadorSemana();
  actualizarStatsGlobales();
  renderBalonDeOro();
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});