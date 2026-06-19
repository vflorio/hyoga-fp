import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { createRoot } from "react-dom/client";
import { FwPlayer } from "./Player";

export { config } from "./env";

function App() {
  return (
    <ThemeProvider theme={createTheme({ palette: { mode: "light" } })}>
      <CssBaseline />
      <FwPlayer />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
