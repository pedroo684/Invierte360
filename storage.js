/**
 * storage.js
 * Persistencia local de las simulaciones del usuario (LocalStorage).
 * También soporta codificar/decodificar la simulación en la URL para compartir.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'invierte360:simulacion';

  function guardar(datos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
      return true;
    } catch (err) {
      console.error('No se pudo guardar la simulación:', err);
      return false;
    }
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('No se pudo leer la simulación guardada:', err);
      return null;
    }
  }

  function limpiar() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Codifica los datos del formulario en un parámetro de URL compacto (base64) */
  function codificarParaURL(datos) {
    const json = JSON.stringify(datos);
    return btoa(encodeURIComponent(json));
  }

  function decodificarDesdeURL(texto) {
    try {
      const json = decodeURIComponent(atob(texto));
      return JSON.parse(json);
    } catch (err) {
      console.error('No se pudo decodificar la simulación de la URL:', err);
      return null;
    }
  }

  function generarURLCompartible(datos) {
    const url = new URL(window.location.href);
    url.searchParams.set('sim', codificarParaURL(datos));
    return url.toString();
  }

  function leerSimulacionDeURL() {
    const params = new URLSearchParams(window.location.search);
    const sim = params.get('sim');
    return sim ? decodificarDesdeURL(sim) : null;
  }

  window.Invierte360Storage = {
    guardar,
    cargar,
    limpiar,
    generarURLCompartible,
    leerSimulacionDeURL
  };
})();
