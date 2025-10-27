

// Configuration placeholders (replace with real values)
const tenantId = '2c1aa898-5dcb-4cba-af2b-4ea1889ff40f';
const clientId = 'fdbbcae2-35c3-481e-9dd1-29311048ed60';
const clientSecret = '5DF8Q~tCYnq_AugGi8DhwnXBKWcGix2zGtLaLdvO';
const userId = '4dccfa83-07ba-403d-b57c-d1b5fd3b775a'; // The organizer/user whose meeting to query

// Get OAuth2 token using client credentials flow
export async function getAccessToken(): Promise<string> {
  const url = `https://zoom-minutes-backend.onrender.com/api/teams/teams-token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');

  const res = await fetch(url, {
    method: 'GET',
    // body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Get Teams onlineMeetingId by joinMeetingId (meeting code)
export async function getMeetingId(token: string, meetingCode: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings?$filter=joinMeetingIdSettings/joinMeetingId eq '${meetingCode}'`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Fetch meeting ID failed: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.value || data.value.length === 0) {
    throw new Error('No meeting found with this meeting code');
  }

  return data.value[0].id;
}

// Get transcript metadata for the meeting
export async function getTranscripts(token: string, meetingId: string): Promise<any[]> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings/${meetingId}/transcripts`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Fetch transcripts failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.value || [];
}

// Download transcript content in WebVTT format
export async function downloadTranscriptContent(token: string, transcriptContentUrl: string): Promise<string> {
  // Ensure to add ?$format=text/vtt to get transcript in WebVTT text format
  const url = transcriptContentUrl.includes('?') 
    ? transcriptContentUrl + '&$format=text/vtt' 
    : transcriptContentUrl + '?$format=text/vtt';

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/vtt',
    },
  });

  if (!res.ok) {
    throw new Error(`Download transcript content failed: ${res.statusText}`);
  }

  return res.text();
}

// Parse WebVTT transcript content to readable plain text blocks
export function parseWebVTT(webvttText: string): string {
  // Simple parser to extract speaker labels and spoken text
  // Ignores timestamps and WebVTT formatting for basic display

  // Split by lines and filter empty
  const lines = webvttText.split('\n').map(l => l.trim()).filter(Boolean);
  let result = '';
  let currentSpeaker = '';
  let currentText = '';

  for (const line of lines) {
    // Look for <v SpeakerName>
    const speakerMatch = line.match(/^<v\s([^>]+)>/);
    if (speakerMatch) {
      // Flush previous speaker text block
      if (currentSpeaker && currentText) {
        result += `[${currentSpeaker}] ${currentText.trim()}\n\n`;
      }
      // Start new speaker block
      currentSpeaker = speakerMatch[1];
      currentText = line.replace(/^<v\s[^>]+>/, '').trim();
    } else if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}:\d{2}\.\d{3}/.test(line)) {
      // timestamp line, ignore
      continue;
    } else if (!line.startsWith('WEBVTT') && !line.startsWith('NOTE') && !line.startsWith('STYLE')) {
      // Additional text line for current speaker
      currentText += ' ' + line;
    }
  }

  // Flush last block
  if (currentSpeaker && currentText) {
    result += `[${currentSpeaker}] ${currentText.trim()}\n\n`;
  }

  return result.trim();
}

// Full flow to get parsed Teams meeting transcription by meeting code
export async function fetchTeamsMeetingTranscription(meetingCode: string): Promise<string> {
  const token = getAccessToken();
  // const token = "eyJ0eXAiOiJKV1QiLCJub25jZSI6IlBpZmQwRldhc0FQd1VuV053NElaaE5aOEJPMWFJa0lKdVAwM0pJM0YySkUiLCJhbGciOiJSUzI1NiIsIng1dCI6InlFVXdtWFdMMTA3Q2MtN1FaMldTYmVPYjNzUSIsImtpZCI6InlFVXdtWFdMMTA3Q2MtN1FaMldTYmVPYjNzUSJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8yYzFhYTg5OC01ZGNiLTRjYmEtYWYyYi00ZWExODg5ZmY0MGYvIiwiaWF0IjoxNzYxMTE3ODc1LCJuYmYiOjE3NjExMTc4NzUsImV4cCI6MTc2MTEyMTc3NSwiYWlvIjoiazJKZ1lQQytwVzVncWxQSkh6c2xRZTNRWFlGOEFBPT0iLCJhcHBfZGlzcGxheW5hbWUiOiJHcmFwaCAuTkVUIHF1aWNrIHN0YXJ0IiwiYXBwaWQiOiJmZGJiY2FlMi0zNWMzLTQ4MWUtOWRkMS0yOTMxMTA0OGVkNjAiLCJhcHBpZGFjciI6IjEiLCJpZHAiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8yYzFhYTg5OC01ZGNiLTRjYmEtYWYyYi00ZWExODg5ZmY0MGYvIiwiaWR0eXAiOiJhcHAiLCJvaWQiOiI2YTk4Y2IxMC02YzU1LTQ1ZjgtYmEwZC1jZGRiYWU4M2EzNTkiLCJyaCI6IjEuQVhBQW1LZ2FMTXRkdWt5dkswNmhpSl8wRHdNQUFBQUFBQUFBd0FBQUFBQUFBQUFrQVFCd0FBLiIsInJvbGVzIjpbIkNhbGxzLkpvaW5Hcm91cENhbGwuQWxsIiwiTWFpbC5SZWFkV3JpdGUiLCJPbmxpbmVNZWV0aW5ncy5SZWFkV3JpdGUuQWxsIiwiVXNlci5SZWFkV3JpdGUuQWxsIiwiT25saW5lTWVldGluZ0FydGlmYWN0LlJlYWQuQWxsIiwiT25saW5lTWVldGluZ1JlY29yZGluZy5SZWFkLkFsbCIsIkNhbGVuZGFycy5SZWFkIiwiQ2FsbHMuSm9pbkdyb3VwQ2FsbEFzR3Vlc3QuQWxsIiwiVXNlci5SZWFkLkFsbCIsIk9ubGluZU1lZXRpbmdUcmFuc2NyaXB0LlJlYWQuQWxsIiwiQ2FsZW5kYXJzLlJlYWRCYXNpYy5BbGwiLCJGaWxlcy5SZWFkLkFsbCIsIkNoYXQuUmVhZC5BbGwiLCJDYWxlbmRhcnMuUmVhZFdyaXRlIiwiTWFpbC5TZW5kIiwiQ2FsbHMuQWNjZXNzTWVkaWEuQWxsIiwiQ2FsbHMuSW5pdGlhdGUuQWxsIl0sInN1YiI6IjZhOThjYjEwLTZjNTUtNDVmOC1iYTBkLWNkZGJhZTgzYTM1OSIsInRlbmFudF9yZWdpb25fc2NvcGUiOiJBUyIsInRpZCI6IjJjMWFhODk4LTVkY2ItNGNiYS1hZjJiLTRlYTE4ODlmZjQwZiIsInV0aSI6ImVVUXhKSXJaYjB1aVFwbmpyQlVwQUEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbIjA5OTdhMWQwLTBkMWQtNGFjYi1iNDA4LWQ1Y2E3MzEyMWU5MCJdLCJ4bXNfYWNkIjoxNzAzMDc5ODIwLCJ4bXNfYWN0X2ZjdCI6IjMgOSIsInhtc19mdGQiOiI2VU5oZnJwaEV3NnBYLXBDVGZVdXJyNDRYNzVucXdXZzdPREc0ZFFVem9RQllYTnBZWE52ZFhSb1pXRnpkQzFrYzIxeiIsInhtc19pZHJlbCI6IjcgMjIiLCJ4bXNfcmQiOiIwLjQyTGxZQkppTEJBUzRXQVhFc2kyMkJ4dnNNemVlMnNLczFWSGQ3Z0FVSlJUU0lCWlMtbXhHNHV0UzRmRmthRDZqVExYZ2FJY1FGRUdDRGdBcFFFIiwieG1zX3N1Yl9mY3QiOiIzIDkiLCJ4bXNfdGNkdCI6MTU4Mjc4ODM4NywieG1zX3RudF9mY3QiOiI0IDMifQ.g3X8ACD_j0NRZLvVcHtn7irRh315wu3UKFPWq5P14TCxpZJWmODg4HxayWQ6SmZmx5NZEHULk-P20XNo-ynJJc4noHhHfsX9t8NVNU2vShI3eJis_bEbxgvloNi5t8aInD4m1r-VfV6KeKMK1nJVLC-hSo4ASGMDHTOAbeUQAd0ClgIZLYPgppyM64aa2eGbP-D1yZk0KST63mrsP5oUCi9eIsPH7rdDMB498Sjcjiut0kwIaqN-uITWyPfxOAVJVtuMx1yy5mNY-ZN4yMnSrz-kA_BGkuUFVC6ro3dZKeTflBdakWfU3LrXwOkOg1-zQXbWXooB6tMEHzhz44pB2w"
  const meetingId = await getMeetingId(await token, meetingCode);
  const transcripts = await getTranscripts(await token, meetingId);
  if (transcripts.length === 0) {
    throw new Error('No transcripts available for this meeting');
  }

  const transcriptContentUrl = transcripts[0].transcriptContentUrl;
  const webvtt = await downloadTranscriptContent(await token, transcriptContentUrl);
  const textTranscript = parseWebVTT(webvtt);
  return textTranscript;
}
