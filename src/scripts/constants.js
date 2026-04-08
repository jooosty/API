export const BASE_URL = 'https://api.openf1.org/v1';

export const ENDPOINTS = [
    { label: 'Drivers',       path: '/drivers' },
    { label: 'Results',       path: '/session_result' },
    { label: 'Laps',          path: '/laps' },
    { label: 'Stints',        path: '/stints' },
    { label: 'Pit Stops',     path: '/pit' },
    { label: 'Position',      path: '/position' },
    { label: 'Intervals',     path: '/intervals' },
    { label: 'Race Control',  path: '/race_control' },
    { label: 'Weather',       path: '/weather' },
    { label: 'Starting Grid', path: '/starting_grid' },
    { label: 'Team Radio',    path: '/team_radio' },
    { label: 'Overtakes',     path: '/overtakes' },
    { label: 'Car Data',      path: '/car_data' },
];

export const ENDPOINTS_WITHOUT_DRIVER_FILTER = [
    '/session_result',
    '/race_control',
    '/weather',
    '/starting_grid',
];
