/**
 * montecarlo.js
 * Controlador de la página /monte-carlo.html
 */

(function () {
  'use strict';

  const form = document.getElementById('mc-form');
  if (!form) return; // Esta página no es Monte Carlo

  const { formatoMoneda, formatoPorcentaje } = window.Invierte360Utils;
  const F = window.FIEngine;
  const C = window.Invierte360Charts;

  const campos = ['gastoAnual', 'tasaRetiro', 'crecimientoAnual', 'inflacionAnual', 'aniosRetiro', 'volatilidad'];

  const porDefecto = {
    gastoAnual: 18000,
    tasaRetiro: 4,
    crecimientoAnual: 7,
    inflacionAnual: 3,
    aniosRetiro: 30,
    volatilidad: 15
  };

  const paletaEstrategias = ['c1', 'c2', 'c3', 'c4', 'c5'];

  function leerConfig() {
    const datos = {};
    campos.forEach((c) => {
      datos[c] = Number(form.elements[c]?.value) || porDefecto[c];
    });
    datos.iteraciones = Number(form.elements.iteraciones?.value) || 2000;
    return datos;
  }

  function rellenarFormulario(datos) {
    campos.forEach((c) => {
      if (form.elements[c] && datos[c] !== undefined) form.elements[c].value = datos[c];
    });
  }

  function claseParaProbabilidad(p) {
    if (p >= 85) return 'prob-pill--alta';
    if (p >= 60) return 'prob-pill--media';
    return 'prob-pill--baja';
  }

  function tipoParaEstrategia(nombre) {
    if (nombre.includes('VPW')) return 'vpw';
    if (nombre.includes('Guyton')) return 'guyton-klinger';
    return 'fija';
  }

  function colorVar(codigo) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--color-chart-${codigo.replace('c', '')}`).trim();
  }

  function renderTablaTasas(tasas) {
    const cuerpo = document.getElementById('tabla-tasas-body');
    if (!cuerpo) return;
    cuerpo.innerHTML = tasas.map((t) => `
      <tr>
        <td><strong>${t.tasa}%</strong></td>
        <td class="numeric-cell">${formatoMoneda(t.patrimonioNecesario)}</td>
        <td class="numeric-cell">${formatoMoneda(t.ingresoAnual)}</td>
        <td><span class="prob-pill ${claseParaProbabilidad(t.probabilidadExito)}">${formatoPorcentaje(t.probabilidadExito, 0)} de éxito</span></td>
      </tr>
    `).join('');
  }

  function renderEstrategias(estrategias) {
    const contenedor = document.getElementById('strategy-cards');
    if (!contenedor) return;
    contenedor.innerHTML = estrategias.map((e, i) => `
      <div class="card strategy-card animate-in">
        <div class="strategy-card__head">
          <h3><span class="strategy-card__dot" style="background:${colorVar(paletaEstrategias[i % 5])}"></span>${e.nombre}</h3>
          <span class="numeric" style="font-weight:600; color:var(--color-primary);">${formatoMoneda(e.ingresoAnual)}/año</span>
        </div>
        <dl>
          <dt>Cómo funciona</dt>
          <dd>${e.comoFunciona || ''}</dd>
          <dt>Ventaja</dt>
          <dd>${e.ventaja}</dd>
          <dt>Desventaja</dt>
          <dd>${e.desventaja}</dd>
        </dl>
      </div>
    `).join('');
  }

  function ejecutar() {
    const progreso = document.getElementById('mc-progreso');
    const resultados = document.getElementById('mc-resultados');
    if (progreso) progreso.classList.add('is-active');
    if (resultados) resultados.style.opacity = '0.35';

    setTimeout(() => {
      const cfg = leerConfig();
      const inputBase = {
        gastoAnual: cfg.gastoAnual,
        tasaRetiro: cfg.tasaRetiro,
        crecimientoAnual: cfg.crecimientoAnual,
        inflacionAnual: cfg.inflacionAnual
      };
      const opciones = {
        iteraciones: cfg.iteraciones,
        aniosRetiro: cfg.aniosRetiro,
        mediaRentabilidad: cfg.crecimientoAnual,
        volatilidad: cfg.volatilidad
      };

      // 1. Simulación principal
      const mc = F.simulacionMonteCarlo(inputBase, opciones);
      document.getElementById('mc-result-probabilidad').textContent = formatoPorcentaje(mc.probabilidadExito, 0);
      document.getElementById('mc-result-p10').textContent = formatoMoneda(mc.percentil10);
      document.getElementById('mc-result-p50').textContent = formatoMoneda(mc.percentil50);
      document.getElementById('mc-result-p90').textContent = formatoMoneda(mc.percentil90);
      C.actualizarAnilloFI(mc.probabilidadExito);
      C.graficoDistribucionMC('chart-distribucion', mc.patrimoniosFinales, formatoMoneda, 24);

      // 2. Comparación de tasas de retiro
      const tasas = F.compararTasasRetiroMC(inputBase, [3, 4, 5], {
        ...opciones,
        iteraciones: Math.min(cfg.iteraciones, 1200)
      });
      renderTablaTasas(tasas);

      // 3. Estrategias de retiro: tarjetas + trayectorias
      const numeroFI = F.calcularNumeroFI(cfg.gastoAnual, cfg.tasaRetiro);
      const estrategias = F.compararEstrategiasRetiro(numeroFI, cfg.gastoAnual);
      renderEstrategias(estrategias);

      const trayectorias = estrategias.map((e) => ({
        nombre: e.nombre,
        datos: F.simularTrayectoriaEstrategia({
          patrimonioInicial: numeroFI,
          tasaInicial: e.tasa || 4.5,
          aniosRetiro: cfg.aniosRetiro,
          rendimientoAnual: cfg.crecimientoAnual,
          inflacionAnual: cfg.inflacionAnual,
          tipo: tipoParaEstrategia(e.nombre)
        })
      }));
      C.graficoTrayectoriasEstrategias('chart-trayectorias', trayectorias, formatoMoneda);
      C.graficoComparativaEstrategias('chart-comparativa', estrategias, formatoMoneda);

      if (progreso) progreso.classList.remove('is-active');
      if (resultados) resultados.style.opacity = '1';

      window.Invierte360Storage.guardar({ ...window.Invierte360Storage.cargar(), ...inputBase });
    }, 50);
  }

  function init() {
    const guardado = window.Invierte360Storage.cargar() || {};
    rellenarFormulario({ ...porDefecto, ...guardado });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ejecutar();
    });

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(ejecutar, 300));
    });

    ejecutar();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
