export const navItems = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard', roles: ['admin', 'approver', 'requester', 'driver'] },
  { id: 'requests', label: 'Requests', icon: 'requests', roles: ['admin', 'approver', 'requester', 'driver'] },
  { id: 'trips', label: 'Trips', icon: 'trips', roles: ['admin', 'driver'] },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', roles: ['admin', 'approver', 'requester', 'driver'] },
  { id: 'vehicles', label: 'Fleet', icon: 'vehicles', roles: ['admin'] },
  { id: 'compliance', label: 'Compliance', icon: 'compliance', roles: ['admin', 'approver', 'requester', 'driver'] },
  { id: 'reports', label: 'Reports', icon: 'reports', roles: ['admin', 'approver'] },
  { id: 'settings', label: 'Settings', icon: 'settings', roles: ['admin'] },
];

export const READY_FOR_CHECKOUT = ['Approved', 'Ready for Release'];
export const ACTIVE_TRIP_STATUSES = ['Checked Out', 'In Transit', 'Overdue'];
