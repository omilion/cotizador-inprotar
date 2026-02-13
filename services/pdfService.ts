
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Product, QuoteInfo, UnitType } from "../types";
import logo_inprotar from "../LOGO-fondo-oscuro2.png";


const unitLabels: Record<UnitType, string> = {
  u: 'Unid.',
  m: 'Mts',
  kg: 'Kg',
  cm: 'cm'
};

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

export const generateQuotePDF = async (products: Product[], info: QuoteInfo) => {
  const doc = new jsPDF();
  const primaryColor = [15, 23, 42]; // Slate-900 (Fondo oscuro)
  const accentColor = [37, 99, 235]; // Blue-600

  try {
    // 1. Header Area
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 45, 'F');

    // Borde Azul Separador
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 45, 210, 2, 'F');

    // Logo Inprotar (Ubicado en el header oscuro)
    try {
      doc.addImage(logo_inprotar, 'PNG', 20, 10, 45, 18);
    } catch (e) {
      console.warn("No se pudo cargar el logo para el PDF", e);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("INPROTAR", 20, 25);
    }


    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Soluciones Eléctricas e Industriales", 20, 32);

    // Título de Cotización
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("COTIZACIÓN COMERCIAL", 130, 22);
    doc.setFontSize(11);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(info.quoteNumber, 130, 30);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Fecha: ${info.date}`, 130, 37);

    // 2. Información General (Dos Columnas)
    doc.setTextColor(0, 0, 0);

    // Columna Izquierda: Datos del Cliente
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATOS DEL CLIENTE", 20, 60);
    doc.setDrawColor(37, 99, 235); // Blue
    doc.line(20, 62, 90, 62);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let yLeft = 70;
    const drawLeftField = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, yLeft);
      doc.setFont("helvetica", "normal");
      doc.text(value || 'N/A', 50, yLeft);
      yLeft += 6;
    };

    drawLeftField("CONTACTO:", info.customerName);
    drawLeftField("EMPRESA:", info.customerCompany);
    drawLeftField("RUT:", info.customerRut);
    drawLeftField("GIRO:", info.customerGiro);
    drawLeftField("EMAIL:", info.customerEmail);
    drawLeftField("TELÉFONO:", info.customerPhone);


    // Columna Derecha: Contacto Inprotar
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CONTACTO COMERCIAL", 120, 60);
    doc.line(120, 62, 190, 62);

    doc.setFontSize(9);
    let yRight = 70;

    doc.setFont("helvetica", "bold");
    doc.text("EJECUTIVO:", 120, yRight);
    doc.setFont("helvetica", "normal");
    doc.text("Enzo Tardones", 150, yRight); // Fixed Executive
    yRight += 6;

    doc.setFont("helvetica", "bold");
    doc.text("EMAIL:", 120, yRight);
    doc.setFont("helvetica", "normal");
    doc.text("info@inprotar.cl", 150, yRight);
    yRight += 6;

    doc.setFont("helvetica", "bold");
    doc.text("TELÉFONO:", 120, yRight);
    doc.setFont("helvetica", "normal");
    doc.text("+56 9 9089 4601", 150, yRight);
    yRight += 6;

    doc.setFont("helvetica", "bold");
    doc.text("WEB:", 120, yRight);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(37, 99, 235);
    doc.text("www.inprotar.cl", 150, yRight);
    doc.setTextColor(0, 0, 0);


    // 3. Tabla de Productos
    const tableRows = products.map((p, idx) => {
      const deliveryText = p.deliveryType === 'immediate'
        ? '[Entrega Inmediata]'
        : `[Importación: ${p.deliveryDays} días hábiles]`;

      const descriptionContent = p.description || p.name;
      const codeOrTitle = (p as any).sku || p.name;
      const contentText = `Código: ${codeOrTitle}\n${descriptionContent}\n${deliveryText}`;

      return [
        idx + 1,
        {
          content: contentText,
          styles: { fontStyle: 'bold' as 'bold' }
        },
        p.quantity,
        unitLabels[p.unit] || p.unit,
        `$${(p.netPrice || 0).toLocaleString('es-CL')}`,
        `$${(p.quantity * (p.netPrice || 0)).toLocaleString('es-CL')}`
      ];
    });

    autoTable(doc, {
      startY: 110, // Increased Y to accommodate headers
      head: [['#', 'Código / Descripción', 'Cant.', 'Unid.', 'Precio Unit.', 'Subtotal']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor as [number, number, number],
        textColor: 255,
        fontSize: 9,
        halign: 'center',
        fontStyle: 'bold' as 'bold'
      },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 94 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 24, halign: 'right' },
      }
    });

    // 4. Resumen de Totales
    // Check if we have space for the totals block (approx 40 units) before the footer (starts at pageHeight - 40)
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    const pageHeight = doc.internal.pageSize.getHeight();

    if (finalY > pageHeight - 50) {
      doc.addPage();
      finalY = 20; // Reset to top of new page
    }
    const netTotal = products.reduce((sum, p) => sum + (p.quantity * (p.netPrice || 0)), 0);
    const iva = netTotal * info.ivaRate;
    const total = netTotal + iva;

    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(252, 252, 252);
    doc.rect(125, finalY - 5, 70, 35, 'F');
    doc.rect(125, finalY - 5, 70, 35, 'D');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("SUBTOTAL NETO:", 130, finalY + 5);
    doc.text("IVA (19%):", 130, finalY + 12);

    doc.setFontSize(11);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("TOTAL CLP:", 130, finalY + 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${netTotal.toLocaleString('es-CL')}`, 190, finalY + 5, { align: 'right' });
    doc.text(`$${iva.toLocaleString('es-CL')}`, 190, finalY + 12, { align: 'right' });

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`$${total.toLocaleString('es-CL')}`, 190, finalY + 23, { align: 'right' });

    // 5. Pie de Página con Datos Formales (Abajo del todo)
    // pageHeight is already defined above
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.line(20, pageHeight - 35, 190, pageHeight - 35); // Separator line

    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text("INPROTAR - Soluciones Eléctricas e Industriales", 105, pageHeight - 28, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Razón Social: COMERCIALIZADORA DE BIENES Y SERVICIOS TARDONES SPA | RUT: 77.223.082-6", 105, pageHeight - 22, { align: 'center' });
    doc.text("Domicilio: CAMINO DEL PARQUE 425 LT 84 PORTAL CHAMISERO", 105, pageHeight - 18, { align: 'center' });

    doc.setFont("helvetica", "italic");
    doc.text("Validez de la cotización: 15 días corridos. Precios netos sujetos a IVA.", 105, pageHeight - 12, { align: 'center' });

    doc.save(`Cotizacion_Inprotar_${info.quoteNumber}.pdf`);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Hubo un error al generar el PDF. Revisa la consola para más detalles.");
  }
};
