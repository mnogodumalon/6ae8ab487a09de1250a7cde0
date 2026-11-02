import type { EnrichedEinladungenUndAntworten, EnrichedTerminvorschlaege, EnrichedUmfragen } from '@/types/enriched';
import type { EinladungenUndAntworten, Personen, Terminvorschlaege, Umfragen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface UmfragenMaps {
  terminvorschlaegeMap: Map<string, Terminvorschlaege>;
}

export function enrichUmfragen(
  umfragen: Umfragen[],
  maps: UmfragenMaps
): EnrichedUmfragen[] {
  return umfragen.map(r => ({
    ...r,
    gewaehlter_terminName: resolveDisplay(r.fields.gewaehlter_termin, maps.terminvorschlaegeMap, 'bezeichnung'),
  }));
}

interface TerminvorschlaegeMaps {
  umfragenMap: Map<string, Umfragen>;
}

export function enrichTerminvorschlaege(
  terminvorschlaege: Terminvorschlaege[],
  maps: TerminvorschlaegeMaps
): EnrichedTerminvorschlaege[] {
  return terminvorschlaege.map(r => ({
    ...r,
    umfrageName: resolveDisplay(r.fields.umfrage, maps.umfragenMap, 'titel'),
  }));
}

interface EinladungenUndAntwortenMaps {
  personenMap: Map<string, Personen>;
  umfragenMap: Map<string, Umfragen>;
  terminvorschlaegeMap: Map<string, Terminvorschlaege>;
}

export function enrichEinladungenUndAntworten(
  einladungenUndAntworten: EinladungenUndAntworten[],
  maps: EinladungenUndAntwortenMaps
): EnrichedEinladungenUndAntworten[] {
  return einladungenUndAntworten.map(r => ({
    ...r,
    personName: resolveDisplay(r.fields.person, maps.personenMap, 'vorname', 'nachname'),
    umfrageName: resolveDisplay(r.fields.umfrage, maps.umfragenMap, 'titel'),
    passende_termineName: resolveDisplay(r.fields.passende_termine, maps.terminvorschlaegeMap, 'bezeichnung'),
  }));
}
