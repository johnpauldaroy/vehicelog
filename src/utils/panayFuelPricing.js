const CANONICAL_FUEL_TYPES = {
  diesel: 'diesel',
  gasoline_regular: 'gasoline_regular',
  gasoline_premium: 'gasoline_premium',
};

function toComparable(value) {
  return String(value || '').trim().toLowerCase();
}

export function toCanonicalFuelType(value) {
  const normalized = toComparable(value);

  if (!normalized) {
    return '';
  }

  if (normalized.includes('diesel')) {
    return CANONICAL_FUEL_TYPES.diesel;
  }

  if (normalized.includes('premium')) {
    return CANONICAL_FUEL_TYPES.gasoline_premium;
  }

  if (
    normalized.includes('regular')
    || normalized === 'gasoline'
    || normalized.includes('unleaded')
  ) {
    return CANONICAL_FUEL_TYPES.gasoline_regular;
  }

  return '';
}

function median(numbers = []) {
  if (!numbers.length) {
    return null;
  }

  const ordered = [...numbers].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);

  if (ordered.length % 2 === 0) {
    return (ordered[middle - 1] + ordered[middle]) / 2;
  }

  return ordered[middle];
}

function toPriceRows(rows = []) {
  return rows
    .map((row) => ({
      ...row,
      province: String(row?.province || '').trim(),
      municipality: String(row?.municipality || '').trim(),
      stationName: String(row?.stationName || row?.station_name || '').trim(),
      fuelType: toCanonicalFuelType(row?.fuelType || row?.fuel_type || ''),
      source: String(row?.source || '').trim(),
      observedAt: row?.observedAt || row?.observed_at || '',
      confidence: Number(row?.confidence || 0),
      pricePerLiter: Number(row?.pricePerLiter ?? row?.price_per_liter ?? 0),
    }))
    .filter((row) => row.province && row.municipality && row.fuelType && Number.isFinite(row.pricePerLiter) && row.pricePerLiter > 0);
}

export function buildPanayLocationOptions(rows = []) {
  const normalizedRows = toPriceRows(rows);
  const provinces = Array.from(new Set(normalizedRows.map((row) => row.province))).sort((left, right) => left.localeCompare(right));
  const municipalitiesByProvince = provinces.reduce((map, province) => {
    map[province] = Array.from(
      new Set(
        normalizedRows
          .filter((row) => row.province === province)
          .map((row) => row.municipality)
      )
    ).sort((left, right) => left.localeCompare(right));
    return map;
  }, {});

  return {
    provinces,
    municipalitiesByProvince,
  };
}

export function selectPanayFuelSuggestion(rows = [], filters = {}) {
  const normalizedRows = toPriceRows(rows);
  const province = String(filters?.province || '').trim();
  const municipality = String(filters?.municipality || '').trim();
  const fuelType = toCanonicalFuelType(filters?.fuelType || filters?.fuelProduct || '');

  if (!province || !fuelType || !normalizedRows.length) {
    return null;
  }

  const byFuelType = normalizedRows.filter((row) => row.fuelType === fuelType);
  const inProvince = byFuelType.filter((row) => row.province === province);

  if (!inProvince.length) {
    return null;
  }

  if (municipality) {
    const inMunicipality = inProvince.filter((row) => row.municipality === municipality);
    const confirmedRows = inMunicipality.filter((row) => row.confidence >= 0.7);

    if (confirmedRows.length) {
      const bestConfirmed = [...confirmedRows].sort((left, right) => left.pricePerLiter - right.pricePerLiter)[0];
      return {
        pricePerLiter: bestConfirmed.pricePerLiter,
        strategy: 'cheapest_confirmed_station',
        stationName: bestConfirmed.stationName,
        province,
        municipality,
        source: bestConfirmed.source,
        observedAt: bestConfirmed.observedAt,
        confidence: bestConfirmed.confidence,
      };
    }

    if (inMunicipality.length) {
      const municipalityMedian = median(inMunicipality.map((row) => row.pricePerLiter));
      if (municipalityMedian !== null) {
        return {
          pricePerLiter: municipalityMedian,
          strategy: 'municipality_median',
          stationName: '',
          province,
          municipality,
          source: inMunicipality[0].source || '',
          observedAt: inMunicipality[0].observedAt || '',
          confidence: inMunicipality.reduce((sum, row) => sum + row.confidence, 0) / inMunicipality.length,
        };
      }
    }
  }

  const provinceMedian = median(inProvince.map((row) => row.pricePerLiter));
  if (provinceMedian === null) {
    return null;
  }

  return {
    pricePerLiter: provinceMedian,
    strategy: 'province_median',
    stationName: '',
    province,
    municipality: municipality || '',
    source: inProvince[0].source || '',
    observedAt: inProvince[0].observedAt || '',
    confidence: inProvince.reduce((sum, row) => sum + row.confidence, 0) / inProvince.length,
  };
}

export function calculateSuggestedFuelAmount(liters, pricePerLiter) {
  const litersNumber = Number(liters);
  const priceNumber = Number(pricePerLiter);

  if (!Number.isFinite(litersNumber) || !Number.isFinite(priceNumber) || litersNumber <= 0 || priceNumber <= 0) {
    return '0';
  }

  return (litersNumber * priceNumber).toFixed(2);
}
