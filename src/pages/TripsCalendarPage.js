import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { formatDate, toEventClass } from '../utils/appHelpers';

export default function TripsCalendarPage({ tripRecords }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const tripsOnSelectedDate = useMemo(() => {
    return tripRecords.filter((trip) => {
      const departure = trip.departureDatetime ? new Date(trip.departureDatetime) : null;
      const expectedDate = trip.expectedReturnDatetime ? new Date(trip.expectedReturnDatetime) : (trip.expectedReturn ? new Date(trip.expectedReturn) : null);
      
      const checkDate = (d) => 
        d && d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate();

      return checkDate(departure) || checkDate(expectedDate);
    });
  }, [selectedDate, tripRecords]);

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const hasTrip = tripRecords.some((trip) => {
        const d = trip.departureDatetime ? new Date(trip.departureDatetime) : (trip.dateOut ? new Date(trip.dateOut) : null);
        return d && d.getFullYear() === date.getFullYear() &&
               d.getMonth() === date.getMonth() &&
               d.getDate() === date.getDate();
      });

      return hasTrip ? <div className="calendar-dot" /> : null;
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const trip = tripRecords.find((trip) => {
        const d = trip.departureDatetime ? new Date(trip.departureDatetime) : (trip.dateOut ? new Date(trip.dateOut) : null);
        return d && d.getFullYear() === date.getFullYear() &&
               d.getMonth() === date.getMonth() &&
               d.getDate() === date.getDate();
      });

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
                  <div key={trip.id} className="trip-mini-card">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
