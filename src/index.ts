import type { Probot } from "probot";
import { registerCheckHandlers } from "./handlers/checks.js";
import { registerCommentHandlers } from "./handlers/comments.js";
import { registerPullRequestHandlers } from "./handlers/pull-request.js";
import { registerReviewHandlers } from "./handlers/reviews.js";

export default (app: Probot): void => {
  app.onError((error) => {
    app.log.error({ err: error }, "Unhandled application error");
  });

  registerPullRequestHandlers(app);
  registerCommentHandlers(app);
  registerReviewHandlers(app);
  registerCheckHandlers(app);
};
