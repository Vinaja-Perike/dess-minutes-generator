import React, { useState, useCallback, useEffect } from 'react';
import { generateMinutesOfMeeting } from './services/geminiService';
import { usePdfDownloader } from './hooks/usePdfDownloader';
import { Loader } from './components/Loader';
import { Bot, FileText, Download, Users, Copy, Check, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import * as XLSX from 'xlsx';
import { MOCK_TRANSCRIPTION } from './constants';

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
  const [agenda, setAgenda] = useState<string>('');
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
  const [selectedOption, setSelectedOption] = useState('');

  const [renderedMinutes, setRenderedMinutes] = useState<string>('');

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
    return new Promise<string>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const response = await fetch("https://rosybrown-pig-623233.hostingersite.com/agenda.pdf");
          if (!response.ok) throw new Error('Failed to fetch agenda file.');
          const fileBuffer = await response.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument(fileBuffer);
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
          }
          setAgendaFileName("agenda.pdf");
          resolve(fullText.trim());
        } catch (err) {
          reject(err);
        } finally {
          setIsParsingAgenda(false);
        }
      }, 2500);
    });
  }, []);

  const startGenerationProcess = async (transcriptionToUse: string) => {
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
      const minutes = await generateMinutesOfMeeting(agendaText, transcriptionData, attendanceData, selectedOption);
      setMinutesOfMeeting(minutes);
    } catch (err) {
      setError(err instanceof Error ? `Failed to generate minutes: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateButtonClick = () => {
    setIsDialogOpen(true);
  };

  const handleConfirmGeneration = () => {
    let transcriptionToUse = '';
    if (selectedOption === 'narrativeAndBullet') {
      transcriptionToUse = MOCK_TRANSCRIPTION1;
    } else if (selectedOption === 'bulletPoints') {
      transcriptionToUse = MOCK_TRANSCRIPTION2;
    } else {
      transcriptionToUse = MOCK_TRANSCRIPTION3;
    }
    startGenerationProcess(MOCK_TRANSCRIPTION);
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
            
            {/* {generationStarted && ( */}
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
            {/* )} */}

            <div className="border-t border-slate-200 pt-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-3">{'4. Generate Minutes'}</h2>
              <button
                onClick={handleGenerateButtonClick}
                disabled={isGenerateDisabled}
                className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg transform hover:scale-105 disabled:transform-none"
              >
                {isGenerating ? <Loader /> : <Bot size={20} />}
                {isGenerating ? 'Generating...' : 'Generate Minutes of Meeting'}
              </button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="bg-white p-6 rounded-xl shadow-md min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Generated Minutes</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  disabled={!minutesOfMeeting || isCopied}
                  className={`px-4 py-2 font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2 ${
                    isCopied
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
                  <Loader />
                  <p className="text-slate-500 mt-4 animate-pulse">Generating Minutes of Meeting</p>
                </div>
              )}
              {error && <div className="text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
              {!isGenerating && !minutesOfMeeting && !error && (
                <div className="text-center text-slate-500 pt-16">
                  <FileText size={48} className="mx-auto text-slate-400" />
                  <p className="mt-4">Your generated Minutes of Meeting will appear here.</p>
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: renderedMinutes }} />
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
            
            <button
              onClick={handleConfirmGeneration}
              disabled={!selectedOption}
              className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
            >
              Confirm and Generate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}