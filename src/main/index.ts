import { app } from "electron";

import { refuseRemoteDebugging } from "./app/refuse-remote-debugging";
import { claimPrimaryInstance } from "./app/single-instance-lock";
import { startApplication } from "./app/start-application";

if (!refuseRemoteDebugging(app) && claimPrimaryInstance(app)) {
  app.whenReady().then(startApplication);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
