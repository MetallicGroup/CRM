import { jsPDF } from 'jspdf';

const FONT_SIZE = 9;
const HEADER_FONT = 11;
const TITLE_FONT = 14;
const MARGIN = 14;
const LINE_HEIGHT = 5;

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

export function generateOfertaPdf(data: OfertaPdfData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - 2 * MARGIN;

  const drawText = (text: string, x: number, fontSize?: number) => {
    doc.setFontSize(fontSize ?? FONT_SIZE);
    doc.text(text, x, y);
    y += LINE_HEIGHT;
  };

  const drawLine = () => {
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 4;
  };

  // Header - METALLIC GROUP
  doc.setFontSize(TITLE_FONT);
  doc.setFont('helvetica', 'bold');
  doc.text('METALLIC GROUP', MARGIN, y);
  y += 6;
  doc.setFontSize(HEADER_FONT);
  doc.text('OFERTA / COMANDA CLIENT', MARGIN, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_SIZE);

  // Agent / Company block
  drawText(`${data.agentName}`, MARGIN);
  drawText(`${data.agentTitle}`, MARGIN);
  drawText(`Tel: ${data.agentPhone}  |  ${data.agentEmail}`, MARGIN);
  drawText(`www.metallicgroup.ro`, MARGIN);
  drawText(data.agentAddress, MARGIN);
  y += 4;

  // Client section
  doc.setFont('helvetica', 'bold');
  drawText('DATE CLIENT', MARGIN);
  doc.setFont('helvetica', 'normal');
  drawText(`Client: ${data.client}`, MARGIN);
  drawText(`CNP / CUI: ${data.cnpCui}`, MARGIN);
  drawText(`Telefon: ${data.telefon}`, MARGIN);
  drawText(`Strada: ${data.strada}`, MARGIN);
  drawText(`Localitate: ${data.localitate}`, MARGIN);
  drawText(`Județ: ${data.judet}`, MARGIN);
  drawText(`Culoare: ${data.culoare}`, MARGIN);
  drawLine();

  // Configurare ofertă
  doc.setFont('helvetica', 'bold');
  drawText('CONFIGURARE', MARGIN);
  doc.setFont('helvetica', 'normal');
  drawText(`Model gard: ${data.modelGard}  |  Grosime: ${data.grosime}  |  Discount: ${data.discountPercent}%`, MARGIN);
  drawLine();

  // Desfășurator panouri
  doc.setFont('helvetica', 'bold');
  drawText('DESFĂȘURATOR PANOURI', MARGIN);
  doc.setFont('helvetica', 'normal');
  y += 2;
  const tableCols = [35, 30, 30, 25, 30];
  const tableHeaders = ['Lungime (L)', 'Înălțime (H)', 'Nr panouri', 'MP', 'Valoare'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let x = MARGIN;
  tableHeaders.forEach((h, i) => {
    doc.text(h, x, y);
    x += tableCols[i];
  });
  y += 5;
  doc.setFont('helvetica', 'normal');

  const pretPerMp = data.totalMp > 0 ? data.totalValoareGard / data.totalMp : 0;
  data.panouri.forEach((row) => {
    if (row.mp <= 0) return;
    x = MARGIN;
    doc.text(String(row.lungime), x, y); x += tableCols[0];
    doc.text(String(row.inaltime), x, y); x += tableCols[1];
    doc.text(String(row.nrPanouri), x, y); x += tableCols[2];
    doc.text(row.mp.toFixed(2), x, y); x += tableCols[3];
    const valLinie = row.mp * pretPerMp;
    doc.text(`${valLinie.toFixed(2)} lei`, x, y);
    y += 5;
  });
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL MP: ${data.totalMp.toFixed(2)}`, MARGIN, y);
  doc.text(`TOTAL VALOARE GARD METALIC: ${data.totalValoareGard.toFixed(2)} lei`, MARGIN + 60, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  drawLine();

  // Accesorii auxiliare
  doc.setFont('helvetica', 'bold');
  drawText('ACCESORII AUXILIARE', MARGIN);
  doc.setFont('helvetica', 'normal');
  const accCols = [70, 20, 25, 30, 35];
  const accHeaders = ['Denumire', 'U.M.', 'Cant.', 'Preț/buc', 'Total'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  x = MARGIN;
  accHeaders.forEach((h, i) => {
    doc.text(h, x, y);
    x += accCols[i];
  });
  y += 5;
  doc.setFont('helvetica', 'normal');
  data.accesorii.forEach((a) => {
    if (a.cant <= 0) return;
    x = MARGIN;
    doc.text(a.denumire.substring(0, 35), x, y); x += accCols[0];
    doc.text(a.um, x, y); x += accCols[1];
    doc.text(String(a.cant), x, y); x += accCols[2];
    doc.text(`${a.pretBuc} lei`, x, y); x += accCols[3];
    doc.text(`${a.total.toFixed(2)} lei`, x, y);
    y += 5;
  });
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL VALOARE ACCESORII: ${data.totalValoareAccesorii.toFixed(2)} lei`, MARGIN, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  drawLine();

  // Total general
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`DISCOUNT: ${data.discountPercent}% (preț achiziție)`, MARGIN, y);
  y += 8;
  doc.setFontSize(14);
  doc.text(`TOTAL GENERAL: ${data.totalGeneral.toFixed(2)} lei`, MARGIN, y);

  doc.save(`Oferta_${(data.client || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
