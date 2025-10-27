
type ZoomRecordingFile = {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;          // e.g., MP4, M4A, TRANSCRIPT
  file_extension: string;     // e.g., MP4, M4A, VTT
  file_size?: number;
  play_url?: string;
  download_url: string;
  status?: string;            // e.g., completed
  recording_type?: string;    // e.g., audio_transcript
};

type ZoomMeetingRecordingsResponse = {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  timezone: string;
  host_email?: string;
  duration?: number;
  total_size?: number;
  recording_count?: number;
  share_url?: string;
  recording_files: ZoomRecordingFile[];
  password?: string;
  recording_play_passcode?: string;
};

type FetchZoomMeetingDataResult = {
  transcript: string;
  transcriptFormat: "vtt";
  transcriptFileId?: string;
  downloadUrl?: string;
};

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";

async function getZoomAccessToken(
  accountId: string
): Promise<string> {

  const url = `${ZOOM_TOKEN_URL}?grant_type=account_credentials&account_id=${accountId}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic YTRyMnlqbWlSdTJKSHMyVHk3N2pjUTowbkdob21kUnZqbDh5V3c3TUpKeHZLZ3ZGeExTbWw2Rg==`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    // No body needed for account_credentials grant with query params
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to get Zoom access token: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { access_token: string };
  if (!data?.access_token) {
    throw new Error("Zoom token response missing access_token");
  }
  return data.access_token;
}

function parseVttToPlainText(vtt: string): string {
  // Minimal VTT -> text: remove headers, cue timings and keep spoken lines
  // WebVTT format includes lines like:
  // WEBVTT
  // 00:00:01.000 --> 00:00:03.000
  // Hello there
  // Optional cue identifiers can be lines preceding the timing line.
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];
  let inHeader = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip header until first blank after WEBVTT or until a timing is found
    if (inHeader) {
      if (line === "" || /^WEBVTT/i.test(line)) continue;
      // If we encounter a timing line, we are out of header
      if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/.test(line) ||
          /^\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}\.\d{3}/.test(line)) {
        inHeader = false;
        continue; // next line should be text
      }
      // Could be a cue id; keep skipping until timing line
      continue;
    }

    // Skip timing lines
    if (/-->\s+/.test(line)) {
      // Next lines (until blank) belong to this cue; gather non-empty text lines
      // Collect subsequent non-timing, non-empty lines until blank
      let j = i + 1;
      const cueText: string[] = [];
      for (; j < lines.length; j++) {
        const l = lines[j].trim();
        if (l === "") break; // end of cue
        // Skip possible speaker tags or markup like <v Speaker>
        cueText.push(l.replace(/<[^>]+>/g, ""));
      }
      if (cueText.length) out.push(cueText.join(" "));
      i = j; // continue after the blank line
      continue;
    }

    // Ignore other lines outside cues
  }

  return out.join("\n").trim();
}

/**
 * Fetch Zoom meeting transcript (VTT) using:
 * 1) Server-to-Server OAuth token (account_credentials)
 * 2) GET meeting recordings
 * 3) Find file_type === "TRANSCRIPT", download with Bearer token
 * 4) Return plain text from VTT
 */
export async function fetchZoomMeetingData(params: {
  meetingId: string;             // Zoom meeting ID as used by /v2/meetings/{meetingId}/recordings
  clientId: string;              // Server-to-Server OAuth clientId
  
  asVtt?: boolean;               // If true, return raw VTT instead of plain text
}): Promise<FetchZoomMeetingDataResult> {
  const { meetingId, clientId, asVtt } = params;

  // 1) Get access token
  // const accessToken = await getZoomAccessToken(clientId);
  // const accessToken = "eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6ImViNDk3Y2ZmLTA0NWMtNDU2Mi1iM2Q5LWM0NTZlZjYwMjFlMCJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJEQk9qTXVzdFIwLUVzVFNJRlptdXZnIiwidmVyIjoxMCwiYXVpZCI6IjAyYjJlNDFjZDkwYTUyZWE5N2M3OGU3MmE5Y2JkZDM4MjQ4ZWJlMDI4YmM3NGEyMWRiOTdlYTk0NWUwYWNmNjkiLCJuYmYiOjE3NTYyMDkyODgsImNvZGUiOiJ6T1Fvc1J3R1JfZTdsdVBCYU04U0dnblVoYzN5dFdURkMiLCJpc3MiOiJ6bTpjaWQ6YTRyMnlqbWlSdTJKSHMyVHk3N2pjUSIsImdubyI6MCwiZXhwIjoxNzU2MjEyODg4LCJ0eXBlIjozLCJpYXQiOjE3NTYyMDkyODgsImFpZCI6IkduWkE0NDVjVFM2M0pqNHNvM28tWHcifQ.vY9dOlOwb2iahP61GrHmbgw4wvwCMGcg6qVOCBtB9zcVZvIOom84ESA_YP58JFkh0bPkS3a3xDdq45MLimgWOQ";

  // 2) Fetch recordings for the meeting
  // const recUrl = `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings`;
  // const recResp = await fetch(recUrl, {
  //   method: "GET",
  //   headers: { Authorization: `Bearer ${accessToken}` },
  // });

  // if (!recResp.ok) {
  //   const text = await recResp.text();
  //   throw new Error(`Failed to fetch recordings: ${recResp.status} ${text}`);
  // }

  // const recData = (await recResp.json()) as ZoomMeetingRecordingsResponse;

  // // 3) Find TRANSCRIPT file (file_type === "TRANSCRIPT", usually VTT)
  // const transcriptFile = recData.recording_files?.find(
  //   (f) => f.file_type === "TRANSCRIPT" && !!f.download_url
  // );

  // if (!transcriptFile?.download_url) {
  //   throw new Error("Transcript file not found for this meeting (file_type TRANSCRIPT).");
  // }

  // // 4) Download transcript with Bearer token
  // // Zoom often requires Bearer token header for private downloads; if it ever responds with 3xx,
  // // follow redirects (node-fetch does by default) and maintain the Authorization header.
  // const dlResp = await fetch(transcriptFile.download_url, {
  //   method: "GET",
  //   headers: { Authorization: `Bearer ${accessToken}` },
  //   redirect: "follow",
  // });

  // if (!dlResp.ok) {
  //   const text = await dlResp.text();
  //   throw new Error(`Failed to download transcript: ${dlResp.status} ${text}`);
  // }

  // const vttContent = await dlResp.text();

  // if (asVtt) {
  //   return {
  //     transcript: vttContent,
  //     transcriptFormat: "vtt",
  //     transcriptFileId: transcriptFile.id,
  //     downloadUrl: transcriptFile.download_url,
  //   };
  // }

  // // 5) Parse to plain text
  // const plain = parseVttToPlainText(vttContent);
  const res = await fetch(`https://zoom-minutes-backend.onrender.com/api/zoom/recordings?meetingId=${encodeURIComponent(meetingId)}`);
  const data = await res.json();
  console.log(data.transcript);
  return {
    transcript: data.transcript,
    transcriptFormat: "vtt",
    // transcriptFileId: transcriptFile.id,
    // downloadUrl: transcriptFile.download_url,
  };
}
