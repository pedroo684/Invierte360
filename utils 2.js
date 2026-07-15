/**
 * utils.js
 * Funciones de formato compartidas por toda la aplicación.
 */

(function () {
  'use strict';

  function formatoMoneda(valor, decimales = 0) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: decimales
    }).format(valor);
  }

  function formatoNumero(valor, decimales = 0) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: decimales }).format(valor);
  }

  function formatoPorcentaje(valor, decimales = 1) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    return `${formatoNumero(valor, decimales)}%`;
  }

  function fechaEstimada(aniosDesdeHoy) {
    if (aniosDesdeHoy === null || aniosDesdeHoy === undefined) return '—';
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + Math.round(aniosDesdeHoy * 12));
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fecha);
  }

  function debounce(fn, espera = 250) {
    let temporizador;
    return (...args) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => fn(...args), espera);
    };
  }

  window.Invierte360Utils = {
    formatoMoneda,
    formatoNumero,
    formatoPorcentaje,
    fechaEstimada,
    debounce
  };
})();
