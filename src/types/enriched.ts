import type { EinladungenUndAntworten, Terminvorschlaege, Umfragen } from './app';

export type EnrichedUmfragen = Umfragen & {
  gewaehlter_terminName: string;
};

export type EnrichedTerminvorschlaege = Terminvorschlaege & {
  umfrageName: string;
};

export type EnrichedEinladungenUndAntworten = EinladungenUndAntworten & {
  personName: string;
  umfrageName: string;
  passende_termineName: string;
};
