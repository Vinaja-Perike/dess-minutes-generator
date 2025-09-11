// backend/src/services/zoom.ts
import { Buffer } from "node:buffer";
import { fetch } from "undici";

type ZoomRecordingFile = {
  id: string;
  file_type: string;
  file_extension: string;
  download_url: string;
};
type ZoomMeetingRecordingsResponse = {
  recording_files: ZoomRecordingFile[];
};

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";

async function getZoomAccessToken(clientId: string, clientSecret: string, accountId: string) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = `${ZOOM_TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}: ${await resp.text()}`);
  const json = (await resp.json()) as { access_token: string };
  if (!json?.access_token) throw new Error("Missing access_token");
  return json.access_token;
}

function parseVttToPlainText(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/-->\s+/.test(line)) {
      let j = i + 1;
      const cue: string[] = [];
      for (; j < lines.length; j++) {
        const l = lines[j].trim();
        if (l === "") break;
        cue.push(l.replace(/<[^>]+>/g, ""));
      }
      if (cue.length) out.push(cue.join(" "));
      i = j;
    }
  }
  return out.join("\n").trim();
}

export async function fetchZoomMeetingData(params: {
  meetingId: string;
  clientId: string;
  clientSecret: string;
  accountId: string;
  asVtt?: boolean;
}) {
  const { meetingId, clientId, clientSecret, accountId, asVtt } = params;
  // const token = await getZoomAccessToken(clientId, clientSecret, accountId);
  const token = "eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6ImZlNzU0YTM3LWVhMDQtNGIxZC1iMzljLWI1MzNlMDQ0ZDFlNCJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJEQk9qTXVzdFIwLUVzVFNJRlptdXZnIiwidmVyIjoxMCwiYXVpZCI6IjAyYjJlNDFjZDkwYTUyZWE5N2M3OGU3MmE5Y2JkZDM4MjQ4ZWJlMDI4YmM3NGEyMWRiOTdlYTk0NWUwYWNmNjkiLCJuYmYiOjE3NTY1NDk3NzUsImNvZGUiOiJQS3puSmxfY1N4V3JTaXpUajAwcjJ3YzJLZHYxVVU5eU0iLCJpc3MiOiJ6bTpjaWQ6YTRyMnlqbWlSdTJKSHMyVHk3N2pjUSIsImdubyI6MCwiZXhwIjoxNzU2NTUzMzc1LCJ0eXBlIjozLCJpYXQiOjE3NTY1NDk3NzUsImFpZCI6IkduWkE0NDVjVFM2M0pqNHNvM28tWHcifQ.SIQxHSOMkoI4h5OGxYorhUcHpRtmn_ObkEkfx-DmBrv8PXmdzyk2B7o5_TXET6ID5R0e73qPdQaElC8YHpE5rw";

  const recUrl = `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings`;
  const recResp = await fetch(recUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!recResp.ok) throw new Error(`Recordings error ${recResp.status}: ${await recResp.text()}`);
  const recData = (await recResp.json()) as ZoomMeetingRecordingsResponse;

  const transcript = recData.recording_files?.find(f => f.file_type === "TRANSCRIPT" && f.download_url);
  if (!transcript?.download_url) throw new Error("No transcript file_type=TRANSCRIPT");

  const dl = await fetch(transcript.download_url, { headers: { Authorization: `Bearer ${token}` } });
  if (!dl.ok) throw new Error(`Download error ${dl.status}: ${await dl.text()}`);
  const vtt = await dl.text();

  return {
    transcript: asVtt ? vtt : parseVttToPlainText(vtt),
    transcriptFormat: "vtt" as const,
    downloadUrl: transcript.download_url,
    transcriptFileId: transcript.id
  };
}
