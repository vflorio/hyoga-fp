import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
//import { registerCoreHandlers, removeCoreHandlers } from "./events";
import type { Instance } from "./instance";
import type { State } from "./state";

// Transition | SetPhase -> StateChange -> InstancePhaseEffect<T>

// Questa funzione gestisce ogni possibile fase della state-machine, se si aggiunge una nuova Phase, da qui si connette all'instanza
export const runInstancePhaseEffect = (state: State) => (instance: Instance) =>
  pipe(
    IO.of(state),
    IO.tap(() => instance.deps.logger.debug(`[MachineInstance] Effect start ${state.phase._tag}`)),
    IO.flatMap(() =>
      match(state.phase)
        .with({ _tag: "Init" }, () => onInit(state, instance))
        .with({ _tag: "Preroll" }, () => onPreroll(state, instance))
        .with({ _tag: "Content" }, () => onContent(state, instance))
        .with({ _tag: "Midroll" }, () => onMidroll(state, instance))
        .with({ _tag: "PauseMidroll" }, () => onPauseMidroll(state, instance))
        .with({ _tag: "Postroll" }, () => onPostroll(state, instance))
        .with({ _tag: "Done" }, () => onDone(state, instance))
        .exhaustive(),
    ),
    IO.tap((newState) => instance.deps.logger.debug(`[MachineInstance] Effect end ${newState.phase._tag}`)),
  );

export const onInit = (state: State, instance: Instance) =>
  pipe(
    IO.of(state),
    // IO.tap(() => registerCoreHandlers(instance.deps.adContext, instance.deps.SDK, instance.coreHandlers)),
    IO.tap(() => instance.diagnostics.register),
  );

export const onPreroll = (state: State, _instance: Instance) => pipe(IO.of(state));

export const onContent = (state: State, _instance: Instance) => pipe(IO.of(state));

export const onMidroll = (state: State, _instance: Instance) => pipe(IO.of(state));

export const onPauseMidroll = (state: State, _instance: Instance) => pipe(IO.of(state));

export const onPostroll = (state: State, _instance: Instance) => pipe(IO.of(state));

export const onDone = (state: State, instance: Instance) =>
  pipe(
    IO.of(state),
    //  IO.tap(() => removeCoreHandlers(instance.deps.adContext, instance.deps.SDK, instance.coreHandlers)),
    IO.tap(() => instance.diagnostics.remove),
    IO.tap(() => instance.deps.adContext.dispose),
  );
