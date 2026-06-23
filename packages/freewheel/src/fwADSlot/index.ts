import type * as Eq from "fp-ts/Eq";
import { flow, pipe } from "fp-ts/function";
import type * as E from "fp-ts/lib/Endomorphism";
import * as N from "fp-ts/number";
import * as Ord from "fp-ts/Ord";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import type * as RR from "fp-ts/ReadonlyRecord";
import * as S from "fp-ts/string";

export interface AdSlot {
  getTimePositionClass(): string;
  getTimePosition(): number;
  getAdCount(): number;
  play(): void;
  pause(): void;
  resume(): void;
}

// -------------------------------------------------------------------------------------
// Eq
// -------------------------------------------------------------------------------------

export const eqByTimePositionClass: Eq.Eq<AdSlot> = {
  equals: (a, b) => S.Eq.equals(a.getTimePositionClass(), b.getTimePositionClass()),
};

export const eqByTimePosition: Eq.Eq<AdSlot> = {
  equals: (a, b) => N.Eq.equals(a.getTimePosition(), b.getTimePosition()),
};

export const adSlotEq: Eq.Eq<AdSlot> = {
  equals: (a, b) => eqByTimePositionClass.equals(a, b) && eqByTimePosition.equals(a, b),
};

// -------------------------------------------------------------------------------------
// Ord
// -------------------------------------------------------------------------------------

export const ordByTimePosition: Ord.Ord<AdSlot> = pipe(
  N.Ord,
  Ord.contramap((s: AdSlot) => s.getTimePosition()),
);

export const sortByTimePosition: (slots: ReadonlyArray<AdSlot>) => ReadonlyArray<AdSlot> = RA.sort(ordByTimePosition);

// -------------------------------------------------------------------------------------
// Show
// -------------------------------------------------------------------------------------

export const show = (slot: AdSlot): string => `[${slot.getTimePositionClass()} @ ${slot.getTimePosition()}s]`;

export const showAll = (slots: ReadonlyArray<AdSlot>): string => pipe(slots, RA.map(show)).join(", ");

// -------------------------------------------------------------------------------------
// Grouping
// -------------------------------------------------------------------------------------

export const groupBy =
  (key: (slot: AdSlot) => string) =>
  (slots: ReadonlyArray<AdSlot>): RR.ReadonlyRecord<string, RNEA.ReadonlyNonEmptyArray<AdSlot>> =>
    pipe(slots, RNEA.groupBy(key));

export const groupByTimePositionClass: (
  slots: ReadonlyArray<AdSlot>,
) => RR.ReadonlyRecord<string, RNEA.ReadonlyNonEmptyArray<AdSlot>> = groupBy((slot) => slot.getTimePositionClass());

export const groupByWith =
  (mod: E.Endomorphism<string>) =>
  (
    key: (slot: AdSlot) => string,
  ): ((slots: ReadonlyArray<AdSlot>) => RR.ReadonlyRecord<string, RNEA.ReadonlyNonEmptyArray<AdSlot>>) =>
    groupBy(flow(key, mod));

// -------------------------------------------------------------------------------------
// Filters
// -------------------------------------------------------------------------------------

export const filterByTimePositionClass =
  (classId: string) =>
  (slots: ReadonlyArray<AdSlot>): ReadonlyArray<AdSlot> =>
    pipe(
      slots,
      RA.filter((slot) => slot.getTimePositionClass() === classId),
    );

export const filterNear =
  (time: number, threshold = 0.5) =>
  (slots: ReadonlyArray<AdSlot>): ReadonlyArray<AdSlot> =>
    pipe(
      slots,
      RA.filter((slot) => Math.abs(slot.getTimePosition() - time) < threshold),
    );
