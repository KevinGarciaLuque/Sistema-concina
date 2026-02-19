import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * ✅ Genera ticket 80mm con técnica de 2 PASADAS
 * - Primera pasada: calcula altura necesaria
 * - Segunda pasada: genera PDF con altura exacta
 * - Evita que se corte el contenido
 * - Incluye: Logo, CAI, totales detallados, total en letras
 */

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

const formatoLempiras = (valor) =>
  `L ${Number(valor || 0).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmt = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v || "") : d.toLocaleString("es-HN");
};

const round2 = (n) => Number((Number(n) || 0).toFixed(2));
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ===== CONVERTIR NÚMERO A LETRAS =====
const convertirNumeroALetras = (numero) => {
  const unidades = [
    "", "uno", "dos", "tres", "cuatro", "cinco", 
    "seis", "siete", "ocho", "nueve"
  ];

  const decenas = [
    "", "diez", "veinte", "treinta", "cuarenta", "cincuenta",
    "sesenta", "setenta", "ochenta", "noventa"
  ];

  const especiales = {
    11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince",
    16: "dieciséis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve"
  };

  const centenas = [
    "", "ciento", "doscientos", "trescientos", "cuatrocientos",
    "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"
  ];

  const convertir = (n) => {
    if (n === 0) return "cero";
    if (n === 100) return "cien";

    let letras = "";

    const miles = Math.floor(n / 1000);
    const resto = n % 1000;

    if (miles === 1) letras += "mil ";
    else if (miles > 1) letras += `${convertir(miles)} mil `;

    const centena = Math.floor(resto / 100);
    const restoCentena = resto % 100;

    if (centena > 0) letras += `${centenas[centena]} `;

    if (especiales[restoCentena]) {
      letras += `${especiales[restoCentena]} `;
    } else {
      const dec = Math.floor(restoCentena / 10);
      const uni = restoCentena % 10;

      if (dec > 0) {
        letras += decenas[dec];
        if (uni > 0) letras += ` y ${unidades[uni]} `;
        else letras += " ";
      } else if (uni > 0) {
        letras += `${unidades[uni]} `;
      }
    }

    return letras.trim();
  };

  const parteEntera = Math.floor(Number(numero) || 0);
  const parteDecimal = Math.round(((Number(numero) || 0) - parteEntera) * 100);

  let resultado = `${convertir(parteEntera)} Lempiras`;

  if (parteDecimal > 0) {
    resultado += ` con ${convertir(parteDecimal)} centavos`;
  }

  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

export function generarTicket80mmPDF(payload) {
  console.log("📄 Generando ticket con datos:", payload);
  
  const { factura, items, pagos, cai, user, esCopia } = payload || {};
  
  if (!factura) {
    console.error("❌ No hay datos de factura:", payload);
    throw new Error("No hay datos de factura para imprimir.");
  }
  
  console.log("✅ Factura:", factura);
  console.log("✅ Items:", items);
  console.log("✅ Pagos:", pagos);
  console.log("✅ CAI:", cai);

  // Validar que items y pagos sean arrays
  const itemsArray = Array.isArray(items) ? items : [];
  const pagosArray = Array.isArray(pagos) ? pagos : [];
  const caiData = cai || {};
  const userData = user || {};

  console.log("📊 Items array:", itemsArray.length, "items");
  console.log("💰 Pagos array:", pagosArray.length, "pagos");

  // ===== CALCULAR TOTALES =====
  const totalNumerico = round2(safeNum(factura.total));
  const subtotalNumerico = round2(safeNum(factura.subtotal));
  const impuestoNumerico = round2(safeNum(factura.impuesto));
  const descuentoNumerico = round2(safeNum(factura.descuento));

  // Usar datos de impuestos separados si vienen del backend
  const baseGravada15 = round2(safeNum(factura.subtotal_gravado_15 || subtotalNumerico));
  const baseGravada18 = round2(safeNum(factura.subtotal_gravado_18 || 0));
  const isv15 = round2(safeNum(factura.isv_15 || impuestoNumerico));
  const isv18 = round2(safeNum(factura.isv_18 || 0));
  const totalISV = round2(safeNum(factura.total_isv || impuestoNumerico));

  // ===== CONFIGURACIÓN =====
  const ANCHO_MM = 80;
  const MARGEN = 4;
  const X_IZQ = MARGEN;
  const X_DER = ANCHO_MM - MARGEN;
  const X_CENTRO = ANCHO_MM / 2;

  const linea = (doc, y) => {
    doc.setLineWidth(0.2);
    doc.line(X_IZQ, y, X_DER, y);
  };

  // ===== FUNCIÓN DE RENDERIZADO (usada en ambas pasadas) =====
  const renderTicket = (doc) => {
    let y = 8;

    // ===== ENCABEZADO EMPRESA =====
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("Sistema Cocina", X_CENTRO, y, { align: "center" });
    y += 5;
    doc.text("Mega Taco 21", X_CENTRO, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Tegucigalpa, Honduras", X_CENTRO, y, { align: "center" });
    y += 4;
    doc.text("RTN: 0801-1900-10000", X_CENTRO, y, { align: "center" });
    y += 4;
    doc.text("Tel: (504) 9800-0000", X_CENTRO, y, { align: "center" });
    y += 4;

    linea(doc, y);
    y += 5;

    // ===== CAI =====
    doc.setFontSize(9);
    doc.text(`CAI: ${caiData.cai_codigo || "-"}`, X_IZQ, y);
    y += 4;
    doc.text(`Rango Autorizado`, X_IZQ, y);
    y += 4;
    doc.text(`  De: ${caiData.rango_desde || "-"}`, X_IZQ, y);
    y += 4;
    doc.text(`  Hasta: ${caiData.rango_hasta || "-"}`, X_IZQ, y);
    y += 4;
    doc.text(`Fecha Límite Emisión: ${caiData.fecha_limite || "-"}`, X_IZQ, y);
    y += 6;

    // ===== TÍTULO =====
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("FACTURA", X_CENTRO, y, { align: "center" });
    y += 5;

    if (esCopia) {
      doc.setFontSize(10);
      doc.text("COPIA", X_CENTRO, y, { align: "center" });
      y += 5;
    }

    // ===== DATOS FACTURA =====
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`No. ${factura.numero_factura || factura.id}`, X_IZQ, y);
    y += 4;
    doc.text(`Fecha: ${fmt(factura.created_at)}`, X_IZQ, y);
    y += 4;
    doc.text(`Cajero: ${userData.nombre || "Sistema"}`, X_IZQ, y);
    y += 4;

    if (factura.orden_codigo) {
      doc.text(`Orden: ${factura.orden_codigo}`, X_IZQ, y);
      y += 4;
    }

    if (factura.orden_tipo) {
      const mesa =
        factura.orden_tipo === "MESA" && factura.orden_mesa
          ? ` Mesa ${factura.orden_mesa}`
          : "";
      doc.text(`Tipo: ${factura.orden_tipo}${mesa}`, X_IZQ, y);
      y += 4;
    }

    // ===== CLIENTE =====
    doc.text(
      `Cliente: ${factura.cliente_nombre || "Consumidor Final"}`,
      X_IZQ,
      y
    );
    y += 4;

    if (factura.cliente_rtn) {
      doc.text(`RTN: ${factura.cliente_rtn}`, X_IZQ, y);
      y += 4;
    }

    if (factura.cliente_telefono) {
      doc.text(`Tel: ${factura.cliente_telefono}`, X_IZQ, y);
      y += 4;
    }

    if (factura.cliente_direccion) {
      const lineasDir = doc.splitTextToSize(
        `Dirección: ${factura.cliente_direccion}`,
        ANCHO_MM - MARGEN * 2
      );
      lineasDir.forEach((ln) => {
        doc.text(ln, X_IZQ, y);
        y += 4;
      });
    }

    linea(doc, y);
    y += 4;

    // ===== DETALLE (TABLA) =====
    const body = itemsArray.map((it) => {
      const cant = safeNum(it.cantidad);
      const codigo = it.producto_codigo || it.codigo || "-";
      const pu = safeNum(it.precio_unitario);
      const totalLinea = round2(cant * pu);

      const nombre = String(it.producto_nombre || it.nombre || "").trim();
      const descCorta = nombre.length > 16 ? `${nombre.slice(0, 16)}…` : nombre;

      return [
        String(cant),
        String(codigo).slice(0, 8),
        descCorta,
        round2(pu).toFixed(2),
        totalLinea.toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Cant", "Código", "Descripción", "P/U", "Total"]],
      body,

      margin: { left: MARGEN, right: MARGEN },

      styles: {
        fontSize: 8,
        font: "helvetica",
        textColor: 0,
        halign: "center",
        cellPadding: 0.5,
        lineWidth: 0.1,
      },

      headStyles: {
        fillColor: [0, 0, 0],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
        halign: "center",
        lineWidth: 0.2,
      },

      columnStyles: {
        0: { cellWidth: 8 },           // Cant
        1: { cellWidth: 12 },          // Código
        2: { cellWidth: 26, halign: "left" }, // Desc
        3: { cellWidth: 12 },          // P/U
        4: { cellWidth: 14 },          // Total
      },
    });

    y = doc.lastAutoTable.finalY + 3;

    // ===== MODIFICADORES/OPCIONES =====
    doc.setFontSize(8);
    itemsArray.forEach((it) => {
      const ops = it.opciones || [];
      if (!ops.length) return;

      doc.text(`  Extras para ${it.producto_nombre}:`, X_IZQ, y);
      y += 3;

      ops.forEach((o) => {
        const label = o.modificador
          ? `${o.modificador}: ${o.opcion}`
          : o.opcion;
        const extra = Number(o.precio_extra || 0);
        const textoOpcion =
          extra > 0 ? `    - ${label} (+${money(extra)})` : `    - ${label}`;
        doc.text(textoOpcion, X_IZQ, y);
        y += 3;
      });

      y += 1;
    });

    linea(doc, y);
    y += 5;

    // ===== TOTALES DETALLADOS =====
    doc.setFont("helvetica", "normal").setFontSize(10);

    doc.text("Subtotal Exonerado:", X_IZQ, y);
    doc.text(formatoLempiras(0), X_DER, y, { align: "right" });
    y += 4;

    doc.text("Subtotal Exento:", X_IZQ, y);
    doc.text(formatoLempiras(0), X_DER, y, { align: "right" });
    y += 4;

    doc.text("Subtotal Gravado 15%:", X_IZQ, y);
    doc.text(formatoLempiras(baseGravada15), X_DER, y, { align: "right" });
    y += 4;

    if (baseGravada18 > 0) {
      doc.text("Subtotal Gravado 18%:", X_IZQ, y);
      doc.text(formatoLempiras(baseGravada18), X_DER, y, { align: "right" });
      y += 4;
    }

    if (descuentoNumerico > 0) {
      doc.text("Descuentos/Rebajas:", X_IZQ, y);
      doc.text(formatoLempiras(descuentoNumerico), X_DER, y, { align: "right" });
      y += 4;
    }

    doc.text("Subtotal General:", X_IZQ, y);
    doc.text(formatoLempiras(subtotalNumerico), X_DER, y, { align: "right" });
    y += 4;

    doc.text("ISV 15%:", X_IZQ, y);
    doc.text(formatoLempiras(isv15), X_DER, y, { align: "right" });
    y += 4;

    if (isv18 > 0) {
      doc.text("ISV 18%:", X_IZQ, y);
      doc.text(formatoLempiras(isv18), X_DER, y, { align: "right" });
      y += 4;
    }

    doc.text("Total ISV:", X_IZQ, y);
    doc.text(formatoLempiras(totalISV), X_DER, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("TOTAL A PAGAR:", X_IZQ, y);
    doc.text(formatoLempiras(totalNumerico), X_DER, y, { align: "right" });
    y += 6;

    // ===== MÉTODO DE PAGO =====
    doc.setFont("helvetica", "normal").setFontSize(10);

    doc.text("Forma de pago:", X_IZQ, y);
    y += 4;

    pagosArray.forEach((p) => {
      const metodo = String(p.metodo || "").toUpperCase();
      doc.text(`  ${metodo}:`, X_IZQ, y);
      doc.text(formatoLempiras(p.monto), X_DER, y, { align: "right" });
      y += 4;

      if (p.referencia) {
        doc.setFontSize(8);
        doc.text(`    Ref: ${p.referencia}`, X_IZQ, y);
        y += 3;
        doc.setFontSize(10);
      }

      if (metodo === "EFECTIVO" && p.efectivo_recibido != null) {
        doc.setFontSize(9);
        doc.text(`    Pago en efectivo: ${formatoLempiras(p.efectivo_recibido)}`, X_IZQ, y);
        y += 3;
        doc.text(`    Cambio entregado: ${formatoLempiras(p.cambio || 0)}`, X_IZQ, y);
        y += 3;
        doc.setFontSize(10);
      } else if (metodo === "TARJETA") {
        y += 3;
        doc.setFontSize(10);
      }
    });

   
    linea(doc, y);
    y += 5;

    // ===== TOTAL EN LETRAS =====
    doc.setFont("helvetica", "italic").setFontSize(10);
    doc.text("Su cantidad a pagar es de:", X_CENTRO, y, { align: "center" });
    y += 4;

    const textoEnLetras = `"${convertirNumeroALetras(totalNumerico)} Exactos"`;
    const lineas = doc.splitTextToSize(textoEnLetras, ANCHO_MM - MARGEN * 2);
    lineas.forEach((lineaTxt) => {
      doc.text(lineaTxt, X_CENTRO, y, { align: "center" });
      y += 4;
    });

    y += 8;

    // ===== PIE =====
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("*** GRACIAS POR SU COMPRA ***", X_CENTRO, y, {
      align: "center",
    });
    y += 8;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("La factura es beneficio de todos.", X_CENTRO, y, {
      align: "center",
    });
    y += 6;

    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("EXÍJALA", X_CENTRO, y, { align: "center" });

    y += 10;

    return y; // Retorna la posición Y final
  };

  // ===== PASADA 1: Calcular altura necesaria =====
  const docTemporal = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [ANCHO_MM, 600], // Altura generosa para cálculo
  });

  const alturaCalculada = renderTicket(docTemporal);
  const alturaFinal = Math.max(220, Math.ceil(alturaCalculada)); // Mínimo 220mm

  console.log("📏 Altura calculada:", alturaCalculada, "mm");
  console.log("📏 Altura final PDF:", alturaFinal, "mm");

  // ===== PASADA 2: Generar PDF con altura exacta =====
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [ANCHO_MM, alturaFinal],
  });

  renderTicket(doc);

  console.log("✅ PDF generado correctamente");

  // ===== ABRIR PDF =====
  try {
    doc.output("dataurlnewwindow");
    console.log("✅ PDF abierto en nueva ventana");
  } catch (err) {
    console.error("❌ Error al abrir PDF:", err);
    // Alternativa: descargar
    doc.save(`factura-${factura.numero_factura || factura.id}.pdf`);
    console.log("📥 PDF descargado como alternativa");
  }
}
