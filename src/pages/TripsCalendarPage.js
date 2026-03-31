import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { formatDate, toEventClass } from '../utils/appHelpers';

export default function TripsCalendarPage({ tripRecords }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTripId, setSelectedTripId] = useState(null);

  const selectedTrip = useMemo(() => {
    return selectedTripId ? tripRecords.find(t => t.id === selectedTripId) : null;
  }, [selectedTripId, tripRecords]);

  function getTripCalendarDates(trip) {
    return [
      trip.departureDatetime,
      trip.dateOut,
      trip.expectedReturnDatetime,
      trip.expectedReturn,
      trip.dateIn,
    ]
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()));
  }

  function isSameDay(left, right) {
    return (
      left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate()
    );
  }

  const tripsOnSelectedDate = useMemo(() => {
    return tripRecords.filter((trip) => {
      return getTripCalendarDates(trip).some((tripDate) => isSameDay(tripDate, selectedDate));
    });
  }, [selectedDate, tripRecords]);

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const hasTrip = tripRecords.some((trip) => getTripCalendarDates(trip).some((tripDate) => isSameDay(tripDate, date)));

      return hasTrip ? <div className="calendar-dot" /> : null;
    }

    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const trip = tripRecords.find((entry) =>
        getTripCalendarDates(entry).some((tripDate) => isSameDay(tripDate, date))
      );

      if (trip) {
        return toEventClass(trip.tripStatus);
      }
    }
    return null;
  };

  return (
    <div className="content-grid-tight calendar-page">
      <div className="calendar-layout">
        <SectionCard title="Trip Calendar" subtitle="Check vehicle bookings and scheduled travel">
          <div className="calendar-container premium-glass">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
            />
          </div>
        </SectionCard>

        <SectionCard 
          title={`Trips for ${formatDate(selectedDate)}`}
          subtitle={tripsOnSelectedDate.length > 0 ? `${tripsOnSelectedDate.length} booking(s) scheduled` : "No trips scheduled for this date"}
        >
          <div className="calendar-trip-list">
            {tripsOnSelectedDate.length === 0 ? (
              <div className="empty-state">
                <p>No trip records found for this date.</p>
              </div>
            ) : (
              <div className="trip-mini-grid">
                {tripsOnSelectedDate.map((trip) => (
                  <button 
                    key={trip.id} 
                    type="button"
                    className="trip-mini-card interactive-row"
                    onClick={() => setSelectedTripId(trip.id)}
                    style={{ textAlign: 'left', width: '100%', cursor: 'pointer', border: 'none', background: 'var(--surface)' }}
                  >
                    <div className="trip-mini-head">
                      <div>
                        <strong>{trip.requestNo}</strong>
                        <p className="cell-subtle">{trip.vehicle}</p>
                      </div>
                      <StatusBadge status={trip.tripStatus} />
                    </div>
                    <div className="trip-mini-body">
                      <p><strong>Driver:</strong> {trip.driver}</p>
                      <p><strong>Destination:</strong> {trip.destination}</p>
                      <p><strong>Departure:</strong> {formatDate(trip.departureDatetime || trip.dateOut, true)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {selectedTrip && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close trip details"
            onClick={() => setSelectedTripId(null)}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Trip details">
            <section className="modal-card">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Trip Details</p>
                  <h3>{selectedTrip.requestNo}</h3>
                  <p className="modal-copy">{selectedTrip.vehicle}</p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={() => setSelectedTripId(null)}
                >
                  Close
                </button>
              </div>

              <div className="detail-panel">
                <dl className="detail-list">
                  <div>
                    <dt>Status</dt>
                    <dd><StatusBadge status={selectedTrip.tripStatus} /></dd>
                  </div>
                  <div>
                    <dt>Driver</dt>
                    <dd>{selectedTrip.driver}</dd>
                  </div>
                  <div>
                    <dt>Destination</dt>
                    <dd>{selectedTrip.destination}</dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{selectedTrip.purpose}</dd>
                  </div>
                  <div>
                    <dt>Departure Time</dt>
                    <dd>{formatDate(selectedTrip.departureDatetime || selectedTrip.dateOut, true)}</dd>
                  </div>
                  <div>
                    <dt>Expected Return</dt>
                    <dd>{formatDate(selectedTrip.expectedReturnDatetime || selectedTrip.expectedReturn, true)}</dd>
                  </div>
                  {selectedTrip.dateIn && (
                    <div>
                      <dt>Actual Return</dt>
                      <dd>{formatDate(selectedTrip.dateIn, true)}</dd>
                    </div>
                  )}
                  {selectedTrip.remarks && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <dt>Remarks</dt>
                      <dd>{selectedTrip.remarks}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
