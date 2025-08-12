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

const buildPrompt = (agenda: string, transcription: string, attendanceData: Attendee[], minuteType: string): string => {
  const presentAttendees = attendanceData
    .filter(p => p.Attendance?.toLowerCase().startsWith('present'))
    .map(p => {
        const attendanceMode = p.Attendance.split('Through ')[1] || p.Attendance.split(' ')[2] || 'N/A';
        return `- ${p.Name} (${attendanceMode})`;
    })
    .join('\n');

const absentAttendees = attendanceData
    .filter(p => p.Attendance?.toLowerCase() === 'absent')
    .map(p => `- ${p.Name}`)
    .join('\n');

  const meetingDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Prompt for Narrative Summary
  const narrativeSummaryPrompt = `
                            System Instruction: You are a highly skilled administrative assistant with expertise in creating professional, detailed, and well-structured Minutes of Meeting (MoM). Your task is to synthesize information from a meeting agenda, an attendance sheet, and its corresponding transcription into a formal MoM document.

                            Task: Generate a comprehensive Minutes of Meeting document based on the provided documents. The output must be in clean, simple Markdown format. For tables, use standard pipe-based Markdown table syntax. Do NOT use horizontal rules (e.g., '---' or '***') to separate sections. The meeting's discussion for each agenda item should be presented in a detailed narrative summary format.

                            Output Structure:
                            The generated MoM must include the following sections:

                            Meeting Details:

                            Title: (Infer a suitable title from the agenda)

                            Date: ${meetingDate}

                            Attendees (Present): (Use the 'Present Attendees' list from the supporting documents. Ensure you include their mode of attendance.)

                            Absent: (Use the 'Absent Attendees' list from the supporting documents.)

                            Agenda Items Discussed: Provide a narrative summary for each agenda point, detailing the conversation, key points raised, and perspectives shared.

                            Key Decisions Made: Create a clear, bulleted list of all firm decisions reached during the meeting.

                            Action Items: Present all action items in a Markdown table with the columns: 'Action Item', 'Assigned To', and 'Deadline'.

                            General Discussion / Other Business: Briefly summarize any significant topics or discussions that were not part of the formal agenda.

                            Supporting Documents:
                            ATTENDANCE LIST:
                            Present Attendees:
                            ${presentAttendees || 'None listed.'}

                            Absent Attendees: ${absentAttendees || 'None listed.'}
                            MEETING AGENDA: ${agenda}
                            MEETING TRANSCRIPTION: ${transcription}
                            Now, generate the detailed Minutes of Meeting in Markdown format.
                              `;

  // Prompt for Bullet Point Format
  const bulletPointsPrompt = `
                          System Instruction: You are a highly skilled administrative assistant with expertise in creating professional, detailed, and well-structured Minutes of Meeting (MoM). Your task is to synthesize information from a meeting agenda, an attendance sheet, and its corresponding transcription into a formal MoM document.

                          Task: Generate a comprehensive Minutes of Meeting document based on the provided documents. The output must be in clean, simple Markdown format. For tables, use standard pipe-based Markdown table syntax. Do NOT use horizontal rules (e.g., '---' or '***') to separate sections. The meeting's discussion for each agenda item should be presented in a concise bullet-point format.

                          Output Structure:
                          The generated MoM must include the following sections:

                          Meeting Details:

                          Title: (Infer a suitable title from the agenda)

                          Date: ${meetingDate}

                          Attendees (Present): (Use the 'Present Attendees' list from the supporting documents. Ensure you include their mode of attendance.)

                          Absent: (Use the 'Absent Attendees' list from the supporting documents.)

                          Agenda Items Discussed: Provide a bulleted list for each agenda point, detailing the key points raised, perspectives shared, and the outcome of the discussion.

                          Key Decisions Made: Create a clear, bulleted list of all firm decisions reached during the meeting.

                          Action Items: Present all action items in a Markdown table with the columns: 'Action Item', 'Assigned To', and 'Deadline'.

                          General Discussion / Other Business: Briefly summarize any significant topics or discussions that were not part of the formal agenda.

                          Supporting Documents:
                          ATTENDANCE LIST:
                          Present Attendees:
                          ${presentAttendees || 'None listed.'}

                          Absent Attendees: ${absentAttendees || 'None listed.'}
                          MEETING AGENDA: ${agenda}
                          MEETING TRANSCRIPTION: ${transcription}
                          Now, generate the detailed Minutes of Meeting in Markdown format.
                          `;

  // Prompt for Narrative Summary & Bullet Points
  const narrativeAndBulletPrompt = 
                          `System Instruction: You are a highly skilled administrative assistant with expertise in creating professional, detailed, and well-structured Minutes of Meeting (MoM). Your task is to synthesize information from a meeting agenda, an attendance sheet, and its corresponding transcription into a formal MoM document.

                          Task: Generate a comprehensive Minutes of Meeting document based on the provided documents. The output must be in clean, simple Markdown format. For tables, use standard pipe-based Markdown table syntax. Do NOT use horizontal rules (e.g., '---' or '***') to separate sections. The discussion for each agenda item should start with a brief narrative summary followed by key details presented in bullet-point format.

                          Output Structure:
                          The generated MoM must include the following sections:

                          Meeting Details:

                          Title: (Infer a suitable title from the agenda)

                          Date: ${meetingDate}

                          Attendees (Present): (Use the 'Present Attendees' list from the supporting documents. Ensure you include their mode of attendance.)

                          Absent: (Use the 'Absent Attendees' list from the supporting documents.)

                          Agenda Items Discussed: Provide a brief narrative summary for each agenda point, followed by a bulleted list of the key points, perspectives, and outcomes of the discussion.

                          Key Decisions Made: Create a clear, bulleted list of all firm decisions reached during the meeting.

                          Action Items: Present all action items in a Markdown table with the columns: 'Action Item', 'Assigned To', and 'Deadline'.

                          General Discussion / Other Business: Briefly summarize any significant topics or discussions that were not part of the formal agenda.

                          Supporting Documents:
                          ATTENDANCE LIST:
                          Present Attendees:
                          ${presentAttendees || 'None listed.'}

                          Absent Attendees: ${absentAttendees || 'None listed.'}
                          MEETING AGENDA: ${agenda}
                          MEETING TRANSCRIPTION: ${transcription}
                          Now, generate the detailed Minutes of Meeting in Markdown format.
                            `;

  if (minuteType === 'bulletPoints') {
    return bulletPointsPrompt;
  } else if (minuteType === 'narrativeAndBullet') {
    return narrativeAndBulletPrompt;
  } else {
    // Default to narrativeSummary if no type is provided or if it's the specified type
    return narrativeSummaryPrompt;
  }
};

export const generateMinutesOfMeeting = async (agenda: string, transcription: string, attendanceData: Attendee[], minuteType: string): Promise<string> => {
  try {
    const prompt = buildPrompt(agenda, transcription, attendanceData, minuteType);

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