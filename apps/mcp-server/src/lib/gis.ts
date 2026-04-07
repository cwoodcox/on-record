// apps/mcp-server/src/lib/gis.ts
import { logger } from './logger.js'
import { retryWithDelay } from './retry.js'
import { createAppError } from '@on-record/types'

const UGRC_BASE = 'https://api.mapserv.utah.gov/api/v1'
const GEOCODE_MIN_SCORE = 70

// Thrown inside retryWithDelay to signal a non-retryable HTTP status from UGRC.
// shouldRetry checks for this class to skip delays on 4xx responses.
class UgrcHttpError extends Error {
  constructor(public readonly status: number) {
    super(`UGRC HTTP ${status}`)
  }
}

export interface GisDistrictResult {
  houseDistrict: number
  senateDistrict: number
  resolvedAddress: string
}

// Internal typed interfaces for UGRC API response shapes.
interface UgrcGeocodeResponse {
  status: number
  result?: {
    location: { x: number; y: number }
    score: number
    matchAddress?: string
  }
}

interface UgrcSearchResponse {
  status: number
  result?: Array<{ attributes: { dist: number } }>
}

export async function resolveAddressToDistricts(
  street: string,
  zone: string,
  apiKey: string,
): Promise<GisDistrictResult> {
  // Step 1: Geocode address to lat/long
  const geocodeUrl =
    `${UGRC_BASE}/geocode/${encodeURIComponent(street)}/${encodeURIComponent(zone)}` +
    `?spatialReference=4326&apiKey=${apiKey}`

  let geocodeData: UgrcGeocodeResponse
  try {
    geocodeData = await retryWithDelay(
      async () => {
        const res = await fetch(geocodeUrl)
        if (res.status === 404) throw new UgrcHttpError(404)
        if (res.status === 400) throw new UgrcHttpError(400)
        if (!res.ok) throw new Error(`UGRC geocode HTTP ${res.status}`)
        return res.json() as Promise<UgrcGeocodeResponse>
      },
      2,
      1000,
      (err) => !(err instanceof UgrcHttpError),
    )
  } catch (err) {
    if (err instanceof UgrcHttpError && err.status === 404) {
      logger.warn(
        { source: 'gis-api', address: '[REDACTED]' },
        'UGRC geocode: address not found',
      )
      throw createAppError(
        'gis-api',
        'Address not found',
        'Check that the address is a valid Utah street address and try again.',
      )
    }
    if (err instanceof UgrcHttpError && err.status === 400) {
      logger.error(
        { source: 'gis-api', address: '[REDACTED]' },
        'UGRC geocode: bad request — malformed input',
      )
      throw createAppError(
        'gis-api',
        'Address lookup failed — request was malformed',
        'This is an internal error. Please try again or contact support if the problem persists.',
      )
    }
    logger.error(
      { source: 'gis-api', address: '[REDACTED]', err },
      'UGRC geocode failed after retries',
    )
    throw createAppError(
      'gis-api',
      'Address lookup failed — the GIS service is unavailable',
      'Try again in a few seconds. If the problem persists, the service may be temporarily down.',
    )
  }

  const geocodeResult = geocodeData.result
  if (
    !geocodeResult ||
    typeof geocodeResult.score !== 'number' ||
    geocodeResult.score < GEOCODE_MIN_SCORE
  ) {
    logger.warn(
      { source: 'gis-api', address: '[REDACTED]', score: geocodeResult?.score },
      'UGRC geocode low-confidence or missing result',
    )
    throw createAppError(
      'gis-api',
      'Your address could not be confidently located in Utah',
      'Check that the address is a valid Utah street address (not a P.O. Box or out-of-state address) and try again.',
    )
  }

  const { x: longitude, y: latitude } = geocodeResult.location
  const resolvedAddress = geocodeResult.matchAddress ?? `${street}, ${zone}`

  // Step 2: Query House and Senate districts in parallel
  // UGRC search endpoint requires ArcGIS JSON geometry format: point:{"x":lon,"y":lat}
  const geometry = `point:{"x":${longitude},"y":${latitude}}`
  const districtParams =
    `geometry=${encodeURIComponent(geometry)}&spatialReference=4326&apiKey=${apiKey}`
  const houseUrl = `${UGRC_BASE}/search/political.house_districts_2022_to_2032/dist?${districtParams}`
  const senateUrl = `${UGRC_BASE}/search/political.senate_districts_2022_to_2032/dist?${districtParams}`

  let houseData: UgrcSearchResponse, senateData: UgrcSearchResponse
  try {
    ;[houseData, senateData] = await Promise.all([
      fetch(houseUrl, ).then(async (r) => {
        if (!r.ok) throw new Error(`UGRC house district HTTP ${r.status}`)
        return r.json() as Promise<UgrcSearchResponse>
      }),
      fetch(senateUrl, ).then(async (r) => {
        if (!r.ok) throw new Error(`UGRC senate district HTTP ${r.status}`)
        return r.json() as Promise<UgrcSearchResponse>
      }),
    ])
  } catch (err) {
    logger.error(
      { source: 'gis-api', address: '[REDACTED]', err },
      'UGRC district query failed',
    )
    throw createAppError(
      'gis-api',
      'Legislative district lookup failed after resolving your address',
      'Try again in a few seconds.',
    )
  }

  const houseDistrict = houseData.result?.[0]?.attributes?.dist
  const senateDistrict = senateData.result?.[0]?.attributes?.dist

  if (
    typeof houseDistrict !== 'number' ||
    typeof senateDistrict !== 'number' ||
    isNaN(houseDistrict) ||
    isNaN(senateDistrict)
  ) {
    logger.warn(
      { source: 'gis-api', address: '[REDACTED]', houseDistrict, senateDistrict },
      'District number missing in SGID response',
    )
    throw createAppError(
      'gis-api',
      'Your address could not be matched to a Utah legislative district',
      'Verify the address is within Utah. P.O. Boxes and rural routes may not resolve correctly — use a physical street address.',
    )
  }

  logger.info(
    { source: 'gis-api', address: '[REDACTED]', houseDistrict, senateDistrict },
    'GIS district lookup successful',
  )

  return { houseDistrict, senateDistrict, resolvedAddress }
}
