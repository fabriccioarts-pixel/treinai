import { Hono } from "hono";
import { requireInternalSecret } from "./middleware/internal-auth";
import { authRoutes } from "./routes/auth";
import { exerciseRoutes } from "./routes/exercises";
import { workoutRoutes } from "./routes/workouts";
import { sessionRoutes } from "./routes/sessions";
import { setRoutes } from "./routes/sets";
import { personalRecordRoutes } from "./routes/personal-records";
import { statsRoutes } from "./routes/stats";
import { aiRoutes } from "./routes/ai";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.json({ ok: true, service: "treinai-api" }));

app.use("*", requireInternalSecret);

app.route("/auth", authRoutes);
app.route("/exercises", exerciseRoutes);
app.route("/workouts", workoutRoutes);
app.route("/workout-sessions", sessionRoutes);
app.route("/sets", setRoutes);
app.route("/personal-records", personalRecordRoutes);
app.route("/stats", statsRoutes);
app.route("/ai", aiRoutes);

export default app;
