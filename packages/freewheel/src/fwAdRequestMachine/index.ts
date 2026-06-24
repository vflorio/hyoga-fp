import type { Logger } from "@hyoga-fp/core";
import type * as IO from "fp-ts/IO";
import type * as T from "fp-ts/Task";
import type { FwAdContext, FwAdRequestPlayerAdapter, FwSdk } from "..";
import type { MachinePhase, MachineState } from "./state";

// FwAdRequestPlayer è la machine-interper  per effettuare una richiesta di ADs a FreeWheel e mostrarla su schermo.
// Il ciclo di vita di questo oggetto termina quando tutti gli slots sono stati mostrati,
// quindi l'oggetto viene disposed quasi intantamente in caso l'AD Server ritorna 0 fwADSlot

export interface FwAdRequestMachine {
  // --------------------------------------------------------------------------
  // API
  // --------------------------------------------------------------------------

  // Qui facciamo iniziare il flusso principale della macchina
  readonly requestAds: T.Task<void>;

  // Dipendenze per la gestione del video, se l'interprete della macchina vuole mettere in pausa o riprendere,
  // deve utilizzare questa API per sincronizzare la MachineState, per mettere in pausa l'AdSlot, per triggerare lo slot di PauseMidroll
  readonly pause: IO.IO<void>;
  readonly resume: IO.IO<void>;

  // --------------------------------------------------------------------------
  // Services
  // --------------------------------------------------------------------------

  // Questa viene usata in caso si voglia eseguire una nuova richiesta AD prima di aver terminato gli slots
  // e/o remount react e simili
  readonly earlyDispose: IO.IO<void>;

  // Observability
  readonly getPhase: IO.IO<MachinePhase>;
  readonly getState: IO.IO<MachineState>;
  readonly onPhaseChange: (callback: (phase: MachinePhase) => void) => IO.IO<void>;
  readonly onStateChange: (callback: (state: MachineState) => void) => IO.IO<void>;
}

// Dipendenze necessarie per istanziare la macchina
export interface FwAdRequestMachineDeps {
  readonly logger: Logger;
  readonly SDK: FwSdk.SDK;
  readonly adContext: FwAdContext.AdContext;
  readonly videoAdapter: FwAdRequestPlayerAdapter.FwAdRequestPlayerAdapter;
  readonly setupBusinessAdContext: IO.IO<void>;
  readonly emit: (event: FwSdk.Event) => void;
  readonly emitStateChange: (state: MachineState) => void;
}

/// TODO
/**
 * Gestire manualmente la creazione dell'alberaturra del passaggio di fasi e gestione degli event listeners centralizzati
 * idealmente la machine viene dichiarata componendo diverse funzionalità, il file principale dovrebbe occuparsi di astrarre
 * la parte di switch fra Phases, ogni Phase dovrebbe iniziare e finire in maniera esplicita, il file principale
 * esegue le operazioni
 */
