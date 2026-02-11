
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

    // 2. Información del Cliente
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATOS DEL CLIENTE", 20, 60);

    doc.setDrawColor(230, 230, 230);
    doc.line(20, 62, 190, 62);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let y = 72;
    const drawField = (label: string, value: string, x: number) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.text(value || 'N/A', x + 30, y);
    };

    drawField("CONTACTO:", info.customerName, 20);
    drawField("RUT:", info.customerRut, 120);
    y += 7;
    drawField("EMPRESA:", info.customerCompany, 20);
    drawField("GIRO:", info.customerGiro, 120);
    y += 7;
    drawField("EMAIL:", info.customerEmail, 20);

    // 3. Tabla de Productos
    const tableRows = products.map((p, idx) => {
      const deliveryText = p.deliveryType === 'immediate'
        ? '[Entrega Inmediata]'
        : `[Importación: ${p.deliveryDays} días hábiles]`;

      return [
        idx + 1,
        {
          content: `${p.name}\n${p.description}\n${deliveryText}\nMarca: ${p.brand}`,
          styles: { fontStyle: 'bold' }
        },
        p.quantity,
        unitLabels[p.unit],
        `$${(p.netPrice || 0).toLocaleString('es-CL')}`,
        `$${(p.quantity * (p.netPrice || 0)).toLocaleString('es-CL')}`
      ];
    });

    autoTable(doc, {
      startY: 100,
      head: [['#', 'Descripción Técnica / Logística', 'Cant.', 'Unid.', 'Precio Unit.', 'Subtotal']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor as [number, number, number],
        textColor: 255,
        fontSize: 9,
        halign: 'center',
        fontStyle: 'bold'
      },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' },
      }
    });

    // 4. Resumen de Totales
    const finalY = (doc as any).lastAutoTable.finalY + 15;
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

    // 5. Pie de Página con Datos Corporativos de Inprotar
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.line(20, pageHeight - 45, 190, pageHeight - 45);

    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DE FACTURACIÓN Y CONTACTO - INPROTAR", 20, pageHeight - 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Razón Social: COMERCIALIZADORA DE BIENES Y SERVICIOS TARDONES SPA", 20, pageHeight - 34);
    doc.text("RUT: 77.223.082 - 6", 20, pageHeight - 30);
    doc.text("Domicilio: CAMINO DEL PARQUE 425 LT 84 PORTAL CHAMISERO", 20, pageHeight - 26);

    doc.text("Correo Electrónico: info@inprotar.cl", 130, pageHeight - 34);
    doc.text("Teléfono: +56 9 9089 4601", 130, pageHeight - 30);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("Web: www.inprotar.cl", 130, pageHeight - 26);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text("Validez de la cotización: 15 días corridos. Precios netos sujetos a IVA.", 105, pageHeight - 15, { align: 'center' });

    doc.save(`Cotizacion_Inprotar_${info.quoteNumber}.pdf`);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Hubo un error al generar el PDF. Revisa la consola para más detalles.");
  }
};
