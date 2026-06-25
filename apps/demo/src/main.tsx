import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "./Player";

export { config } from "./env";

function App() {
  return (
    <ThemeProvider theme={createTheme({ palette: { mode: "light" } })}>
      <CssBaseline />
      <Player />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
