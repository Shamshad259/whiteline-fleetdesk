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

export async function generateTimesheetPdf({ entries, filterLabel }) {
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
  doc.text("TIMESHEET REPORT", pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB", { calendar: "gregory", day: "2-digit", month: "short", year: "numeric" })}`,
    pageW - margin,
    y,
    { align: "right" },
  );
  y += 5;

  if (filterLabel) {
    doc.text(`Filter: ${filterLabel}`, margin, y);
    y += 5;
  }

  y += 3;

  const totalEntries = entries.length;
  const totalKm = entries.reduce(
    (sum, entry) => sum + (Number(entry.totalKm) || 0),
    0,
  );
  const totalExpenses = entries.reduce(
    (sum, entry) => sum + (Number(entry.totalExpenses) || 0),
    0,
  );

  const boxW = (pageW - margin * 2 - 8) / 3;
  const boxes = [
    { label: "Total Entries", value: totalEntries.toString() },
    { label: "Total KM", value: totalKm.toLocaleString("en-IN") },
    { label: "Total Expenses", value: formatSAR(totalExpenses) },
  ];

  boxes.forEach((box, index) => {
    const boxX = margin + index * (boxW + 4);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.rect(boxX, y, boxW, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(box.label, boxX + boxW / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 20);
    doc.text(box.value, boxX + boxW / 2, y + 11, { align: "center" });
  });

  y += 20;

  const tableRows = entries.map((entry) => [
    entry.driverName || "Unknown Driver",
    formatDate(entry.shiftDate),
    entry.serviceRef || "—",
    `${entry.pickupLocation || "—"} - ${entry.pickupTime || "—"}`,
    entry.destination || "—",
    entry.totalKm == null || entry.totalKm === "" ? "—" : entry.totalKm,
    formatSAR(entry.totalExpenses),
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Driver",
        "Shift Date",
        "Service Ref",
        "Pickup",
        "Destination",
        "Total KM",
        "Expenses (SAR)",
      ],
    ],
    body: tableRows,
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
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 24 },
      2: { cellWidth: 22 },
      3: { cellWidth: 33 },
      4: { cellWidth: 33 },
      5: { halign: "center", cellWidth: 18 },
      6: { halign: "right", cellWidth: 24 },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  const boxX = pageW - margin - 70;
  doc.setFillColor(0, 0, 0);
  doc.rect(boxX, y, 70, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Total:", boxX + 4, y + 6.5);
  doc.text(formatSAR(totalExpenses), pageW - margin - 4, y + 6.5, {
    align: "right",
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

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`Timesheet_Report_${date}.pdf`);
}
