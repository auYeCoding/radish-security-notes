import { app } from "electron";

import { startApplication } from "./app/start-application";

app.whenReady().then(startApplication);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
