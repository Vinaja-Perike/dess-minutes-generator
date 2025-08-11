import { useState, useCallback } from 'react';
import { jsPDF, TextOptionsLight } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const usePdfDownloader = () => {
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadPdf = useCallback(async (markdownContent: string) => {
        if (!markdownContent) {
            console.error("PDF download failed: Markdown content is empty.");
            return;
        }

        setIsDownloading(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const maxLineWidth = pageWidth - margin * 2;
            let cursorY = margin;

            const checkPageBreak = (neededHeight: number) => {
                if (cursorY + neededHeight > pageHeight - margin) {
                    doc.addPage();
                    cursorY = margin;
                }
            };

            const lines = markdownContent.split('\n');
            let isTable = false;
            let tableHeaders: string[] = [];
            let tableBody: string[][] = [];

            const processTable = () => {
                if (tableHeaders.length > 0 && tableBody.length > 0) {
                    checkPageBreak(20); // rough estimate for table height
                    autoTable(doc, {
                        head: [tableHeaders],
                        body: tableBody,
                        startY: cursorY,
                        theme: 'grid',
                        headStyles: { fillColor: [75, 75, 75], textColor: 255 },
                        styles: { cellPadding: 2, fontSize: 9, lineColor: 200, lineWidth: 0.1 },
                    });
                    cursorY = (doc as any).lastAutoTable.finalY + 7;
                }
                isTable = false;
                tableHeaders = [];
                tableBody = [];
            }

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (isTable && !trimmedLine.startsWith('|')) {
                    processTable();
                }

                if (/^(\*|-|_){3,}$/.test(trimmedLine)) {
                    checkPageBreak(5);
                    doc.setDrawColor(200); // Light grey line
                    doc.line(margin, cursorY, pageWidth - margin, cursorY);
                    cursorY += 5;
                    continue;
                }

                if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
                    const columns = trimmedLine.split('|').map(c => c.trim()).slice(1, -1);
                    if (!isTable) { 
                        isTable = true;
                        tableHeaders = columns;
                    } else if (!/---\|/.test(line) && !/\|---/.test(line)) { 
                         tableBody.push(columns);
                    }
                    continue;
                }

                let options: TextOptionsLight = {};
                let fontSize = 11;
                let fontStyle = 'normal';
                let textToRender = line;
                let spacingAfter = 5;

                if (line.startsWith('# ')) {
                    fontSize = 18;
                    fontStyle = 'bold';
                    textToRender = line.substring(2);
                    spacingAfter = 8;
                } else if (line.startsWith('## ')) {
                    fontSize = 16;
                    fontStyle = 'bold';
                    textToRender = line.substring(3);
                    spacingAfter = 7;
                } else if (line.startsWith('### ')) {
                    fontSize = 14;
                    fontStyle = 'bold';
                    textToRender = line.substring(4);
                    spacingAfter = 6;
                } else if (line.startsWith('**')) {
                     fontStyle = 'bold';
                     textToRender = line.replace(/\*\*/g, '');
                } else if (line.startsWith('* ') || line.startsWith('- ')) {
                    textToRender = `•  ${line.substring(2)}`; 
                    spacingAfter = 4;
                } else if (trimmedLine === '') {
                    cursorY += 5; 
                    continue;
                }

                doc.setFontSize(fontSize);
                doc.setFont('helvetica', fontStyle);

                const splitText = doc.splitTextToSize(textToRender, maxLineWidth);
                const textHeight = splitText.length * (fontSize * 0.35); 
                checkPageBreak(textHeight);
                doc.text(splitText, margin, cursorY, options);
                cursorY += textHeight + spacingAfter;
            }

            if (isTable) {
                processTable();
            }

            doc.save('meeting-minutes.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    }, []);

    return { downloadPdf, isDownloading };
};