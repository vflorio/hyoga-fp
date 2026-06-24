import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
import type { FwAdRequestMachineInstance } from "./instance";
import { registerHandlers, removeHandlers } from "./mediaEvents";
import type { MachineState } from "./state";

// Transition | SetPhase -> StateChange -> InstancePhaseEffect<T>

// Questa funzione gestisce ogni possibile fase della state-machine, se si aggiunge una nuova Phase, da qui si connette all'instanza
export const runInstancePhaseEffect = (state: MachineState) => (instance: FwAdRequestMachineInstance) =>
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

export const onInit = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(
    IO.of(state),
    IO.tap(() => registerHandlers(instance.deps.adContext, instance.deps.SDK, instance.mediaEventListeners)),
    IO.tap(() => instance.diagnostics.register),
  );

export const onPreroll = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onContent = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onMidroll = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onPauseMidroll = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onPostroll = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onDone = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(
    IO.of(state),
    IO.tap(() => removeHandlers(instance.deps.adContext, instance.deps.SDK, instance.mediaEventListeners)),
    IO.tap(() => instance.diagnostics.remove),
    IO.tap(() => instance.deps.adContext.dispose),
  );
