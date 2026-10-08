import { app } from "electron";

import { claimPrimaryInstance } from "./app/single-instance-lock";
import { startApplication } from "./app/start-application";

if (claimPrimaryInstance(app)) {
  app.whenReady().then(startApplication);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
