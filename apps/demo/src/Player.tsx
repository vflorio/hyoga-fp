import { Box, Button, Stack, Typography } from "@mui/material";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { useCallback, useState } from "react";
import { match } from "ts-pattern";
//import { useFreeWheelPlayer } from "./useFreeWheelPlayer";
import { useFwAdRequestMachine } from "./useFwAdRequestMachine";

export type ButtonPhase = "init" | "playing" | "paused";

export function Player() {
  const [phase, setPhase] = useState<ButtonPhase>("init");
  //const { videoRef, player, state } = useFreeWheelPlayer();

  const { machine, videoRef } = useFwAdRequestMachine();

  const handleClick = useCallback(
    () =>
      pipe(
        machine,
        O.match(
          () => {},
          (machine) => {
            match(phase)
              .with("init", () => {
                setPhase("playing");
                machine.requestAds();
              })
              .with("playing", () => {
                setPhase("paused");
                machine.pause();
              })
              .with("paused", () => {
                setPhase("playing");
                machine.resume();
              })
              .exhaustive();
          },
        ),
      ),
    [phase, machine],
  );

  return (
    <Stack>
      <Stack direction="row" sx={{ flexGrow: 1 }}>
        <Stack>
          <Box id="displayBase" sx={{ position: "relative", flexGrow: 1, width: "100%", height: 480 }}>
            <video ref={videoRef} id="videoPlayer" playsInline controls style={{ width: "100%", height: "100%" }}>
              <source src="https://ott.dolby.com/OnDelKits/AC-4/Dolby_AC-4_Online_Delivery_Kit_1.5/Test_Signals/muxed_streams/MP4/Example/Audio_ID_720p_25fps_h264_2ch_64kbps_ac4.mp4" />
            </video>
          </Box>
          <Button variant="contained" onClick={handleClick}>
            {phase === "init" ? "Play" : phase === "playing" ? "Pause" : "Resume"}
          </Button>
        </Stack>
        <pre style={{ maxWidth: "400px" }}>
          {pipe(
            machine,
            O.match(
              () => "empty",
              (instance) => pipe(instance.getState(), (state) => JSON.stringify(state, null, 2)),
            ),
          )}
        </pre>
      </Stack>
      <Stack
        sx={{
          flexDirection: "row",

          "& .MuiBox-root": {
            border: "1px solid #000",
            position: "relative",

            "& .MuiTypography-root": {
              position: "absolute",
              top: 0,
              left: 0,
            },
          },
        }}
      >
        <Box sx={{ height: 90, width: 728 }} id="standaloneContainer">
          <Typography>Standalone 728x90</Typography>
          <span id="standaloneSlot" className="_fwph">
            <form id="_fw_form_standaloneSlot" style={{ display: "none" }}>
              <input
                type="hidden"
                name="_fw_input_standaloneSlot"
                id="_fw_input_standaloneSlot"
                defaultValue="ptgt=p&h=90&w=728&flag=+cmpn+fcai"
              />
            </form>
            <span id="_fw_container_standaloneSlot" />
          </span>
        </Box>
        <Box sx={{ height: 250, width: 300 }} id="companionContainer">
          <Typography>Companion 300x250</Typography>
          <span id="companionSlot" className="_fwph">
            <form id="_fw_form_companionSlot" style={{ display: "none" }}>
              <input
                type="hidden"
                name="_fw_input_companionSlot"
                id="_fw_input_companionSlot"
                defaultValue="ptgt=p&h=250&w=300"
              />
            </form>
            <span id="_fw_container_companionSlot" />
          </span>
        </Box>
      </Stack>
    </Stack>
  );
}
