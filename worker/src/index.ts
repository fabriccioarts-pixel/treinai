import { Hono } from "hono";
import { requireInternalSecret } from "./middleware/internal-auth";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { exerciseRoutes } from "./routes/exercises";
import { workoutRoutes } from "./routes/workouts";
import { sessionRoutes } from "./routes/sessions";
import { setRoutes } from "./routes/sets";
import { personalRecordRoutes } from "./routes/personal-records";
import { statsRoutes } from "./routes/stats";
import { aiRoutes } from "./routes/ai";
import { voiceRoutes } from "./routes/voice";
import { coachConversationRoutes } from "./routes/coach-conversations";
import { goalRoutes } from "./routes/goals";
import { badgeRoutes } from "./routes/badges";
import { profileRoutes } from "./routes/profile";
import { waterRoutes } from "./routes/water";
import { mealRoutes } from "./routes/meals";
import { pushRoutes } from "./routes/push";
import { gamificationRoutes } from "./routes/gamification";
import { runHourlyReminders } from "./lib/reminders";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.json({ ok: true, service: "treinai-api" }));

app.use("*", requireInternalSecret);

app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/exercises", exerciseRoutes);
app.route("/workouts", workoutRoutes);
app.route("/workout-sessions", sessionRoutes);
app.route("/sets", setRoutes);
app.route("/personal-records", personalRecordRoutes);
app.route("/stats", statsRoutes);
app.route("/ai/voice", voiceRoutes);
app.route("/ai", aiRoutes);
app.route("/coach-conversations", coachConversationRoutes);
app.route("/goals", goalRoutes);
app.route("/badges", badgeRoutes);
app.route("/profile", profileRoutes);
app.route("/water", waterRoutes);
app.route("/meals", mealRoutes);
app.route("/push", pushRoutes);
app.route("/gamification", gamificationRoutes);

export default {
  fetch: app.fetch,
  // Cron de hora em hora (wrangler.jsonc): lembretes de água e de treino
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runHourlyReminders(env));
  },
} satisfies ExportedHandler<Env>;
