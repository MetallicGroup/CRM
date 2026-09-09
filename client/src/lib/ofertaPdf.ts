import { jsPDF } from 'jspdf';

const FONT_SIZE = 9;
const MARGIN = 14;
const GOLD: [number, number, number] = [201, 162, 39]; // #C9A227
const CHARCOAL: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [100, 100, 100];
const LIGHT_BG: [number, number, number] = [247, 247, 245];

export interface OfertaPdfData {
  agentName: string;
  agentTitle: string;
  agentPhone: string;
  agentEmail: string;
  agentAddress: string;
  client: string;
  cnpCui: string;
  telefon: string;
  strada: string;
  localitate: string;
  judet: string;
  culoare: string;
  modelGard: string;
  grosime: string;
  discountPercent: number;
  panouri: { lungime: number; inaltime: number; nrPanouri: number; mp: number }[];
  accesorii: { denumire: string; um: string; cant: number; pretBuc: number; total: number }[];
  totalMp: number;
  totalValoareGard: number;
  totalValoareAccesorii: number;
  totalGeneral: number;
}

export interface AccesoriiPdfData {
  agentName: string;
  agentTitle: string;
  agentPhone: string;
  agentEmail: string;
  agentAddress: string;
  client: string;
  cnpCui: string;
  telefon: string;
  strada: string;
  localitate: string;
  judet: string;
  accesorii: { denumire: string; um: string; cant: number; pretBuc: number; total: number }[];
  totalValoareAccesorii: number;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/metallic-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawGoldRule(doc: jsPDF, y: number, pageWidth: number) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
}

function drawSectionLabel(doc: jsPDF, text: string, y: number, pageWidth: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(text.toUpperCase(), MARGIN, y);
  y += 2;
  drawGoldRule(doc, y, pageWidth);
  return y + 5;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, pageWidth: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

async function drawHeader(
  doc: jsPDF,
  title: string,
  pageWidth: number,
): Promise<number> {
  const logo = await loadLogoDataUrl();
  // Logo real: 767×128 → ratio ~6:1 — nu-l comprima pe verticală
  const logoH = 14;
  const logoW = logoH * (767 / 128); // ~84mm
  const headerH = 26;

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  if (logo) {
    doc.addImage(logo, 'PNG', MARGIN, (headerH - logoH) / 2, logoW, logoH);
  } else {
    doc.setTextColor(...GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('METALLIC GROUP', MARGIN, 16);
  }

  doc.setTextColor(220, 220, 220);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('www.metallicgroup.ro', pageWidth - MARGIN, headerH / 2 + 1.5, { align: 'right' });

  let y = headerH + 10;
  doc.setTextColor(...CHARCOAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, MARGIN, y);
  y += 3;
  drawGoldRule(doc, y, pageWidth);
  return y + 8;
}

function drawAgentBlock(doc: jsPDF, data: {
  agentName: string;
  agentTitle: string;
  agentPhone: string;
  agentEmail: string;
  agentAddress: string;
}, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...CHARCOAL);
  doc.text(data.agentName, MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(data.agentTitle, MARGIN, y);
  y += 4.5;
  doc.text(`Tel: ${data.agentPhone}  |  ${data.agentEmail}`, MARGIN, y);
  y += 4.5;
  doc.text('www.metallicgroup.ro', MARGIN, y);
  y += 4.5;
  doc.text(data.agentAddress, MARGIN, y);
  return y + 6;
}

function drawClientBlock(doc: jsPDF, data: {
  client: string;
  cnpCui: string;
  telefon: string;
  strada: string;
  localitate: string;
  judet: string;
  culoare?: string;
}, y: number, pageWidth: number): number {
  y = drawSectionLabel(doc, 'Date client', y, pageWidth);
  doc.setFillColor(...LIGHT_BG);
  const blockH = data.culoare ? 36 : 32;
  doc.rect(MARGIN, y - 3, pageWidth - 2 * MARGIN, blockH, 'F');
  // gold accent bar
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y - 3, 1.2, blockH, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CHARCOAL);
  const leftX = MARGIN + 4;
  const rows: [string, string][] = [
    ['Client', data.client],
    ['CNP / CUI', data.cnpCui],
    ['Telefon', data.telefon],
    ['Strada', data.strada],
    ['Localitate', data.localitate],
    ['Judet', data.judet],
  ];
  if (data.culoare) rows.push(['Culoare', data.culoare]);

  for (const [label, value] of rows) {
    doc.setTextColor(...MUTED);
    doc.text(`${label}:`, leftX, y);
    doc.setTextColor(...CHARCOAL);
    doc.setFont('helvetica', 'bold');
    doc.text(value, leftX + 28, y);
    doc.setFont('helvetica', 'normal');
    y += 4.5;
  }
  return y + 4;
}

function drawTableHeader(
  doc: jsPDF,
  headers: string[],
  cols: number[],
  y: number,
): number {
  const tableW = cols.reduce((s, c) => s + c, 0);
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y - 3.5, tableW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let x = MARGIN + 1;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += cols[i];
  });
  return y + 5;
}

export async function generateOfertaPdf(data: OfertaPdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = await drawHeader(doc, 'OFERTA / COMANDA CLIENT', pageWidth);

  y = drawAgentBlock(doc, data, y);
  y = drawClientBlock(doc, data, y, pageWidth);

  y = drawSectionLabel(doc, 'Configurare', y, pageWidth);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CHARCOAL);
  const configParts = [
    `Model gard: ${data.modelGard}`,
    `Grosime: ${data.grosime}`,
  ];
  if (data.discountPercent > 0) {
    configParts.push(`Discount: ${data.discountPercent}%`);
  }
  doc.text(configParts.join('  |  '), MARGIN, y);
  y += 8;

  y = ensureSpace(doc, y, 40, pageWidth);
  y = drawSectionLabel(doc, 'Desfasurator panouri', y, pageWidth);
  const tableCols = [35, 30, 30, 25, 40];
  const tableHeaders = ['Lungime (L)', 'Inaltime (H)', 'Nr panouri', 'MP', 'Valoare'];
  y = drawTableHeader(doc, tableHeaders, tableCols, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...CHARCOAL);
  const pretPerMp = data.totalMp > 0 ? data.totalValoareGard / data.totalMp : 0;
  data.panouri.forEach((row) => {
    if (row.mp <= 0) return;
    y = ensureSpace(doc, y, 8, pageWidth);
    let x = MARGIN + 1;
    const vals = [
      String(row.lungime),
      String(row.inaltime),
      String(row.nrPanouri),
      row.mp.toFixed(2),
      `${(row.mp * pretPerMp).toFixed(2)} lei`,
    ];
    vals.forEach((v, i) => {
      doc.text(v, x, y);
      x += tableCols[i];
    });
    y += 5;
  });

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL MP: ${data.totalMp.toFixed(2)}`, MARGIN, y);
  doc.text(`TOTAL VALOARE GARD METALIC: ${data.totalValoareGard.toFixed(2)} lei`, MARGIN + 55, y);
  y += 8;

  y = ensureSpace(doc, y, 40, pageWidth);
  y = drawSectionLabel(doc, 'Accesorii auxiliare', y, pageWidth);
  const accCols = [72, 18, 20, 28, 30];
  const accHeaders = ['Denumire', 'U.M.', 'Cant.', 'Pret/buc', 'Total'];
  y = drawTableHeader(doc, accHeaders, accCols, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...CHARCOAL);
  data.accesorii.forEach((a) => {
    if (a.cant <= 0) return;
    y = ensureSpace(doc, y, 8, pageWidth);
    let x = MARGIN + 1;
    const vals = [
      a.denumire.substring(0, 38),
      a.um,
      String(a.cant),
      `${a.pretBuc} lei`,
      `${a.total.toFixed(2)} lei`,
    ];
    vals.forEach((v, i) => {
      doc.text(v, x, y);
      x += accCols[i];
    });
    y += 5;
  });

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL VALOARE ACCESORII: ${data.totalValoareAccesorii.toFixed(2)} lei`, MARGIN, y);
  y += 10;

  y = ensureSpace(doc, y, 25, pageWidth);
  drawGoldRule(doc, y, pageWidth);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...CHARCOAL);
  if (data.discountPercent > 0) {
    doc.text(`DISCOUNT: ${data.discountPercent}% (pret achizitie)`, MARGIN, y);
    y += 8;
  }
  doc.setFontSize(14);
  doc.setTextColor(...GOLD);
  doc.text(`TOTAL GENERAL: ${data.totalGeneral.toFixed(2)} lei`, MARGIN, y);

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Metallic Group  ·  Document comercial', MARGIN, pageHeight - 7);
  doc.text('1 / 1', pageWidth - MARGIN, pageHeight - 7, { align: 'right' });

  doc.save(`Oferta_${(data.client || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generateAccesoriiPdf(data: AccesoriiPdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = await drawHeader(doc, 'ACCESORII AUXILIARE - OFERTA', pageWidth);

  y = drawAgentBlock(doc, data, y);
  y = drawClientBlock(doc, data, y, pageWidth);

  y = drawSectionLabel(doc, 'Accesorii auxiliare', y, pageWidth);
  const accCols = [72, 18, 20, 28, 30];
  const accHeaders = ['Denumire', 'U.M.', 'Cant.', 'Pret/buc', 'Total'];
  y = drawTableHeader(doc, accHeaders, accCols, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...CHARCOAL);
  data.accesorii.forEach((a) => {
    if (a.cant <= 0) return;
    y = ensureSpace(doc, y, 8, pageWidth);
    let x = MARGIN + 1;
    const vals = [
      a.denumire.substring(0, 40),
      a.um,
      String(a.cant),
      `${a.pretBuc} lei`,
      `${a.total.toFixed(2)} lei`,
    ];
    vals.forEach((v, i) => {
      doc.text(v, x, y);
      x += accCols[i];
    });
    y += 5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(`TOTAL VALOARE ACCESORII: ${data.totalValoareAccesorii.toFixed(2)} lei`, MARGIN, y);

  doc.save(`Accesorii_${(data.client || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
