import { Hono } from "hono";

export const personalRecordRoutes = new Hono<{ Bindings: Env }>();

personalRecordRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  const muscleGroup = c.req.query("muscleGroup");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const query = muscleGroup
    ? c.env.DB.prepare(
        `SELECT pr.*, e.name AS exercise_name, e.muscle_group
         FROM personal_records pr
         JOIN exercises e ON e.id = pr.exercise_id
         WHERE pr.user_id = ? AND pr.type = 'carga' AND e.muscle_group = ?
         ORDER BY pr.achieved_at DESC`
      ).bind(userId, muscleGroup)
    : c.env.DB.prepare(
        `SELECT pr.*, e.name AS exercise_name, e.muscle_group
         FROM personal_records pr
         JOIN exercises e ON e.id = pr.exercise_id
         WHERE pr.user_id = ? AND pr.type = 'carga'
         ORDER BY pr.achieved_at DESC`
      ).bind(userId);

  const { results } = await query.all();
  return c.json({ personalRecords: results });
});
