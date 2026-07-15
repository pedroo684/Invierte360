/**
 * calculator.js
 * Controlador principal de la página /calculadora.html
 */

(function () {
  'use strict';

  const { formatoMoneda, formatoPorcentaje, fechaEstimada, debounce } = window.Invierte360Utils;
  const { proyectar, generarEscenarios, simulacionMonteCarlo, compararEstrategiasRetiro } = window.FIEngine;

  const form = document.getElementById('calc-form');
  if (!form) return; // Esta página no es la calculadora

  const campos = [
    'patrimonioInicial', 'aporteMensual', 'aporteAnual', 'crecimientoAnual',
    'inflacionAnual', 'edadActual', 'gastoAnual', 'tasaRetiro',
    'impuestos', 'comisionBroker'
  ];

  const valoresPorDefecto = {
    patrimonioInicial: 15000,
    aporteMensual: 600,
    aporteAnual: 0,
    crecimientoAnual: 7,
    inflacionAnual: 3,
    edadActual: 32,
    gastoAnual: 18000,
    tasaRetiro: 4,
    impuestos: 0,
    comisionBroker: 0.2
  };

  let ultimoResultado = null;
  let ultimosEscenarios = null;

  function leerFormulario() {
    const datos = {};
    campos.forEach((campo) => {
      const input = form.elements[campo];
      datos[campo] = input ? Number(input.value) || 0 : valoresPorDefecto[campo];
    });
    return datos;
  }

  function rellenarFormulario(datos) {
    campos.forEach((campo) => {
      const input = form.elements[campo];
      if (input && datos[campo] !== undefined) input.value = datos[campo];
    });
  }

  function actualizarResultadosPrincipales(resultado) {
    document.getElementById('res-numero-fi').textContent = formatoMoneda(resultado.numeroFI);
    document.getElementById('res-anios').textContent = resultado.anosRestantes !== null
      ? `${resultado.anosRestantes.toFixed(1)} años`
      : 'Fuera de rango';
    document.getElementById('res-edad-retiro').textContent = resultado.edadRetiro !== null
      ? `${resultado.edadRetiro.toFixed(1)} años`
      : '—';
    document.getElementById('res-fecha').textContent = resultado.anosRestantes !== null
      ? fechaEstimada(resultado.anosRestantes)
      : 'No alcanzado en el horizonte simulado';
    document.getElementById('res-ingreso-pasivo').textContent = formatoMoneda(resultado.ingresoPasivoAnual);
    document.getElementById('res-patrimonio-final').textContent = formatoMoneda(resultado.patrimonioFinalReal);

    const datosActuales = leerFormulario();
    const patrimonioActual = datosActuales.patrimonioInicial;
    const porcentaje = resultado.numeroFI > 0 ? (patrimonioActual / resultado.numeroFI) * 100 : 0;
    document.querySelector('.fi-ring__value').textContent = `${Math.min(100, porcentaje).toFixed(0)}%`;
    window.Invierte360Charts.actualizarAnilloFI(porcentaje);
  }

  function actualizarTablaEstrategias(resultado) {
    const cuerpo = document.getElementById('tabla-estrategias-body');
    if (!cuerpo) return;
    const datosActuales = leerFormulario();
    const estrategias = compararEstrategiasRetiro(resultado.numeroFI, datosActuales.gastoAnual);
    cuerpo.innerHTML = estrategias.map((e) => `
      <tr>
        <td>${e.nombre}</td>
        <td class="numeric-cell">${formatoMoneda(e.ingresoAnual)}</td>
        <td>${e.ventaja}</td>
        <td>${e.desventaja}</td>
      </tr>
    `).join('');
  }

  function ejecutarMonteCarlo(datos) {
    const progreso = document.getElementById('mc-progreso');
    const resumen = document.getElementById('mc-resumen');
    if (progreso) progreso.classList.add('is-active');
    if (resumen) resumen.style.opacity = '0.4';

    // setTimeout permite que la UI pinte el spinner antes del cálculo síncrono
    setTimeout(() => {
      const resultado = simulacionMonteCarlo(datos, { iteraciones: 2000, aniosRetiro: 30 });

      document.getElementById('mc-probabilidad').textContent = formatoPorcentaje(resultado.probabilidadExito, 0);
      document.getElementById('mc-p10').textContent = formatoMoneda(resultado.percentil10);
      document.getElementById('mc-p50').textContent = formatoMoneda(resultado.percentil50);
      document.getElementById('mc-p90').textContent = formatoMoneda(resultado.percentil90);

      window.Invierte360Charts.graficoMonteCarlo('chart-montecarlo', resultado, formatoMoneda);

      if (progreso) progreso.classList.remove('is-active');
      if (resumen) resumen.style.opacity = '1';
    }, 50);
  }

  function recalcular() {
    const datos = leerFormulario();
    const resultado = proyectar(datos);
    const escenarios = generarEscenarios(datos);

    ultimoResultado = resultado;
    ultimosEscenarios = escenarios;

    actualizarResultadosPrincipales(resultado);
    actualizarTablaEstrategias(resultado);

    window.Invierte360Charts.graficoPatrimonio('chart-patrimonio', resultado.seriesAnual, formatoMoneda);
    window.Invierte360Charts.graficoAportesVsGanancias('chart-aportes', resultado.seriesAnual, formatoMoneda);
    window.Invierte360Charts.graficoEscenarios('chart-escenarios', escenarios, formatoMoneda);

    window.Invierte360Storage.guardar(datos);
  }

  const recalcularConDebounce = debounce(recalcular, 200);

  // ---- Inicialización ----
  function init() {
    const guardado = window.Invierte360Storage.leerSimulacionDeURL()
      || window.Invierte360Storage.cargar()
      || valoresPorDefecto;

    rellenarFormulario(guardado);
    recalcular();

    form.addEventListener('input', recalcularConDebounce);

    const btnMonteCarlo = document.getElementById('btn-montecarlo');
    if (btnMonteCarlo) {
      btnMonteCarlo.addEventListener('click', () => ejecutarMonteCarlo(leerFormulario()));
    }

    const btnCompartir = document.getElementById('btn-compartir');
    if (btnCompartir) {
      btnCompartir.addEventListener('click', () => {
        const url = window.Invierte360Storage.generarURLCompartible(leerFormulario());
        navigator.clipboard?.writeText(url).then(() => mostrarToast('Enlace copiado al portapapeles'));
      });
    }

    const btnCopiar = document.getElementById('btn-copiar');
    if (btnCopiar) {
      btnCopiar.addEventListener('click', () => {
        if (!ultimoResultado) return;
        const resumen = [
          `Número FI: ${formatoMoneda(ultimoResultado.numeroFI)}`,
          `Años restantes: ${ultimoResultado.anosRestantes?.toFixed(1) ?? '—'}`,
          `Edad de retiro: ${ultimoResultado.edadRetiro?.toFixed(1) ?? '—'}`,
          `Ingreso pasivo anual: ${formatoMoneda(ultimoResultado.ingresoPasivoAnual)}`
        ].join('\n');
        navigator.clipboard?.writeText(resumen).then(() => mostrarToast('Resultados copiados'));
      });
    }

    const btnReiniciar = document.getElementById('btn-reiniciar');
    if (btnReiniciar) {
      btnReiniciar.addEventListener('click', () => {
        window.Invierte360Storage.limpiar();
        rellenarFormulario(valoresPorDefecto);
        recalcular();
        mostrarToast('Simulación reiniciada');
      });
    }

    const btnImprimir = document.getElementById('btn-imprimir');
    if (btnImprimir) {
      btnImprimir.addEventListener('click', () => window.print());
    }

    const toggleAvanzado = document.querySelector('.field-advanced__toggle');
    if (toggleAvanzado) {
      toggleAvanzado.addEventListener('click', () => {
        toggleAvanzado.parentElement.classList.toggle('is-open');
      });
    }

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(recalcular, 300));
    });
  }

  function mostrarToast(mensaje) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.classList.add('is-visible');
    clearTimeout(mostrarToast._t);
    mostrarToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
