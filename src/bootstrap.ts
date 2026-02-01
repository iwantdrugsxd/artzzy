import "react-native-gesture-handler";
import * as WebBrowser from "expo-web-browser";
import { LogBox } from "react-native";
import { enableScreens } from "react-native-screens";
import { logger } from "./utils/logger";

WebBrowser.maybeCompleteAuthSession();

enableScreens(false);
LogBox.ignoreLogs(["Require cycle:"]);

const globalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
if ((global as any).ErrorUtils?.setGlobalHandler) {
  (global as any).ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
    logger.error("global error", { message: error.message, isFatal });
    if (globalHandler) {
      globalHandler(error, isFatal);
    }
  });
}

logger.info("bootstrap.ready");

if (typeof (global as any).onunhandledrejection === "undefined") {
  (global as any).onunhandledrejection = (event: any) => {
    logger.error("unhandled.rejection", { reason: event?.reason });
  };
}
