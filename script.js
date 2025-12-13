/* VERSION D — script.js
   Mejoras:
   - Calcula G/A (contribuciones de gol)
   - Calcula automáticamente G/P y A/P según equipo (FYE: 20 partidos, FYA: 26 partidos)
   - Muestra G/A en las estadísticas expandidas
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
  const sectionPartidos = document.getElementById("partidos-balon");
  const elJugadorSemana = document.getElementById("jugador-semana");

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
  });

  // Partidos por equipo
  const PARTIDOS_FYE = 20;
  const PARTIDOS_FYA = 26;

  // Load JSON (force fresh by adding timestamp)
  let jugadores = [];
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

    // Determinar partidos según equipo
    const partidos = j.equipo === "FYE" ? PARTIDOS_FYE : PARTIDOS_FYA;
    j.partidos = partidos;

    // Calcular G/P y A/P automáticamente
    j.gp = partidos > 0 ? (j.goles / partidos) : 0;
    j.ap = partidos > 0 ? (j.asistencias / partidos) : 0;

    // Calcular G/A (contribuciones de gol)
    j.ga = j.goles + j.asistencias;

    // Calcular puntaje total según posición
    if (j.nombre.includes("(POR)")) {
      j.puntaje = (j.goles * 2) + (j.asistencias) + (j.salvadas * 0.5);
    } else if (j.nombre.includes("(DFC)")) {
      j.puntaje = (j.goles * 2) + (j.asistencias) + (j.bloqueos * 0.5);
    } else {
      j.puntaje = (j.goles * 2) + (j.asistencias) + (j.hattricks * 3);
    }
    j.puntaje = Number(Number(j.puntaje).toFixed(2));
  });

  /* ---------- RENDER ---------- */
  function renderTabla() {
    tableBody.innerHTML = "";
    jugadores.forEach((j, idx) => {
      const tr = document.createElement("tr");
      tr.className = "player";
      tr.tabIndex = 0;
      tr.dataset.index = idx;

      // cell: rank
      const tdRank = document.createElement("td");
      tdRank.innerText = idx + 1;

      // cell: name + score
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

      // stats row
      const trStats = document.createElement("tr");
      trStats.className = "stats-row";
      trStats.setAttribute("aria-hidden", "true");

      // extra stats conditional
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
      const baseName = jugadores[i].nombre;
      if (i === 0) nameSpan.innerText = `🥇 ${baseName}`;
      else if (i === 1) nameSpan.innerText = `🥈 ${baseName}`;
      else if (i === 2) nameSpan.innerText = `🥉 ${baseName}`;
      else nameSpan.innerText = baseName;
    });
  }

  /* ---------- SORT / ORDER ---------- */
  function ordenarRanking(criterio) {
    jugadores.sort((a, b) => ((b[criterio] || 0) - (a[criterio] || 0)));
    renderTabla();
    mostrarJugadorSemana();
  }

  /* ---------- STATS ROWS (collapsible) ---------- */
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

    // compute weekly scores from j.semana
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
        <div style="font-size:18px; color:var(--accent)">🏅 Jugador de la semana</div>
        <strong>${top.nombre}</strong>
        <div class="meta" aria-hidden="true">⭐ ${top.puntajeSemana} pts (semana)</div>
        <div class="meta" style="margin-top:6px;">
          ⚽ ${top.semanaObj?.goles || 0} &nbsp;|&nbsp;
          🎯 ${top.semanaObj?.asistencias || 0}
        </div>
      </div>
    `;
  }

  /* ---------- BOTÓN VER MÁS ---------- */
  if (btnVerMas && sectionPartidos) {
    btnVerMas.addEventListener("click", () => sectionPartidos.scrollIntoView({behavior:"smooth"}));
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
});
