import { COOP_LOGO_PDF_ASSET } from './coopLogoPdfAsset';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_X = 28;
const PAGE_MARGIN_TOP = 24;
const PAGE_MARGIN_BOTTOM = 24;
const CONTENT_WIDTH = PAGE_WIDTH - (PAGE_MARGIN_X * 2);
const HEADER_HEIGHT = 52;
const BODY_FONT_SIZE = 8;
const SMALL_FONT_SIZE = 7;
const TITLE_FONT_SIZE = 11;
const SECTION_FONT_SIZE = 8;
const BODY_LINE_HEIGHT = 10;
const CELL_PADDING_X = 5;
const CELL_PADDING_Y = 4;
const SECTION_GAP = 8;
const PDF_HEADER = '%PDF-1.4\n';
const HAS_LOGO_ASSET = Boolean(COOP_LOGO_PDF_ASSET?.hex && COOP_LOGO_PDF_ASSET?.width && COOP_LOGO_PDF_ASSET?.height);

function getHeaderLogoLayout(boxBottom) {
  const logoLeft = PAGE_MARGIN_X + 8;
  const logoGapRight = 8;
  const maxLogoWidth = 56;
  const maxLogoHeight = HEADER_HEIGHT - 6;
  const logoAspect = (COOP_LOGO_PDF_ASSET?.width && COOP_LOGO_PDF_ASSET?.height)
    ? (COOP_LOGO_PDF_ASSET.width / COOP_LOGO_PDF_ASSET.height)
    : 1;

  let logoWidth = maxLogoWidth;
  let logoHeight = logoAspect > 0 ? (logoWidth / logoAspect) : maxLogoHeight;

  if (logoHeight > maxLogoHeight) {
    logoHeight = maxLogoHeight;
    logoWidth = logoHeight * (logoAspect || 1);
  }

  return {
    logoLeft,
    logoWidth,
    logoHeight,
    logoBottom: boxBottom + ((HEADER_HEIGHT - logoHeight) / 2),
    titleLeft: logoLeft + logoWidth + logoGapRight,
  };
}

function formatPdfDateTime(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
}

function formatPdfNumber(value, maximumFractionDigits = 2) {
  const parsedValue = Number(value || 0);

  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number.isFinite(parsedValue) ? parsedValue : 0);
}

function toPdfSafeText(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .split('')
    .map((character) => {
      const codePoint = character.charCodeAt(0);

      if (codePoint === 10 || (codePoint >= 32 && codePoint <= 126)) {
        return character;
      }

      return ' ';
    })
    .join('')
    .trimEnd();
}

function escapePdfText(value) {
  return toPdfSafeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(value, fontSize, width) {
  const sourceText = toPdfSafeText(value);

  if (!sourceText) {
    return ['-'];
  }

  const paragraphs = sourceText.split('\n');
  const maxChars = Math.max(8, Math.floor(width / Math.max(fontSize * 0.52, 1)));
  const wrappedLines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (!words.length) {
      wrappedLines.push('');
      return;
    }

    let currentLine = words.shift() || '';

    words.forEach((word) => {
      const nextLine = `${currentLine} ${word}`.trim();

      if (nextLine.length <= maxChars) {
        currentLine = nextLine;
        return;
      }

      wrappedLines.push(currentLine);
      currentLine = word;
    });

    wrappedLines.push(currentLine);
  });

  return wrappedLines.length ? wrappedLines : ['-'];
}

function buildTextCommand(text, x, y, fontName = 'F1', fontSize = BODY_FONT_SIZE) {
  return `BT /${fontName} ${fontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;
}

function buildRectCommand(x, y, width, height) {
  return `${x} ${y} ${width} ${height} re S`;
}

function startNewPage(pages) {
  const page = {
    commands: [
      '0 G',
      '0.6 w',
    ],
    y: PAGE_HEIGHT - PAGE_MARGIN_TOP,
  };

  pages.push(page);
  return page;
}

function ensurePageSpace(pages, requiredHeight) {
  let currentPage = pages[pages.length - 1];

  if (!currentPage || currentPage.y - requiredHeight < PAGE_MARGIN_BOTTOM) {
    currentPage = startNewPage(pages);
  }

  return currentPage;
}

function addHeader(pages, request, title) {
  const currentPage = ensurePageSpace(pages, HEADER_HEIGHT);
  const boxBottom = currentPage.y - HEADER_HEIGHT;
  const { logoLeft, logoWidth, logoHeight, logoBottom, titleLeft } = getHeaderLogoLayout(boxBottom);
  const rightColumnX = PAGE_MARGIN_X + CONTENT_WIDTH - 108;

  currentPage.commands.push(buildRectCommand(PAGE_MARGIN_X, boxBottom, CONTENT_WIDTH, HEADER_HEIGHT));
  if (HAS_LOGO_ASSET) {
    currentPage.commands.push('q');
    currentPage.commands.push(`${logoWidth} 0 0 ${logoHeight} ${logoLeft} ${logoBottom} cm`);
    currentPage.commands.push('/Im1 Do');
    currentPage.commands.push('Q');
  }
  currentPage.commands.push(buildTextCommand('BMPC VEHICLE MANAGEMENT SYSTEM', titleLeft, currentPage.y - 13, 'F2', SMALL_FONT_SIZE));
  currentPage.commands.push(buildTextCommand(title, titleLeft, currentPage.y - 30, 'F2', TITLE_FONT_SIZE));
  currentPage.commands.push(buildTextCommand(request?.requestNo || '-', rightColumnX, currentPage.y - 18, 'F2', SMALL_FONT_SIZE));
  currentPage.commands.push(buildTextCommand(String(request?.status || 'Approved'), rightColumnX, currentPage.y - 34, 'F1', SMALL_FONT_SIZE));

  currentPage.y = boxBottom - SECTION_GAP;
}

function addSectionLabel(pages, title) {
  const currentPage = ensurePageSpace(pages, 14);
  currentPage.commands.push(buildTextCommand(title, PAGE_MARGIN_X, currentPage.y - 2, 'F2', SECTION_FONT_SIZE));
  currentPage.y -= 14;
}

function addTable(pages, rows, columnWidths, options = {}) {
  const {
    fontSize = BODY_FONT_SIZE,
    lineHeight = BODY_LINE_HEIGHT,
    labelColumns = [],
    headerRows = 0,
    gapAfter = SECTION_GAP,
  } = options;

  rows.forEach((row, rowIndex) => {
    ensurePageSpace(pages, 18);
    const absoluteWidths = columnWidths.map((fraction) => CONTENT_WIDTH * fraction);
    const lineSets = row.map((value, cellIndex) =>
      wrapText(value, fontSize, absoluteWidths[cellIndex] - (CELL_PADDING_X * 2))
    );
    const contentHeight = Math.max(...lineSets.map((lines) => Math.max(1, lines.length))) * lineHeight;
    const rowHeight = contentHeight + (CELL_PADDING_Y * 2);
    const page = ensurePageSpace(pages, rowHeight);
    const rowTop = page.y;
    let cellX = PAGE_MARGIN_X;

    row.forEach((_, cellIndex) => {
      const cellWidth = absoluteWidths[cellIndex];
      page.commands.push(buildRectCommand(cellX, rowTop - rowHeight, cellWidth, rowHeight));

      const fontName = (rowIndex < headerRows || labelColumns.includes(cellIndex)) ? 'F2' : 'F1';
      const lines = lineSets[cellIndex];
      let textY = rowTop - CELL_PADDING_Y - lineHeight + 2;

      lines.forEach((line) => {
        page.commands.push(buildTextCommand(line, cellX + CELL_PADDING_X, textY, fontName, fontSize));
        textY -= lineHeight;
      });

      cellX += cellWidth;
    });

    page.y -= rowHeight;
  });

  const currentPage = ensurePageSpace(pages, gapAfter);
  currentPage.y -= gapAfter;
}

function buildPdfObjects(pageStreams) {
  const imageObjectNumber = HAS_LOGO_ASSET ? 5 : null;
  const firstPageObjectNumber = HAS_LOGO_ASSET ? 6 : 5;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    `2 0 obj\n<< /Type /Pages /Count ${pageStreams.length} /Kids [${pageStreams
      .map((_, index) => `${firstPageObjectNumber + (index * 2)} 0 R`)
      .join(' ')}] >>\nendobj\n`,
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  if (HAS_LOGO_ASSET) {
    const imageHexStream = `${COOP_LOGO_PDF_ASSET.hex}>`;
    const imageObject = `${imageObjectNumber} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${COOP_LOGO_PDF_ASSET.width} /Height ${COOP_LOGO_PDF_ASSET.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${imageHexStream.length} >>\nstream\n${imageHexStream}\nendstream\nendobj\n`;
    objects.push(imageObject);
  }

  pageStreams.forEach((stream, index) => {
    const pageObjectNumber = firstPageObjectNumber + (index * 2);
    const contentObjectNumber = pageObjectNumber + 1;
    const xObjectSegment = HAS_LOGO_ASSET ? ` /XObject << /Im1 ${imageObjectNumber} 0 R >>` : '';

    objects.push(
      `${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xObjectSegment} >> /Contents ${contentObjectNumber} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObjectNumber} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  });

  return objects;
}

function assemblePdfDocument(objects) {
  let pdf = PDF_HEADER;
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function buildPageStreams(request) {
  const pages = [];
  const isFuelSlip = Boolean(request?.fuelRequested);
  const trimmedNotes = String(request?.notes || '').trim();
  const passengerNames = Array.isArray(request?.passengerNames) ? request.passengerNames.filter(Boolean) : [];
  const passengerSummary = Number(request?.passengerCount || 0) <= 1
    ? 'Driver only'
    : (passengerNames.length ? passengerNames.join(', ') : 'No passenger names provided.');
  const approvedAt = request?.approvedAt || request?.approved_at || request?.updatedAt || request?.createdAt || new Date().toISOString();
  const title = isFuelSlip ? 'Approved Ticket and Fuel Slip' : 'Approved Ticket';
  const signatureName = '________________________________';

  startNewPage(pages);
  addHeader(pages, request, title);

  if (isFuelSlip) {
    addSectionLabel(pages, 'REQUEST SNAPSHOT');
    addTable(
      pages,
      [
        ['Request No', request?.requestNo || '-', 'Branch', request?.branch || '-'],
        ['Requester', request?.requestedBy || '-', 'Approved By', request?.approver || 'Pending'],
        ['Status', String(request?.status || 'Approved'), 'Approved At', formatPdfDateTime(approvedAt)],
      ],
      [0.18, 0.32, 0.18, 0.32],
      { labelColumns: [0, 2] }
    );

    addSectionLabel(pages, 'TRIP RELEASE');
    addTable(
      pages,
      [
        ['Destination', request?.destination || '-', 'Departure', formatPdfDateTime(request?.departureDatetime)],
        ['Assigned Vehicle', request?.assignedVehicle || 'Unassigned', 'Assigned Driver', request?.assignedDriver || 'Unassigned'],
      ],
      [0.18, 0.32, 0.18, 0.32],
      { labelColumns: [0, 2] }
    );

    addSectionLabel(pages, 'FUEL AUTHORIZATION');
    addTable(
      pages,
      [
        ['Fuel Product', String(request?.fuelProduct || 'diesel').replace(/_/g, ' '), 'Expected Return', formatPdfDateTime(request?.expectedReturnDatetime)],
        ['Authorized Amount', `PHP ${formatPdfNumber(request?.fuelAmount, 2)}`, 'Approved Liters', `${formatPdfNumber(request?.fuelLiters, 2)} L`],
        ['Estimated Range', `${formatPdfNumber(request?.estimatedKms, 2)} KM`, 'Fuel Remarks', request?.fuelRemarks || '-'],
      ],
      [0.18, 0.32, 0.18, 0.32],
      { labelColumns: [0, 2] }
    );

    addSectionLabel(pages, 'ISSUANCE ACKNOWLEDGEMENT');
    addTable(
      pages,
      [
        ['Pump Station', '________________________', 'Date Issued', '________________________'],
        ['Issued By', '________________________', 'Received By', request?.assignedDriver || request?.requestedBy || '________________________'],
      ],
      [0.18, 0.32, 0.18, 0.32],
      { labelColumns: [0, 2], gapAfter: 4 }
    );
  } else {
    addSectionLabel(pages, 'REQUEST SUMMARY');
    addTable(
      pages,
      [
        ['Request No', request?.requestNo || '-', 'Status', String(request?.status || 'Approved')],
        ['Requester', request?.requestedBy || '-', 'Branch', request?.branch || '-'],
        ['Approved By', request?.approver || 'Pending', 'Approved At', formatPdfDateTime(approvedAt)],
      ],
      [0.18, 0.32, 0.18, 0.32],
      { labelColumns: [0, 2] }
    );

    addSectionLabel(pages, 'TRIP DETAILS');
    addTable(
      pages,
      [
        ['Purpose', request?.purpose || '-', 'Destination', request?.destination || '-'],
        ['Departure', formatPdfDateTime(request?.departureDatetime), 'Expected Return', formatPdfDateTime(request?.expectedReturnDatetime)],
        ['Passenger Count', String(request?.passengerCount || 0), 'Passenger Manifest', passengerSummary],
        ['Assigned Vehicle', request?.assignedVehicle || 'Unassigned', 'Assigned Driver', request?.assignedDriver || 'Unassigned'],
      ],
      [0.18, 0.32, 0.18, 0.32],
      { labelColumns: [0, 2] }
    );

    addSectionLabel(pages, 'FUEL SLIP');
    addTable(
      pages,
      [
        ['Fuel Status', 'No fuel authorization requested for this trip.'],
      ],
      [0.22, 0.78],
      { labelColumns: [0] }
    );

    if (trimmedNotes) {
      addSectionLabel(pages, 'NOTES');
      addTable(
        pages,
        [
          ['Request Notes', trimmedNotes],
        ],
        [0.22, 0.78],
        { labelColumns: [0] }
      );
    }

    addSectionLabel(pages, 'SIGNATORIES');
    addTable(
      pages,
      [
        ['Requested By', 'Approved By', 'Driver'],
        [
          request?.requestedBy || signatureName,
          request?.approver || signatureName,
          request?.assignedDriver || signatureName,
        ],
      ],
      [0.3334, 0.3333, 0.3333],
      { headerRows: 1, gapAfter: 4 }
    );
  }

  return pages.map((page, index) => {
    const commands = [...page.commands];
    commands.push(buildTextCommand(`Generated ${formatPdfDateTime(new Date().toISOString())}`, PAGE_MARGIN_X, 12, 'F1', SMALL_FONT_SIZE));
    commands.push(buildTextCommand(`Page ${index + 1} of ${pages.length}`, PAGE_WIDTH - 56, 12, 'F1', SMALL_FONT_SIZE));
    return commands.join('\n');
  });
}

export function getApprovedRequestPdfFilename(request) {
  const requestNo = String(request?.requestNo || 'approved-ticket').replace(/[^A-Za-z0-9_-]+/g, '-');
  const suffix = request?.fuelRequested ? 'fuel-slip' : 'ticket';
  return `${requestNo}-${suffix}.pdf`;
}

export function createApprovedRequestPdfBlob(request) {
  const pageStreams = buildPageStreams(request || {});
  const objects = buildPdfObjects(pageStreams);
  const pdfDocument = assemblePdfDocument(objects);

  return new Blob([pdfDocument], { type: 'application/pdf' });
}

export function openApprovedRequestPdf(request, previewWindow = null) {
  const pdfBlob = createApprovedRequestPdfBlob(request);
  const pdfUrl = URL.createObjectURL(pdfBlob);

  if (previewWindow && !previewWindow.closed) {
    previewWindow.location.replace(pdfUrl);
    previewWindow.focus();
  } else {
    const openedWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');

    if (!openedWindow) {
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
      return false;
    }
  }

  setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
  return true;
}
