import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { createRoot } from "react-dom/client";
import { FwPlayer } from "./Player";

export const config = {
  networkId: 42015,
  serverURL: "http://demo.v.fwmrm.net/ad/g/1",
  profileId: "42015:js_allinone_profile",
  videoAssetId: "js_allinone_demo_video",
  siteSectionId: "js_allinone_demo_site_section",
  videoDuration: 500,
  fallbackSiteId: 42015,
  videoContainer: "displayBase",
  disableAutoPause: false,
} as const;

function App() {
  return (
    <ThemeProvider theme={createTheme({ palette: { mode: "light" } })}>
      <CssBaseline />
      <FwPlayer />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
