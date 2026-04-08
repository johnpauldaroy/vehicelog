import { useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from '../components/AppIcon';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import {
  canPrintRequestStatus,
  formatDate,
  getDriverAssignmentValidation,
  REQUEST_HIRED_DRIVER_OPTION_VALUE,
} from '../utils/appHelpers';

export default function RequestsPage({
  mode,
  currentUser,
  requestSearch,
  setRequestSearch,
  filteredRequests,
  requestModalOpen,
  requestForm,
  requestApprovalForm,
  driverOptions,
  vehicleOptions,
  allVehicleRecords = [],
  assignmentVehicleOptions,
  requestApprovalDriverOptions,
  onOpenRequestModal,
  onCloseRequestModal,
  onRequestFormChange,
  onRequestApprovalFieldChange,
  onRequestPassengerNameChange,
  onRequestSubmit,
  rejectionModalOpen,
  assignmentModalOpen,
  requestDetailsModalOpen,
  rejectionRemarks,
  selectedReviewRequest,
  selectedAssignmentRequest,
  selectedRequestDetails,
  assignmentVehicleId,
  onCloseRejectionModal,
  onCloseAssignmentModal,
  onOpenRequestDetails,
  onCloseRequestDetails,
  onAssignmentVehicleChange,
  onRejectionRemarksChange,
  onRejectRequest,
  onOpenAssignmentModal,
  onAssignmentSubmit,
  onApproveRequest,
  onSaveRequestFuelEdits,
  onSaveRequestDriverEdits,
  onPrintRequest,
  onRejectSubmit,
}) {
  const isAdmin = mode === 'admin';
  const isApprover = mode === 'approver';
  const isGuard = mode === 'guard';
  const isPumpStation = mode === 'pump_station';
  const isDriver = mode === 'driver';
  const canReviewRequests = isAdmin || isApprover;
  const showsQueue = isAdmin || isApprover || isGuard || isPumpStation;
  const showsAssignmentActions = isAdmin || isApprover;
  const showsReadOnlyDetailAction = isGuard || isPumpStation;
  const canCreateRequest = !isGuard && !isPumpStation;
  const canAddHiredDriver = isAdmin || isApprover;
  const [openActionMenuId, setOpenActionMenuId] = useState('');
  const [requestDateFrom, setRequestDateFrom] = useState('');
  const [requestDateTo, setRequestDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const actionMenuRef = useRef(null);
  const requestsPerPage = 6;
  const isHiredDriverSelected = requestForm.assignedDriverId === REQUEST_HIRED_DRIVER_OPTION_VALUE;
  const selectedRequestDriver = isHiredDriverSelected
    ? {
        fullName: requestForm.hiredDriverName,
        licenseRestrictions: requestForm.hiredDriverLicenseRestrictions,
        licenseExpiry: requestForm.hiredDriverLicenseExpiry,
      }
    : (driverOptions.find((driver) => driver.id === requestForm.assignedDriverId) || null);
  const selectedRequestVehicle = vehicleOptions.find((vehicle) => vehicle.id === requestForm.assignedVehicleId) || null;
  const requestDriverValidation = getDriverAssignmentValidation(selectedRequestDriver, selectedRequestVehicle);
  const hasMissingHiredDriverFields = isHiredDriverSelected
    && (
      !String(requestForm.hiredDriverName || '').trim()
      || !String(requestForm.hiredDriverLicenseNumber || '').trim()
      || !String(requestForm.hiredDriverLicenseExpiry || '').trim()
    );
  const selectedApprovalDriver = requestApprovalDriverOptions.find(
    (driver) => driver.id === requestApprovalForm.assignedDriverId
  ) || null;
  const selectedApprovalVehicle = allVehicleRecords.find(
    (vehicle) => vehicle.id === selectedRequestDetails?.assignedVehicleId
  ) || null;
  const approvalDriverValidation = getDriverAssignmentValidation(selectedApprovalDriver, selectedApprovalVehicle);
  const canPrintSelectedRequest = showsAssignmentActions && canPrintRequestStatus(selectedRequestDetails?.status);
  const isRequestSubmissionBlocked = Boolean(
    (requestForm.assignedDriverId && !requestDriverValidation.isValid)
    || hasMissingHiredDriverFields
  );
  const showsUserFuelEditActions = !showsAssignmentActions && !isGuard && !isPumpStation;
  const showsActionColumn = showsAssignmentActions || showsUserFuelEditActions || showsReadOnlyDetailAction;

  function isOwnedByCurrentUser(request) {
    if (!request) {
      return false;
    }

    if (request.requestedById && currentUser?.id) {
      return request.requestedById === currentUser.id;
    }

    return String(request.requestedBy || '').trim() === String(currentUser?.name || '').trim();
  }

  function isAssignedToCurrentUser(request) {
    if (!request || !currentUser?.name) {
      return false;
    }

    return String(request.assignedDriver || '').trim() === String(currentUser.name || '').trim();
  }

  function canUserUpdateFuel(request) {
    if (isGuard || isPumpStation) {
      return false;
    }

    if (!request || !request.fuelRequested) {
      return false;
    }

    const isPending = request.status === 'Pending Approval';
    const isReady = request.status === 'Ready for Release';

    if (!isPending && !isReady) {
      return false;
    }

    if (showsAssignmentActions) {
      return true;
    }

    return isOwnedByCurrentUser(request) || isAssignedToCurrentUser(request);
  }

  const canEditFuelInDetails = canUserUpdateFuel(selectedRequestDetails);
  const canEditDriverInPendingDetails = canReviewRequests && selectedRequestDetails?.status === 'Pending Approval';
  const canEditDriverInCheckedOutDetails = canReviewRequests && selectedRequestDetails?.status === 'Checked Out';
  const canEditDriverInDetails = canEditDriverInPendingDetails || canEditDriverInCheckedOutDetails;
  const canOpenRequestDetailsModal = Boolean(selectedRequestDetails);

  function renderDriverValidationNotice(validation) {
    if (validation.isValid) {
      return null;
    }

    const guidanceItems = [];

    if (validation.licenseExpired) {
      guidanceItems.push(`Update the driver's license expiry before assigning this request.`);
    }

    if (validation.vehicleRequirementMissing) {
      guidanceItems.push('Edit the selected vehicle and set either its vehicle type or its required restriction profile before assigning a driver.');
    }

    if (validation.restrictionMismatch) {
      guidanceItems.push(
        `Select a driver whose license restrictions include all codes required for ${validation.vehicleTypeLabel || 'the selected vehicle'}: ${validation.requiredRestrictions.join(', ')}.`
      );
    }

    return (
      <div
        style={{
          marginTop: '8px',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(185, 28, 28, 0.2)',
          background: 'rgba(185, 28, 28, 0.08)',
          color: '#991b1b',
        }}
      >
        {validation.licenseExpired && (
          <div>Selected driver license expired on {formatDate(validation.licenseExpiry)}.</div>
        )}
        {validation.vehicleRequirementMissing && (
          <div>
            The selected vehicle does not have a configured type or required restriction profile yet.
          </div>
        )}
        {validation.restrictionMismatch && (
          <div>
            The selected driver's license restrictions ({validation.driverRestrictions.length ? validation.driverRestrictions.join(', ') : 'none'})
            {' '}do not satisfy the full requirement for {validation.vehicleTypeLabel || 'the selected vehicle'}
            {' '}({validation.requiredRestrictions.join(', ')}).
          </div>
        )}
        {guidanceItems.length > 0 && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(185, 28, 28, 0.16)' }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Notes</strong>
            {guidanceItems.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function closeActionMenu() {
    setOpenActionMenuId('');
  }

  const dateFilteredRequests = useMemo(() => {
    return filteredRequests.filter((request) => {
      const requestDateSource = isPumpStation
        ? (request.approvedAt || request.createdAt || '')
        : (request.departureDatetime || '');
      const requestDate = String(requestDateSource).slice(0, 10);

      if (requestDateFrom && requestDate < requestDateFrom) {
        return false;
      }

      if (requestDateTo && requestDate > requestDateTo) {
        return false;
      }

      return true;
    });
  }, [filteredRequests, isPumpStation, requestDateFrom, requestDateTo]);

  const totalPages = Math.max(1, Math.ceil(dateFilteredRequests.length / requestsPerPage));
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * requestsPerPage;
    return dateFilteredRequests.slice(startIndex, startIndex + requestsPerPage);
  }, [currentPage, dateFilteredRequests]);

  const pageStart = dateFilteredRequests.length === 0 ? 0 : (currentPage - 1) * requestsPerPage + 1;
  const pageEnd = Math.min(currentPage * requestsPerPage, dateFilteredRequests.length);

  useEffect(() => {
    function handlePointerDown(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        closeActionMenu();
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        closeActionMenu();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [requestSearch, requestDateFrom, requestDateTo]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleApproveFromDetails() {
    if (!selectedRequestDetails) {
      return;
    }

    const didApprove = await onApproveRequest(selectedRequestDetails, 'Approved', requestApprovalForm);

    if (didApprove) {
      closeActionMenu();
      onCloseRequestDetails();
    }
  }

  async function handleSaveFuelFromDetails() {
    if (!selectedRequestDetails || !canEditFuelInDetails || !onSaveRequestFuelEdits) {
      return;
    }

    await onSaveRequestFuelEdits(selectedRequestDetails, requestApprovalForm);
  }

  async function handleSaveDriverFromDetails() {
    if (!selectedRequestDetails || !canEditDriverInCheckedOutDetails || !onSaveRequestDriverEdits) {
      return;
    }

    await onSaveRequestDriverEdits(selectedRequestDetails, requestApprovalForm);
  }

  function handleRejectFromDetails() {
    if (!selectedRequestDetails) {
      return;
    }

    closeActionMenu();
    onCloseRequestDetails();
    onRejectRequest(selectedRequestDetails);
  }

  function clearDateFilters() {
    setRequestDateFrom('');
    setRequestDateTo('');
  }

  function summarizePassengers(request) {
    const passengerNames = Array.isArray(request?.passengerNames) ? request.passengerNames.filter(Boolean) : [];
    const passengerCount = Number(request?.passengerCount || 0);

    if (passengerCount <= 1) {
      return 'Driver only';
    }

    if (!passengerNames.length) {
      return `${passengerCount - 1} passenger${passengerCount - 1 > 1 ? 's' : ''}`;
    }

    if (passengerNames.length <= 2) {
      return passengerNames.join(', ');
    }

    return `${passengerNames.slice(0, 2).join(', ')} +${passengerNames.length - 2}`;
  }

  function getApproverNameForDisplay(request) {
    if (!request) {
      return '';
    }

    const normalizedStatus = String(request.status || '').trim().toLowerCase();
    if (normalizedStatus === 'pending approval') {
      return '';
    }

    return String(request.approver || '').trim();
  }

  return (
    <>
      <div className="content-grid content-grid-tight">
        <SectionCard
          title={
            isGuard
              ? 'Branch request monitor'
              : isPumpStation
                ? 'Pump station fuel approvals'
              : showsQueue
                ? 'Request queue'
                : isDriver
                  ? 'Driver requests'
                  : 'My requests'
          }
        subtitle={
          isGuard
            ? `View all request statuses and passenger manifests for ${currentUser.branch}.`
            : isPumpStation
              ? `View approved fuel authorizations for ${currentUser.branch}.`
            : showsQueue
            ? 'Search and review requests waiting in your branch queue'
            : isDriver
              ? `Track requests submitted by or assigned to ${currentUser.name}`
              : `Track requests submitted by ${currentUser.name}`
        }
      >
        <div className="toolbar request-toolbar">
          <input
            className="input"
              value={requestSearch}
              onChange={(event) => setRequestSearch(event.target.value)}
              placeholder={
                isGuard
                  ? 'Search request number, requester, passenger, or status'
                  : isPumpStation
                    ? 'Search request number, branch, approver, or fuel details'
                  : showsQueue
                  ? 'Search request number, requester, purpose'
                  : 'Search request number, destination, or status'
              }
            />
            {!isPumpStation && (
              <div className="request-filter-group">
                <label className="request-date-filter">
                  <span className="field-label">From</span>
                  <input
                    type="date"
                    className="input"
                    value={requestDateFrom}
                    onChange={(event) => setRequestDateFrom(event.target.value)}
                  />
                </label>
                <label className="request-date-filter">
                  <span className="field-label">To</span>
                  <input
                    type="date"
                    className="input"
                    value={requestDateTo}
                    onChange={(event) => setRequestDateTo(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="button button-secondary request-filter-clear"
                  onClick={clearDateFilters}
                  disabled={!requestDateFrom && !requestDateTo}
                >
                  Clear dates
                </button>
              </div>
            )}
            {canCreateRequest && (
              <button type="button" className="button button-primary" onClick={onOpenRequestModal}>
                <AppIcon name="requests" className="button-icon" />
                {isAdmin ? 'New request' : 'Create request'}
              </button>
            )}
          </div>

          {isPumpStation ? (
            <div className="table-wrap request-table-wrap">
              <table className="data-table request-data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Request No</th>
                    <th>Branch</th>
                    <th>Fuel details</th>
                    <th>Approver</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dateFilteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        No approved fuel authorizations match your current filters.
                      </td>
                    </tr>
                  )}
                  {paginatedRequests.map((request) => (
                    <tr key={request.id}>
                      <td data-label="Status" className="request-status-cell">
                        <StatusBadge status={request.status} />
                      </td>
                      <td data-label="Request no">{request.requestNo}</td>
                      <td data-label="Branch">{request.branch || '-'}</td>
                      <td data-label="Fuel details">
                        <span>{`Product: ${String(request.fuelProduct || 'diesel').replace(/_/g, ' ')}`}</span>
                        <span className="cell-subtle">{`${Number(request.fuelLiters || 0).toFixed(2)} L / PHP ${Number(request.fuelAmount || 0).toFixed(2)}`}</span>
                      </td>
                      <td data-label="Approver">{getApproverNameForDisplay(request)}</td>
                      <td data-label="Action">
                        <button
                          type="button"
                          className="button button-secondary request-page-button"
                          onClick={() => onOpenRequestDetails(request)}
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap request-table-wrap">
              <table className="data-table request-data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Request No</th>
                    {showsQueue && <th>Requester</th>}
                    <th>{isGuard ? 'Passengers' : 'Destination'}</th>
                    <th>Schedule</th>
                    {!isGuard && <th>Assignment</th>}
                    {showsActionColumn && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {dateFilteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={4 + (showsQueue ? 1 : 0) + (!isGuard ? 1 : 0) + (showsActionColumn ? 1 : 0)} className="empty-state">
                        {isGuard
                          ? 'No branch requests match the current search or date filter.'
                          : showsQueue
                            ? 'No requests match the current search or date filter.'
                            : isDriver
                              ? 'No submitted or assigned requests match your search or date filter.'
                              : 'No requests match your search or date filter.'}
                      </td>
                    </tr>
                  )}
                  {paginatedRequests.map((request, index) => (
                    <tr key={request.id}>
                      <td data-label="Status" className="request-status-cell">
                        <StatusBadge status={request.status} />
                        {request.rejectionReason && (
                          <span className="cell-subtle">Reason: {request.rejectionReason}</span>
                        )}
                      </td>
                      <td data-label="Request no">
                        <div className="request-no-mobile-head">
                          <span>{request.requestNo}</span>
                          <span className="request-mobile-status">
                            <StatusBadge status={request.status} />
                          </span>
                        </div>
                        {!isGuard && request.fuelRequested && (
                          <button
                            type="button"
                            className="fuel-indicator-button request-fuel-link"
                            onClick={() => onOpenRequestDetails(request)}
                            title="View and update fuel details"
                          >
                            <AppIcon name="release" style={{ width: '12px', height: '12px' }} />
                            <span>{`Fuel requested (\u20B1${request.fuelAmount})`}</span>
                          </button>
                        )}
                        {request.rejectionReason && (
                          <span className="cell-subtle request-mobile-only">Reason: {request.rejectionReason}</span>
                        )}
                      </td>
                      {showsQueue && <td data-label="Requester">{request.requestedBy}</td>}
                      <td data-label={isGuard ? 'Passengers' : 'Destination'}>
                        {isGuard ? summarizePassengers(request) : request.destination}
                      </td>
                      <td data-label="Schedule">{formatDate(request.departureDatetime, true)}</td>
                      {!isGuard && (
                        <td data-label="Assignment">
                          {request.assignedVehicle}
                          <span className="cell-subtle">{request.assignedDriver}</span>
                          <span className="cell-subtle">{`Assigned approver: ${getApproverNameForDisplay(request)}`}</span>
                        </td>
                      )}
                      {showsActionColumn && (
                        <td data-label="Actions">
                          {showsAssignmentActions
                            ? (() => {
                                const normalizedRequestStatus = String(request.status || '').toLowerCase();
                                const isVehicleAssignmentLocked = ['returned', 'closed', 'rejected'].includes(normalizedRequestStatus);
                                const isPendingApproval = request.status === 'Pending Approval';
                                const opensUpward = index >= Math.max(paginatedRequests.length - 2, 0);

                                return (
                                  <div className="action-menu-shell" ref={openActionMenuId === request.id ? actionMenuRef : null}>
                                    <button
                                      type="button"
                                      className="button button-secondary action-menu-trigger"
                                      aria-label={`Open actions for ${request.requestNo}`}
                                      aria-expanded={openActionMenuId === request.id}
                                      aria-haspopup="menu"
                                      onClick={() => setOpenActionMenuId((current) => (current === request.id ? '' : request.id))}
                                    >
                                      <span className="action-menu-trigger-label">Actions</span>
                                      <AppIcon name="more" className="button-icon" />
                                    </button>
                                    {openActionMenuId === request.id && (
                                      <div className={`action-menu-popover${opensUpward ? ' action-menu-popover-up' : ''}`} role="menu">
                                        {(!canReviewRequests || !isPendingApproval) && (
                                          <button
                                            type="button"
                                            className="action-menu-item"
                                            onClick={() => {
                                              closeActionMenu();
                                              onOpenRequestDetails(request);
                                            }}
                                          >
                                            View details
                                          </button>
                                        )}
                                        {!isVehicleAssignmentLocked && isAdmin && (
                                          <button
                                            type="button"
                                            className="action-menu-item"
                                            onClick={() => {
                                              closeActionMenu();
                                              onOpenAssignmentModal(request);
                                            }}
                                          >
                                            {request.assignedVehicleId ? 'Edit vehicle' : 'Assign vehicle'}
                                          </button>
                                        )}
                                        {!isVehicleAssignmentLocked && canReviewRequests && isPendingApproval && (
                                          <>
                                            <button
                                              type="button"
                                              className="action-menu-item action-menu-item-primary"
                                              onClick={() => {
                                                closeActionMenu();
                                                onOpenRequestDetails(request);
                                              }}
                                            >
                                              Approve
                                            </button>
                                            <button
                                              type="button"
                                              className="action-menu-item action-menu-item-danger"
                                              onClick={() => {
                                                closeActionMenu();
                                                onRejectRequest(request);
                                              }}
                                            >
                                              Reject
                                            </button>
                                          </>
                                        )}
                                        {canPrintRequestStatus(request.status) && (
                                          <button
                                            type="button"
                                            className="action-menu-item"
                                            onClick={() => {
                                              closeActionMenu();
                                              onPrintRequest(request);
                                            }}
                                          >
                                            View approved ticket
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            : isGuard ? (
                                <button
                                  type="button"
                                  className="button button-secondary request-page-button"
                                  onClick={() => onOpenRequestDetails(request)}
                                >
                                  View details
                                </button>
                              )
                            : (() => {
                                const canEditFuel = canUserUpdateFuel(request);
                                const canOpenApprovedPdf = canPrintRequestStatus(request.status);

                                if (!canEditFuel && !canOpenApprovedPdf) {
                                  return <span className="cell-subtle">-</span>;
                                }

                                if (canEditFuel && canOpenApprovedPdf) {
                                  return (
                                    <div className="row-actions">
                                      <button
                                        type="button"
                                        className="button button-secondary request-page-button"
                                        onClick={() => onOpenRequestDetails(request)}
                                      >
                                        Edit fuel
                                      </button>
                                      <button
                                        type="button"
                                        className="button button-secondary request-page-button"
                                        onClick={() => onPrintRequest(request)}
                                      >
                                        View approved ticket
                                      </button>
                                    </div>
                                  );
                                }

                                if (canEditFuel) {
                                  return (
                                    <button
                                      type="button"
                                      className="button button-secondary request-page-button"
                                      onClick={() => onOpenRequestDetails(request)}
                                    >
                                      Edit fuel
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    className="button button-secondary request-page-button"
                                    onClick={() => onPrintRequest(request)}
                                  >
                                    View approved ticket
                                  </button>
                                );
                              })()}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="request-pagination">
            <p className="request-pagination-copy">
              {dateFilteredRequests.length === 0
                ? 'No requests to show'
                : `Showing ${pageStart}-${pageEnd} of ${dateFilteredRequests.length} requests`}
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
                <span className="request-page-indicator-full">Page {totalPages === 0 ? 0 : currentPage} of {totalPages}</span>
                <span className="request-page-indicator-short">{totalPages === 0 ? 0 : currentPage}/{totalPages}</span>
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
        </SectionCard>
      </div>

      {requestModalOpen && canCreateRequest && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close request form"
            onClick={onCloseRequestModal}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Create request">
            <section className="modal-card">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Request form</p>
                  <h3>{isAdmin ? 'New request' : 'Create request'}</h3>
                  <p className="modal-copy">
                    {isAdmin
                      ? 'Add a trip request without leaving the queue view.'
                      : 'Submit a new vehicle request and keep the table visible behind the modal.'}
                  </p>
                </div>
                <button type="button" className="button button-secondary modal-close" onClick={onCloseRequestModal}>
                  Close
                </button>
              </div>

              <form className="form-grid" onSubmit={onRequestSubmit}>
                <label>
                  <span className="field-label">Purpose</span>
                  <input
                    className="input"
                    value={requestForm.purpose}
                    onChange={(event) => onRequestFormChange('purpose', event.target.value)}
                    placeholder="Trip purpose"
                  />
                </label>
                <label>
                  <span className="field-label">Destination</span>
                  <input
                    className="input"
                    value={requestForm.destination}
                    onChange={(event) => onRequestFormChange('destination', event.target.value)}
                    placeholder="Destination"
                  />
                </label>
                <label>
                  <span className="field-label">Departure</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={requestForm.departureDatetime}
                    onChange={(event) => onRequestFormChange('departureDatetime', event.target.value)}
                  />
                </label>
                <label>
                  <span className="field-label">Expected return</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={requestForm.expectedReturnDatetime}
                    onChange={(event) => onRequestFormChange('expectedReturnDatetime', event.target.value)}
                  />
                </label>
                <label>
                  <span className="field-label">Passenger count</span>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={requestForm.passengerCount}
                    onChange={(event) => onRequestFormChange('passengerCount', event.target.value)}
                  />
                </label>
                <div className="full-span">
                  <span className="field-label">Passenger / companion names</span>
                  {Number(requestForm.passengerCount) <= 1 ? (
                    <div className="cell-subtle">No companion name needed. A passenger count of 1 indicates the driver only.</div>
                  ) : (
                    <div className="form-grid">
                      {requestForm.passengerNames.map((passengerName, index) => (
                        <label key={`passenger-slot-${index}`}>
                          <span className="field-label">Companion {index + 1}</span>
                          <input
                            className="input"
                            value={passengerName}
                            onChange={(event) => onRequestPassengerNameChange(index, event.target.value)}
                            placeholder={`Name for companion ${index + 1}`}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <label>
                  <span className="field-label">Assigned driver</span>
                  <select
                    className="input"
                    value={requestForm.assignedDriverId}
                    onChange={(event) => onRequestFormChange('assignedDriverId', event.target.value)}
                  >
                    <option value="">No driver selected</option>
                    {driverOptions.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.fullName} ({driver.status})
                      </option>
                    ))}
                    {canAddHiredDriver && (
                      <option value={REQUEST_HIRED_DRIVER_OPTION_VALUE}>
                        Hired driver (not on list)
                      </option>
                    )}
                  </select>
                </label>
                <label>
                  <span className="field-label">Assigned vehicle</span>
                  <select
                    className="input"
                    value={requestForm.assignedVehicleId}
                    onChange={(event) => onRequestFormChange('assignedVehicleId', event.target.value)}
                  >
                    <option value="">No vehicle selected</option>
                    {vehicleOptions.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleName} ({vehicle.plateNumber})
                      </option>
                    ))}
                  </select>
                </label>
                {isHiredDriverSelected && (
                  <div className="full-span detail-panel" style={{ background: 'rgba(0,0,0,0.02)' }}>
                    <span className="field-label">Hired driver details</span>
                    <div className="form-grid" style={{ marginTop: '12px' }}>
                      <label>
                        <span className="field-label">Full name</span>
                        <input
                          className="input"
                          value={requestForm.hiredDriverName}
                          onChange={(event) => onRequestFormChange('hiredDriverName', event.target.value)}
                          placeholder="Driver full name"
                        />
                      </label>
                      <label>
                        <span className="field-label">License number</span>
                        <input
                          className="input"
                          value={requestForm.hiredDriverLicenseNumber}
                          onChange={(event) => onRequestFormChange('hiredDriverLicenseNumber', event.target.value)}
                          placeholder="License number"
                        />
                      </label>
                      <label>
                        <span className="field-label">License restrictions</span>
                        <input
                          className="input"
                          value={requestForm.hiredDriverLicenseRestrictions}
                          onChange={(event) => onRequestFormChange('hiredDriverLicenseRestrictions', event.target.value)}
                          placeholder="e.g. B2"
                        />
                      </label>
                      <label>
                        <span className="field-label">License expiry</span>
                        <input
                          className="input"
                          type="date"
                          value={requestForm.hiredDriverLicenseExpiry}
                          onChange={(event) => onRequestFormChange('hiredDriverLicenseExpiry', event.target.value)}
                        />
                      </label>
                      <label className="full-span">
                        <span className="field-label">Contact number (optional)</span>
                        <input
                          className="input"
                          value={requestForm.hiredDriverContactNumber}
                          onChange={(event) => onRequestFormChange('hiredDriverContactNumber', event.target.value)}
                          placeholder="Mobile number"
                        />
                      </label>
                    </div>
                  </div>
                )}
                {!requestDriverValidation.isValid && (
                  <div className="full-span">
                    {renderDriverValidationNotice(requestDriverValidation)}
                  </div>
                )}
                <div className="full-span" style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={requestForm.fuelRequested}
                      onChange={(event) => onRequestFormChange('fuelRequested', event.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '600', color: 'var(--text-strong)' }}>Request Fuel Authorization?</span>
                  </label>
                  
                  {requestForm.fuelRequested && (
                    <div className="form-grid" style={{ marginTop: '16px', gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <label>
                        <span className="field-label">Fuel Product</span>
                        <select
                          className="input"
                          value={requestForm.fuelProduct}
                          onChange={(event) => onRequestFormChange('fuelProduct', event.target.value)}
                        >
                          <option value="diesel">Diesel</option>
                          <option value="gasoline_regular">Gasoline (Regular)</option>
                          <option value="gasoline_premium">Gasoline (Premium)</option>
                        </select>
                      </label>
                      <label>
                        <span className="field-label">Fuel Amount (PHP)</span>
                        <input
                          className="input"
                          type="number"
                          value={requestForm.fuelAmount}
                          onChange={(event) => onRequestFormChange('fuelAmount', event.target.value)}
                          placeholder="0.00"
                        />
                      </label>
                      <label>
                        <span className="field-label">Number of Liters</span>
                        <input
                          className="input"
                          type="number"
                          value={requestForm.fuelLiters}
                          onChange={(event) => onRequestFormChange('fuelLiters', event.target.value)}
                          placeholder="0"
                        />
                      </label>
                      <label>
                        <span className="field-label">Estimated Range (KM)</span>
                        <input
                          className="input"
                          type="number"
                          value={requestForm.estimatedKms}
                          readOnly
                          style={{ background: 'rgba(0,0,0,0.05)', fontWeight: '600' }}
                        />
                      </label>
                      <label className="full-span">
                        <span className="field-label">Fuel Remarks</span>
                        <input
                          className="input"
                          value={requestForm.fuelRemarks}
                          onChange={(event) => onRequestFormChange('fuelRemarks', event.target.value)}
                          placeholder="e.g. Long distance trip, mid-trip refuel"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <label className="full-span">
                  <span className="field-label">Notes</span>
                  <textarea
                    className="input textarea"
                    value={requestForm.notes}
                    onChange={(event) => onRequestFormChange('notes', event.target.value)}
                    placeholder="Optional context for approvers or dispatch"
                  />
                </label>
                <div className="full-span form-actions">
                  <button type="submit" className="button button-primary button-solid" disabled={isRequestSubmissionBlocked}>
                    Submit request
                  </button>
                  <span className="muted">
                    {isRequestSubmissionBlocked
                      ? (hasMissingHiredDriverFields
                        ? 'Complete required hired driver fields before submitting this request.'
                        : 'Resolve the driver validation note before submitting this request.')
                      : (canAddHiredDriver
                        ? 'Only available drivers are listed, or add a hired driver not yet in the roster.'
                        : 'Only currently available drivers and vehicles are shown for selection.')}
                  </span>
                </div>
              </form>
            </section>
          </div>
        </>
      )}

      {requestDetailsModalOpen && selectedRequestDetails && canOpenRequestDetailsModal && (isPumpStation ? (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close fuel authorization details"
            onClick={onCloseRequestDetails}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Fuel authorization details">
            <section className="modal-card">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Fuel authorization</p>
                  <h3>{selectedRequestDetails.requestNo}</h3>
                  <p className="modal-copy">
                    Review approved fuel authorization details, status, and approver information.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={onCloseRequestDetails}
                >
                  Close
                </button>
              </div>

              <div className="detail-panel">
                <dl className="detail-list">
                  <div>
                    <dt>Request no</dt>
                    <dd>{selectedRequestDetails.requestNo}</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{selectedRequestDetails.branch || '-'}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd><StatusBadge status={selectedRequestDetails.status} /></dd>
                  </div>
                  <div>
                    <dt>Assigned approver</dt>
                    <dd>{getApproverNameForDisplay(selectedRequestDetails)}</dd>
                  </div>
                  <div>
                    <dt>Approved at</dt>
                    <dd>{formatDate(selectedRequestDetails.approvedAt, true)}</dd>
                  </div>
                  <div>
                    <dt>Fuel product</dt>
                    <dd>{String(selectedRequestDetails.fuelProduct || 'diesel').replace(/_/g, ' ')}</dd>
                  </div>
                  <div>
                    <dt>Fuel amount</dt>
                    <dd>{`PHP ${Number(selectedRequestDetails.fuelAmount || 0).toFixed(2)}`}</dd>
                  </div>
                  <div>
                    <dt>Fuel liters</dt>
                    <dd>{`${Number(selectedRequestDetails.fuelLiters || 0).toFixed(2)} L`}</dd>
                  </div>
                  <div>
                    <dt>Estimated range</dt>
                    <dd>{`${Number(selectedRequestDetails.estimatedKms || 0).toFixed(2)} KM`}</dd>
                  </div>
                  <div className="full-span">
                    <dt>Fuel remarks</dt>
                    <dd>{selectedRequestDetails.fuelRemarks || '-'}</dd>
                  </div>
                  {(selectedRequestDetails.fuelQuotePricePerLiter || selectedRequestDetails.fuelQuoteLocation) && (
                    <div className="full-span">
                      <dt>Fuel quote snapshot</dt>
                      <dd>
                        <span>
                          {selectedRequestDetails.fuelQuotePricePerLiter
                            ? `PHP ${Number(selectedRequestDetails.fuelQuotePricePerLiter).toFixed(2)}/L`
                            : 'N/A'}
                        </span>
                        {selectedRequestDetails.fuelQuoteLocation ? (
                          <span className="cell-subtle">{`Location: ${selectedRequestDetails.fuelQuoteLocation}`}</span>
                        ) : null}
                        {selectedRequestDetails.fuelQuoteSource ? (
                          <span className="cell-subtle">{`Source: ${selectedRequestDetails.fuelQuoteSource}`}</span>
                        ) : null}
                        {selectedRequestDetails.fuelQuoteObservedAt ? (
                          <span className="cell-subtle">{`Observed: ${formatDate(selectedRequestDetails.fuelQuoteObservedAt, true)}`}</span>
                        ) : null}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close request details"
            onClick={onCloseRequestDetails}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Request details">
            <section className="modal-card">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Request details</p>
                  <h3>{selectedRequestDetails.requestNo}</h3>
                  <p className="modal-copy">
                    {isGuard
                      ? 'Review request status, schedule, and passenger manifest details.'
                      : 'Review the requester, approver, assignment, and trip purpose before taking action.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={onCloseRequestDetails}
                >
                  Close
                </button>
              </div>

              <div className="detail-panel">
                <dl className="detail-list">
                  <div>
                    <dt>Request no</dt>
                    <dd>{selectedRequestDetails.requestNo}</dd>
                  </div>
                  <div>
                    <dt>Requester</dt>
                    <dd>{selectedRequestDetails.requestedBy}</dd>
                  </div>
                  {!isGuard && (
                    <div>
                      <dt>Assigned approver</dt>
                      <dd>{getApproverNameForDisplay(selectedRequestDetails)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Status</dt>
                    <dd><StatusBadge status={selectedRequestDetails.status} /></dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{selectedRequestDetails.branch}</dd>
                  </div>
                  {!isGuard && (
                    <div>
                      <dt>Purpose</dt>
                      <dd>{selectedRequestDetails.purpose || '-'}</dd>
                    </div>
                  )}
                  {!isGuard && (
                    <div>
                      <dt>Destination</dt>
                      <dd>{selectedRequestDetails.destination || '-'}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Departure</dt>
                    <dd>{formatDate(selectedRequestDetails.departureDatetime, true)}</dd>
                  </div>
                  <div>
                    <dt>Expected return</dt>
                    <dd>{formatDate(selectedRequestDetails.expectedReturnDatetime, true)}</dd>
                  </div>
                  <div>
                    <dt>Passenger count</dt>
                    <dd>{selectedRequestDetails.passengerCount || 0}</dd>
                  </div>
                  <div className="full-span">
                    <dt>Passenger names</dt>
                    <dd>
                      {Number(selectedRequestDetails.passengerCount || 0) <= 1 ? (
                        'Driver only'
                      ) : selectedRequestDetails.passengerNames?.length ? (
                        <ul className="detail-inline-list">
                          {selectedRequestDetails.passengerNames.map((passengerName, index) => (
                            <li key={`${selectedRequestDetails.id}-passenger-${index}`}>{passengerName}</li>
                          ))}
                        </ul>
                      ) : 'No passenger names provided.'}
                    </dd>
                  </div>
                  {!isGuard && (
                    <div>
                      <dt>Assigned vehicle</dt>
                      <dd>{selectedRequestDetails.assignedVehicle || 'Unassigned'}</dd>
                    </div>
                  )}
                  {!isGuard && (
                    <div>
                      <dt>Assigned driver</dt>
                      <dd>
                        {canEditDriverInDetails ? (
                          <select
                            className="input"
                            value={requestApprovalForm.assignedDriverId}
                            onChange={(event) => onRequestApprovalFieldChange('assignedDriverId', event.target.value)}
                          >
                            <option value="">No driver selected</option>
                            {requestApprovalDriverOptions.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.fullName} ({driver.status})
                              </option>
                            ))}
                          </select>
                        ) : (
                          selectedRequestDetails.assignedDriver || 'Unassigned'
                        )}
                      </dd>
                    </div>
                  )}
                  {!isGuard && canEditDriverInDetails && approvalDriverValidation && !approvalDriverValidation.isValid && (
                    <div className="full-span">
                      {renderDriverValidationNotice(approvalDriverValidation)}
                    </div>
                  )}
                  {!isGuard && (
                    <div className="full-span">
                      <dt>Fuel authorization</dt>
                      <dd>
                        {canEditFuelInDetails ? (
                          <div className="form-grid">
                            {requestApprovalForm.fuelRequested ? (
                              <>
                                <span className="cell-subtle full-span">Fuel authorization requested.</span>
                                <label>
                                  <span className="field-label">Fuel product</span>
                                  <input
                                    className="input"
                                    value={String(requestApprovalForm.fuelProduct || 'diesel').replace(/_/g, ' ')}
                                    readOnly
                                    style={{ background: 'rgba(0,0,0,0.05)' }}
                                  />
                                </label>
                                <label>
                                  <span className="field-label">{isApprover ? 'Fuel amount (PHP)' : 'Actual fuel amount (PHP)'}</span>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    value={requestApprovalForm.fuelAmount}
                                    onChange={(event) => onRequestApprovalFieldChange('fuelAmount', event.target.value)}
                                  />
                                </label>
                                <label>
                                  <span className="field-label">{isApprover ? 'Approved liters' : 'Actual liters'}</span>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    value={requestApprovalForm.fuelLiters}
                                    onChange={(event) => onRequestApprovalFieldChange('fuelLiters', event.target.value)}
                                  />
                                </label>
                                <label>
                                  <span className="field-label">Estimated range (KM)</span>
                                  <input
                                    className="input"
                                    type="number"
                                    value={requestApprovalForm.estimatedKms}
                                    readOnly
                                    style={{ background: 'rgba(0,0,0,0.05)', fontWeight: '600' }}
                                  />
                                </label>
                                <label className="full-span">
                                  <span className="field-label">Fuel remarks</span>
                                  <input
                                    className="input"
                                    value={requestApprovalForm.fuelRemarks}
                                    readOnly
                                    style={{ background: 'rgba(0,0,0,0.05)' }}
                                  />
                                </label>
                                {(requestApprovalForm.fuelQuotePricePerLiter || requestApprovalForm.fuelQuoteLocation) && (
                                  <div className="full-span" style={{ fontSize: '0.85rem', color: '#475569' }}>
                                    <strong>Price quote snapshot:</strong>{' '}
                                    {requestApprovalForm.fuelQuotePricePerLiter
                                      ? `PHP ${Number(requestApprovalForm.fuelQuotePricePerLiter).toFixed(2)}/L`
                                      : 'N/A'}
                                    {requestApprovalForm.fuelQuoteLocation ? ` at ${requestApprovalForm.fuelQuoteLocation}` : ''}
                                    {requestApprovalForm.fuelQuoteSource ? ` via ${requestApprovalForm.fuelQuoteSource}` : ''}
                                    {requestApprovalForm.fuelQuoteObservedAt ? ` (${formatDate(requestApprovalForm.fuelQuoteObservedAt, true)})` : ''}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="cell-subtle">No fuel authorization requested for this trip.</span>
                            )}
                          </div>
                        ) : selectedRequestDetails.fuelRequested ? (
                          <>
                            <span>{`Fuel product: ${String(selectedRequestDetails.fuelProduct || 'diesel').replace(/_/g, ' ')}`}</span>
                            <span>{`Requested (${selectedRequestDetails.fuelLiters || 0}L / PHP ${selectedRequestDetails.fuelAmount || 0})`}</span>
                            {selectedRequestDetails.estimatedKms ? (
                              <span className="cell-subtle">{`${selectedRequestDetails.estimatedKms} KM estimated range`}</span>
                            ) : null}
                            {selectedRequestDetails.fuelRemarks ? (
                              <span className="cell-subtle">{selectedRequestDetails.fuelRemarks}</span>
                            ) : null}
                            {(selectedRequestDetails.fuelQuotePricePerLiter || selectedRequestDetails.fuelQuoteLocation) ? (
                              <span className="cell-subtle">
                                Quote: {selectedRequestDetails.fuelQuotePricePerLiter
                                  ? `PHP ${Number(selectedRequestDetails.fuelQuotePricePerLiter).toFixed(2)}/L`
                                  : 'N/A'}
                                {selectedRequestDetails.fuelQuoteLocation ? ` at ${selectedRequestDetails.fuelQuoteLocation}` : ''}
                                {selectedRequestDetails.fuelQuoteSource ? ` via ${selectedRequestDetails.fuelQuoteSource}` : ''}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          'Not requested'
                        )}
                      </dd>
                    </div>
                  )}
                  {!isGuard && (
                    <div className="full-span">
                      <dt>Notes</dt>
                      <dd>{selectedRequestDetails.notes || 'No notes provided.'}</dd>
                    </div>
                  )}
                  {!isGuard && selectedRequestDetails.rejectionReason && (
                    <div className="full-span">
                      <dt>Rejection reason</dt>
                      <dd>{selectedRequestDetails.rejectionReason}</dd>
                    </div>
                  )}
                </dl>
              </div>
              {canPrintSelectedRequest && (
                <div className="form-actions request-detail-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => onPrintRequest(selectedRequestDetails)}
                  >
                    {selectedRequestDetails.fuelRequested ? 'Open fuel slip PDF' : 'Open approved ticket'}
                  </button>
                </div>
              )}
              {canEditFuelInDetails && (
                <div className="form-actions request-detail-actions">
                  <button
                    type="button"
                    className="button button-primary button-solid"
                    onClick={handleSaveFuelFromDetails}
                  >
                    Save fuel changes
                  </button>
                </div>
              )}
              {canEditDriverInCheckedOutDetails && (
                <div className="form-actions request-detail-actions">
                  <button
                    type="button"
                    className="button button-primary button-solid"
                    onClick={handleSaveDriverFromDetails}
                  >
                    Save driver change
                  </button>
                </div>
              )}
              {canReviewRequests && selectedRequestDetails.status === 'Pending Approval' && (
                <div className="form-actions request-detail-actions">
                  <button
                    type="button"
                    className="button button-primary button-solid"
                    onClick={handleApproveFromDetails}
                  >
                    Approve request
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={handleRejectFromDetails}
                  >
                    Reject request
                  </button>
                </div>
              )}
            </section>
          </div>
        </>
      ))}

      {assignmentModalOpen && showsAssignmentActions && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close assignment form"
            onClick={onCloseAssignmentModal}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Assign vehicle">
            <section className="modal-card modal-card-compact">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Vehicle assignment</p>
                  <h3>{selectedAssignmentRequest?.requestNo || 'Request assignment'}</h3>
                  <p className="modal-copy">
                    Only currently available vehicles for this branch can be assigned or swapped here.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={onCloseAssignmentModal}
                >
                  Close
                </button>
              </div>

              <form className="form-grid" onSubmit={onAssignmentSubmit}>
                <label className="full-span">
                  <span className="field-label">Assigned vehicle</span>
                  <select
                    className="input"
                    value={assignmentVehicleId}
                    onChange={(event) => onAssignmentVehicleChange(event.target.value)}
                  >
                    <option value="">No vehicle selected</option>
                    {assignmentVehicleOptions.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleName} ({vehicle.plateNumber})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="full-span form-actions">
                  <button type="submit" className="button button-primary button-solid">
                    Save vehicle
                  </button>
                  <span className="muted">This updates the assigned vehicle without changing the rest of the request.</span>
                </div>
              </form>
            </section>
          </div>
        </>
      )}

      {rejectionModalOpen && canReviewRequests && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close rejection form"
            onClick={onCloseRejectionModal}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Reject request">
            <section className="modal-card modal-card-compact">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Reject request</p>
                  <h3>{selectedReviewRequest?.requestNo || 'Pending request'}</h3>
                  <p className="modal-copy">
                    Add remarks so the requester can understand why this request was rejected.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={onCloseRejectionModal}
                >
                  Close
                </button>
              </div>

              <form className="form-grid" onSubmit={onRejectSubmit}>
                <label className="full-span">
                  <span className="field-label">Rejection remarks</span>
                  <textarea
                    className="input textarea"
                    value={rejectionRemarks}
                    onChange={(event) => onRejectionRemarksChange(event.target.value)}
                    placeholder="Explain why the request cannot be approved."
                  />
                </label>
                <div className="full-span form-actions">
                  <button type="submit" className="button button-danger button-solid">
                    Confirm rejection
                  </button>
                  <span className="muted">This remark will be saved with the rejected request.</span>
                </div>
              </form>
            </section>
          </div>
        </>
      )}
    </>
  );
}
