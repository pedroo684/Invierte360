/**
 * fiEngine.js
 * Motor de cálculo de independencia financiera de Invierte360.
 * Sin dependencias externas. Exporta funciones puras sobre `window.FIEngine`.
 */

(function () {
  'use strict';

  /**
   * Datos de entrada esperados (todas las cifras en la moneda del usuario, anuales salvo indicado):
   * {
   *   patrimonioInicial: number,
   *   aporteMensual: number,
   *   aporteAnual: number,
   *   crecimientoAnual: number,      // % ej. 7 = 7%
   *   inflacionAnual: number,        // % ej. 3 = 3%
   *   edadActual: number,
   *   edadObjetivo: number,          // opcional, si no se da se calcula por Número FI
   *   gastoAnual: number,
   *   tasaRetiro: number,            // % ej. 4 = regla del 4%
   *   impuestos: number,             // % opcional sobre la rentabilidad
   *   comisionBroker: number         // % opcional anual sobre patrimonio
   * }
   */

  const MESES_POR_ANIO = 12;

  function toDecimal(pct) {
    return (Number(pct) || 0) / 100;
  }

  /** Número FI: patrimonio necesario para vivir del gasto anual a la tasa de retiro dada */
  function calcularNumeroFI(gastoAnual, tasaRetiro) {
    const tasa = toDecimal(tasaRetiro);
    if (tasa <= 0) return 0;
    return gastoAnual / tasa;
  }

  /**
   * Proyecta el patrimonio mes a mes hasta alcanzar el Número FI o un límite de años.
   * Devuelve una serie temporal completa además de los hitos clave.
   */
  function proyectar(input) {
    const {
      patrimonioInicial = 0,
      aporteMensual = 0,
      aporteAnual = 0,
      crecimientoAnual = 7,
      inflacionAnual = 3,
      edadActual = 30,
      gastoAnual = 0,
      tasaRetiro = 4,
      impuestos = 0,
      comisionBroker = 0,
      limiteAnios = 60
    } = input;

    const numeroFI = calcularNumeroFI(gastoAnual, tasaRetiro);

    const tasaMensualBruta = Math.pow(1 + toDecimal(crecimientoAnual), 1 / MESES_POR_ANIO) - 1;
    const costeAnualBps = toDecimal(comisionBroker);
    const impuestoBps = toDecimal(impuestos);
    // La comisión del bróker se descuenta directamente del patrimonio; los impuestos
    // se aplican sobre la parte de rentabilidad generada cada mes (aproximación simple).
    const tasaMensualNeta = tasaMensualBruta * (1 - impuestoBps) - (costeAnualBps / MESES_POR_ANIO);
    const inflacionMensual = Math.pow(1 + toDecimal(inflacionAnual), 1 / MESES_POR_ANIO) - 1;

    const seriesMensual = [];
    const seriesAnual = [];

    let patrimonioNominal = patrimonioInicial;
    let totalAportado = patrimonioInicial;
    let mesesTranscurridos = 0;
    let mesFI = null;
    const maxMeses = limiteAnios * MESES_POR_ANIO;

    for (let mes = 0; mes <= maxMeses; mes++) {
      const factorInflacionAcumulado = Math.pow(1 + inflacionMensual, mes);
      const patrimonioReal = patrimonioNominal / factorInflacionAcumulado;

      seriesMensual.push({
        mes,
        edad: edadActual + mes / MESES_POR_ANIO,
        patrimonioNominal,
        patrimonioReal,
        totalAportado
      });

      if (mes % MESES_POR_ANIO === 0) {
        seriesAnual.push({
          anio: mes / MESES_POR_ANIO,
          edad: edadActual + mes / MESES_POR_ANIO,
          patrimonioNominal,
          patrimonioReal,
          totalAportado,
          ganancias: patrimonioNominal - totalAportado
        });
      }

      if (mesFI === null && numeroFI > 0 && patrimonioReal >= numeroFI) {
        mesFI = mes;
      }

      if (mesFI !== null && mes % MESES_POR_ANIO === 0 && mes > 0) break;

      // Avanzar un mes: rendimiento + aportes
      patrimonioNominal = patrimonioNominal * (1 + tasaMensualNeta) + aporteMensual;
      totalAportado += aporteMensual;

      if ((mes + 1) % MESES_POR_ANIO === 0) {
        patrimonioNominal += aporteAnual;
        totalAportado += aporteAnual;
      }

      mesesTranscurridos = mes + 1;
    }

    const anosRestantes = mesFI !== null ? mesFI / MESES_POR_ANIO : null;
    const edadRetiro = anosRestantes !== null ? edadActual + anosRestantes : null;
    const ingresoPasivoAnual = numeroFI * toDecimal(tasaRetiro);

    return {
      numeroFI,
      anosRestantes,
      edadRetiro,
      ingresoPasivoAnual,
      alcanzado: mesFI !== null,
      seriesMensual,
      seriesAnual,
      patrimonioFinalNominal: seriesMensual[seriesMensual.length - 1]?.patrimonioNominal ?? patrimonioInicial,
      patrimonioFinalReal: seriesMensual[seriesMensual.length - 1]?.patrimonioReal ?? patrimonioInicial
    };
  }

  /** Genera los tres escenarios estándar variando la rentabilidad esperada */
  function generarEscenarios(input) {
    const ajustes = {
      conservador: -2,
      tradicional: 0,
      optimista: 2
    };
    const resultado = {};
    Object.keys(ajustes).forEach((clave) => {
      resultado[clave] = proyectar({
        ...input,
        crecimientoAnual: Math.max(0, (Number(input.crecimientoAnual) || 0) + ajustes[clave])
      });
    });
    return resultado;
  }

  /**
   * Simulación Monte Carlo: aplica variabilidad aleatoria (distribución normal aproximada)
   * a la rentabilidad anual durante la fase de retiro para estimar probabilidad de éxito.
   */
  function simulacionMonteCarlo(input, opciones = {}) {
    const {
      iteraciones = 2000,
      aniosRetiro = 30,
      mediaRentabilidad = Number(input.crecimientoAnual) || 7,
      volatilidad = 15 // desviación estándar anual en %
    } = opciones;

    const numeroFI = calcularNumeroFI(input.gastoAnual, input.tasaRetiro);
    const gastoAnual = Number(input.gastoAnual) || 0;
    const inflacion = toDecimal(input.inflacionAnual);

    let exitos = 0;
    const patrimoniosFinales = [];

    for (let i = 0; i < iteraciones; i++) {
      let patrimonio = numeroFI;
      let gasto = gastoAnual;
      let sobrevive = true;

      for (let anio = 0; anio < aniosRetiro; anio++) {
        const rendimiento = muestraNormal(mediaRentabilidad, volatilidad) / 100;
        patrimonio = patrimonio * (1 + rendimiento) - gasto;
        gasto = gasto * (1 + inflacion);

        if (patrimonio <= 0) {
          sobrevive = false;
          break;
        }
      }

      if (sobrevive) exitos++;
      patrimoniosFinales.push(Math.max(0, patrimonio));
    }

    patrimoniosFinales.sort((a, b) => a - b);
    const percentil = (p) => patrimoniosFinales[Math.floor(p * (patrimoniosFinales.length - 1))];

    return {
      probabilidadExito: (exitos / iteraciones) * 100,
      iteraciones,
      percentil10: percentil(0.1),
      percentil50: percentil(0.5),
      percentil90: percentil(0.9)
    };
  }

  /** Aproximación Box-Muller para muestrear una distribución normal */
  function muestraNormal(media, desviacion) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return media + z0 * desviacion;
  }

  /** Compara estrategias de retiro sobre el patrimonio proyectado al momento FI */
  function compararEstrategiasRetiro(patrimonioFI, gastoAnualDeseado) {
    return [
      {
        nombre: 'Regla del 4%',
        tasa: 4,
        ingresoAnual: patrimonioFI * 0.04,
        ventaja: 'Simple y ampliamente estudiada (Trinity Study).',
        desventaja: 'No se adapta a mercados bajistas prolongados.'
      },
      {
        nombre: 'Regla del 3%',
        tasa: 3,
        ingresoAnual: patrimonioFI * 0.03,
        ventaja: 'Mayor margen de seguridad para retiros muy largos.',
        desventaja: 'Exige un patrimonio bastante mayor.'
      },
      {
        nombre: 'Regla del 5%',
        tasa: 5,
        ingresoAnual: patrimonioFI * 0.05,
        ventaja: 'Permite retirarse antes con menos capital.',
        desventaja: 'Mayor riesgo de agotar el patrimonio.'
      },
      {
        nombre: 'VPW (Variable Percentage Withdrawal)',
        tasa: null,
        ingresoAnual: patrimonioFI * 0.045,
        ventaja: 'El retiro se ajusta cada año a la esperanza de vida y al mercado.',
        desventaja: 'Los ingresos anuales son menos predecibles.'
      },
      {
        nombre: 'Guyton-Klinger',
        tasa: null,
        ingresoAnual: gastoAnualDeseado,
        ventaja: 'Reglas de ajuste que protegen el capital en caídas fuertes.',
        desventaja: 'Más compleja de aplicar sin herramientas.'
      }
    ];
  }

  window.FIEngine = {
    calcularNumeroFI,
    proyectar,
    generarEscenarios,
    simulacionMonteCarlo,
    compararEstrategiasRetiro
  };
})();
