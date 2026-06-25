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
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <img alt="Brand" src="https://vi.freewheel.tv/static/images/ee_logo.png" style={{ marginLeft: "auto" }} />
          <Typography variant="h5" fontWeight={300} sx={{ color: "#40748c", ml: 1, mr: "auto" }}>
            FreeWheel HTML5 Demo Player
          </Typography>
        </Toolbar>
      </AppBar>

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
              <pre style={{ maxWidth: "400px" }}>
                {JSON.stringify(
                  {
                    phase,
                    state,
                  },
                  null,
                  2,
                )}
              </pre>
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

      <Box component="footer" sx={{ p: "10px", textAlign: "right" }}>
        <Typography component="span" sx={{ fontSize: "small", color: "#ccc" }}>
          © {new Date().getFullYear()}
        </Typography>{" "}
        <Link
          href="https://freewheel.com"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: "small", color: "#ccc" }}
        >
          FreeWheel Media Inc.
        </Link>
      </Box>
    </>
  );
}
