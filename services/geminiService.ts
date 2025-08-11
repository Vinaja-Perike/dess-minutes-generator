import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface Attendee {
  Name: string;
  Attendance: string;
  'Mode of Attendance': string;
}

const buildPrompt = (agenda: string, transcription: string, attendanceData: Attendee[]): string => {
  const presentAttendees = attendanceData
    .filter(p => p.Attendance?.toLowerCase() === 'yes')
    .map(p => `- ${p.Name} (${p['Mode of Attendance'] || 'N/A'})`)
    .join('\n');

  const absentAttendees = attendanceData
    .filter(p => p.Attendance?.toLowerCase() !== 'yes')
    .map(p => `- ${p.Name}`)
    .join('\n');

  const meetingDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    **System Instruction:** You are a highly skilled administrative assistant with expertise in creating professional, detailed, and well-structured Minutes of Meeting (MoM). Your task is to synthesize information from a meeting agenda, an attendance sheet, and its corresponding transcription into a formal MoM document.

    **Task:** Generate a comprehensive Minutes of Meeting document based on the provided documents. The output must be in clean, simple Markdown format. For tables, use standard pipe-based Markdown table syntax. Do NOT use horizontal rules (e.g., '---' or '***') to separate sections.

    **Output Structure:**
    The generated MoM must include the following sections:
    1.  **Meeting Details:**
        *   **Title:** (Infer a suitable title from the agenda)
        *   **Date:** ${meetingDate}
        *   **Attendees (Present):** (Use the 'Present Attendees' list from the supporting documents. Ensure you include their mode of attendance.)
        *   **Attendees (Absent):** (Use the 'Absent Attendees' list from the supporting documents.)
    2.  **Agenda Items Discussed:** Provide a summary for each agenda point, detailing the conversation, key points raised, and perspectives shared.
    3.  **Key Decisions Made:** Create a clear, bulleted list of all firm decisions reached during the meeting.
    4.  **Action Items:** Present all action items in a Markdown table with the columns: 'Action Item', 'Assigned To', and 'Deadline'.
    5.  **General Discussion / Other Business:** Briefly summarize any significant topics or discussions that were not part of the formal agenda.

    **Supporting Documents:**

    ---
    **ATTENDANCE LIST:**
    **Present Attendees:**
    ${presentAttendees || 'None listed.'}

    **Absent Attendees:**
    ${absentAttendees || 'None listed.'}
    ---

    ---
    **MEETING AGENDA:**
    ${agenda}
    ---

    ---
    **MEETING TRANSCRIPTION:**
    ${transcription}
    ---

    Now, generate the detailed Minutes of Meeting in Markdown format.
  `;
};

export const generateMinutesOfMeeting = async (agenda: string, transcription: string, attendanceData: Attendee[]): Promise<string> => {
  try {
    const prompt = buildPrompt(agenda, transcription, attendanceData);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const text = response.text;
    if (!text) {
        throw new Error("Received an empty response from Gemini API.");
    }
    
    return text;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};