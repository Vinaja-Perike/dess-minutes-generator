// backend/src/routes/zoom.ts
import { Router } from "express";
import { fetchZoomMeetingData } from "../services/zoom.js";

export const zoomRouter = Router();

zoomRouter.get("/recordings", async (req, res) => {
  const meetingId = (req.query.meetingId as string) || "";
  if (!meetingId) return res.status(400).json({ error: "meetingId required" });

  try {
    const data = await fetchZoomMeetingData({
      meetingId,
      clientId: process.env.ZOOM_CLIENT_ID!,
      clientSecret: process.env.ZOOM_CLIENT_SECRET!,
      accountId: process.env.ZOOM_ACCOUNT_ID!,
      // asVtt: true,
    });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
});
