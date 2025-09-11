import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateMinutesOfMeeting } from './services/geminiService';
import { usePdfDownloader } from './hooks/usePdfDownloader';
import { Loader } from './components/Loader';
import { Bot, FileText, Download, Zap, UploadCloud, X, Users, Copy, Check } from 'lucide-react';
import { fetchMeetingData } from './services/googleMeetService';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import * as XLSX from 'xlsx';
import { Editor } from '@tinymce/tinymce-react';
import { BeatLoader } from 'react-spinners';
import mammoth from 'mammoth';

// Configure the worker for pdf.js using a stable CDN URL to prevent parsing errors
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.54/build/pdf.worker.mjs`;

declare global {
    interface Window {
        marked: any;
    }

}

export default function App3() {
    const [meetingId, setMeetingId] = useState('qyk-mvgg-bgg');
    const [transcription, setTranscription] = useState<string | null>(null);
    const [agenda, setAgenda] = useState<string>('');
    const [agendaFileName, setAgendaFileName] = useState<string | null>(null);
    const [attendanceData, setAttendanceData] = useState<any[] | null>(null);
    const [transcriptionData, settranscriptionData] = useState(null);
    const [attendanceFileName, setAttendanceFileName] = useState<string | null>(null);
    const [transcriptionFileName, settranscriptionFileName] = useState<string | null>(null);

    const [minutesOfMeeting, setMinutesOfMeeting] = useState<string | null>(null);
    const [isLoadingTranscription, setIsLoadingTranscription] = useState<boolean>(false);
    const [isParsingAgenda, setIsParsingAgenda] = useState<boolean>(false);
    const [isParsingAttendance, setIsParsingAttendance] = useState<boolean>(false);

    const [isParsingTranscription, setisParsingTranscription] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDialogLoading, setIsDialogLoading] = useState(false);
    const [generationStarted, setGenerationStarted] = useState(false);
    const [selectedOption, setSelectedOption] = useState('');
    const agendaFileRef = useRef<HTMLInputElement>(null);
    const attendanceFileRef = useRef<HTMLInputElement>(null);

    const transcriptionRef = useRef<HTMLInputElement>(null);
    const { downloadPdf, isDownloading } = usePdfDownloader();

    const [renderedMinutes, setRenderedMinutes] = useState<string>('');
    const editorRef = useRef(null);

    useEffect(() => {
        if (minutesOfMeeting) {
            setRenderedMinutes(window.marked.parse(minutesOfMeeting));
        }
    }, [minutesOfMeeting]);
    const handleConfirmGeneration = async (meetingId: string) => {
        try {
            // const meetingData = await fetchMeetingData(meetingId);
            startGenerationProcess();
        } catch (err) {
            setIsDialogOpen(false);
            setIsDialogLoading(false);
            setError(err instanceof Error ? `Failed to generate minutes: ${err.message}` : 'An unknown error occurred.');
            console.error("Failed to fetch meeting data:", error);
        }
    };
    const startGenerationProcess = async () => {
        setIsDialogLoading(true);
        setIsDialogOpen(false);
        setMinutesOfMeeting(null);
        setError(null);
        setGenerationStarted(true);
        setIsGenerating(true);
        // console.log("Starting generation process with transcription:", transcriptionToUse);
        try {
            // const transcriptionData = transcription;
            // console.log("Transcription Data:", transcriptionData);
            // const attendanceData = await simulateParseAttendance();
            setAttendanceData(attendanceData);
            const agendaText = agenda
            setAgenda(agendaText);
            // console.log("Parsed Agenda Text:", agendaText);
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


    const handleAttendanceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.match(/\.(xlsx|xls)$/)) {
            setError('Please upload a valid Excel file (.xlsx or .xls).');
            return;
        }

        setIsParsingAttendance(true);
        setAttendanceFileName(file.name);
        setError(null);
        setAttendanceData(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            // Check the column headers for the new format
            const firstRow = json[0];
            if (!firstRow || !('Name' in firstRow && 'Attendance' in firstRow)) {
                throw new Error("Excel sheet must contain 'Name' and 'Attendance' columns.");
            }

            // Validate the 'Attendance' column values
            const validAttendanceValues = ['Present through VC', 'Present through AC', 'Present', 'Absent', 'Present in Person'];
            const isValidData = json.every(row => {
                return row.Name && validAttendanceValues.includes(row.Attendance);
            });

            if (!isValidData) {
                throw new Error('One or more rows have invalid data in the Attendance column. Valid values are: Present through VC, Present through AC, Present, or Absent.');
            }

            setAttendanceData(json);
        } catch (err) {
            setError(err instanceof Error ? `Failed to parse Excel file: ${err.message}` : 'An unknown error occurred during parsing.');
            console.error(err);
            setAttendanceFileName(null);
        } finally {
            setIsParsingAttendance(false);
        }
    };


    const handleTranscriptionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check for DOC/DOCX file extension
        if (!file.name.match(/\.(docx|doc)$/)) {
            setError('Please upload a valid Word document (.docx or .doc).');
            return;
        }

        setisParsingTranscription(true);
        settranscriptionFileName(file.name);
        setError(null);
        settranscriptionData(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const textContent = result.value;
            // console.log("Extracted Text Content:", textContent);

            // Basic validation - check if document has meaningful content
            if (!textContent || textContent.trim().length < 10) {
                throw new Error("The document appears to be empty or contains very little text.");
            }

            // Parse the text content into structured data
            // const parsedData = parseTranscriptionText(textContent);

            // Validate parsed data
            // if (!parsedData || parsedData.length === 0) {
            //     throw new Error("Could not extract meaningful data from the document.");
            // }
            console.log("Parsed Transcription Data:", textContent);
            settranscriptionData(textContent);
        } catch (err) {
            setError(err instanceof Error ? `Failed to parse document: ${err.message}` : 'An unknown error occurred during parsing.');
            console.error(err);
            settranscriptionFileName(null);
        } finally {
            setisParsingTranscription(false);
        }
    };

    // Example parser - customize based on your document structure
    const parseTranscriptionText = (text: string): any[] => {
        const lines = text.split('\n').filter(line => line.trim());
        const transcriptData = [];

        // Example parsing logic - adjust according to your document format
        for (const line of lines) {
            // Customize this based on how your transcription document is structured
            // This example looks for patterns like "Name: John Doe, Attendance: Present"
            const nameMatch = line.match(/Name:\s*(.+?)(,|$)/i);
            const attendanceMatch = line.match(/Attendance:\s*(.+?)(,|$)/i);

            if (nameMatch && attendanceMatch) {
                transcriptData.push({
                    Name: nameMatch[1].trim(),
                    Attendance: attendanceMatch[1].trim(),
                    // Add other fields as needed
                });
            }
        }

        return transcriptData;
    };
    const handleClearAttendance = () => {
        setAttendanceData(null);
        setAttendanceFileName(null);
        if (attendanceFileRef.current) {
            attendanceFileRef.current.value = '';
        }
    };
    const handleClearTranscription = () => {
        settranscriptionData(null);
        if (transcriptionRef.current) {
            transcriptionRef.current.value = '';
        }
    };
    const handleAgendaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file for the agenda.');
            return;
        }

        setIsParsingAgenda(true);
        setAgendaFileName(file.name);
        setError(null);
        setAgenda('');

        try {
            const fileBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(fileBuffer);
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            setAgenda(fullText.trim());
            console.log("Parsed Agenda Text:", fullText.trim());
        } catch (err) {
            setError('Failed to parse PDF file. Please ensure it is not corrupted.');
            console.error(err);
            setAgendaFileName(null);
        } finally {
            setIsParsingAgenda(false);
        }
    };

    const handleClearAgenda = () => {
        setAgenda('');
        setAgendaFileName(null);
        if (agendaFileRef.current) {
            agendaFileRef.current.value = '';
        }
    };

    const handleGenerateMinutes = async () => {
        if (!transcription || !agenda || !attendanceData) {
            setError("Please ensure transcription, attendance, and agenda are all provided.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        setMinutesOfMeeting(null);

        try {
            const minutes = await generateMinutesOfMeeting(agenda, transcription, attendanceData, selectedOption);
            setMinutesOfMeeting(minutes);
        } catch (err) {
            setError(err instanceof Error ? `Failed to generate minutes: ${err.message}` : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsGenerating(false);
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
    const handleGenerateButtonClick = () => {
        setIsDialogOpen(true);
    };
    const isGenerateDisabled = !transcription || !agenda || !attendanceData || isGenerating || isLoadingTranscription || isParsingAgenda || isParsingAttendance;

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800">
            <main className="container mx-auto px-4 py-8 md:py-12">
                <header className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 bg-white shadow-sm rounded-full p-3 mb-4">
                        <div className=" text-white p-2 rounded-full"><img src="https://www.dess.digital/wp-content/uploads/2021/09/cropped-Dess-Logo-Final-1-1.png" alt="Company Logo" width="48" height="48" /></div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Dess Meeting Minutes Generator</h1>
                    </div>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Automatically generate detailed Minutes of Meeting from a meeting agenda and transcription using AI.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Inputs */}
                    <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
                        {/* <div>
                            <h2 className="text-xl font-semibold text-slate-700 mb-3">1. Fetch Meeting Data</h2>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={meetingId}
                                    onChange={(e) => setMeetingId(e.target.value)}
                                    placeholder="Enter Google Meet ID (e.g., abc-def-ghi)"
                                    className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                />
                                <button
                                    onClick={handleFetchTranscription}
                                    disabled={isLoadingTranscription || !!transcription}
                                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isLoadingTranscription ? <Loader /> : <Zap size={16} />}
                                    {transcription ? 'Fetched' : 'Fetch'}
                                </button>
                            </div>
                            {transcription && <p className="text-sm text-green-600 mt-2">✓ Transcription data loaded successfully.</p>}
                            <p className="text-xs text-slate-500 mt-2">Note: This feature simulates fetching data from a live meeting.</p>
                        </div> */}
                        <div>
                            <h2 className="text-xl font-semibold text-slate-700 mb-3">1. Upload Transcription</h2>
                            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                                {!transcriptionFileName ? (
                                    <button
                                        onClick={() => transcriptionRef.current?.click()}
                                        disabled={isParsingTranscription}
                                        className="w-full flex items-center justify-center gap-3 text-center py-3 px-4 bg-white hover:bg-slate-100 rounded-md text-slate-600 font-semibold transition border border-dashed border-slate-400 disabled:opacity-50"
                                    >
                                        {isParsingTranscription ? (
                                            <>
                                                <Loader className="text-slate-600 animate-spin" />
                                                Parsing Doc...
                                            </>
                                        ) : (
                                            <>
                                                <Users size={18} />
                                                Upload Transcription (Doc)
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-700 overflow-hidden">
                                            <Users size={18} className="flex-shrink-0" />
                                            <span className="font-medium truncate" title={transcriptionFileName}>
                                                {transcriptionFileName}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                settranscriptionFileName('');
                                                settranscriptionData(null);
                                                if (transcriptionRef.current) transcriptionRef.current.value = '';
                                            }}
                                            className="text-slate-500 hover:text-red-600 transition-colors p-1 rounded-full flex-shrink-0"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={transcriptionRef}
                                    onChange={handleTranscriptionUpload}
                                    accept=".doc, .docx"
                                    className="hidden"
                                />
                            </div>

                            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                            {transcriptionData && (
                                <p className="text-sm text-green-600 mt-2">
                                    ✓ Successfully parsed.
                                </p>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-700 mb-3">2. Upload Attendance Sheet</h2>
                            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                                {!attendanceFileName ? (
                                    <button
                                        onClick={() => attendanceFileRef.current?.click()}
                                        disabled={isParsingAttendance}
                                        className="w-full flex items-center justify-center gap-3 text-center py-3 px-4 bg-white hover:bg-slate-100 rounded-md text-slate-600 font-semibold transition border border-dashed border-slate-400 disabled:opacity-50"
                                    >
                                        {isParsingAttendance ? <><Loader className="text-slate-600" /> Parsing Sheet...</> : <><Users size={18} /> Upload Attendance (Excel)</>}
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-700 overflow-hidden">
                                            <Users size={18} className="flex-shrink-0" />
                                            <span className="font-medium truncate" title={attendanceFileName}>{attendanceFileName}</span>
                                        </div>
                                        <button onClick={handleClearAttendance} className="text-slate-500 hover:text-red-600 transition-colors p-1 rounded-full flex-shrink-0">
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={attendanceFileRef}
                                    onChange={handleAttendanceUpload}
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                />
                            </div>
                            {/* <p className="text-xs text-slate-500 mt-2">Requires columns: Name, Attendance (Yes/No), Mode of Attendance (Online/Offline).</p> */}
                            {attendanceData && <p className="text-sm text-green-600 mt-2">✓ Parsed {attendanceData.length} attendees.</p>}
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-slate-700 mb-3">3. Upload Meeting Agenda</h2>
                            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                                {!agendaFileName ? (
                                    <button
                                        onClick={() => agendaFileRef.current?.click()}
                                        disabled={isParsingAgenda}
                                        className="w-full flex items-center justify-center gap-3 text-center py-3 px-4 bg-white hover:bg-slate-100 rounded-md text-slate-600 font-semibold transition border border-dashed border-slate-400 disabled:opacity-50"
                                    >
                                        {isParsingAgenda ? <><Loader className="text-slate-600" /> Parsing PDF...</> : <><UploadCloud size={18} /> Upload Agenda (PDF)</>}
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-700 overflow-hidden">
                                            <FileText size={18} className="flex-shrink-0" />
                                            <span className="font-medium truncate" title={agendaFileName}>{agendaFileName}</span>
                                        </div>
                                        <button onClick={handleClearAgenda} className="text-slate-500 hover:text-red-600 transition-colors p-1 rounded-full flex-shrink-0">
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={agendaFileRef}
                                    onChange={handleAgendaUpload}
                                    accept=".pdf"
                                    className="hidden"
                                />
                            </div>
                            {agenda && <p className="text-sm text-green-600 mt-2">✓ Agenda parsed successfully.</p>}
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                            <h2 className="text-xl font-semibold text-slate-700 mb-3">4. Generate Minutes</h2>
                            <button
                                onClick={handleGenerateButtonClick}
                                // disabled={isGenerateDisabled}
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
                                    <div className="flex items-center justify-center w-full py-3">
                                        <BeatLoader color="#4863A0" />
                                    </div>
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
                            {/* Rendered HTML from Markdown */}
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