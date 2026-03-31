import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { ACTIVE_TRIP_STATUSES, READY_FOR_CHECKOUT } from '../constants/appConfig';
import { formatDate, toEventClass } from '../utils/appHelpers';

export default function TripsCalendarPage({ tripRecords }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [activeStartDate, setActiveStartDate] = useState(new Date());

  function toDayKey(value) {
    return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
  }

  function isBookedTrip(trip) {
    return READY_FOR_CHECKOUT.includes(String(trip?.tripStatus || ''));
  }

  function isOngoingTrip(trip) {
    return ACTIVE_TRIP_STATUSES.includes(String(trip?.tripStatus || ''));
  }

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

  const tripCountsByDay = useMemo(() => {
    const nextCounts = new Map();

    tripRecords.forEach((trip) => {
      const uniqueDayKeys = new Set(
        getTripCalendarDates(trip).map((tripDate) => toDayKey(tripDate))
      );

      uniqueDayKeys.forEach((dayKey) => {
        const existing = nextCounts.get(dayKey) || {
          total: 0,
          booked: 0,
          ongoing: 0,
        };

        existing.total += 1;

        if (isBookedTrip(trip)) {
          existing.booked += 1;
        }

        if (isOngoingTrip(trip)) {
          existing.ongoing += 1;
        }

        nextCounts.set(dayKey, existing);
      });
    });

    return nextCounts;
  }, [tripRecords]);

  const tripsOnSelectedDate = useMemo(() => {
    return tripRecords.filter((trip) => {
      return getTripCalendarDates(trip).some((tripDate) => isSameDay(tripDate, selectedDate));
    });
  }, [selectedDate, tripRecords]);

  const selectedDateCounts = useMemo(() => {
    return tripCountsByDay.get(toDayKey(selectedDate)) || {
      total: 0,
      booked: 0,
      ongoing: 0,
    };
  }, [selectedDate, tripCountsByDay]);

  const activeMonthCounts = useMemo(() => {
    const month = activeStartDate.getMonth();
    const year = activeStartDate.getFullYear();

    return tripRecords.reduce((summary, trip) => {
      const touchesMonth = getTripCalendarDates(trip).some(
        (tripDate) => tripDate.getFullYear() === year && tripDate.getMonth() === month
      );

      if (!touchesMonth) {
        return summary;
      }

      if (isBookedTrip(trip)) {
        summary.booked += 1;
      }

      if (isOngoingTrip(trip)) {
        summary.ongoing += 1;
      }

      return summary;
    }, { booked: 0, ongoing: 0 });
  }, [activeStartDate, tripRecords]);

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayCounts = tripCountsByDay.get(toDayKey(date));

      if (!dayCounts?.total) {
        return null;
      }

      return (
        <div className="calendar-tile-meta">
          <div className="calendar-dot" />
          <div className="calendar-tile-counts">
            {dayCounts.booked > 0 && (
              <span className="calendar-count-tag calendar-count-tag-booked">
                {dayCounts.booked} booked
              </span>
            )}
            {dayCounts.ongoing > 0 && (
              <span className="calendar-count-tag calendar-count-tag-ongoing">
                {dayCounts.ongoing} ongoing
              </span>
            )}
          </div>
        </div>
      );
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
          <div className="calendar-status-overview">
            <span className="calendar-status-pill calendar-status-pill-booked">
              Booked this month: {activeMonthCounts.booked}
            </span>
            <span className="calendar-status-pill calendar-status-pill-ongoing">
              Ongoing this month: {activeMonthCounts.ongoing}
            </span>
          </div>
          <div className="calendar-container premium-glass">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              onActiveStartDateChange={({ activeStartDate: nextStartDate }) => {
                if (nextStartDate) {
                  setActiveStartDate(nextStartDate);
                }
              }}
              tileContent={tileContent}
              tileClassName={tileClassName}
            />
          </div>
        </SectionCard>

        <SectionCard 
          title={`Trips for ${formatDate(selectedDate)}`}
          subtitle={tripsOnSelectedDate.length > 0
            ? `${tripsOnSelectedDate.length} trip(s): ${selectedDateCounts.booked} booked, ${selectedDateCounts.ongoing} ongoing`
            : 'No trips scheduled for this date'}
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
