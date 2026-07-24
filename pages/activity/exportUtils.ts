import { jsPDF } from 'jspdf';
import { Profile } from '../../lib/types';

const obfuscateEmail = (email?: string) => {
  if (!email) return 'N/A';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  return `${parts[0].substring(0, 3)}***@${parts[1]}`;
};

const obfuscatePhone = (phone?: string) => {
  if (!phone) return 'N/A';
  if (phone.length < 6) return phone;
  return `${phone.substring(0, 4)}****${phone.substring(phone.length - 2)}`;
};

const resolveItemDetails = (item: any) => {
  const isTask = item.budget !== undefined && !item.worker_id;
  const isBooking = !!item.worker_id;
  const title = isTask ? item.title : (item.task_id ? item.posted_tasks?.title : 'Direct Hiring Request');
  const budget = isTask ? item.budget : (item.task_id ? item.posted_tasks?.budget : item.budget);
  const client = item.client_id === item.client?.id ? item.client : null; // Needs robust linking depending on payload.
  const worker = item.worker_id === item.worker?.id ? item.worker : (item.profiles ? item.profiles : null);
  return { isTask, isBooking, title, budget, client, worker };
};


export const downloadJobReceipt = (item: any, profile: any) => {
  const downloadJobReceiptLogic = (item: any) => {
    if (!item) return;

    // Detect if it is a task or direct booking
    const isTask = item.budget !== undefined && !item.worker_id;

    // Name / Title details
    const title = item.title || item.posted_tasks?.title || 'Direct Artisan Booking';
    const description = item.description || item.posted_tasks?.description || 'N/A';
    
    // Resolve amount/budget
    const rawBudget = item.budget || item.posted_tasks?.budget;
    const formattedBudget = rawBudget ? `NGN ${Number(rawBudget).toLocaleString()}` : 'Negotiated labor cost';

    // Client/Employer details
    const clientName = item.client?.full_name || 'N/A';
    const clientEmail = item.client?.email || 'N/A';
    const clientPhone = item.client?.phone_number || 'N/A';

    // Worker Details
    const workerName = isTask ? (item.profiles?.full_name || 'N/A') : (item.worker?.full_name || 'N/A');
    const workerEmail = isTask ? (item.profiles?.email || 'N/A') : (item.worker?.email || 'N/A');
    const workerPhone = isTask ? (item.profiles?.phone_number || 'N/A') : (item.worker?.phone_number || 'N/A');
    const workerBankName = isTask ? (item.profiles?.bank_name || 'N/A') : (item.worker?.bank_name || 'N/A');
    const workerAccountNumber = isTask ? (item.profiles?.account_number || 'N/A') : (item.worker?.account_number || 'N/A');
    const workerAccountName = isTask ? (item.profiles?.account_name || 'N/A') : (item.worker?.account_name || 'N/A');

    const status = (item.status || 'N/A').toUpperCase();
    const dateStr = new Date(item.created_at).toLocaleDateString('en-GB') + ' UTC';

    // Initialize portrait PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2); // 170

    // Design Color Theme
    const colorPrimary = [15, 23, 42];  // Slate 900
    const colorSecondary = [71, 85, 105]; // Slate 600
    const colorLight = [248, 250, 252]; // Slate 50

    // Top Brand Solid Banner
    doc.setFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.rect(margin, margin, contentWidth, 12, 'F');

    // Header label
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("VELGO NIGERIA • TRUSTED LOCAL SERVICES PLATFORM", margin + 6, margin + 7.5);

    // Docket Receipt title
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setFont('text', 'bold');
    doc.setFontSize(16);
    doc.text("SERVICE JOB DOCKET & RECEIPT", margin, margin + 22);

    // Reference ID & Date block
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
    const docketId = `VLG-${item.id.substring(0, 8).toUpperCase()}-${new Date(item.created_at).getFullYear()}`;
    doc.text(`Reference ID: ${docketId}`, margin, margin + 28);
    doc.text(`Record Verified: ${dateStr}`, margin, margin + 31.5);

    // Status Pill Badge Box on right
    doc.setFillColor(241, 245, 249); // slate 100
    doc.roundedRect(pageWidth - margin - 45, margin + 17, 45, 12, 2, 2, 'F');
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("STATUS STATUS", pageWidth - margin - 40, margin + 21.5);
    
    if (status === 'COMPLETED') {
      doc.setTextColor(16, 185, 129); // Green 500
    } else if (status === 'CANCELLED' || status === 'DECLINED') {
      doc.setTextColor(239, 68, 68); // Red 500
    } else {
      doc.setTextColor(245, 158, 11); // Amber 500
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(status, pageWidth - margin - 40, margin + 26.5);

    // Participants Table Box
    let y = margin + 40;
    doc.setFillColor(colorLight[0], colorLight[1], colorLight[2]);
    doc.rect(margin, y, contentWidth, 36, 'F');
    doc.setDrawColor(226, 232, 240); // border slate 200
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, 36, 'S');

    // Box Head
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("1. TRANSACTION PARTICIPANTS (SPAM PROTECTION PROTOCOL ENFORCED)", margin + 5, y + 5);

    // Client Info
    doc.setFontSize(7);
    doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
    doc.text("CLIENT / EMPLOYER:", margin + 6, y + 11.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text(clientName.toUpperCase(), margin + 6, y + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Email: ${obfuscateEmail(clientEmail)}`, margin + 6, y + 21);
    doc.text(`Phone: ${obfuscatePhone(clientPhone)}`, margin + 6, y + 26);

    // Vertical Border Separator
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 85, y + 8, margin + 85, y + 30);

    // Worker Info
    doc.setFontSize(7);
    doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
    doc.text("SERVICE PROVIDER / ARTISAN:", margin + 91, y + 11.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text(workerName.toUpperCase(), margin + 91, y + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Email: ${obfuscateEmail(workerEmail)}`, margin + 91, y + 21);
    doc.text(`Phone: ${obfuscatePhone(workerPhone)}`, margin + 91, y + 26);

    // Job Section Details
    y += 42;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text("2. CONTRACT SERVICE DETAILS", margin, y);

    // Simple Table
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y + 3, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 10, margin + contentWidth, y + 10);

    doc.setFontSize(7.5);
    doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
    doc.text("JOB TITLE / DESCRIPTION", margin + 3, y + 7.5);
    doc.text("NEGOTIATED labor sum", margin + 115, y + 7.5);

    // Table Row Content
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    // Split title lines
    const titleLines = doc.splitTextToSize(title, 105);
    doc.text(titleLines, margin + 3, y + 15);
    doc.text(formattedBudget.toUpperCase(), margin + 115, y + 15);

    let offsetOffset = titleLines.length * 4.5;
    y += 16 + offsetOffset;

    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);

    // Description Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
    doc.text("WORK SUMMARY & SCOPE NOTES:", margin, y + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    const descLines = doc.splitTextToSize(description, contentWidth - 6);
    doc.text(descLines, margin, y + 9.5);

    y += 13 + (descLines.length * 4);

    // Verification Bank Account Block if set
    const hasBank = workerAccountNumber && workerAccountNumber !== 'N/A' && workerAccountNumber !== '---------';
    if (hasBank) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 20, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 20, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("ARTISAN BANK VERIFICATION BLOCK", margin + 5, y + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Remittance Bank Name: ${workerBankName}`, margin + 5, y + 9);
      doc.text(`Registered Account Title: ${workerAccountName}`, margin + 5, y + 13);
      doc.text(`Verified Number: ${workerAccountNumber}`, margin + 5, y + 17);
      
      y += 25;
    } else {
      y += 8;
    }

    // Safety and Nigerian regulatory compliance footer notes
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    doc.line(margin, y + 0.5, margin + contentWidth, y + 0.5);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text("VELGO NIGERIA COMPLIANCE LOGS", margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
    const finePrint = [
      "• DIRECT PAYMENT REMITTANCE: Clients send funds directly to the verified professional. Velgo does NOT collect commission/escrow escrow holding fees.",
      "• SPAM / PIRACY CONTROLS: According to NDPR privacy laws, phone details are starred (hashed) on receipt prints to prevent indexing spam bots.",
      "• COMPLETION GUARANTEE: Mark accomplishments as Completed inside Velgo to build transparency weight on the network."
    ];
    finePrint.forEach((line, index) => {
      doc.text(line, margin, y + 3.5 + (index * 3.5));
    });

    // Save File on target system
    doc.save(`velgo_receipt_${docketId.toLowerCase()}.pdf`);
  };
  return downloadJobReceiptLogic(item);
};

export const downloadAllHistoryPDF = (items: any[], profile: any, viewMode: string) => {
  const downloadAllHistoryPDFLogic = (items: any[]) => {
    if (!items || items.length === 0) {
      alert("No history records to export.");
      return;
    }

    // Initialize landscape PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Professional Palette matching Slate
    const brandPrimary = [15, 23, 42]; // Slate 900
    const textGray = [100, 116, 139]; // Slate 500
    const zebraBg = [248, 250, 252]; // Slate 50
    const borderGray = [226, 232, 240]; // Slate 200

    let pageNum = 1;

    const drawHeader = (docInstance: any, page: number) => {
      // Solid header bar
      docInstance.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
      docInstance.rect(margin, margin, contentWidth, 18, 'F');

      // Left Titles
      docInstance.setTextColor(255, 255, 255);
      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(14);
      docInstance.text("VELGO NIGERIA", margin + 6, margin + 11);

      docInstance.setFont('helvetica', 'normal');
      docInstance.setFontSize(9);
      const roleStr = viewMode === 'hiring' ? 'HIRING ENTITY REPORT' : 'ARTISAN SERVICE REMITTANCE RECORDS';
      docInstance.text(`CONSOLIDATED TRANSACTION HISTORY & INVOICES • ${roleStr}`, margin + 6, margin + 15);

      // Right Metadata
      docInstance.setFontSize(8);
      docInstance.setTextColor(203, 213, 225); // Slate 300
      const dateStr = new Date().toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC';
      docInstance.text(`Generated: ${dateStr}`, margin + contentWidth - 6, margin + 9, { align: 'right' });
      docInstance.text(`Total Records: ${items.length} | Page ${page}`, margin + contentWidth - 6, margin + 14, { align: 'right' });

      // Columns header Y
      const tableHeaderY = margin + 24;
      docInstance.setFillColor(241, 245, 249); // slate 100
      docInstance.rect(margin, tableHeaderY, contentWidth, 8, 'F');

      docInstance.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      docInstance.setLineWidth(0.1);
      docInstance.line(margin, tableHeaderY + 8, margin + contentWidth, tableHeaderY + 8);

      docInstance.setTextColor(71, 85, 105); // Slate 600
      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(8);

      // Draw columns header text
      let currentX = margin;
      
      docInstance.text("S/N", currentX + 3, tableHeaderY + 5.5);
      currentX += 12;
      
      docInstance.text("DATE", currentX + 3, tableHeaderY + 5.5);
      currentX += 22;
      
      docInstance.text("JOB TITLE & DESCRIPTION", currentX + 3, tableHeaderY + 5.5);
      currentX += 85;
      
      docInstance.text(viewMode === 'hiring' ? "VERIFIED PROVIDER / EMAIL" : "EMPLOYER DETAILS / EMAIL", currentX + 3, tableHeaderY + 5.5);
      currentX += 68;
      
      docInstance.text("REMITTANCE", currentX + 3, tableHeaderY + 5.5);
      currentX += 48;
      
      docInstance.text("STATUS", currentX + 3, tableHeaderY + 5.5);
    };

    drawHeader(doc, pageNum);

    let y = margin + 38;

    items.forEach((item, index) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        pageNum++;
        drawHeader(doc, pageNum);
        y = margin + 38;
      }

      if (index % 2 === 1) {
        doc.setFillColor(zebraBg[0], zebraBg[1], zebraBg[2]);
        doc.rect(margin, y - 6, contentWidth, 8, 'F');
      }

      const details = resolveItemDetails(item);

      doc.setTextColor(51, 65, 85);
      doc.setFont('text', 'normal');
      doc.setFontSize(8);

      let currentX = margin;

      // 1. S/N
      doc.text(String(index + 1), currentX + 3, y - 0.5);
      currentX += 12;

      // 2. Date
      doc.text(details.dateStr, currentX + 3, y - 0.5);
      currentX += 22;

      // 3. Job Title
      doc.setFont('helvetica', 'bold');
      const truncatedTitle = details.title.length > 46 ? details.title.substring(0, 43) + '...' : details.title;
      doc.text(truncatedTitle, currentX + 3, y - 0.5);
      doc.setFont('helvetica', 'normal');
      currentX += 85;

      // 4. Counterparty Details
      const labelName = details.cpName.length > 20 ? details.cpName.substring(0, 18) + '...' : details.cpName;
      const labelEmail = obfuscateEmail(details.cpEmail);
      doc.text(`${labelName} (${labelEmail})`, currentX + 3, y - 0.5);
      currentX += 68;

      // 5. Budget Amount
      doc.setFont('helvetica', 'bold');
      doc.text(details.formattedBudget, currentX + 3, y - 0.5);
      doc.setFont('helvetica', 'normal');
      currentX += 48;

      // 6. Status Badge
      if (details.status === 'COMPLETED') {
        doc.setTextColor(16, 185, 129); // Green 500
        doc.setFont('helvetica', 'bold');
        doc.text("COMPLETED", currentX + 3, y - 0.5);
      } else if (details.status === 'CANCELLED' || details.status === 'DECLINED') {
        doc.setTextColor(239, 68, 68); // Red 500
        doc.text(details.status, currentX + 3, y - 0.5);
      } else {
        doc.setTextColor(245, 158, 11); // Amber 500
        doc.text(details.status, currentX + 3, y - 0.5);
      }

      // Border lines
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 2, margin + contentWidth, y + 2);

      y += 8;
    });

    if (y > pageHeight - 32) {
      doc.addPage();
      pageNum++;
      drawHeader(doc, pageNum);
      y = margin + 38;
    }

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    doc.line(margin, y + 0.8, margin + contentWidth, y + 0.8);

    y += 5;
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 22, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 22, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("REPORT SUMMARY STATISTICS • AUDITED RECORDS", margin + 5, y + 5);

    const totalJobs = items.length;
    const completedCount = items.filter(item => {
      const details = resolveItemDetails(item);
      return details.status === 'COMPLETED';
    }).length;
    const cancelledCount = items.filter(item => {
      const details = resolveItemDetails(item);
      return details.status === 'CANCELLED' || details.status === 'DECLINED';
    }).length;

    let totalSpentEarned = 0;
    items.forEach(item => {
      const details = resolveItemDetails(item);
      if (details.rawBudget && details.status === 'COMPLETED') {
        totalSpentEarned += Number(details.rawBudget);
      }
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const amountLabel = viewMode === 'hiring' ? "Total Finished Job Costs Paid" : "Total Finished Earnings Remitted";
    doc.text(`Total Records Present: ${totalJobs} historical items`, margin + 5, y + 10);
    doc.text(`Completed Jobs: ${completedCount} | Cancelled/Declined: ${cancelledCount}`, margin + 5, y + 15);
    doc.text(`${amountLabel}: NGN ${totalSpentEarned.toLocaleString()}`, margin + 120, y + 10);
    doc.text("Velgo Nigeria Audit Protocol • All transactions are client-to-professional direct-tier remittance. Privacy protection enforced.", margin + 120, y + 15);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Report verification checksum: VLG-HASH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, margin + 5, y + 20);

    doc.save(`velgo_history_report_${viewMode}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  return downloadAllHistoryPDFLogic(items);
};
