import { AppBar, Box, Button, Link, Stack, Toolbar, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { match } from "ts-pattern";
import { useFreeWheelPlayer } from "./useFreeWheelPlayer";

export type ButtonPhase = "init" | "playing" | "paused";

export function Player() {
  const [phase, setPhase] = useState<ButtonPhase>("init");

  const { videoRef, player, state } = useFreeWheelPlayer();

  const handleClick = useCallback(() => {
    if (!player) return;
    match(phase)
      .with("init", () => {
        setPhase("playing");
        console.log("Requesting ads...");
        player.requestAds();
      })
      .with("playing", () => {
        setPhase("paused");
        console.log("Pausing playback...");
        player.pause();
      })
      .with("paused", () => {
        setPhase("playing");
        console.log("Resuming playback...");
        player.resume();
      })
      .exhaustive();
  }, [phase, player]);

  return (
    <>
      <pre
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          maxWidth: "400px",
          backgroundColor: "#000",
          color: "#fff",
          padding: "10px",
          opacity: 0.8,
          fontSize: "12px",
        }}
      >
        {JSON.stringify({ phase, state }, null, 2)}
      </pre>

      <Box sx={{ m: "20px" }}>
        <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", lg: "row" } }}>
          {/* Left panel */}
          <Box sx={{ flex: 1 }}>
            <Stack direction="row">
              <Box id="displayBase" sx={{ position: "relative" }}>
                <video
                  ref={videoRef}
                  id="videoPlayer"
                  playsInline
                  style={{ height: 480, width: "100%", backgroundColor: "#000" }}
                >
                  <source src="https://ott.dolby.com/OnDelKits/AC-4/Dolby_AC-4_Online_Delivery_Kit_1.5/Test_Signals/muxed_streams/MP4/Example/Audio_ID_720p_25fps_h264_2ch_64kbps_ac4.mp4" />
                </video>
              </Box>
            </Stack>

            <Button variant="contained" color="info" fullWidth onClick={handleClick}>
              {phase === "init" ? "Play" : phase === "playing" ? "Pause" : "Resume"}
            </Button>

            <Box sx={{ mt: "20px" }} id="standaloneContainer">
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
          </Box>

          {/* Right panel */}
          <Box sx={{ flex: 1 }} id="companionContainer">
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
        </Box>
      </Box>
    </>
  );
}
