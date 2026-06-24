import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import type { FwAdRequestMachineInstance } from "./instance";
import type { MachineState } from "./state";

export const onInit = (state: MachineState, instance: FwAdRequestMachineInstance) => IO.of(state);

export const onPreroll = (state: MachineState, instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onContent = (state: MachineState, instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onMidroll = (state: MachineState, instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onPauseMidroll = (state: MachineState, instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onPostroll = (state: MachineState, instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

export const onDone = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(
    IO.of(state),
    IO.tap(() => instance.diagnostics.remove),
    IO.tap(() => instance.deps.adContext.dispose),
  );
