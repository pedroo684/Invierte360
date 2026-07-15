/**
 * charts.js
 * Crea y actualiza los gráficos de Chart.js de la calculadora.
 * Requiere que Chart.js esté cargado globalmente (CDN) antes de este script.
 */

(function () {
  'use strict';

  const instancias = {};

  function coloresTema() {
    const styles = getComputedStyle(document.documentElement);
    return {
      texto: styles.getPropertyValue('--color-text-muted').trim(),
      rejilla: styles.getPropertyValue('--color-border').trim(),
      c1: styles.getPropertyValue('--color-chart-1').trim(),
      c2: styles.getPropertyValue('--color-chart-2').trim(),
      c3: styles.getPropertyValue('--color-chart-3').trim(),
      c4: styles.getPropertyValue('--color-chart-4').trim(),
      c5: styles.getPropertyValue('--color-chart-5').trim()
    };
  }

  function opcionesBase(formatoEje) {
    const c = coloresTema();
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: c.texto, usePointStyle: true, boxWidth: 8, font: { family: 'Inter' } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatoEje(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: { ticks: { color: c.texto, font: { family: 'Inter' } }, grid: { color: c.rejilla } },
        y: {
          ticks: {
            color: c.texto,
            font: { family: 'IBM Plex Mono' },
            callback: (val) => formatoEje(val)
          },
          grid: { color: c.rejilla }
        }
      }
    };
  }

  function crearOActualizar(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (instancias[id]) {
      instancias[id].data = config.data;
      instancias[id].options = config.options;
      instancias[id].update();
      return instancias[id];
    }
    instancias[id] = new Chart(canvas.getContext('2d'), config);
    return instancias[id];
  }

  /** Gráfico de evolución del patrimonio (nominal vs real) */
  function graficoPatrimonio(id, seriesAnual, formatoMoneda) {
    const c = coloresTema();
    const labels = seriesAnual.map((p) => `Año ${p.anio}`);
    crearOActualizar(id, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Patrimonio nominal',
            data: seriesAnual.map((p) => Math.round(p.patrimonioNominal)),
            borderColor: c.c1,
            backgroundColor: c.c1 + '22',
            fill: true,
            tension: 0.3,
            pointRadius: 0
          },
          {
            label: 'Patrimonio real (ajustado por inflación)',
            data: seriesAnual.map((p) => Math.round(p.patrimonioReal)),
            borderColor: c.c2,
            backgroundColor: 'transparent',
            borderDash: [6, 4],
            tension: 0.3,
            pointRadius: 0
          }
        ]
      },
      options: opcionesBase(formatoMoneda)
    });
  }

  /** Gráfico de aportes acumulados vs ganancias generadas */
  function graficoAportesVsGanancias(id, seriesAnual, formatoMoneda) {
    const c = coloresTema();
    const labels = seriesAnual.map((p) => `Año ${p.anio}`);
    crearOActualizar(id, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total aportado',
            data: seriesAnual.map((p) => Math.round(p.totalAportado)),
            backgroundColor: c.c2,
            stack: 'total'
          },
          {
            label: 'Ganancias generadas',
            data: seriesAnual.map((p) => Math.round(p.ganancias)),
            backgroundColor: c.c1,
            stack: 'total'
          }
        ]
      },
      options: { ...opcionesBase(formatoMoneda), scales: { ...opcionesBase(formatoMoneda).scales, x: { ...opcionesBase(formatoMoneda).scales.x, stacked: true }, y: { ...opcionesBase(formatoMoneda).scales.y, stacked: true } } }
    });
  }

  /** Gráfico comparando los tres escenarios (conservador / tradicional / optimista) */
  function graficoEscenarios(id, escenarios, formatoMoneda) {
    const c = coloresTema();
    const base = escenarios.tradicional.seriesAnual;
    const labels = base.map((p) => `Año ${p.anio}`);
    crearOActualizar(id, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Conservador',
            data: escenarios.conservador.seriesAnual.map((p) => Math.round(p.patrimonioNominal)),
            borderColor: c.c3, backgroundColor: 'transparent', tension: 0.3, pointRadius: 0
          },
          {
            label: 'Tradicional',
            data: escenarios.tradicional.seriesAnual.map((p) => Math.round(p.patrimonioNominal)),
            borderColor: c.c1, backgroundColor: 'transparent', tension: 0.3, pointRadius: 0
          },
          {
            label: 'Optimista',
            data: escenarios.optimista.seriesAnual.map((p) => Math.round(p.patrimonioNominal)),
            borderColor: c.c2, backgroundColor: 'transparent', tension: 0.3, pointRadius: 0
          }
        ]
      },
      options: opcionesBase(formatoMoneda)
    });
  }

  /** Resumen de percentiles de Monte Carlo (para la calculadora rápida) */
  function graficoMonteCarlo(id, percentiles, formatoMoneda) {
    const c = coloresTema();
    crearOActualizar(id, {
      type: 'bar',
      data: {
        labels: ['Percentil 10 (pesimista)', 'Percentil 50 (mediana)', 'Percentil 90 (optimista)'],
        datasets: [{
          label: 'Patrimonio final estimado',
          data: [percentiles.percentil10, percentiles.percentil50, percentiles.percentil90].map((v) => Math.round(v)),
          backgroundColor: [c.c5, c.c1, c.c2]
        }]
      },
      options: { ...opcionesBase(formatoMoneda), plugins: { ...opcionesBase(formatoMoneda).plugins, legend: { display: false } } }
    });
  }

  /** Compara la trayectoria del patrimonio durante el retiro bajo varias estrategias */
  function graficoTrayectoriasEstrategias(id, trayectorias, formatoMoneda) {
    const c = coloresTema();
    const colores = [c.c1, c.c2, c.c3, c.c4, c.c5];
    const primeraSerie = trayectorias[0]?.datos ?? [];
    const labels = primeraSerie.map((p) => `Año ${p.anio}`);

    crearOActualizar(id, {
      type: 'line',
      data: {
        labels,
        datasets: trayectorias.map((t, i) => ({
          label: t.nombre,
          data: t.datos.map((p) => Math.round(p.patrimonio)),
          borderColor: colores[i % colores.length],
          backgroundColor: 'transparent',
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2
        }))
      },
      options: opcionesBase(formatoMoneda)
    });
  }

  /** Histograma real de la distribución de patrimonios finales de Monte Carlo */
  function graficoDistribucionMC(id, patrimoniosFinales, formatoMoneda, numBins = 24) {
    const c = coloresTema();
    if (!patrimoniosFinales || !patrimoniosFinales.length) return;

    const min = patrimoniosFinales[0];
    const max = patrimoniosFinales[patrimoniosFinales.length - 1];
    const ancho = (max - min) / numBins || 1;

    const bins = new Array(numBins).fill(0);
    patrimoniosFinales.forEach((valor) => {
      let idx = Math.floor((valor - min) / ancho);
      if (idx >= numBins) idx = numBins - 1;
      if (idx < 0) idx = 0;
      bins[idx]++;
    });

    const etiquetas = bins.map((_, i) => formatoMoneda(min + ancho * i, 0));

    crearOActualizar(id, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          label: 'Nº de simulaciones',
          data: bins,
          backgroundColor: bins.map((_, i) => (min + ancho * i <= 0 ? c.c5 : c.c1)),
          barPercentage: 1,
          categoryPercentage: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Patrimonio final ≈ ${etiquetas[items[0].dataIndex]}`,
              label: (ctx) => `${ctx.parsed.y} simulaciones`
            }
          }
        },
        scales: {
          x: { display: false, grid: { display: false } },
          y: {
            ticks: { color: c.texto, font: { family: 'IBM Plex Mono' } },
            grid: { color: c.rejilla },
            title: { display: true, text: 'Nº de simulaciones', color: c.texto }
          }
        }
      }
    });
  }

  /** Compara el ingreso anual resultante de cada estrategia de retiro */
  function graficoComparativaEstrategias(id, estrategias, formatoMoneda) {
    const c = coloresTema();
    const paleta = [c.c1, c.c2, c.c3, c.c4, c.c5];
    crearOActualizar(id, {
      type: 'bar',
      data: {
        labels: estrategias.map((e) => e.nombre),
        datasets: [{
          label: 'Ingreso anual estimado',
          data: estrategias.map((e) => Math.round(e.ingresoAnual)),
          backgroundColor: estrategias.map((_, i) => paleta[i % paleta.length])
        }]
      },
      options: {
        ...opcionesBase(formatoMoneda),
        indexAxis: 'y',
        plugins: { ...opcionesBase(formatoMoneda).plugins, legend: { display: false } }
      }
    });
  }

  /** Actualiza el anillo SVG de progreso hacia el Número FI */
  function actualizarAnilloFI(porcentaje) {
    const circle = document.querySelector('.fi-ring__progress');
    if (!circle) return;
    const radio = circle.r.baseVal.value;
    const circunferencia = 2 * Math.PI * radio;
    const clamped = Math.max(0, Math.min(100, porcentaje));
    circle.style.strokeDasharray = `${circunferencia}`;
    circle.style.strokeDashoffset = `${circunferencia * (1 - clamped / 100)}`;
  }

  window.Invierte360Charts = {
    graficoPatrimonio,
    graficoAportesVsGanancias,
    graficoEscenarios,
    graficoMonteCarlo,
    graficoDistribucionMC,
    graficoComparativaEstrategias,
    graficoTrayectoriasEstrategias,
    actualizarAnilloFI
  };
})();
