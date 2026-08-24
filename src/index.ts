import type { ApplicationFunctionOptions, Probot } from "probot";
import { registerCheckHandlers } from "./handlers/checks.js";
import { registerCommentHandlers } from "./handlers/comments.js";
import { registerPullRequestHandlers } from "./handlers/pull-request.js";
import { registerReviewHandlers } from "./handlers/reviews.js";
import { healthHandler } from "./health.js";

export default (app: Probot, options?: ApplicationFunctionOptions): void => {
  if (typeof options?.addHandler === "function") {
    try {
      options.addHandler(healthHandler);
    } catch (error) {
      // Probot unit tests construct an app without an HTTP server.
      if (!(error instanceof Error) || !error.message.includes("No server instance")) {
        throw error;
      }
    }
  }

  app.onError((error) => {
    app.log.error({ err: error.message }, "Unhandled application error");
  });

  registerPullRequestHandlers(app);
  registerCommentHandlers(app);
  registerReviewHandlers(app);
  registerCheckHandlers(app);
};
