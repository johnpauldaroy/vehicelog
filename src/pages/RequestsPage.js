import AppIcon from '../components/AppIcon';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../utils/appHelpers';

export default function RequestsPage({
  mode,
  currentUser,
  requestSearch,
  setRequestSearch,
  filteredRequests,
  requestModalOpen,
  requestForm,
  driverOptions,
  vehicleOptions,
  assignmentVehicleOptions,
  onOpenRequestModal,
  onCloseRequestModal,
  onRequestFormChange,
  onRequestSubmit,
  rejectionModalOpen,
  assignmentModalOpen,
  rejectionRemarks,
  selectedReviewRequest,
  selectedAssignmentRequest,
  assignmentVehicleId,
  onCloseRejectionModal,
  onCloseAssignmentModal,
  onAssignmentVehicleChange,
  onRejectionRemarksChange,
  onRejectRequest,
  onOpenAssignmentModal,
  onAssignmentSubmit,
  onApproveRequest,
  onRejectSubmit,
}) {
  const isAdmin = mode === 'admin';
  const isApprover = mode === 'approver';
  const isDriver = mode === 'driver';
  const showsQueue = isAdmin || isApprover;
  const showsAssignmentActions = isAdmin || isApprover;

  return (
    <>
      <div className="content-grid content-grid-tight">
        <SectionCard
          title={showsQueue ? 'Request queue' : isDriver ? 'Driver requests' : 'My requests'}
        subtitle={
          showsQueue
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
                showsQueue
                  ? 'Search request number, requester, purpose'
                  : 'Search request number, destination, or status'
              }
            />
            {!isApprover && (
              <button type="button" className="button button-primary" onClick={onOpenRequestModal}>
                <AppIcon name="requests" className="button-icon" />
                {isAdmin ? 'New request' : 'Create request'}
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request No</th>
                  {showsQueue && <th>Requester</th>}
                  <th>Destination</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Assignment</th>
                  {showsAssignmentActions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={showsQueue ? (showsAssignmentActions ? 7 : 6) : 5} className="empty-state">
                      {showsQueue ? 'No requests match the current search.' : isDriver ? 'No submitted or assigned requests match your search.' : 'No requests match your search.'}
                    </td>
                  </tr>
                )}
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.requestNo}</td>
                    {showsQueue && <td>{request.requestedBy}</td>}
                    <td>{request.destination}</td>
                    <td>{formatDate(request.departureDatetime, true)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                      {request.rejectionReason && (
                        <span className="cell-subtle">Reason: {request.rejectionReason}</span>
                      )}
                      {request.fuelRequested && (
                        <div className="fuel-indicator" style={{ marginTop: '4px', fontSize: '0.75rem', color: '#5b7ee3', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AppIcon name="release" style={{ width: '12px', height: '12px' }} />
                          <span>Fuel requested (₱{request.fuelAmount})</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {request.assignedVehicle}
                      <span className="cell-subtle">{request.assignedDriver}</span>
                    </td>
                    {showsAssignmentActions && (
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="button button-secondary row-action-button"
                            onClick={() => onOpenAssignmentModal(request)}
                          >
                            {request.assignedVehicleId ? 'Edit vehicle' : 'Assign vehicle'}
                          </button>
                          {isApprover && request.status === 'Pending Approval' && (
                            <>
                              <button
                                type="button"
                                className="button button-primary row-action-button"
                                onClick={() => onApproveRequest(request, 'Approved')}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="button button-danger row-action-button"
                                onClick={() => onRejectRequest(request)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {requestModalOpen && !isApprover && (
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
                  </select>
                </label>
                <label>
                  <span className="field-label">Assigned vehicle</span>
                  <select
                    className="input"
                    value={requestForm.assignedVehicleId}
                    onChange={(event) => {
                      const vehId = event.target.value;
                      onRequestFormChange('assignedVehicleId', vehId);
                      
                      // Auto-calculate KM if fuel liters exist
                      if (requestForm.fuelRequested && requestForm.fuelLiters > 0) {
                        const selectedVehicle = vehicleOptions.find(v => v.id === vehId);
                        const efficiency = selectedVehicle?.fuelEfficiency || 10;
                        const kms = (Number(requestForm.fuelLiters) || 0) * efficiency;
                        onRequestFormChange('estimatedKms', kms);
                      }
                    }}
                  >
                    <option value="">No vehicle selected</option>
                    {vehicleOptions.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleName} ({vehicle.plateNumber})
                      </option>
                    ))}
                  </select>
                </label>
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
                          onChange={(event) => {
                            const liters = event.target.value;
                            onRequestFormChange('fuelLiters', liters);
                            
                            // Auto-calculate KM
                            const selectedVehicle = vehicleOptions.find(v => v.id === requestForm.assignedVehicleId);
                            const efficiency = selectedVehicle?.fuelEfficiency || 10;
                            const kms = (Number(liters) || 0) * efficiency;
                            onRequestFormChange('estimatedKms', kms);
                          }}
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
                  <button type="submit" className="button button-primary button-solid">
                    Submit request
                  </button>
                  <span className="muted">
                    Only currently available drivers and vehicles are shown for selection.
                  </span>
                </div>
              </form>
            </section>
          </div>
        </>
      )}

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

      {rejectionModalOpen && isApprover && (
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
