import {
  buildPanayLocationOptions,
  calculateSuggestedFuelAmount,
  selectPanayFuelSuggestion,
} from './panayFuelPricing';

const rows = [
  { province: 'Iloilo', municipality: 'Iloilo City', station_name: 'A', fuel_type: 'diesel', price_per_liter: 58.2, confidence: 0.75, source: 'seed', observed_at: '2026-03-31T00:00:00Z' },
  { province: 'Iloilo', municipality: 'Iloilo City', station_name: 'B', fuel_type: 'diesel', price_per_liter: 57.9, confidence: 0.92, source: 'seed', observed_at: '2026-03-31T00:00:00Z' },
  { province: 'Iloilo', municipality: 'Iloilo City', station_name: 'C', fuel_type: 'diesel', price_per_liter: 58.6, confidence: 0.4, source: 'seed', observed_at: '2026-03-31T00:00:00Z' },
  { province: 'Iloilo', municipality: 'Oton', station_name: 'D', fuel_type: 'diesel', price_per_liter: 59.0, confidence: 0.9, source: 'seed', observed_at: '2026-03-31T00:00:00Z' },
];

describe('panayFuelPricing', () => {
  test('buildPanayLocationOptions groups provinces and municipalities', () => {
    const options = buildPanayLocationOptions(rows);
    expect(options.provinces).toEqual(['Iloilo']);
    expect(options.municipalitiesByProvince.Iloilo).toEqual(['Iloilo City', 'Oton']);
  });

  test('selectPanayFuelSuggestion uses cheapest confirmed station first', () => {
    const result = selectPanayFuelSuggestion(rows, {
      province: 'Iloilo',
      municipality: 'Iloilo City',
      fuelType: 'Diesel',
    });

    expect(result?.strategy).toBe('cheapest_confirmed_station');
    expect(result?.pricePerLiter).toBe(57.9);
    expect(result?.stationName).toBe('B');
  });

  test('selectPanayFuelSuggestion falls back to province median', () => {
    const result = selectPanayFuelSuggestion(rows, {
      province: 'Iloilo',
      municipality: 'Missing Municipality',
      fuelType: 'Diesel',
    });

    expect(result?.strategy).toBe('province_median');
    expect(result?.pricePerLiter).toBeCloseTo(58.4, 5);
  });

  test('calculateSuggestedFuelAmount multiplies liters and price', () => {
    expect(calculateSuggestedFuelAmount('25', 57.9)).toBe('1447.50');
    expect(calculateSuggestedFuelAmount('', 57.9)).toBe('0');
  });
});
