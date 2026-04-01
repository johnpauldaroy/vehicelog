import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-panay-sync-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ProviderFuelRow = Record<string, unknown>;

type FuelSnapshotRow = {
  province: string;
  municipality: string;
  station_name: string;
  fuel_type: 'diesel' | 'gasoline_regular' | 'gasoline_premium';
  price_per_liter: number;
  currency: string;
  observed_at: string;
  source: string;
  confidence: number;
  ingested_at: string;
};

const PANAY_PROVINCES = new Set(['iloilo', 'capiz', 'aklan', 'antique']);
const GASWATCH_DEFAULT_BASE_URL = 'https://gaswatchph.com';
const METROFUEL_DEFAULT_BASE_URL = 'https://metrofueltracker.com';

const METROFUEL_PANAY_BOUNDS = {
  south: 10.38,
  west: 121.80,
  north: 11.95,
  east: 123.15,
};

const METROFUEL_TYPE_MAP: Record<string, string> = {
  diesel: 'DIESEL',
  gasoline_regular: 'UNLEADED_91',
  gasoline_premium: 'PREMIUM_95',
};

const PANAY_EXPLICIT_LOCATION_MATCHES: Array<{ token: string; province: string; municipality: string }> = [
  { token: 'iloilo city', province: 'Iloilo', municipality: 'Iloilo City' },
  { token: 'roxas city', province: 'Capiz', municipality: 'Roxas City' },
  { token: 'kalibo', province: 'Aklan', municipality: 'Kalibo' },
  { token: 'san jose de buenavista', province: 'Antique', municipality: 'San Jose De Buenavista' },
  { token: 'passi city', province: 'Iloilo', municipality: 'Passi City' },
];

const PANAY_PROVINCE_FROM_TOKEN: Array<{ token: string; province: string }> = [
  { token: 'iloilo', province: 'Iloilo' },
  { token: 'capiz', province: 'Capiz' },
  { token: 'aklan', province: 'Aklan' },
  { token: 'antique', province: 'Antique' },
];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeFuelType(value: unknown): FuelSnapshotRow['fuel_type'] | null {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes('diesel')) {
    return 'diesel';
  }

  if (normalized.includes('premium')) {
    return 'gasoline_premium';
  }

  if (normalized.includes('regular') || normalized.includes('unleaded') || normalized === 'gasoline') {
    return 'gasoline_regular';
  }

  return null;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeJsonObjectParse<T = Record<string, unknown>>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (_error) {
    return null;
  }
}

function extractJsConstValue(script: string, constName: string): string | null {
  const marker = `const ${constName} =`;
  const markerIndex = script.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const afterMarker = script.slice(markerIndex + marker.length);
  const firstBraceIndex = afterMarker.search(/[\[{"]/);
  if (firstBraceIndex < 0) {
    return null;
  }

  const body = afterMarker.slice(firstBraceIndex).trimStart();
  if (body.startsWith('"')) {
    const endIndex = body.indexOf('";');
    if (endIndex < 0) {
      return null;
    }
    return body.slice(0, endIndex + 1);
  }

  const openChar = body[0];
  const closeChar = openChar === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return body.slice(0, i + 1);
      }
    }
  }

  return null;
}

function jsObjectLikeToJson(raw: string): string {
  return raw
    .replace(/\/\/[^\r\n]*/g, '')
    .replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1');
}

function parseGaswatchDate(lastUpdatedRaw: string | null): string {
  if (!lastUpdatedRaw) {
    return new Date().toISOString();
  }

  const rawValue = lastUpdatedRaw.replace(/^"|"$/g, '');
  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

function inferPanayProvinceMunicipality(station: { area?: unknown; name?: unknown }): { province: string; municipality: string } | null {
  const areaRaw = String(station.area || '').trim();
  const nameRaw = String(station.name || '').trim();
  const haystack = `${areaRaw} ${nameRaw}`.toLowerCase();

  for (const match of PANAY_EXPLICIT_LOCATION_MATCHES) {
    if (haystack.includes(match.token)) {
      return {
        province: match.province,
        municipality: match.municipality,
      };
    }
  }

  for (const match of PANAY_PROVINCE_FROM_TOKEN) {
    if (haystack.includes(match.token)) {
      return {
        province: match.province,
        municipality: areaRaw ? titleCase(areaRaw) : match.province,
      };
    }
  }

  return null;
}

function normalizeGaswatchFuelEntries(station: Record<string, unknown>, overridesByStation: Record<string, unknown>): ProviderFuelRow[] {
  const stationId = String(station.id ?? '').trim();
  const stationName = String(station.name ?? '').trim();
  const location = inferPanayProvinceMunicipality(station);

  if (!stationId || !stationName || !location) {
    return [];
  }

  const basePrices = (station.prices && typeof station.prices === 'object')
    ? station.prices as Record<string, unknown>
    : {};

  const overrideFuelMap = (overridesByStation[stationId] && typeof overridesByStation[stationId] === 'object')
    ? overridesByStation[stationId] as Record<string, unknown>
    : {};

  function readPrice(rawValue: unknown): number | null {
    const value = toFiniteNumber(rawValue, NaN);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }

  function getPriceWithOverride(fuelKey: string): { price: number | null; confidence: number; source: string } {
    const overrideEntry = (overrideFuelMap[fuelKey] && typeof overrideFuelMap[fuelKey] === 'object')
      ? overrideFuelMap[fuelKey] as Record<string, unknown>
      : null;

    const overridePrice = overrideEntry ? readPrice(overrideEntry.p) : null;
    if (overridePrice !== null) {
      const isCommunity = Number(overrideEntry.r) === 1;
      return {
        price: overridePrice,
        confidence: isCommunity ? 0.78 : 0.9,
        source: isCommunity ? 'gaswatchph_community' : 'gaswatchph_official',
      };
    }

    return {
      price: readPrice(basePrices[fuelKey]),
      confidence: 0.85,
      source: 'gaswatchph',
    };
  }

  const diesel = getPriceWithOverride('diesel');
  const regularCandidates = [getPriceWithOverride('unleaded'), getPriceWithOverride('egasoline')]
    .filter((entry) => entry.price !== null) as Array<{ price: number; confidence: number; source: string }>;
  const premiumCandidates = [getPriceWithOverride('premium95'), getPriceWithOverride('premium97')]
    .filter((entry) => entry.price !== null) as Array<{ price: number; confidence: number; source: string }>;

  const regular = regularCandidates.sort((a, b) => a.price - b.price)[0] || null;
  const premium = premiumCandidates.sort((a, b) => a.price - b.price)[0] || null;

  const rows: ProviderFuelRow[] = [];
  if (diesel.price !== null) {
    rows.push({
      province: location.province,
      municipality: location.municipality,
      station_name: stationName,
      fuel_type: 'diesel',
      price_per_liter: diesel.price,
      currency: 'PHP',
      confidence: diesel.confidence,
      source: diesel.source,
    });
  }
  if (regular) {
    rows.push({
      province: location.province,
      municipality: location.municipality,
      station_name: stationName,
      fuel_type: 'gasoline_regular',
      price_per_liter: regular.price,
      currency: 'PHP',
      confidence: regular.confidence,
      source: regular.source,
    });
  }
  if (premium) {
    rows.push({
      province: location.province,
      municipality: location.municipality,
      station_name: stationName,
      fuel_type: 'gasoline_premium',
      price_per_liter: premium.price,
      currency: 'PHP',
      confidence: premium.confidence,
      source: premium.source,
    });
  }

  return rows;
}

async function fetchGaswatchRows(apiBaseUrl: string): Promise<ProviderFuelRow[]> {
  const baseUrl = (apiBaseUrl || GASWATCH_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const [dataResponse, overridesResponse] = await Promise.all([
    fetch(`${baseUrl}/js/data.js`, {
      method: 'GET',
      headers: { Accept: 'application/javascript, text/javascript, */*;q=0.1' },
    }),
    fetch(`${baseUrl}/js/station-overrides.js`, {
      method: 'GET',
      headers: { Accept: 'application/javascript, text/javascript, */*;q=0.1' },
    }),
  ]);

  if (!dataResponse.ok) {
    throw new Error(`GasWatch data.js request failed with status ${dataResponse.status}.`);
  }
  if (!overridesResponse.ok) {
    throw new Error(`GasWatch station-overrides.js request failed with status ${overridesResponse.status}.`);
  }

  const [dataScript, overridesScript] = await Promise.all([
    dataResponse.text(),
    overridesResponse.text(),
  ]);

  const stationsRaw = extractJsConstValue(dataScript, 'GAS_STATIONS');
  if (!stationsRaw) {
    throw new Error('GasWatch GAS_STATIONS was not found in data.js.');
  }

  const lastUpdatedRaw = extractJsConstValue(dataScript, 'LAST_UPDATED');
  const observedAt = parseGaswatchDate(lastUpdatedRaw);
  const stationsJson = jsObjectLikeToJson(stationsRaw);
  const stations = safeJsonObjectParse<Array<Record<string, unknown>>>(stationsJson);

  if (!Array.isArray(stations) || !stations.length) {
    throw new Error('GasWatch GAS_STATIONS parse yielded zero rows.');
  }

  const overridesRaw = extractJsConstValue(overridesScript, 'STATION_OVERRIDES');
  const overridesJson = jsObjectLikeToJson(overridesRaw || '{}');
  const overrides = safeJsonObjectParse<Record<string, unknown>>(overridesJson) || {};

  return stations.flatMap((station) => {
    const rows = normalizeGaswatchFuelEntries(station, overrides);
    return rows.map((row) => ({
      ...row,
      observed_at: observedAt,
    }));
  });
}

async function fetchMetroFuelTrackerRows(apiBaseUrl: string): Promise<ProviderFuelRow[]> {
  const baseUrl = (apiBaseUrl || METROFUEL_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const results: ProviderFuelRow[] = [];

  const fuelTypes = Object.entries(METROFUEL_TYPE_MAP);

  await Promise.all(
    fuelTypes.map(async ([canonicalType, providerType]) => {
      const url = new URL(`${baseUrl}/api/stations`);
      url.searchParams.set('fuelType', providerType);
      url.searchParams.set('south', METROFUEL_PANAY_BOUNDS.south.toString());
      url.searchParams.set('west', METROFUEL_PANAY_BOUNDS.west.toString());
      url.searchParams.set('north', METROFUEL_PANAY_BOUNDS.north.toString());
      url.searchParams.set('east', METROFUEL_PANAY_BOUNDS.east.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.error(`MetroFuel ${providerType} fetch failed: ${response.status}`);
        return;
      }

      const payload = await response.json();
      const stations = (payload.stations || []) as Array<Record<string, unknown>>;

      for (const station of stations) {
        const stationName = String(station.name || '').trim();
        const priceData = (station.prices && typeof station.prices === 'object')
          ? (station.prices as Record<string, Record<string, unknown>>)[providerType]
          : null;

        const price = priceData ? toFiniteNumber(priceData.price, 0) : 0;
        const reportedAt = priceData ? String(priceData.reportedAt || '') : '';

        if (!stationName || price <= 0) continue;

        const location = inferPanayProvinceMunicipality({ name: stationName });
        
        results.push({
          province: location?.province || 'Iloilo', // Default to Iloilo if fallback needed
          municipality: location?.municipality || 'Panay Area', 
          station_name: stationName,
          fuel_type: canonicalType,
          price_per_liter: price,
          currency: 'PHP',
          confidence: 0.95,
          source: 'metrofueltracker',
          observed_at: reportedAt || new Date().toISOString(),
        });
      }
    })
  );

  return results;
}

function extractRows(payload: unknown): ProviderFuelRow[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry) => entry && typeof entry === 'object') as ProviderFuelRow[];
  }

  if (payload && typeof payload === 'object') {
    const maybeData = (payload as Record<string, unknown>).data;
    if (Array.isArray(maybeData)) {
      return maybeData.filter((entry) => entry && typeof entry === 'object') as ProviderFuelRow[];
    }
  }

  return [];
}

async function fetchStationsAndPrices(provider: string, apiBaseUrl: string, apiKey: string): Promise<ProviderFuelRow[]> {
  if (provider === 'mock') {
    const observedAt = new Date().toISOString();
    return [
      { province: 'Iloilo', municipality: 'Iloilo City', station_name: 'Metro Oil - Diversion', fuel_type: 'diesel', price_per_liter: 57.9, confidence: 0.92, observed_at: observedAt },
      { province: 'Iloilo', municipality: 'Iloilo City', station_name: 'Shell - Jaro', fuel_type: 'gasoline_regular', price_per_liter: 62.1, confidence: 0.9, observed_at: observedAt },
      { province: 'Capiz', municipality: 'Roxas City', station_name: 'Caltex - Arnaldo Blvd', fuel_type: 'diesel', price_per_liter: 58.5, confidence: 0.84, observed_at: observedAt },
      { province: 'Aklan', municipality: 'Kalibo', station_name: 'Petron - Kalibo', fuel_type: 'diesel', price_per_liter: 58.75, confidence: 0.8, observed_at: observedAt },
      { province: 'Antique', municipality: 'San Jose de Buenavista', station_name: 'Phoenix - Sibalom Road', fuel_type: 'diesel', price_per_liter: 59.1, confidence: 0.78, observed_at: observedAt },
    ];
  }

  if (provider === 'gaswatch') {
    return fetchGaswatchRows(apiBaseUrl);
  }

  if (provider === 'metrofueltracker') {
    return fetchMetroFuelTrackerRows(apiBaseUrl);
  }

  if (!apiBaseUrl || !apiKey) {
    throw new Error('Provider API credentials are missing.');
  }

  const endpoint = `${apiBaseUrl.replace(/\/+$/, '')}/panay/prices`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const rows = extractRows(payload);

  if (!rows.length) {
    throw new Error('Provider payload did not include fuel price rows.');
  }

  return rows;
}

function normalizeToSnapshotRows(rows: ProviderFuelRow[], provider: string): FuelSnapshotRow[] {
  const ingestedAt = new Date().toISOString();

  return rows
    .map((entry) => {
      const provinceRaw = String(entry.province ?? entry.region ?? '').trim();
      const municipalityRaw = String(entry.municipality ?? entry.city ?? '').trim();
      const stationRaw = String(entry.station_name ?? entry.station ?? entry.name ?? '').trim();
      const fuelType = normalizeFuelType(entry.fuel_type ?? entry.product ?? entry.fuel);
      const price = toFiniteNumber(entry.price_per_liter ?? entry.price ?? entry.amount);

      if (!provinceRaw || !municipalityRaw || !stationRaw || !fuelType || price <= 0) {
        return null;
      }

      const provinceNormalized = provinceRaw.toLowerCase();
      if (!PANAY_PROVINCES.has(provinceNormalized)) {
        return null;
      }

      return {
        province: titleCase(provinceRaw),
        municipality: titleCase(municipalityRaw),
        station_name: stationRaw,
        fuel_type: fuelType,
        price_per_liter: price,
        currency: String(entry.currency || 'PHP').toUpperCase(),
        observed_at: new Date(String(entry.observed_at ?? entry.observedAt ?? entry.updated_at ?? new Date().toISOString())).toISOString(),
        source: String(entry.source || provider),
        confidence: Math.min(1, Math.max(0, toFiniteNumber(entry.confidence, 0.6))),
        ingested_at: ingestedAt,
      } satisfies FuelSnapshotRow;
    })
    .filter((entry): entry is FuelSnapshotRow => Boolean(entry));
}

async function upsertSnapshots(client: ReturnType<typeof createClient>, rows: FuelSnapshotRow[]) {
  if (!rows.length) {
    return 0;
  }

  const { error } = await client
    .from('fuel_price_snapshots')
    .upsert(rows, {
      onConflict: 'province,municipality,station_name,fuel_type,observed_at',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(error.message || 'Unable to upsert fuel price snapshots.');
  }

  return rows.length;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const provider = String(Deno.env.get('PANAY_FUEL_PROVIDER') || '').trim().toLowerCase();
  const providerBaseUrl = String(Deno.env.get('PANAY_FUEL_API_BASE_URL') || '').trim();
  const providerApiKey = String(Deno.env.get('PANAY_FUEL_API_KEY') || '').trim();
  const syncToken = String(Deno.env.get('PANAY_FUEL_SYNC_TOKEN') || '').trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Supabase edge function secrets are not configured.' }, 500);
  }

  if (syncToken) {
    const incomingToken = String(request.headers.get('x-panay-sync-token') || '').trim();
    if (!incomingToken || incomingToken !== syncToken) {
      return jsonResponse({ error: 'Unauthorized sync token.' }, 401);
    }
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const startedAt = new Date().toISOString();
  const { data: runRow, error: runInsertError } = await serviceClient
    .from('fuel_price_sync_runs')
    .insert({
      provider,
      status: 'running',
      started_at: startedAt,
      metadata: {
        trigger: 'edge_function',
      },
    })
    .select('id')
    .single();

  if (runInsertError) {
    return jsonResponse({ error: runInsertError.message || 'Unable to create sync run.' }, 500);
  }

  async function finalizeRun(status: 'completed' | 'failed' | 'skipped', rowsUpserted: number, errorMessage = '', metadata: Record<string, unknown> = {}) {
    await serviceClient
      .from('fuel_price_sync_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        rows_upserted: rowsUpserted,
        error: errorMessage || null,
        metadata,
      })
      .eq('id', runRow.id);
  }

  try {
    if (!provider) {
      await finalizeRun('skipped', 0, 'PANAY_FUEL_PROVIDER is not configured.');
      return jsonResponse({
        status: 'skipped',
        provider: '',
        reason: 'PANAY_FUEL_PROVIDER is not configured.',
      });
    }

    const providerNeedsApiKey = provider !== 'mock' && provider !== 'gaswatch';
    if (providerNeedsApiKey && (!providerBaseUrl || !providerApiKey)) {
      await finalizeRun('skipped', 0, 'Provider credentials are missing.');
      return jsonResponse({
        status: 'skipped',
        provider,
        reason: 'Provider credentials are missing.',
      });
    }

    const providerRows = await fetchStationsAndPrices(provider, providerBaseUrl, providerApiKey);
    const normalizedRows = normalizeToSnapshotRows(providerRows, provider);
    if (!normalizedRows.length) {
      const reason = `No Panay rows available from provider ${provider}.`;
      await finalizeRun('skipped', 0, reason, {
        providerRows: providerRows.length,
        normalizedRows: 0,
      });
      return jsonResponse({
        status: 'skipped',
        provider,
        reason,
        providerRows: providerRows.length,
      });
    }
    const rowsUpserted = await upsertSnapshots(serviceClient, normalizedRows);

    await finalizeRun('completed', rowsUpserted, '', {
      providerRows: providerRows.length,
      normalizedRows: normalizedRows.length,
    });

    return jsonResponse({
      status: 'completed',
      provider,
      providerRows: providerRows.length,
      normalizedRows: normalizedRows.length,
      rowsUpserted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected sync failure.';
    await finalizeRun('failed', 0, message);
    return jsonResponse({ status: 'failed', provider, error: message }, 500);
  }
});
