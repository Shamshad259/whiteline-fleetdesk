import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { companyConfig } from "../config/companyConfig";
import logoUrl from "../assets/logo.png";

const toBase64FromUrl = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const formatSAR = (amount) =>
  `SAR ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const d = value?.toDate?.() || new Date(value);
  return d.toLocaleDateString("en-GB", {
    calendar: "gregory",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export async function generateInvoicePdf(invoice) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  let y = 12;

  let logoBase64 = null;
  try {
    logoBase64 = await toBase64FromUrl(logoUrl);
  } catch (e) {
    console.warn("Logo load failed:", e);
  }

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 22, 22);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(companyConfig.name, pageW / 2, y + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(companyConfig.address, pageW / 2, y + 13, { align: "center" });
  doc.text(
    `${companyConfig.phone}   |   ${companyConfig.crNumber}   |   ${companyConfig.vatNumber}`,
    pageW / 2,
    y + 18,
    { align: "center" },
  );

  y += 28;

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 1;
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(`Invoice Number: ${invoice.invoiceNumber || "—"}`, margin, y);
  doc.text(
    `Invoice Date: ${formatDate(invoice.createdAt || new Date())}`,
    pageW - margin,
    y,
    { align: "right" },
  );
  y += 7;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("Bill To:", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(invoice.customerName || "—", margin, y);
  y += 5;

  if (invoice.snapshot?.vehicleModelName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Vehicle: ${invoice.snapshot.vehicleModelName}${invoice.snapshot.vehiclePlateNumber ? " - " + invoice.snapshot.vehiclePlateNumber : ""}`,
      margin,
      y,
    );
    y += 6;
  } else {
    y += 3;
  }

  const description = invoice.snapshot?.isCustom
    ? invoice.snapshot?.customDescription || "Custom Service"
    : invoice.snapshot?.tierHours
      ? `${invoice.snapshot?.serviceType || "Service"} - ${invoice.snapshot.tierHours} hours`
      : invoice.snapshot?.serviceType || "Service";

  autoTable(doc, {
    startY: y,
    head: [["Description", "Trip Date", "Amount"]],
    body: [
      [
        description,
        formatDate(invoice.snapshot?.tripDate),
        formatSAR(invoice.subtotal),
      ],
    ],
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [20, 20, 20],
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  const summaryRows = [
    {
      label: "Subtotal",
      value: formatSAR(invoice.subtotal || 0),
      isTotal: false,
    },
  ];

  if (invoice.vatApplied) {
    summaryRows.push({
      label: "VAT (15%)",
      value: formatSAR(invoice.vatAmount || 0),
      isTotal: false,
    });
  }

  summaryRows.push({
    label: "Total",
    value: formatSAR(invoice.total || 0),
    isTotal: true,
  });

  const boxW = 75;
  const boxX = pageW - margin - boxW;
  const rowHeight = 8;
  const boxHeight = summaryRows.length * rowHeight;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(boxX, y, boxW, boxHeight, "S");

  summaryRows.forEach((row, index) => {
    const rowTop = y + index * rowHeight;
    const textY = rowTop + rowHeight / 2 + 2.5;

    if (row.isTotal) {
      doc.setFillColor(0, 0, 0);
      doc.rect(boxX, rowTop, boxW, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
    }

    doc.text(row.label, boxX + 5, textY);
    doc.text(row.value, boxX + boxW - 5, textY, { align: "right" });
  });

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${companyConfig.name}   |   ${companyConfig.phone}   |   ${companyConfig.vatNumber}`,
    pageW / 2,
    pageH - 8,
    { align: "center" },
  );

  const fileName = `Invoice_${invoice.invoiceNumber || "download"}.pdf`;
  doc.save(fileName);
}
