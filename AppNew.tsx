import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateMinutesOfMeeting } from './services/geminiService';
import { usePdfDownloader } from './hooks/usePdfDownloader';
import { Loader } from './components/Loader';
import { Bot, FileText, Download, Users, Copy, Check, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import * as XLSX from 'xlsx';
import { MOCK_TRANSCRIPTION } from './constants';
import { BeatLoader } from 'react-spinners';
import { fetchMeetingData, getAuthToken, getDocumentLinkFromMeetingId } from './services/googleMeetService';
import { Editor } from '@tinymce/tinymce-react';

// Configure the worker for pdf.js using a stable CDN URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.54/build/pdf.worker.mjs`;

declare global {
  interface Window {
    marked: any;
  }
}

// Simulated file paths
const ATTENDANCE_FILE_PATH = '/files/attendance.xlsx';
const AGENDA_FILE_PATH = '/files/agenda.pdf';

// Mock Transcription Data
const MOCK_TRANSCRIPTION1 = "This is a detailed narrative summary with additional bullet points. The discussion covered Q3 performance, showing a 15% rise in online sales. A key action item was to schedule a training session for the new project management tool due to slow adoption. John will also be preparing the Q4 sales forecast. The new marketing campaign's budget was approved at $50,000.";
const MOCK_TRANSCRIPTION2 = "This transcription will be used for a bullet point format. It includes key action items and decisions. New project management tool adoption is slow. A training session needs to be scheduled by Sarah. The Q4 sales forecast is to be prepared by John. A budget of $50,000 for the new marketing campaign has been approved.";
const MOCK_TRANSCRIPTION3 = "This is a narrative summary only. The team met to discuss Q3 performance, noting a significant 15% increase in online sales. Concerns were raised about the low adoption of the new project management tool, leading to a decision to schedule a training session. Additionally, the team approved a budget of $50,000 for the upcoming marketing campaign, and John was tasked with preparing the Q4 sales forecast.";

export default function AppNew() {
  const [meetingId, setMeetingId] = useState('qyk-mvgg-bgg');
  const [agenda, setAgenda] = useState('');

  // The 'modules' prop lets you customize the toolbar options
  const modules = {
    toolbar: [
      [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
      [{ size: [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];
  const [agendaFileName, setAgendaFileName] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<any[] | null>(null);
  const [attendanceFileName, setAttendanceFileName] = useState<string | null>(null);
  const [minutesOfMeeting, setMinutesOfMeeting] = useState<string | null>(null);
  const [isParsingAgenda, setIsParsingAgenda] = useState<boolean>(false);
  const [isParsingAttendance, setIsParsingAttendance] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [generationStarted, setGenerationStarted] = useState(false);
  const { downloadPdf, isDownloading } = usePdfDownloader();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogLoading, setIsDialogLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');

  const [renderedMinutes, setRenderedMinutes] = useState<string>('Your generated Minutes of Meeting will appear here. ');
  const editorRef = useRef(null);
  let currentParent: any = null;
  const log = () => {
    if (editorRef.current) {
      console.log(editorRef.current.getContent());
    }
  };
  useEffect(() => {
    if (minutesOfMeeting) {
      setRenderedMinutes(window.marked.parse(minutesOfMeeting));
    }
  }, [minutesOfMeeting]);

  // Simulated attendance parsing
  const simulateParseAttendance = useCallback(async () => {
    setIsParsingAttendance(true);
    return new Promise<any[]>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const response = await fetch('https://rosybrown-pig-623233.hostingersite.com/attendance.xlsx');
          if (!response.ok) throw new Error('Failed to fetch attendance file.');
          const data = await response.arrayBuffer();
          const workbook = XLSX.read(data);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet);
          const validAttendanceValues = ['Present through VC', 'Present through AC', 'Present', 'Absent', 'Present in Person'];
          const isValidData = json.every(row => row.Name && validAttendanceValues.includes(row.Attendance));
          if (!isValidData) throw new Error('Invalid data in Attendance column.');
          setAttendanceFileName("attendance.xlsx");
          resolve(json);
        } catch (err) {
          reject(err);
        } finally {
          setIsParsingAttendance(false);
        }
      }, 2000);
    });
  }, []);

  // Simulated agenda parsing
  const simulateParseAgenda = useCallback(async () => {
    setIsParsingAgenda(true);
    // return new Promise<any[]>(async (resolve, reject) => {
    //   try {
    //     // Step 1 - get agenda doc link
    //     const documentLink = await getDocumentLinkFromMeetingId(meetingId);
    //     if (!documentLink) throw new Error("Could not find agenda document link.");

    //     const match = documentLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
    //     if (!match) throw new Error("Could not parse agenda doc ID.");
    //     const agendaDocId = match[1];

    //     const authToken = await getAuthToken();

    //     // Step 2 - Fetch agenda doc via Google Docs API (not Drive export)
    //     const docResponse = await fetch(
    //       `https://docs.googleapis.com/v1/documents/${agendaDocId}`,
    //       { headers: { Authorization: `Bearer ${authToken}` } }
    //     );
    //     if (!docResponse.ok) throw new Error("Failed to fetch agenda doc.");
    //     const agendaDoc = await docResponse.json();
    //     console.log("Agenda Document Data:", agendaDoc);
    //     // Step 3 - Walk through the body content, locate tables
    //     const rows: { agendaItem: string; link: string }[] = [];

    //     for (const element of agendaDoc.body.content) {
    //       if (element.table) {
    //         for (const row of element.table.tableRows) {
    //           const cells = row.tableCells;
    //           if (cells.length >= 3) {
    //             const agendaItem = cells[1].content.map(c => c.paragraph.elements.map(e => e.textRun?.content || '').join('')).join('').trim();
    //             const links = cells[0].content.map(c => c.paragraph.elements.map(e => e.textRun?.content || '').join('')).join('').trim();

    //             console.log("Agenda Item:", agendaItem);
    //             // const presenter = cells?.content?.map(c => c.paragraph?.elements?.map(e => e.textRun?.content || '').join('')).join('').trim();

    //             // Extract link inside the 2nd or 3rd cell
    //             let linkUrl = '';
    //             const linkCell = cells;
    //             if (linkCell || Array.isArray(linkCell.content)) {
    //               // console.log("Link Cell Content:", typeof linkCell.content, linkCell.content);
    //               for (const c of linkCell.content) {
    //                 if (!c.paragraph?.elements) continue;
    //                 for (const e of c.paragraph.elements) {
    //                   const linkData = e?.textRun?.textStyle?.link?.url;
    //                   if (linkData) {
    //                     linkUrl = linkData;
    //                   }
    //                 }
    //               }
    //             }

    //             if (linkUrl) rows.push({ agendaItem, link: linkUrl });
    //           }
    //         }
    //       }
    //     }
    //     console.log("Parsed Agenda Rows:", rows);
    //     // Step 4 - For each link, fetch document contents and extract text
    //     const agendaResults: string[] = [];

    //     for (const row of rows) {
    //       try {
    //         const match = row.link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    //         if (!match) continue;
    //         const linkedDocId = match[1];
    //         console.log("Processing linked doc:", row.link);
    //         // Try exporting as PDF
    //         const fileResp = await fetch(
    //           `https://www.googleapis.com/drive/v3/files/${linkedDocId}/export?mimeType=application/pdf&alt=media`,
    //           { headers: { Authorization: `Bearer ${authToken}` } }
    //         );
    //         if (!fileResp.ok) continue;

    //         const fileBuffer = await fileResp.arrayBuffer();

    //         const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
    //         let docText = '';
    //         for (let i = 1; i <= pdf.numPages; i++) {
    //           const page = await pdf.getPage(i);
    //           const textContent = await page.getTextContent();
    //           docText += textContent.items.map((it: any) => it.str).join(' ') + '\n';
    //         }

    //         agendaResults.push(`${row.agendaItem} - ${docText.trim()}`);
    //       } catch (err) {
    //         console.error("Error processing linked doc", row.link, err);
    //       }
    //     }
    //     // console.log("Parsed Agenda Results:", agendaResults);
    //     resolve(agendaResults);

    //   } catch (err) {
    //     reject(err);
    //   } finally {
    //     setIsParsingAgenda(false);
    //   }
    // });
    // return new Promise<string>((resolve, reject) => {
    //   setTimeout(async () => {
    //     try {
    //       const documentLink = await getDocumentLinkFromMeetingId(meetingId);
    //       console.log("Document Link:", documentLink);
    //       if (!documentLink) {
    //         throw new Error('Could not find a document link for the provided meeting ID.');
    //       }
    //       const match = documentLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
    //       if (!match || !match[1]) {
    //         throw new Error('Could not parse document ID from the document link.');
    //       }
    //       const documentId = match[1];
    //       console.log("Document ID:", documentId);
    //       const authToken = await getAuthToken();
    //       const response = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=application/pdf&alt=media`, {
    //         headers: {
    //           'Authorization': `Bearer ${authToken}`,
    //         },
    //       });;
    //       // const response = await fetch("https://rosybrown-pig-623233.hostingersite.com/agenda.pdf");
    //       if (!response.ok) throw new Error('Failed to fetch agenda file.');
    //       const fileBuffer = await response.arrayBuffer();
    //       const loadingTask = pdfjsLib.getDocument(fileBuffer);
    //       const pdf = await loadingTask.promise;
    //       let fullText = '';
    //       for (let i = 1; i <= pdf.numPages; i++) {
    //         const page = await pdf.getPage(i);
    //         const textContent = await page.getTextContent();
    //         const pageText = textContent.items.map((item: any) => item.str).join(' ');
    //         fullText += pageText + '\n\n';
    //       }
    //       // console.log("Full Agenda Text:", fullText);
    //       setAgendaFileName("agenda.pdf");
    //       resolve(fullText.trim());
    //     } catch (err) {
    //       reject(err);
    //     } finally {
    //       setIsParsingAgenda(false);
    //     }
    //   }, 2500);
    // });
    return new Promise<string>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const documentLink = await getDocumentLinkFromMeetingId(meetingId);

          if (!documentLink) {
            throw new Error('Could not find a document link for the provided meeting ID.');
          }

          const match = documentLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (!match || !match[1]) {
            throw new Error('Could not parse document ID from the document link.');
          }

          const documentId = match[1];
          const authToken = await getAuthToken();

          // Fetch the document directly using Google Docs API
          const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });

          if (!docResponse.ok) {
            throw new Error('Failed to fetch agenda document.');
          }

          const document = await docResponse.json();
          // let tableData: any[] = [];

          // Process tables in the document
          // Process tables in the document
          interface AgendaItem {
            srNo: string;
            description: string;
            link: string;
            presenter: string;
            duration: string;
            isSubItem: boolean;
            parentSrNo?: string; // Only for sub-items
          }

          let tableData: AgendaItem[] = [];
          let lastMainItem: AgendaItem | null = null;

          // Process tables in the document
          if (document.body && document.body.content) {
            document.body.content.forEach((contentItem: any) => {
              if (contentItem.table) {
                // Process each table row
                contentItem.table.tableRows.forEach((row: any) => {
                  const rowCells = row.tableCells;
                  if (rowCells.length >= 5) { // Assuming 5 columns

                    // Check if first cell is empty (sub-item)
                    const srNoContent = extractTextWithLinks(rowCells[0]);
                    const isSubItem = !srNoContent.text.trim();

                    // For sub-items, we might need to look at the second cell for SR No
                    const effectiveSrNoCell = isSubItem && rowCells.length > 5 ? rowCells[1] : rowCells[0];
                    const srNo = extractTextWithLinks(effectiveSrNoCell);

                    const description = extractTextWithLinks(rowCells[isSubItem && rowCells.length > 5 ? 2 : 1]);
                    const link = extractLinks(rowCells[isSubItem || rowCells.length > 5 ? 3 : 2]);
                    const presenter = extractTextWithLinks(rowCells[isSubItem && rowCells.length > 5 ? 4 : 3]);
                    const duration = extractTextWithLinks(rowCells[isSubItem && rowCells.length > 5 ? 5 : 4]);

                    // Validate it's a data row
                    if ((!isSubItem && srNo.text.match(/^\d+\.?$/)) ||
                      (isSubItem && lastMainItem)) {

                      const item: AgendaItem = {
                        srNo: isSubItem ? `${lastMainItem?.srNo}.${srNo.text}` : srNo.text,
                        description: description.text,
                        link: link.url,
                        presenter: presenter.text,
                        duration: duration.text,
                        isSubItem: isSubItem
                      };

                      if (isSubItem && lastMainItem) {
                        item.parentSrNo = lastMainItem.srNo;
                      }

                      tableData.push(item);

                      // Update last main item reference
                      if (!isSubItem) {
                        lastMainItem = item;
                      }
                    }
                  }
                });
              }
            });
          }
          console.log("Parsed Agenda Table Data:", tableData);
          // Helper functions to extract content from table cells
          function extractTextWithLinks(cell: any): { text: string, link?: string } {
            let text = '';
            let link = '';
            cell.content?.forEach((content: any) => {
              if (content.paragraph) {
                content.paragraph.elements?.forEach((element: any) => {
                  if (element.textRun) {
                    text += element.textRun.content;
                    if (element.textRun.textStyle?.link?.url) {
                      link = element.textRun.textStyle.link.url;
                    }
                  }
                });
              }
            });
            return { text: text.trim(), link };
          }

          function extractLinks(cell: any): { url?: string } {
            let url = '';
            cell.content?.forEach((content: any) => {
              if (content.paragraph) {
                content.paragraph.elements?.forEach((element: any) => {
                  if (element.textRun?.textStyle?.link?.url) {
                    url = element.textRun.textStyle.link.url;
                  }
                });
              }
            });
            return { url };
          }

          // Now fetch content from each linked document
          const result = [];
          let currentGroup: { title: string; items: string[]; content: string } | null = null;

          for (const row of tableData) {
            if (row.link) {
              try {
                const docMatch = row.link.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (docMatch && docMatch[1]) {
                  const docId = docMatch[1];
                  const linkedDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
                    headers: {
                      'Authorization': `Bearer ${authToken}`,
                    },
                  });

                  if (linkedDocResponse.ok) {
                    const linkedDoc = await linkedDocResponse.json();
                    let docText = '';

                    // Extract all text from the linked document
                    if (linkedDoc.body && linkedDoc.body.content) {
                      linkedDoc.body.content.forEach((content: any) => {
                        if (content.paragraph) {
                          content.paragraph.elements?.forEach((element: any) => {
                            if (element.textRun) {
                              docText += element.textRun.content;
                            }
                          });
                          docText += '\n';
                        }
                      });
                    }

                    const content = docText.trim();

                    // Check if this is a sub-item of the current group
                    if (row.isSubItem && currentGroup && row.parentSrNo === currentGroup.title.split(' ')[0]) {
                      currentGroup.items.push(`${row.srNo} ${row.description}`);
                    }
                    // New main item with possible sub-items
                    else {
                      // Push previous group if exists
                      if (currentGroup) {
                        result.push({
                          [currentGroup.title]: currentGroup.content,
                          subItems: currentGroup.items
                        });
                      }

                      // Start new group
                      currentGroup = {
                        title: `${row.srNo} ${row.description}`,
                        items: [],
                        content: content
                      };
                    }
                  }
                }
              } catch (err) {
                console.error(`Error fetching document ${row.link}:`, err);
                result.push({
                  [`${row.srNo} ${row.description}`]: "Error fetching linked document"
                });
              }
            } else {
              // Handle items without links
              if (currentGroup && row.isSubItem && row.parentSrNo === currentGroup.title.split(' ')[0]) {
                currentGroup.items.push(`${row.srNo} ${row.description}`);
              } else {
                // Push previous group if exists
                if (currentGroup) {
                  result.push({
                    [currentGroup.title]: currentGroup.content,
                    subItems: currentGroup.items
                  });
                  currentGroup = null;
                }

                result.push({
                  [`${row.srNo} ${row.description}`]: "No linked document"
                });
              }
            }
          }

          // Push the last group if exists
          if (currentGroup) {
            result.push({
              [currentGroup.title]: currentGroup.content,
              subItems: currentGroup.items
            });
          }

          setAgendaFileName("agenda");
          resolve(JSON.stringify(result, null, 2));
        } catch (err) {
          reject(err);
        } finally {
          setIsParsingAgenda(false);
        }
      }, 2500);
    });

  }, []);

  const startGenerationProcess = async (transcriptionToUse: string) => {
    setIsDialogLoading(true);
    setIsDialogOpen(false);
    setMinutesOfMeeting(null);
    setError(null);
    setGenerationStarted(true);
    setIsGenerating(true);

    try {
      const transcriptionData = transcriptionToUse;
      const attendanceData = await simulateParseAttendance();
      setAttendanceData(attendanceData);
      const agendaText = await simulateParseAgenda();
      setAgenda(agendaText);
      console.log("Parsed Agenda Text:", agendaText);
      const minutes = await generateMinutesOfMeeting(agendaText, transcriptionData, attendanceData, selectedOption);
      setMinutesOfMeeting(minutes);
    } catch (err) {
      setIsDialogOpen(false);
      setIsDialogLoading(false);
      setError(err instanceof Error ? `Failed to generate minutes: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsDialogLoading(false);
      setIsGenerating(false);
    }
  };

  const handleGenerateButtonClick = () => {
    setIsDialogOpen(true);
  };

  // const handleConfirmGeneration = () => {
  //   let transcriptionToUse = '';
  //   if (selectedOption === 'narrativeAndBullet') {
  //     transcriptionToUse = MOCK_TRANSCRIPTION1;
  //   } else if (selectedOption === 'bulletPoints') {
  //     transcriptionToUse = MOCK_TRANSCRIPTION2;
  //   } else {
  //     transcriptionToUse = MOCK_TRANSCRIPTION3;
  //   }
  //   startGenerationProcess(MOCK_TRANSCRIPTION);
  // };
  const handleConfirmGeneration = async (meetingId: string) => {
    try {
      const meetingData = await fetchMeetingData(meetingId);
      startGenerationProcess(meetingData.transcription);
    } catch (err) {
      setIsDialogOpen(false);
      setIsDialogLoading(false);
      setError(err instanceof Error ? `Failed to generate minutes: ${err.message}` : 'An unknown error occurred.');
      console.error("Failed to fetch meeting data:", error);
    }
  };

  const handleDownloadPdf = () => {
    if (minutesOfMeeting) {
      downloadPdf(minutesOfMeeting);
    }
  };

  const handleCopyText = async () => {
    if (!minutesOfMeeting || !renderedMinutes) {
      return;
    }

    try {
      const htmlBlob = new Blob([renderedMinutes], { type: 'text/html' });
      const textBlob = new Blob([minutesOfMeeting], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Rich text copy failed, falling back to plain text.', err);
      try {
        await navigator.clipboard.writeText(minutesOfMeeting);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Plain text copy failed as well.', fallbackErr);
        setError('Failed to copy text to clipboard.');
      }
    }
  };

  const isGenerateDisabled = isGenerating;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-3 bg-white shadow-sm rounded-full p-3 mb-4">
            <div className=" text-white p-2 rounded-full">
              <img src="https://www.dess.digital/wp-content/uploads/2021/09/cropped-Dess-Logo-Final-1-1.png" alt="Company Logo" width="48" height="48" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Dess Meeting Minutes Generator</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Automatically generate detailed Minutes of Meeting from a meeting agenda and transcription using AI.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Inputs */}
          <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-700 mb-3">1. Meeting ID</h2>
              <input
                type="text"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="Enter Google Meet ID (e.g., abc-def-ghi)"
                className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition w-full"
              />
            </div>

            {/* {generationStarted && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-slate-700 mb-3">2. Attendance Data</h2>
                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 overflow-hidden">
                      <Users size={18} className="flex-shrink-0" />
                      <span className="font-medium truncate" title={attendanceFileName || 'attendance.xlsx'}>
                        {isParsingAttendance ? 'Parsing Attendance...' : attendanceFileName || 'Your Attendance Data will appear here'}
                      </span>
                    </div>
                    {(isParsingAttendance || attendanceData) && (
                      isParsingAttendance ? <Loader /> : <Check size={18} className="text-green-600" />
                    )}
                  </div>
                  {attendanceData && <p className="text-sm text-green-600 mt-2">✓ Parsed {attendanceData.length} attendees from attendance.xlsx</p>}
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-700 mb-3">3. Meeting Agenda</h2>
                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 overflow-hidden">
                      <FileText size={18} className="flex-shrink-0" />
                      <span className="font-medium truncate" title={agendaFileName || 'agenda.pdf'}>
                        {isParsingAgenda ? 'Parsing Agenda...' : agendaFileName || 'Your Meeting Agenda will appear here'}
                      </span>
                    </div>
                    {(isParsingAgenda || agenda) && (
                      isParsingAgenda ? <Loader /> : <Check size={18} className="text-green-600" />
                    )}
                  </div>
                  {agenda && <p className="text-sm text-green-600 mt-2">✓ Agenda parsed successfully from agenda.pdf</p>}
                </div>
              </>
          )}  */}

            <div className="border-t border-slate-200 pt-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-3">{'2. Generate Minutes'}</h2>
              <button
                onClick={handleGenerateButtonClick}
                disabled={isGenerateDisabled}
                className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg transform hover:scale-105 disabled:transform-none"
              >
                {isGenerating ? <Loader /> : <Bot size={20} />}
                {isGenerating ? 'Generating...' : 'Generate Minutes of Meeting using Meeting ID'}
              </button>
            </div>
          </div>
          {/* <button
                
                onClick={()=>fetchMeetingData('qyk-mvgg-bgg')}
                className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg transform hover:scale-105 disabled:transform-none"
          >Sample Call</button> */}
          {/* Right Column: Output */}
          <div className="bg-white p-6 rounded-xl shadow-md min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Generated Minutes</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  disabled={!minutesOfMeeting || isCopied}
                  className={`px-4 py-2 font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2 ${isCopied
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:bg-slate-200 disabled:text-slate-400'
                    }`}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? 'Copied!' : 'Copy Text'}
                </button>
                {/* <button
                  onClick={handleDownloadPdf}
                  disabled={!minutesOfMeeting || isDownloading}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDownloading ? <Loader /> : <Download size={16} />}
                  Download PDF
                </button> */}
              </div>
            </div>
            <div className="prose prose-slate max-w-none flex-grow bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-y-auto">
              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-full">
                  <BeatLoader color='#4863A0' />
                  <p className="text-slate-500 mt-4 animate-pulse">Generating Minutes of Meeting</p>
                </div>
              )}
              {error && <div className="text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
              {/* {!isGenerating && !minutesOfMeeting && !error && (
                <div className="text-center text-slate-500 pt-16">
                  <FileText size={48} className="mx-auto text-slate-400" />
                  <p className="mt-4">Your generated Minutes of Meeting will appear here.</p>
                </div>
              )} */}
              <>
                <Editor
                  apiKey='q79q61v2i3m67pk48pzjv5tbvhtceu3hlb36f3mdh1enrn1l' // Replace with your actual TinyMCE API key
                  onInit={(evt, editor) => editorRef.current = editor}
                  initialValue={renderedMinutes} // Use the generated agenda text as the initial value
                  init={{
                    height: 500,
                    menubar: true,
                    plugins: [
                      'advlist autolink lists link image charmap print preview anchor',
                      'searchreplace visualblocks code fullscreen',
                      'insertdatetime media table paste code help wordcount'
                    ],
                    toolbar: 'undo redo | formatselect | ' +
                      'bold italic backcolor | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'removeformat | help'
                  }}
                />
                {/* <button onClick={log}>Log editor content</button> */}
              </>
              {/* <div dangerouslySetInnerHTML={{ __html: renderedMinutes }} /> */}
            </div>
          </div>
        </div>
      </main>

      {/* Dialog Box */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Minutes Generation</h2>
              <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6">Dess AI will combine your agenda and transcription to create complete minutes.</p>

            <div className="mb-6">
              <label htmlFor="format-dropdown" className="block text-sm font-medium text-slate-700 mb-2">
                Select Format
              </label>
              <select
                id="format-dropdown"
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="" disabled>Select an option...</option>
                <option value="narrativeAndBullet">Narrative summary & Bullet Points</option>
                <option value="bulletPoints">Bullet point format</option>
                <option value="narrativeSummary">Narrative Summary</option>
              </select>
            </div>

            <div className="text-sm text-slate-500 mb-6">
              {selectedOption === 'narrativeAndBullet' && (
                <p>Your minutes will be generated in summarized paragraphs with additional bullet points added below your existing agenda section and notes.</p>
              )}
              {selectedOption === 'bulletPoints' && (
                <p>Your minutes will be generated into bullet points and added below your existing agenda and notes.</p>
              )}
              {selectedOption === 'narrativeSummary' && (
                <p>Your minutes will be generated into summarized paragraphs and added below your existing agenda section & notes.</p>
              )}
            </div>

            {isDialogLoading ? (
              // Loader component or HTML for the loader goes here
              <div className="flex items-center justify-center w-full py-3">
                <BeatLoader color="#4863A0" />
              </div>
            ) : (
              // The original button
              <button
                onClick={() => handleConfirmGeneration(meetingId)}
                disabled={!selectedOption}
                className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                Confirm and Generate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}