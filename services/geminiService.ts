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

  const today = new Date();
  today.setDate(today.getDate() - 1);

  const meetingDate = 'pick the date from the agenda, display it as DD, MMM, YYYY'; // Placeholder for date extraction logic
  // today.toLocaleDateString('en-US', {
  //   year: 'numeric',
  //   month: 'long',
  //   day: 'numeric'
  // });

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

                            Action Items: Present all action items in a Markdown table (with all borders) with the columns: 'Action Item', 'Assigned To', and 'Deadline'.

                            General Discussion / Other Business: Briefly summarize any significant topics or discussions that were not part of the formal agenda.

                            Supporting Documents:
                            ATTENDANCE LIST:
                            Present Attendees:
                            ${presentAttendees || 'None listed.'}

                            Absent Attendees: ${absentAttendees || 'None listed.'}
                            MEETING AGENDA: ${agenda}
                            MEETING TRANSCRIPTION: ${transcription}

                            Attendance should be only based on the provided attendance sheet. Do not make assumptions about attendees not listed in the attendance sheet.
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

                          Action Items: Present all action items in a Markdown table (with all borders) with the columns: 'Action Item', 'Assigned To', and 'Deadline'.

                          General Discussion / Other Business: Briefly summarize any significant topics or discussions that were not part of the formal agenda.

                          Supporting Documents:
                          ATTENDANCE LIST:
                          Present Attendees:
                          ${presentAttendees || 'None listed.'}

                          Absent Attendees: ${absentAttendees || 'None listed.'}
                          MEETING AGENDA: ${agenda}
                          MEETING TRANSCRIPTION: ${transcription}
                          Attendance should be only based on the provided attendance sheet. Do not make assumptions about attendees not listed in the attendance sheet.
                          Now, generate the detailed Minutes of Meeting in Markdown format.
                          `;

  const narrativeAndBulletPrompt =
                              `System Instruction: You are a highly skilled administrative assistant with expertise in creating professional, detailed, and well-structured Minutes of Meeting (MoM). Your task is to synthesize information from a meeting agenda (including embedded minutes of previous meetings, annexures, compliance checklists, and tables), an attendance sheet, and its corresponding transcription into a formal MoM document.

                          Task: Generate a comprehensive and structured Minutes of Meeting in Markdown format. You must carefully process *all components* of the agenda — including minutes of previous meetings, annexures, financial tables, compliance checklists, and data summaries — and reflect them accurately in the MoM. Where tables or checklists are provided in the agenda, convert them into Markdown tables in the MoM. Do not omit any relevant detail. If information appears redundant between the agenda and transcription, consolidate it into a single coherent narrative.

                          Output Structure:
                          1. Meeting Details:
                            - Title: (Infer a suitable title from the agenda)
                            - Date: ${meetingDate}
                            - Attendees (Present): (From the 'Present Attendees' list, include mode of attendance)
                            - Absent: (From the 'Absent Attendees' list)

                          2. Agenda Items Discussed:  
                            For each agenda point:
                            - Begin with a short **narrative summary** of the discussion.  
                            - Then present the **detailed points** in a bulleted list.  
                            - If the agenda point references tables, annexures, or checklists, convert them into clean Markdown tables or bullet form.  
                            - If the agenda point contains *minutes of previous meetings*, include a short recap of those as part of the discussion.  

                          3. Key Decisions Made:  
                            Provide a clear bulleted list of *all firm decisions* reached in the meeting.  

                          4. Action Items:  
                            Present in a full Markdown table with the following columns:  
                            | Action Item | Assigned To | Deadline |  

                          5. General Discussion / Other Business:  
                            Summarize any non-agenda but significant points raised.  

                          Supporting Documents (for traceability):  
                          - ATTENDANCE LIST  
                            - Present Attendees: ${presentAttendees || 'None listed.'}  
                            - Absent Attendees: ${absentAttendees || 'None listed.'}  
                          - MEETING AGENDA: ${agenda}  
                          - MEETING TRANSCRIPTION: ${transcription}  

                          Formatting Requirements:
                          - Use clean, simple Markdown.  
                          - For tables, use standard pipe-based Markdown syntax.  
                          - Do NOT use horizontal rules (e.g., '---' or '***').  
                          - Ensure all sections are thorough, structured, and professional.  

                            `;

  if (minuteType === 'bulletPoints') {
    return bulletPointsPrompt;
  } else if (minuteType === 'narrativeAndBullet') {
    return narrativeAndBulletPrompt;
  } else {
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
    // console.log(`Generated Minutes of Meeting:\n${text}`);

    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};