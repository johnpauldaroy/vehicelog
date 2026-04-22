import { useEffect, useMemo, useState } from 'react';
import SectionCard from '../components/SectionCard';
import StatBarChart from '../components/StatBarChart';
import StatusBadge from '../components/StatusBadge';
import StatusRingChart from '../components/StatusRingChart';
import SummaryGrid from '../components/SummaryGrid';
import { exportToCSV, formatDate } from '../utils/appHelpers';

const REPORT_DEFINITIONS = [
  { id: 'requests', label: 'Request Summary' },
  { id: 'trips', label: 'Trip History' },
  { id: 'vehicles', label: 'Vehicle Utilization' },
  { id: 'fuel', label: 'Fuel Authorization' },
  { id: 'maintenance', label: 'Maintenance / Compliance' },
];

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function matchesDateRange(value, startDate, endDate) {
  const dateValue = String(value || '').slice(0, 10);

  if (!dateValue) {
    return !startDate && !endDate;
  }

  if (startDate && dateValue < startDate) {
    return false;
  }

  if (endDate && dateValue > endDate) {
    return false;
  }

  return true;
}

function getTripBranch(trip) {
  return trip.origin || 'Unknown';
}

function getTripDate(trip) {
  return trip.dateOut || trip.expectedReturn || trip.actualReturnDatetime || trip.dateIn || '';
}

function toChartItems(counts, toneMap = {}) {
  return Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({
      label,
      value,
      helper: `${value} record${value === 1 ? '' : 's'}`,
      tone: toneMap[label] || 'blue',
    }));
}

export default function ReportsPage({
  mode,
  currentUser,
  branchRecords,
  requestRecords,
  tripRecords,
  vehicleRecords,
  maintenanceRecords,
  incidentRecords,
}) {
  const isAdmin = mode === 'admin';
  const [activeReport, setActiveReport] = useState('requests');
  const [branchFilter, setBranchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [requesterFilter, setRequesterFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  const vehicleById = useMemo(
    () => new Map(vehicleRecords.map((vehicle) => [vehicle.id, vehicle])),
    [vehicleRecords]
  );
  const vehicleByName = useMemo(
    () => new Map(vehicleRecords.map((vehicle) => [vehicle.vehicleName, vehicle])),
    [vehicleRecords]
  );

  const scopedRequests = requestRecords;
  const scopedTrips = isAdmin
    ? tripRecords
    : tripRecords.filter((trip) => getTripBranch(trip) === currentUser.branch);
  const scopedVehicles = isAdmin
    ? vehicleRecords
    : vehicleRecords.filter((vehicle) => vehicle.branch === currentUser.branch);
  const scopedMaintenance = isAdmin
    ? maintenanceRecords
    : maintenanceRecords.filter((entry) => entry.branch === currentUser.branch);
  const scopedIncidents = isAdmin
    ? incidentRecords
    : incidentRecords.filter((incident) => {
        const linkedVehicle = vehicleById.get(incident.vehicleId) || vehicleByName.get(incident.vehicle);
        return linkedVehicle?.branch === currentUser.branch;
      });

  const effectiveBranch = isAdmin ? branchFilter : currentUser.branch;

  const branchOptions = useMemo(() => {
    if (!isAdmin) {
      return [currentUser.branch];
    }

    return uniqueValues(branchRecords.map((branch) => branch.name));
  }, [branchRecords, currentUser.branch, isAdmin]);

  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((request) => {
      const matchesBranch = !effectiveBranch || request.branch === effectiveBranch;
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesRequester = requesterFilter === 'all' || request.requestedBy === requesterFilter;
      return matchesBranch
        && matchesStatus
        && matchesRequester
        && matchesDateRange(request.departureDatetime, startDate, endDate);
    });
  }, [effectiveBranch, endDate, requesterFilter, scopedRequests, startDate, statusFilter]);

  const filteredTrips = useMemo(() => {
    return scopedTrips.filter((trip) => {
      const matchesBranch = !effectiveBranch || getTripBranch(trip) === effectiveBranch;
      const matchesStatus = statusFilter === 'all' || trip.tripStatus === statusFilter;
      const matchesVehicle = vehicleFilter === 'all' || trip.vehicle === vehicleFilter;
      const matchesDriver = driverFilter === 'all' || trip.driver === driverFilter;
      return matchesBranch
        && matchesStatus
        && matchesVehicle
        && matchesDriver
        && matchesDateRange(getTripDate(trip), startDate, endDate);
    });
  }, [driverFilter, effectiveBranch, endDate, scopedTrips, startDate, statusFilter, vehicleFilter]);

  const filteredVehicles = useMemo(() => {
    const branchScopedTrips = scopedTrips.filter((trip) => !effectiveBranch || getTripBranch(trip) === effectiveBranch);
    const dateScopedTrips = branchScopedTrips.filter((trip) => matchesDateRange(getTripDate(trip), startDate, endDate));

    return scopedVehicles
      .filter((vehicle) => {
        const matchesBranch = !effectiveBranch || vehicle.branch === effectiveBranch;
        const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
        const matchesVehicle = vehicleFilter === 'all' || vehicle.vehicleName === vehicleFilter;
        return matchesBranch && matchesStatus && matchesVehicle;
      })
      .map((vehicle) => {
        const relatedTrips = dateScopedTrips.filter((trip) => trip.vehicleId === vehicle.id || trip.vehicle === vehicle.vehicleName);
        const activeTripCount = relatedTrips.filter((trip) => ['Ready for Release', 'Checked Out', 'In Transit', 'Overdue'].includes(trip.tripStatus)).length;

        return {
          ...vehicle,
          tripCount: relatedTrips.length,
          activeTripCount,
        };
      })
      .sort((left, right) => right.tripCount - left.tripCount || left.vehicleName.localeCompare(right.vehicleName));
  }, [effectiveBranch, endDate, scopedTrips, scopedVehicles, startDate, statusFilter, vehicleFilter]);

  const fuelScopeRequests = useMemo(() => {
    return scopedRequests.filter((request) => {
      const matchesBranch = !effectiveBranch || request.branch === effectiveBranch;
      const matchesRequester = requesterFilter === 'all' || request.requestedBy === requesterFilter;
      const matchesVehicle = vehicleFilter === 'all' || request.assignedVehicle === vehicleFilter;
      return matchesBranch
        && matchesRequester
        && matchesVehicle
        && matchesDateRange(request.departureDatetime, startDate, endDate);
    });
  }, [effectiveBranch, endDate, requesterFilter, scopedRequests, startDate, vehicleFilter]);

  const filteredFuelRequests = useMemo(
    () => fuelScopeRequests.filter((request) => request.fuelRequested),
    [fuelScopeRequests]
  );

  const filteredMaintenance = useMemo(() => {
    return scopedMaintenance.filter((entry) => {
      const matchesBranch = !effectiveBranch || entry.branch === effectiveBranch;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesVehicle = vehicleFilter === 'all' || entry.vehicle === vehicleFilter;
      return matchesBranch
        && matchesStatus
        && matchesVehicle
        && matchesDateRange(entry.scheduleDate || entry.completedDate, startDate, endDate);
    });
  }, [effectiveBranch, endDate, scopedMaintenance, startDate, statusFilter, vehicleFilter]);

  const filteredIncidents = useMemo(() => {
    return scopedIncidents.filter((incident) => {
      const linkedVehicle = vehicleById.get(incident.vehicleId) || vehicleByName.get(incident.vehicle);
      const incidentBranch = linkedVehicle?.branch || '';
      const matchesBranch = !effectiveBranch || incidentBranch === effectiveBranch;
      const matchesVehicle = vehicleFilter === 'all' || incident.vehicle === vehicleFilter;
      return matchesBranch
        && matchesVehicle
        && matchesDateRange(incident.incidentDatetime, startDate, endDate);
    });
  }, [effectiveBranch, endDate, scopedIncidents, startDate, vehicleById, vehicleByName, vehicleFilter]);

  const statusOptions = useMemo(() => {
    switch (activeReport) {
      case 'trips':
        return uniqueValues(scopedTrips.map((trip) => trip.tripStatus));
      case 'vehicles':
        return uniqueValues(scopedVehicles.map((vehicle) => vehicle.status));
      case 'maintenance':
        return uniqueValues(scopedMaintenance.map((entry) => entry.status));
      case 'requests':
        return uniqueValues(scopedRequests.map((request) => request.status));
      default:
        return [];
    }
  }, [activeReport, scopedMaintenance, scopedRequests, scopedTrips, scopedVehicles]);

  const requesterOptions = useMemo(
    () => uniqueValues(scopedRequests.map((request) => request.requestedBy)),
    [scopedRequests]
  );
  const vehicleOptions = useMemo(
    () => uniqueValues(scopedVehicles.map((vehicle) => vehicle.vehicleName)),
    [scopedVehicles]
  );
  const driverOptions = useMemo(
    () => uniqueValues(scopedTrips.map((trip) => trip.driver)),
    [scopedTrips]
  );

  const reportModel = useMemo(() => {
    switch (activeReport) {
      case 'trips': {
        const summaryItems = [
          { label: 'Trips', value: filteredTrips.length, helper: 'Filtered trip records', tone: 'green', icon: 'trips' },
          { label: 'Ready', value: filteredTrips.filter((trip) => trip.tripStatus === 'Ready for Release').length, helper: 'Waiting for dispatch', tone: 'amber', icon: 'release' },
          { label: 'Active', value: filteredTrips.filter((trip) => ['Checked Out', 'In Transit'].includes(trip.tripStatus)).length, helper: 'Currently moving', tone: 'blue', icon: 'trips' },
          { label: 'Overdue', value: filteredTrips.filter((trip) => trip.tripStatus === 'Overdue').length, helper: 'Need follow-up', tone: 'red', icon: 'warning' },
        ];
        const chartItems = toChartItems(
          filteredTrips.reduce((map, trip) => {
            map[trip.tripStatus] = (map[trip.tripStatus] || 0) + 1;
            return map;
          }, {}),
          { 'Ready for Release': 'amber', 'Checked Out': 'blue', 'In Transit': 'blue', Overdue: 'red', Returned: 'green', Closed: 'green' }
        );
        const ringItems = [
          { label: 'Ready', value: filteredTrips.filter((trip) => trip.tripStatus === 'Ready for Release').length, helper: 'Ready for release', tone: 'amber' },
          { label: 'Active', value: filteredTrips.filter((trip) => ['Checked Out', 'In Transit'].includes(trip.tripStatus)).length, helper: 'Checked out or in transit', tone: 'blue' },
          { label: 'Returned', value: filteredTrips.filter((trip) => trip.tripStatus === 'Returned').length, helper: 'Returned trips', tone: 'green' },
          { label: 'Overdue', value: filteredTrips.filter((trip) => trip.tripStatus === 'Overdue').length, helper: 'Need follow-up', tone: 'red' },
        ].filter((item) => item.value > 0);

        return {
          summaryItems,
          chartTitle: 'Trip status breakdown',
          chartCopy: 'Shows where trip records are within the dispatch lifecycle.',
          chartItems,
          ringTitle: 'Trip mix',
          ringItems,
          tableColumns: ['Request', 'Vehicle', 'Driver', 'Branch', 'Status', 'Timing', 'Mileage'],
          tableRows: filteredTrips.map((trip) => ({
            key: trip.id,
            cells: [
              trip.requestNo,
              trip.vehicle,
              trip.driver,
              getTripBranch(trip),
              { type: 'status', value: trip.tripStatus },
              `${formatDate(trip.dateOut || trip.expectedReturn, true)} / Return ${formatDate(trip.expectedReturn, true)}`,
              trip.mileageComputed || 0,
            ],
          })),
          exportRows: filteredTrips.map((trip) => ({
            request_no: trip.requestNo,
            vehicle: trip.vehicle,
            driver: trip.driver,
            branch: getTripBranch(trip),
            trip_status: trip.tripStatus,
            date_out: trip.dateOut,
            expected_return: trip.expectedReturn,
            date_in: trip.dateIn,
            mileage_computed: trip.mileageComputed || 0,
          })),
          exportName: 'Trip_History_Report',
          emptyMessage: 'No trip records match the active filters.',
        };
      }
      case 'vehicles': {
        const summaryItems = [
          { label: 'Vehicles', value: filteredVehicles.length, helper: 'Fleet in scope', tone: 'green', icon: 'vehicles' },
          { label: 'Available', value: filteredVehicles.filter((vehicle) => vehicle.status === 'available').length, helper: 'Ready to assign', tone: 'green', icon: 'check' },
          { label: 'Reserved', value: filteredVehicles.filter((vehicle) => vehicle.status === 'reserved').length, helper: 'Held for requests', tone: 'amber', icon: 'clock' },
          { label: 'In use', value: filteredVehicles.filter((vehicle) => vehicle.status === 'in_use').length, helper: 'Out on trips', tone: 'blue', icon: 'trips' },
        ];
        const chartItems = filteredVehicles.slice(0, 6).map((vehicle) => ({
          label: vehicle.vehicleName,
          value: vehicle.tripCount,
          valueLabel: `${vehicle.tripCount} trip${vehicle.tripCount === 1 ? '' : 's'}`,
          helper: `${vehicle.activeTripCount} active or release-ready`,
          tone: vehicle.tripCount > 0 ? 'blue' : 'slate',
        }));
        const ringItems = [
          { label: 'Available', value: filteredVehicles.filter((vehicle) => vehicle.status === 'available').length, helper: 'Assignable fleet', tone: 'green' },
          { label: 'Reserved', value: filteredVehicles.filter((vehicle) => vehicle.status === 'reserved').length, helper: 'Reserved vehicles', tone: 'amber' },
          { label: 'In use', value: filteredVehicles.filter((vehicle) => vehicle.status === 'in_use').length, helper: 'Active trips', tone: 'blue' },
          { label: 'Service', value: filteredVehicles.filter((vehicle) => vehicle.status === 'maintenance').length, helper: 'Under maintenance', tone: 'red' },
        ].filter((item) => item.value > 0);

        return {
          summaryItems,
          chartTitle: 'Top utilized vehicles',
          chartCopy: 'Trip counts for the current scope and date range.',
          chartItems,
          ringTitle: 'Fleet readiness',
          ringItems,
          tableColumns: ['Vehicle', 'Plate', 'Branch', 'Status', 'Type', 'Trips', 'Active'],
          tableRows: filteredVehicles.map((vehicle) => ({
            key: vehicle.id,
            cells: [
              vehicle.vehicleName,
              vehicle.plateNumber,
              vehicle.branch,
              { type: 'status', value: vehicle.status },
              vehicle.type,
              vehicle.tripCount,
              vehicle.activeTripCount,
            ],
          })),
          exportRows: filteredVehicles.map((vehicle) => ({
            vehicle: vehicle.vehicleName,
            plate_number: vehicle.plateNumber,
            branch: vehicle.branch,
            status: vehicle.status,
            type: vehicle.type,
            trip_count: vehicle.tripCount,
            active_trip_count: vehicle.activeTripCount,
            odometer_current: vehicle.odometerCurrent,
          })),
          exportName: 'Vehicle_Utilization_Report',
          emptyMessage: 'No vehicles match the active utilization filters.',
        };
      }
      case 'fuel': {
        const totalFuelLiters = filteredFuelRequests.reduce((sum, request) => sum + (Number(request.fuelLiters) || 0), 0);
        const totalFuelCost = filteredFuelRequests.reduce((sum, request) => sum + (Number(request.fuelAmount) || 0), 0);
        const summaryItems = [
          { label: 'Fuel-authorized', value: filteredFuelRequests.length, helper: 'Requested fuel support', tone: 'amber', icon: 'release' },
          { label: 'Fuel liters', value: totalFuelLiters.toLocaleString(undefined, { maximumFractionDigits: 1 }), helper: 'Total liters requested', tone: 'green', icon: 'vehicles' },
          { label: 'Fuel cost', value: `PHP ${totalFuelCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, helper: 'Total fuel amount', tone: 'blue', icon: 'check' },
        ];
        const chartItems = Object.entries(
          filteredFuelRequests.reduce((map, request) => {
            const key = request.assignedVehicle || 'Unassigned';
            map[key] = (map[key] || 0) + (Number(request.fuelLiters) || 0);
            return map;
          }, {})
        )
          .sort((left, right) => right[1] - left[1])
          .slice(0, 6)
          .map(([label, value]) => ({
            label,
            value,
            valueLabel: `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`,
            helper: 'Fuel liters requested',
            tone: 'amber',
          }));
        const ringItems = [
          { label: 'Fuel requested', value: filteredFuelRequests.length, helper: 'With fuel authorization', tone: 'amber' },
          { label: 'No fuel', value: Math.max(fuelScopeRequests.length - filteredFuelRequests.length, 0), helper: 'Without fuel support', tone: 'slate' },
        ].filter((item) => item.value > 0);

        return {
          summaryItems,
          chartTitle: 'Fuel demand by vehicle',
          chartCopy: 'Tracks which assigned vehicles carry the most fuel requests.',
          chartItems,
          ringTitle: 'Fuel request split',
          ringItems,
          tableColumns: ['Request', 'Requester', 'Vehicle', 'Destination', 'Schedule', 'Fuel', 'Status'],
          tableRows: filteredFuelRequests.map((request) => ({
            key: request.id,
            cells: [
              request.requestNo,
              request.requestedBy,
              request.assignedVehicle || 'Unassigned',
              request.destination,
              formatDate(request.departureDatetime, true),
              `PHP ${Number(request.fuelAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${Number(request.fuelLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} L`,
              { type: 'status', value: request.status },
            ],
          })),
          exportRows: filteredFuelRequests.map((request) => ({
            request_no: request.requestNo,
            requester: request.requestedBy,
            branch: request.branch,
            assigned_vehicle: request.assignedVehicle,
            destination: request.destination,
            departure_datetime: request.departureDatetime,
            status: request.status,
            fuel_amount: Number(request.fuelAmount || 0),
            fuel_liters: Number(request.fuelLiters || 0),
            estimated_kms: Number(request.estimatedKms || 0),
            fuel_remarks: request.fuelRemarks || '',
            fuel_product: request.fuelProduct || '',
            fuel_quote_price_per_liter: request.fuelQuotePricePerLiter ?? '',
            fuel_quote_source: request.fuelQuoteSource || '',
            fuel_quote_observed_at: request.fuelQuoteObservedAt || '',
            fuel_quote_location: request.fuelQuoteLocation || '',
          })),
          exportName: 'Fuel_Authorization_Report',
          emptyMessage: 'No fuel-authorized requests match the active filters.',
        };
      }
      case 'maintenance': {
        const complianceRows = [
          ...filteredMaintenance.map((entry) => ({
            key: `maintenance-${entry.id}`,
            dateValue: entry.scheduleDate || entry.completedDate || '',
            cells: [
              formatDate(entry.scheduleDate || entry.completedDate),
              'Maintenance',
              entry.vehicle,
              entry.branch,
              entry.maintenanceType,
              { type: 'status', value: entry.status },
              `PHP ${Number(entry.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            ],
          })),
          ...filteredIncidents.map((incident) => ({
            key: `incident-${incident.id}`,
            dateValue: incident.incidentDatetime || '',
            cells: [
              formatDate(incident.incidentDatetime, true),
              'Incident',
              incident.vehicle,
              (vehicleById.get(incident.vehicleId) || vehicleByName.get(incident.vehicle))?.branch || 'Unknown',
              incident.location,
              { type: 'status', value: incident.status },
              '-',
            ],
          })),
        ].sort((left, right) => String(right.dateValue).localeCompare(String(left.dateValue)));

        const summaryItems = [
          { label: 'Maintenance', value: filteredMaintenance.length, helper: 'Maintenance records in scope', tone: 'blue', icon: 'wrench' },
          { label: 'Pending', value: filteredMaintenance.filter((entry) => entry.status === 'Pending').length, helper: 'Need scheduling attention', tone: 'amber', icon: 'clock' },
          { label: 'Incidents', value: filteredIncidents.length, helper: 'Linked incident reports', tone: 'red', icon: 'warning' },
        ];
        const chartItems = toChartItems(
          filteredMaintenance.reduce((map, entry) => {
            map[entry.status] = (map[entry.status] || 0) + 1;
            return map;
          }, {}),
          { Pending: 'amber', Completed: 'green', Cancelled: 'slate', 'In Progress': 'blue' }
        );
        const ringItems = [
          { label: 'Maintenance', value: filteredMaintenance.length, helper: 'Service records', tone: 'blue' },
          { label: 'Incidents', value: filteredIncidents.length, helper: 'Incident reports', tone: 'red' },
        ].filter((item) => item.value > 0);

        return {
          summaryItems,
          chartTitle: 'Maintenance status breakdown',
          chartCopy: 'Shows how service workload is distributed across statuses.',
          chartItems,
          ringTitle: 'Compliance mix',
          ringItems,
          tableColumns: ['Date', 'Type', 'Vehicle', 'Branch', 'Details', 'Status', 'Amount'],
          tableRows: complianceRows,
          exportRows: [
            ...filteredMaintenance.map((entry) => ({
              record_type: 'Maintenance',
              date: entry.scheduleDate || entry.completedDate || '',
              vehicle: entry.vehicle,
              branch: entry.branch,
              details: entry.maintenanceType,
              status: entry.status,
              provider: entry.provider,
              amount: Number(entry.amount || 0),
            })),
            ...filteredIncidents.map((incident) => ({
              record_type: 'Incident',
              date: incident.incidentDatetime,
              vehicle: incident.vehicle,
              branch: (vehicleById.get(incident.vehicleId) || vehicleByName.get(incident.vehicle))?.branch || 'Unknown',
              details: incident.description,
              status: incident.status,
              provider: '',
              amount: '',
            })),
          ],
          exportName: 'Maintenance_Compliance_Report',
          emptyMessage: 'No maintenance or incident records match the active filters.',
        };
      }
      case 'requests':
      default: {
        const pendingRequestsCount = filteredRequests.filter((request) => request.status === 'Pending Approval').length;
        const reviewedRequestsCount = filteredRequests.filter((request) => ['Approved', 'Ready for Release'].includes(request.status)).length;
        const rejectedRequestsCount = filteredRequests.filter((request) => request.status === 'Rejected').length;
        const summaryItems = [
          { label: 'Requests', value: filteredRequests.length, helper: 'Requests in scope', tone: 'green', icon: 'requests' },
          { label: 'Pending', value: pendingRequestsCount, helper: 'Waiting for review', tone: 'amber', icon: 'clock' },
          { label: 'Reviewed', value: reviewedRequestsCount, helper: 'Approved and dispatch-ready', tone: 'blue', icon: 'check' },
        ];
        const chartItems = toChartItems(
          filteredRequests.reduce((map, request) => {
            map[request.status] = (map[request.status] || 0) + 1;
            return map;
          }, {}),
          { 'Pending Approval': 'amber', Approved: 'green', 'Ready for Release': 'blue', Closed: 'slate', Rejected: 'red' }
        );
        const ringItems = [
          { label: 'Pending', value: pendingRequestsCount, helper: 'Awaiting review', tone: 'amber' },
          { label: 'Reviewed', value: reviewedRequestsCount, helper: 'Approved and dispatch-ready', tone: 'green' },
          { label: 'Rejected', value: rejectedRequestsCount, helper: 'Rejected requests', tone: 'red' },
        ].filter((item) => item.value > 0);

        return {
          summaryItems,
          chartTitle: 'Request status breakdown',
          chartCopy: 'Tracks request volume and approval movement for the active filters.',
          chartItems,
          ringTitle: 'Request outcome mix',
          ringItems,
          tableColumns: ['Request', 'Requester', 'Branch', 'Destination', 'Schedule', 'Status', 'Fuel'],
          tableRows: filteredRequests.map((request) => ({
            key: request.id,
            cells: [
              request.requestNo,
              request.requestedBy,
              request.branch,
              request.destination,
              formatDate(request.departureDatetime, true),
              { type: 'status', value: request.status },
              request.fuelRequested ? `PHP ${Number(request.fuelAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'No',
            ],
          })),
          exportRows: filteredRequests.map((request) => ({
            request_no: request.requestNo,
            requester: request.requestedBy,
            branch: request.branch,
            destination: request.destination,
            departure_datetime: request.departureDatetime,
            status: request.status,
            assigned_vehicle: request.assignedVehicle,
            assigned_driver: request.assignedDriver,
            fuel_requested: request.fuelRequested ? 'Yes' : 'No',
            fuel_amount: Number(request.fuelAmount || 0),
          })),
          exportName: 'Request_Summary_Report',
          emptyMessage: 'No request records match the active filters.',
        };
      }
    }
  }, [
    activeReport,
    filteredFuelRequests,
    filteredIncidents,
    filteredMaintenance,
    filteredRequests,
    filteredTrips,
    filteredVehicles,
    fuelScopeRequests,
    vehicleById,
    vehicleByName,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeReport, branchFilter, startDate, endDate, statusFilter, vehicleFilter, driverFilter, requesterFilter]);

  const totalPages = Math.max(1, Math.ceil(reportModel.tableRows.length / rowsPerPage));
  const paginatedRows = reportModel.tableRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function clearFilters() {
    setBranchFilter('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setVehicleFilter('all');
    setDriverFilter('all');
    setRequesterFilter('all');
  }

  return (
    <div className="reports-layout">
      <SectionCard title="Reports module" subtitle="Generate operational reports for requests, trips, fleet, fuel, and compliance.">
        <div className="chip-row reports-tab-row">
          {REPORT_DEFINITIONS.map((definition) => (
            <button
              key={definition.id}
              type="button"
              className={`chip-button ${activeReport === definition.id ? 'chip-button-active' : ''}`}
              onClick={() => setActiveReport(definition.id)}
            >
              {definition.label}
            </button>
          ))}
        </div>

        <div className="reports-filter-grid">
          {isAdmin && (
            <label>
              <span className="field-label">Branch</span>
              <select className="input" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                <option value="">All branches</option>
                {branchOptions.map((branchName) => (
                  <option key={branchName} value={branchName}>{branchName}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span className="field-label">Date from</span>
            <input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>

          <label>
            <span className="field-label">Date to</span>
            <input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>

          {['requests', 'trips', 'vehicles', 'maintenance'].includes(activeReport) && (
            <label>
              <span className="field-label">Status</span>
              <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statusOptions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>{statusValue}</option>
                ))}
              </select>
            </label>
          )}

          {['trips', 'vehicles', 'fuel', 'maintenance'].includes(activeReport) && (
            <label>
              <span className="field-label">Vehicle</span>
              <select className="input" value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}>
                <option value="all">All vehicles</option>
                {vehicleOptions.map((vehicleName) => (
                  <option key={vehicleName} value={vehicleName}>{vehicleName}</option>
                ))}
              </select>
            </label>
          )}

          {activeReport === 'trips' && (
            <label>
              <span className="field-label">Driver</span>
              <select className="input" value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}>
                <option value="all">All drivers</option>
                {driverOptions.map((driverName) => (
                  <option key={driverName} value={driverName}>{driverName}</option>
                ))}
              </select>
            </label>
          )}

          {['requests', 'fuel'].includes(activeReport) && (
            <label>
              <span className="field-label">Requester</span>
              <select className="input" value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}>
                <option value="all">All requesters</option>
                {requesterOptions.map((requesterName) => (
                  <option key={requesterName} value={requesterName}>{requesterName}</option>
                ))}
              </select>
            </label>
          )}

          <div className="reports-filter-actions">
            <button type="button" className="button button-secondary" onClick={clearFilters}>
              Clear filters
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => exportToCSV(reportModel.exportRows, `${reportModel.exportName}_${new Date().toISOString().slice(0, 10)}`)}
              disabled={!reportModel.exportRows.length}
            >
              Export CSV
            </button>
          </div>
        </div>
      </SectionCard>

      <SummaryGrid items={reportModel.summaryItems} />

      <div className="content-grid">
        <SectionCard title={reportModel.chartTitle} subtitle={reportModel.chartCopy}>
          {reportModel.chartItems.length ? (
            <StatBarChart items={reportModel.chartItems} ariaLabel={reportModel.chartTitle} />
          ) : (
            <div className="empty-state-panel">No chart data for the current filters.</div>
          )}
        </SectionCard>

        <SectionCard title={reportModel.ringTitle} subtitle="Visual distribution of the current report scope.">
          {reportModel.ringItems.length ? (
            <StatusRingChart items={reportModel.ringItems} ariaLabel={reportModel.ringTitle} centerLabel="records" />
          ) : (
            <div className="empty-state-panel">No distribution data for the current filters.</div>
          )}
        </SectionCard>
      </div>

      <SectionCard title={REPORT_DEFINITIONS.find((definition) => definition.id === activeReport)?.label || 'Report details'} subtitle={reportModel.emptyMessage}>
        <div className="reports-table-head">
          <p className="reports-table-copy">
            {reportModel.tableRows.length === 0
              ? 'No rows to show'
              : `Showing ${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, reportModel.tableRows.length)} of ${reportModel.tableRows.length} rows`}
          </p>
          <div className="request-pagination-actions">
            <button
              type="button"
              className="button button-secondary request-page-button pagination-nav-button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <span className="pagination-label-full">Previous</span>
              <span className="pagination-label-short">Prev</span>
            </button>
            <span className="request-page-indicator">
              <span className="request-page-indicator-full">Page {currentPage} of {totalPages}</span>
              <span className="request-page-indicator-short">{currentPage}/{totalPages}</span>
            </span>
            <button
              type="button"
              className="button button-secondary request-page-button pagination-nav-button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
            >
              <span className="pagination-label-full">Next</span>
              <span className="pagination-label-short">Next</span>
            </button>
          </div>
        </div>

        <div className="table-wrap reports-table-wrap">
          <table className="data-table reports-data-table">
            <thead>
              <tr>
                {reportModel.tableColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={reportModel.tableColumns.length} className="empty-state">{reportModel.emptyMessage}</td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.key}>
                    {row.cells.map((cell, index) => (
                      <td key={`${row.key}-${index}`} data-label={reportModel.tableColumns[index]}>
                        {cell && typeof cell === 'object' && cell.type === 'status'
                          ? <StatusBadge status={cell.value} />
                          : cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
