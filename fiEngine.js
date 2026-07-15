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
      aniosRetiro,
      mediaRentabilidad,
      volatilidad,
      exitos,
      fracasos: iteraciones - exitos,
      percentil10: percentil(0.1),
      percentil25: percentil(0.25),
      percentil50: percentil(0.5),
      percentil75: percentil(0.75),
      percentil90: percentil(0.9),
      patrimoniosFinales
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
        desventaja: 'No se adapta a mercados bajistas prolongados.',
        comoFunciona: 'Retiras el 4% de tu patrimonio inicial el primer año y, a partir de ahí, ajustas esa cantidad fija cada año según la inflación, sin mirar cómo evoluciona el mercado.'
      },
      {
        nombre: 'Regla del 3%',
        tasa: 3,
        ingresoAnual: patrimonioFI * 0.03,
        ventaja: 'Mayor margen de seguridad para retiros muy largos.',
        desventaja: 'Exige un patrimonio bastante mayor.',
        comoFunciona: 'Misma mecánica que la regla del 4%, pero con una tasa inicial más conservadora, pensada para retiros de más de 40 años o para quienes priorizan la seguridad sobre el gasto.'
      },
      {
        nombre: 'Regla del 5%',
        tasa: 5,
        ingresoAnual: patrimonioFI * 0.05,
        ventaja: 'Permite retirarse antes con menos capital.',
        desventaja: 'Mayor riesgo de agotar el patrimonio.',
        comoFunciona: 'Misma mecánica que la regla del 4%, con una tasa inicial más agresiva. Solo recomendable con retiros cortos o con ingresos adicionales (pensión, alquileres) que reduzcan la dependencia de la cartera.'
      },
      {
        nombre: 'VPW (Variable Percentage Withdrawal)',
        tasa: null,
        ingresoAnual: patrimonioFI * 0.045,
        ventaja: 'El retiro se ajusta cada año a la esperanza de vida y al mercado.',
        desventaja: 'Los ingresos anuales son menos predecibles.',
        comoFunciona: 'Cada año retiras un porcentaje distinto de tu patrimonio actual (no del inicial), calculado según los años de retiro que te quedan. Si el mercado cae, retiras menos en euros; si sube, retiras más.'
      },
      {
        nombre: 'Guyton-Klinger',
        tasa: null,
        ingresoAnual: gastoAnualDeseado,
        ventaja: 'Reglas de ajuste que protegen el capital en caídas fuertes.',
        desventaja: 'Más compleja de aplicar sin herramientas.',
        comoFunciona: 'Parte de una tasa similar al 4-5%, pero aplica "barreras": si el mercado cae mucho, recorta temporalmente el gasto un 10%; si sube mucho, te permite un extra. Requiere revisión anual activa.'
      }
    ];
  }

  /**
   * Simula año a año la evolución del patrimonio durante el retiro bajo una estrategia
   * de retiro concreta. Devuelve la trayectoria completa para poder graficarla.
   *
   * tipo: 'fija' (4%/3%/5%, retiro real constante ajustado por inflación),
   *       'vpw' (porcentaje variable según años restantes — aproximación simplificada),
   *       'guyton-klinger' (retiro real con barreras de +/-20% sobre la tasa inicial —
   *        versión simplificada de las reglas originales, con fines educativos).
   */
  function simularTrayectoriaEstrategia(opciones) {
    const {
      patrimonioInicial,
      tasaInicial = 4,
      aniosRetiro = 30,
      rendimientoAnual = 6,
      inflacionAnual = 3
    } = opciones;
    const tipo = opciones.tipo || 'fija';

    const inflacion = toDecimal(inflacionAnual);
    const tasaInicialDecimal = toDecimal(tasaInicial);
    const gastoInicial = patrimonioInicial * tasaInicialDecimal;

    let patrimonio = patrimonioInicial;
    let gastoFijo = gastoInicial;
    const trayectoria = [{ anio: 0, patrimonio, gasto: gastoInicial, agotado: false }];

    for (let anio = 1; anio <= aniosRetiro; anio++) {
      if (patrimonio <= 0) {
        trayectoria.push({ anio, patrimonio: 0, gasto: 0, agotado: true });
        continue;
      }

      let gastoDelAnio;

      if (tipo === 'vpw') {
        const aniosRestantes = Math.max(1, aniosRetiro - anio + 1);
        const tasaVPW = Math.min(1 / aniosRestantes * 1.15, 0.12);
        gastoDelAnio = patrimonio * tasaVPW;
      } else if (tipo === 'guyton-klinger') {
        const tasaActual = gastoFijo / patrimonio;
        if (tasaActual > tasaInicialDecimal * 1.2) {
          gastoFijo *= 0.9; // barrera superior: recorte del 10%
        } else if (tasaActual < tasaInicialDecimal * 0.8) {
          gastoFijo *= 1.1; // barrera inferior: aumento del 10%
        }
        gastoDelAnio = gastoFijo;
        gastoFijo *= 1 + inflacion;
      } else {
        // 'fija': regla del 4%/3%/5% clásica — retiro real constante
        gastoDelAnio = gastoFijo;
        gastoFijo *= 1 + inflacion;
      }

      patrimonio = Math.max(0, (patrimonio - gastoDelAnio) * (1 + toDecimal(rendimientoAnual)));
      trayectoria.push({ anio, patrimonio, gasto: gastoDelAnio, agotado: patrimonio <= 0 });
    }

    return trayectoria;
  }

  /** Agrupa un array de valores numéricos en `numBins` intervalos para un histograma */
  function construirHistograma(valores, numBins = 12) {
    if (!valores || !valores.length) return [];
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min || 1;
    const ancho = rango / numBins;

    const bins = Array.from({ length: numBins }, (_, i) => ({
      inicio: min + i * ancho,
      fin: min + (i + 1) * ancho,
      cuenta: 0
    }));

    valores.forEach((v) => {
      let idx = Math.floor((v - min) / ancho);
      if (idx >= numBins) idx = numBins - 1;
      if (idx < 0) idx = 0;
      bins[idx].cuenta++;
    });

    return bins;
  }

  /**
   * Ejecuta la simulación Monte Carlo para varias tasas de retiro (p.ej. 3%, 4%, 5%)
   * usando el mismo gasto anual deseado, para comparar la probabilidad de éxito de cada una.
   */
  function compararTasasRetiroMC(input, tasas = [3, 4, 5], opciones = {}) {
    return tasas.map((tasa) => {
      const resultado = simulacionMonteCarlo({ ...input, tasaRetiro: tasa }, opciones);
      return {
        tasa,
        patrimonioNecesario: calcularNumeroFI(input.gastoAnual, tasa),
        ingresoAnual: input.gastoAnual,
        probabilidadExito: resultado.probabilidadExito
      };
    });
  }

  window.FIEngine = {
    calcularNumeroFI,
    proyectar,
    generarEscenarios,
    simulacionMonteCarlo,
    compararEstrategiasRetiro,
    simularTrayectoriaEstrategia,
    construirHistograma,
    compararTasasRetiroMC
  };
})();
