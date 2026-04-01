import { createApprovedRequestPdfBlob, getApprovedRequestPdfFilename } from './requestPdf';

test('creates a PDF blob for an approved fuel slip', async () => {
  const request = {
    requestNo: 'VR-2026-0311-002',
    status: 'Approved',
    requestedBy: 'Paolo Reyes',
    approver: 'Marina Santos',
    branch: 'North Cluster',
    purpose: 'Member visit and field inspection',
    destination: 'San Pablo',
    departureDatetime: '2026-03-11T08:15:00',
    expectedReturnDatetime: '2026-03-11T17:30:00',
    passengerCount: 2,
    passengerNames: ['Lina Perez'],
    assignedVehicle: 'Montero Response',
    assignedDriver: 'Joel Ramirez',
    fuelRequested: true,
    fuelAmount: 3500,
    fuelLiters: 52,
    estimatedKms: 468,
    fuelRemarks: 'Full tank before dispatch.',
    notes: 'Bring the trip envelope.',
    approvedAt: '2026-03-11T07:55:00',
  };

  const pdfBlob = createApprovedRequestPdfBlob(request);
  const pdfText = await new Response(pdfBlob).text();

  expect(pdfBlob.type).toBe('application/pdf');
  expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
  expect(pdfText).toContain('Approved Ticket and Fuel Slip');
  expect(pdfText).toContain('Fuel Slip');
  expect(getApprovedRequestPdfFilename(request)).toBe('VR-2026-0311-002-fuel-slip.pdf');
});

test('keeps approved ticket without fuel on a single page when notes are empty', async () => {
  const request = {
    requestNo: 'VR-2026-0401-014',
    status: 'Ready for Release',
    requestedBy: 'Pael Langka',
    approver: 'admin',
    branch: 'Barbaza Main',
    purpose: 'fsd',
    destination: 'fsdf',
    departureDatetime: '2026-04-01T23:02:00',
    expectedReturnDatetime: '2026-04-02T07:02:00',
    passengerCount: 3,
    passengerNames: ['fsdf', 'fsdf'],
    assignedVehicle: 'Ford Ranger',
    assignedDriver: 'Joel Ramirez',
    fuelRequested: false,
    notes: '',
    approvedAt: '2026-04-01T15:08:00',
  };

  const pdfBlob = createApprovedRequestPdfBlob(request);
  const pdfText = await new Response(pdfBlob).text();

  expect(pdfText).toContain('/Count 1');
  expect(pdfText).not.toContain('No notes provided.');
  expect(pdfText).toContain('SIGNATORIES');
});
