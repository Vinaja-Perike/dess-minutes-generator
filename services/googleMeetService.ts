
import { MOCK_TRANSCRIPTION } from '../constants';

import { gapi } from 'gapi-script';
// This is a placeholder for a real Google Meet API integration.
// A real implementation would require OAuth2 authentication and using the Google Drive API
// to find and download the transcription file, which is a significant undertaking.
// For now, we simulate the API call and return mock data.

// export interface MeetingData {
//     transcription: string;
//     recordingUrl: string; // Example of other data we might get
// }

// export const fetchMeetingData = (meetingId: string): Promise<MeetingData> => {
//     console.log(`Simulating fetch for meeting ID: ${meetingId}`);

//     return new Promise((resolve) => {
//         setTimeout(() => {
//             resolve({
//                 transcription: MOCK_TRANSCRIPTION,
//                 recordingUrl: `https://meet.google.com/rec/${meetingId}`,
//             });
//         }, 1500); 
//     });
// };

// Define a type for the data you want to return.
// You might want to expand this with more details from the APIs.
export interface MeetingData {
    transcription: string;
    recordingUrl: string;
}

// Define the structure of the API responses to ensure type safety.
// This is a simplified version of the full API responses.
interface ConferenceRecord {
    name: string; // e.g., "conferenceRecords/FaBVioZXZ1zBvzQZZSVpDxIOOAIIigIgABgECA"
    space: string;
    startTime: string; // ISO 8601 format
    endTime: string;
    // other properties...
}

interface ConferenceRecordsResponse {
    conferenceRecords: ConferenceRecord[];
}

interface Transcript {
    name: string;
    docsDestination: {
        document: string; // The Google Docs ID
        exportUri: string;
    };
    // other properties...
}

interface TranscriptsResponse {
    transcripts: Transcript[];
}

interface DocsContent {
    tabs: Array<{
        tabProperties: {
            tabId: string;
            title: string;
        };
        documentTab: {
            body: {
                content: Array<{
                    paragraph?: {
                        elements: Array<{
                            textRun?: {
                                content: string;
                            };
                        }>;
                    };
                }>;
            };
        };
    }>;
}
interface MeetingItem {
    "Folder ID": string;
    "Timestamp": string;
    "Document Link": string;
    "Meeting Link": string;
    "Meeting No :": string;
    "Company": string;
    "Company Short Name": string;
    "Committee": string;
    "Meeting From Date :": string;
    "Meeting To Date": string;
    "CR Completion Date (Only For Circular Resolution)": string;
    "Meeting Time": string;
    "Type": string;
    "Venue": string;
}

// Define the structure of the full API response
interface MeetingsApiResponse {
    success: boolean;
    msg: string;
    data: MeetingItem[];
}
// You'll need to provide a function to get your bearer token.
// The implementation depends on your authentication flow (e.g., OAuth 2.0).
export const getAuthToken = async (): Promise<string> => {
    // Implement your logic to retrieve the bearer token here.
    // This could be from a stored value, by refreshing a token, etc.
    return "ya29.A0AS3H6NzjxSJZXXs_3-PlabMwmYedifHEJWaDcUswyeai3SkLkZHIltp4FwiFIEXDaPha8CEMnO3EVkDesPIlhgOaZO862oUJOCugNy8-ix2GI3_j-ajCRyHaNW4dUO7ZmkYSxTAaSP4lKPMMY4CY1SZ_Y4G8EFAx9iQHAstJl-ka4YcSsfn1Bfolvq1G1xxjx44WGEAaCgYKAYYSARcSFQHGX2MilTTdYJDPwM4TLTyfGA9HuA0206";
};

// The core function to fetch all the data
// export const fetchMeetingData = async (meetingId: string): Promise<MeetingData> => {
//     console.log(`Fetching real data for meeting ID: ${meetingId}`);

//     const authToken = await getAuthToken();
//     // Step 1: Get the conference record using the meeting ID.
//     const recordsResponse = await fetch(`https://meet.googleapis.com/v2/conferenceRecords?filter=space.meeting_code="${meetingId}"`, {
//         headers: {
//             'Authorization': `Bearer ${authToken}`,
//         },
//     });
//     const recordsData: ConferenceRecordsResponse = await recordsResponse.json();
//     console.log("Conference Records Data: ", recordsData.conferenceRecords);
//     if (!recordsData.conferenceRecords || recordsData.conferenceRecords.length === 0) {
//         throw new Error("No conference records found for this meeting ID.");
//     }

//     // Assuming you want the most recent meeting.
//     const latestRecord = recordsData.conferenceRecords[recordsData.conferenceRecords.length - 1];
//     const recordName = latestRecord.name;
//     console.log("Latest Record Name: ", recordName);
//     // Step 2: Get the transcript details using the conference record name.
//     const transcriptsResponse = await fetch(`https://meet.googleapis.com/v2/${recordName}/transcripts`, {
//         headers: {
//             'Authorization': `Bearer ${authToken}`,
//         },
//     });
//     const transcriptsData: TranscriptsResponse = await transcriptsResponse.json();
//     console.log("Transcripts Data: ", transcriptsData);
//     if (!transcriptsData.transcripts || transcriptsData.transcripts.length === 0) {
//         throw new Error("No transcripts found for this conference record.");
//     }

//     // Assuming you want the first available transcript.
//     const transcriptDetails = transcriptsData.transcripts[0];
//     const documentId = transcriptDetails.docsDestination.document;
//     const recordingUrl = latestRecord.space ? `https://meet.google.com/${latestRecord.space.split('/')[1]}` : 'Not available';
//     console.log("Transcript Document ID: ", recordingUrl);
//     // Step 3: Get the document content using the document ID.
//     const docsResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true`, {
//         headers: {
//             'Authorization': `Bearer ${authToken}`,
//         },
//     });
//     const docsData: DocsContent = await docsResponse.json();

//     let transcription = "";
//     const transcriptTabTitle = "Transcript"; // The expected title of the transcript tab

//     // Find the correct tab and extract its content.
//     if (docsData.tabs && docsData.tabs.length > 0) {
//         const transcriptTab = docsData.tabs.find(tab => tab.tabProperties.title === transcriptTabTitle);

//         if (transcriptTab && transcriptTab.documentTab && transcriptTab.documentTab.body) {
//             for (const element of transcriptTab.documentTab.body.content) {
//                 if (element.paragraph && element.paragraph.elements) {
//                     for (const textRun of element.paragraph.elements) {
//                         if (textRun.textRun && textRun.textRun.content) {
//                             transcription += textRun.textRun.content;
//                         }
//                     }
//                 }
//             }
//         }
//     }

//     if (!transcription) {
//         throw new Error(`Transcription tab "${transcriptTabTitle}" not found or empty.`);
//     }
//     // console.log("Transcription Content: ", transcription);
//     return {
//         transcription,
//         recordingUrl: recordingUrl,
//     };
// };
// type MeetingData = {
//     transcription: string;
//     recordingUrl: string;               // kept for compatibility: first available
//     allTranscriptions: Array<{
//         recordName: string;
//         startTime?: string;
//         endTime?: string;
//         documentId?: string;
//         transcriptText: string;
//         recordingUrl?: string;
//     }>;
//     recordingUrls: string[];            // all available
// };

export const fetchMeetingData = async (meetingId: string): Promise<MeetingData> => {
    console.log(`Fetching real data for meeting ID: ${meetingId}`);

    const authToken = await getAuthToken();

    // 1) Fetch conference records for meeting code
    const recordsResponse = await fetch(
        `https://meet.googleapis.com/v2/conferenceRecords?filter=space.meeting_code="${meetingId}"`,
        { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const recordsData: ConferenceRecordsResponse = await recordsResponse.json();

    console.log("Conference Records Data: ", recordsData.conferenceRecords);
    if (!recordsData.conferenceRecords || recordsData.conferenceRecords.length === 0) {
        throw new Error("No conference records found for this meeting ID.");
    }

    // Sort records chronologically if timestamps exist; otherwise keep order
    const records = [...recordsData.conferenceRecords].sort((a, b) => {
        const at = a?.startTime ? Date.parse(a.startTime) : 0;
        const bt = b?.startTime ? Date.parse(b.startTime) : 0;
        return at - bt;
    });

    // Helper to extract transcript text from a Docs document (Transcript tab)
    const extractTranscriptFromDoc = (docsData: DocsContent, tabTitle = "Transcript"): string => {
        let text = "";
        if (docsData.tabs && docsData.tabs.length > 0) {
            const transcriptTab = docsData.tabs.find(tab => tab.tabProperties?.title === tabTitle);
            const body = transcriptTab?.documentTab?.body;
            if (body?.content?.length) {
                for (const element of body.content) {
                    if (element.paragraph?.elements?.length) {
                        for (const run of element.paragraph.elements) {
                            const content = run.textRun?.content;
                            if (content) text += content;
                        }
                    }
                }
            }
        }
        return text.trim();
    };

    // 2) For each record, fetch transcripts and then docs
    // Use Promise.all with internal try/catch to not fail the whole batch
    const perRecordResults = await Promise.all(
        records.map(async (record) => {
            try {
                const recordName = record.name;
                const recordingUrl =
                    record.space ? `https://meet.google.com/${record.space.split("/")[1]}` : undefined;

                const transcriptsResp = await fetch(
                    `https://meet.googleapis.com/v2/${recordName}/transcripts`,
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                const transcriptsData: TranscriptsResponse = await transcriptsResp.json();
                if (!transcriptsData.transcripts?.length) {
                    return {
                        recordName,
                        startTime: record.startTime,
                        endTime: record,
                        documentId: undefined,
                        transcriptText: "",
                        recordingUrl,
                    };
                }

                // There can be multiple transcripts per record. Fetch them all and concatenate.
                const docIds = transcriptsData.transcripts
                    .map(t => t.docsDestination?.document)
                    .filter(Boolean) as string[];

                // De-duplicate doc IDs in case of repeats
                const uniqueDocIds = Array.from(new Set(docIds));

                const texts = await Promise.all(
                    uniqueDocIds.map(async (documentId) => {
                        try {
                            const docsResp = await fetch(
                                `https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true`,
                                { headers: { Authorization: `Bearer ${authToken}` } }
                            );
                            const docsData: DocsContent = await docsResp.json();
                            const text = extractTranscriptFromDoc(docsData, "Transcript");
                            // If "Transcript" tab is missing/empty, optionally fall back to main body
                            if (text) return text;
                            // Fallback: try body if top-level document body exists (defensive)
                            // @ts-ignore optional shape
                            const fallbackBody = docsData.body?.content ?? [];
                            let fallbackText = "";
                            for (const el of fallbackBody) {
                                if (el.paragraph?.elements?.length) {
                                    for (const run of el.paragraph.elements) {
                                        const content = run.textRun?.content;
                                        if (content) fallbackText += content;
                                    }
                                }
                            }
                            return fallbackText.trim();
                        } catch (e) {
                            console.warn(`Failed to fetch/parse doc ${documentId}:`, e);
                            return "";
                        }
                    })
                );

                const transcriptText = texts.filter(Boolean).join("\n\n");

                return {
                    recordName,
                    startTime: record.startTime,
                    endTime: record.endTime,
                    documentId: uniqueDocIds[0],
                    transcriptText,
                    recordingUrl,
                };
            } catch (e) {
                console.warn(`Failed to process record ${record?.name}:`, e);
                return {
                    recordName: record?.name ?? "",
                    startTime: record?.startTime,
                    endTime: record?.endTime,
                    documentId: undefined,
                    transcriptText: "",
                    recordingUrl: record?.space ? `https://meet.google.com/${record.space.split("/")}` : undefined,
                };
            }
        })
    );

    // 3) Combine transcripts in the same order as "records" (chronological if sorted)
    const nonEmpty = perRecordResults.filter(r => r.transcriptText && r.transcriptText.trim().length > 0);

    if (nonEmpty.length === 0) {
        throw new Error('No transcripts found across all conference records or all were empty.');
    }

    // Build a combined transcript with separators (optional)
    const combined = nonEmpty
        .map((r, idx) => {
            const headerParts = [
                r.startTime ? `Start: ${r.startTime}` : undefined,
                r.endTime ? `End: ${r.endTime}` : undefined,
                r.recordName ? `Record: ${r.recordName}` : undefined,
            ].filter(Boolean);
            const header = headerParts.length ? `--- ${headerParts.join(" | ")} ---\n` : "";
            return `${header}${r.transcriptText}`;
        })
        .join("\n\n====================\n\n");

    const recordingUrls = perRecordResults
        .map(r => r.recordingUrl)
        .filter(Boolean) as string[];
    console.log("Combined transcript :", combined);
    return {
        transcription: combined,
        recordingUrl: recordingUrls[0] ?? 'Not available',
        // allTranscriptions: perRecordResults,
        // recordingUrls,
    };
};



export const getDocumentLinkFromMeetingId = async (meetingId: string): Promise<string | null> => {
    const apiUrl = `https://sheets.livepolls.app/api/spreadsheets/a56a934d-03ee-4023-9357-629574c8842d/meetings`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`API call failed with status: ${response.status}`);
            return null;
        }

        const data: MeetingsApiResponse = await response.json();
        // console.log("API Response Data:", data.data);
        if (data.success && data.data.length > 0) {
            for (const item of data.data) {
                const meetingLink = item["Meeting Link"];
                // Extract the Google Meet ID from the 'Meeting Link' (e.g., "qyk-mvgg-bgg")
                const match = meetingLink.match(/meet\.google\.com\/(.+)/);

                if (match && match[1] === meetingId) {
                    console.log(`Found matching document link for meeting ID ${meetingId}: ${item["Document Link"]}`);
                    return item["Document Link"];
                }
            }
            console.log(`No matching document link found for meeting ID: ${meetingId}`);
            return null; // No match found
        } else {
            console.log("API response indicates no success or no data.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching meeting data:", error);
        return null;
    }
};