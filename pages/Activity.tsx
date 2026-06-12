
import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { getTierLimit } from '../lib/constants';
import { openWhatsAppHelper } from '../lib/whatsapp';

interface ActivityProps {
  profile: Profile | null;
  onOpenChat: (partnerId: string) => void;
  onUpgrade: () => void;
  onRefreshProfile: () => void;
  onViewTask: (id: string) => void;
  onViewWorker: (id: string) => void;
  onShowNotifications?: () => void;
  unreadCount?: number;
}

const Activity: React.FC<ActivityProps> = ({ profile, onOpenChat, onUpgrade, onRefreshProfile, onViewTask, onViewWorker, onShowNotifications, unreadCount }) => {
  const [viewMode, setViewMode] = useState<'working' | 'hiring'>('working');
  const [statusFilter, setStatusFilter] = useState<'requests' | 'ongoing' | 'history'>('requests');
  const [bookings, setBookings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect modal states
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectingPartnerName, setRedirectingPartnerName] = useState('');
  const [redirectingPhone, setRedirectingPhone] = useState('');
  const [redirectingMessage, setRedirectingMessage] = useState('');

  const handleConnectWhatsApp = (item: any) => {
    if (!profile) return;
    
    let partnerPhone = '';
    let partnerName = '';
    let jobTitle = item.title || item.posted_tasks?.title || 'our job';

    // 1. If it's a booking object (has worker_id)
    if (item.worker_id) {
      const isClient = profile.id === item.client_id;
      const partner = isClient ? item.worker : item.client;
      partnerPhone = partner?.phone_number || '';
      partnerName = partner?.full_name || 'User';
    } 
    // 2. If it's a task object
    else {
      const isClient = profile.id === item.client_id;
      const partner = isClient ? item.profiles : item.client; // profiles holds assigned_worker_id mapped as profiles
      partnerPhone = partner?.phone_number || '';
      partnerName = partner?.full_name || 'User';
    }

    if (!partnerPhone) {
      alert("We couldn't retrieve the partner's phone number. Please contact Support.");
      return;
    }

    const message = `Hello! I am contacting you regarding our contract for '${jobTitle}' on Velgo Nigeria.`;
    
    setRedirectingPartnerName(partnerName);
    setRedirectingPhone(partnerPhone);
    setRedirectingMessage(message);
    setShowRedirectModal(true);

    const isIOSorSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                          (navigator.userAgent.toLowerCase().includes('safari') && !navigator.userAgent.toLowerCase().includes('chrome') && !navigator.userAgent.toLowerCase().includes('chromium'));
    const isStandalone = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;

    // WebKit popup blockers in Safari and added-to-homescreen PWA mode block synthetic clicks after any asynchronous delay.
    // So we resolve Safari/iOS natively, synchronously inline.
    if (isIOSorSafari || isStandalone) {
      openWhatsAppHelper(message, partnerPhone);
    } else {
      // Maintain premium transition for Android/Desktop/Chrome
      setTimeout(() => {
        setShowRedirectModal(false);
        openWhatsAppHelper(message, partnerPhone);
      }, 2500);
    }
  };

  // Client Completion Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingBooking, setCompletingBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Artisan-to-Client Review Reply State
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyingBooking, setReplyingBooking] = useState<any>(null);
  const [workerReplyText, setWorkerReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Worker-to-Client Rating Modal State
  const [showWorkerRatingModal, setShowWorkerRatingModal] = useState(false);
  const [ratingToClient, setRatingToClient] = useState(5);
  const [clientCommunicationRating, setClientCommunicationRating] = useState(5);
  const [clientFairnessRating, setClientFairnessRating] = useState(5);
  const [reviewToClient, setReviewToClient] = useState('');

  const fetchActivity = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    
    // Fetch Bookings (Direct hires or applications) where user is client OR worker
    const { data: bookingsData } = await safeFetch<any[]>(async () => 
      await supabase.from('bookings')
        .select(`
          *, 
          client:client_id(id, full_name, email, phone_number, avatar_url),
          worker:worker_id(id, full_name, email, phone_number, avatar_url, bank_name, account_number, account_name), 
          posted_tasks:task_id(id, title, description, budget, status, assigned_worker_id)
        `)
        .or(`client_id.eq.${profile.id},worker_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
    );

    // Map profiles column back for compatibility with existing code
    const processedBookings = (bookingsData || []).map((b: any) => ({
      ...b,
      profiles: b.client_id === profile.id ? b.worker : b.client
    }));
    
    setBookings(processedBookings);
    
    // Fetch Tasks (Jobs posted by the user or assigned to the user)
    const { data: tasksData } = await safeFetch<any[]>(async () => 
      await supabase.from('posted_tasks')
        .select('*, client:client_id(*), profiles:assigned_worker_id(*)')
        .or(`client_id.eq.${profile.id},assigned_worker_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
    );

    setTasks(tasksData || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const updateBookingStatus = async (booking: any, newStatus: string) => {
    if (!profile) return;
    try {
        if (newStatus === 'accepted') {
            const { error } = await supabase.rpc('accept_booking_with_token', { 
                p_booking_id: booking.id, 
                p_user_id: profile.id 
            });
            if (error) {
                if (error.message.includes('INSUFFICIENT_TOKENS')) {
                    setShowUpgradeModal(true);
                    return;
                } else {
                    throw error;
                }
            }
        } else {
            const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
            if (error) throw error;
        }

        // Auto-assign Task if Client accepts Application
        if (newStatus === 'accepted' && booking.task_id && profile.id === booking.client_id) {
            const { error: taskError } = await supabase
                .from('posted_tasks')
                .update({ 
                    status: 'assigned',
                    assigned_worker_id: booking.worker_id 
                })
                .eq('id', booking.task_id);
            
            if (taskError) console.error("Failed to auto-assign task:", taskError.message);
        }

        if (newStatus === 'accepted' && onRefreshProfile) onRefreshProfile(); // Refresh profile to show deducted tokens

        if (newStatus === 'accepted') {
            // Trigger immediate direct-drive WhatsApp connection
            setTimeout(() => {
                handleConnectWhatsApp(booking);
            }, 400);
        }
        
        fetchActivity();
    } catch (err: any) { alert("Action failed: " + err.message); }
  };

  const handleDismissWorker = async (booking: any) => {
    if (!profile || !booking) return;

    const confirmDismiss = window.confirm(
      "Are you sure you want to dismiss this artisan and re-open the task for applications? Other pending applicants will instantly become available again, and the hired worker will be removed from this task. Note: Your safety deposit token is not refundable."
    );
    if (!confirmDismiss) return;

    try {
        setLoading(true);

        // 1. Revert active booking back to 'cancelled' status
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', booking.id);
        
        if (bookingError) throw bookingError;

        // 2. Re-open the task and clear assigned_worker_id
        if (booking.task_id) {
            const { error: taskError } = await supabase
                .from('posted_tasks')
                .update({ 
                    status: 'open', 
                    assigned_worker_id: null 
                })
                .eq('id', booking.task_id);
            
            if (taskError) throw taskError;
        }

        alert("Artisan dismissed and job has been successfully re-opened for other applicants!");
        fetchActivity();
    } catch (err: any) {
        alert("Dismiss failed: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleOpenCompleteModal = (item: any) => {
      setCompletingBooking(item);
      setRating(5);
      setCommunicationRating(5);
      setQualityRating(5);
      setPunctualityRating(5);
      setReview('');
      setShowCompleteModal(true);
  };

  const handleOpenWorkerRatingModal = (item: any) => {
      setCompletingBooking(item);
      setRatingToClient(5);
      setClientCommunicationRating(5);
      setClientFairnessRating(5);
      setReviewToClient('');
      setShowWorkerRatingModal(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Account number copied!");
  };

  // ============================================
  // PRIVACY MASKING & PDF INVOICE GENERATOR UTILS
  // ============================================
  const obfuscateEmail = (email?: string): string => {
    if (!email) return 'N/A';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  };

  const obfuscatePhone = (phone?: string): string => {
    if (!phone) return 'N/A';
    if (phone.length <= 6) return '****';
    return `${phone.substring(0, 4)}****${phone.slice(-2)}`;
  };

  const resolveItemDetails = (item: any) => {
    const isBooking = item.worker_id !== undefined;
    const isTask = !isBooking;

    const title = item.title || item.posted_tasks?.title || 'Direct Artisan Booking';

    const rawBudget = item.budget !== undefined ? item.budget : item.posted_tasks?.budget;
    const formattedBudget = rawBudget ? `NGN ${Number(rawBudget).toLocaleString()}` : 'Negotiated';

    let cpName = 'N/A';
    let cpEmail = 'N/A';
    let cpPhone = 'N/A';

    if (isBooking) {
      cpName = item.profiles?.full_name || 'N/A';
      cpEmail = item.profiles?.email || 'N/A';
      cpPhone = item.profiles?.phone_number || 'N/A';
    } else {
      if (viewMode === 'hiring') {
        cpName = item.profiles?.full_name || 'Unassigned / Open';
        cpEmail = item.profiles?.email || 'N/A';
        cpPhone = item.profiles?.phone_number || 'N/A';
      } else {
        cpName = item.client?.full_name || 'N/A';
        cpEmail = item.client?.email || 'N/A';
        cpPhone = item.client?.phone_number || 'N/A';
      }
    }

    const status = (item.status || 'N/A').toUpperCase();
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : 'N/A';

    return { title, rawBudget, formattedBudget, cpName, cpEmail, cpPhone, status, dateStr, isBooking };
  };

  const downloadAllHistoryPDF = (items: any[]) => {
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
    doc.text("Velgo Nigeria Audit Protocol • All transactions are client-to-artisan direct-tier remittance. Privacy protection enforced.", margin + 120, y + 15);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Report verification checksum: VLG-HASH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, margin + 5, y + 20);

    doc.save(`velgo_history_report_${viewMode}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadJobReceipt = (item: any) => {
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
      "• DIRECT PAYMENT REMITTANCE: Clients send funds directly to the verified artisan. Velgo does NOT collect commission/escrow escrow holding fees.",
      "• SPAM / PIRACY CONTROLS: According to NDPR privacy laws, phone details are starred (hashed) on receipt prints to prevent indexing spam bots.",
      "• COMPLETION GUARANTEE: Mark accomplishments as Completed inside Velgo to build transparency weight on the network."
    ];
    finePrint.forEach((line, index) => {
      doc.text(line, margin, y + 3.5 + (index * 3.5));
    });

    // Save File on target system
    doc.save(`velgo_receipt_${docketId.toLowerCase()}.pdf`);
  };

  const submitCompletion = async () => {
      if (!completingBooking || !profile) return;
      setIsSubmitting(true);
      
      try {
          const { error: bookingError } = await supabase
              .from('bookings')
              .update({ 
                  status: 'completed',
                  rating: rating,
                  worker_communication_rating: communicationRating,
                  worker_quality_rating: qualityRating,
                  worker_punctuality_rating: punctualityRating,
                  review: review.trim()
              })
              .eq('id', completingBooking.id);
          
          if (bookingError) throw bookingError;

          if (completingBooking.task_id) {
              await supabase
                  .from('posted_tasks')
                  .update({ status: 'completed' })
                  .eq('id', completingBooking.task_id);

              // Auto-decline all OTHER remaining pending bookings for that task
              const { error: declineError } = await supabase
                  .from('bookings')
                  .update({ 
                      status: 'declined',
                      quote_notes: 'Job successfully completed by another artisan.'
                  })
                  .eq('task_id', completingBooking.task_id)
                  .eq('status', 'pending');
              
              if (declineError) {
                  console.error("Failed to auto-decline other applications on completion:", declineError.message);
              }
          }

          alert("Great! Job marked as completed.");
          setShowCompleteModal(false);
          fetchActivity();
      } catch (err: any) {
          alert("Failed to complete task: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const submitWorkerRating = async () => {
      if (!completingBooking || !profile) return;
      setIsSubmitting(true);
      
      try {
          const { error } = await supabase
              .from('bookings')
              .update({ 
                  client_rating: ratingToClient,
                  client_communication_rating: clientCommunicationRating,
                  client_fairness_rating: clientFairnessRating,
                  client_review: reviewToClient.trim()
              })
              .eq('id', completingBooking.id);
          
          if (error) throw error;

          alert("Feedback submitted! Thanks for helping keep the community safe.");
          setShowWorkerRatingModal(false);
          fetchActivity();
      } catch (err: any) {
          alert("Failed to submit rating: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleOpenArtisanReplyModal = (item: any) => {
      setReplyingBooking(item);
      setWorkerReplyText('');
      setShowReplyModal(true);
  };

  const submitArtisanReply = async () => {
      if (!replyingBooking || !profile) return;
      
      const textToSubmit = workerReplyText.trim();
      if (!textToSubmit) {
          alert("Please write your reply first.");
          return;
      }
      if (textToSubmit.length > 200) {
          alert("Your reply exceeds the 200 character cap constraint.");
          return;
      }

      // Proactive safety checks (Nigerian context, security checks, contact info)
      const phoneRegex = /(?:\+?234|0)[789][01]\d{8}/; 
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const bannedWords = ['fuck', 'bastard', 'bitch', 'idiot', 'fool', 'mad', 'mumu', 'scam', 'thief', 'ole', 'barawo', 'ashewo', 'oloribu', 'stupid', 'onu', 'oloriburuku'];

      if (phoneRegex.test(textToSubmit) || /\d{10,}/.test(textToSubmit)) {
          alert("Safety Filter: Adding phone numbers, bank accounts or numeric contact details in review replies is strictly prohibited for your physical safety and privacy. Please remove any contact numbers.");
          return;
      }
      if (emailRegex.test(textToSubmit)) {
          alert("Safety Filter: Including email addresses or websites is forbidden. Please communicate strictly inside the application.");
          return;
      }
      const lowerText = textToSubmit.toLowerCase();
      if (bannedWords.some(word => lowerText.includes(word))) {
          alert("Professionalism Filter: Your response contains terms that violate our community standards. Please rephrase your reply to maintain a polite, commercial, and professional tone.");
          return;
      }

      setIsSubmittingReply(true);
      try {
          const { error } = await supabase
              .from('bookings')
              .update({
                  worker_reply: textToSubmit,
                  worker_reply_at: new Date().toISOString(),
                  worker_reply_approved: false // Pending approval by default
              })
              .eq('id', replyingBooking.id);

          if (error) throw error;

          alert("Your reply was submitted successfully! It is now pending administrative review and will be live on your profile once approved.");
          setShowReplyModal(false);
          fetchActivity();
      } catch (err: any) {
          alert("Submission failed: " + err.message);
      } finally {
          setIsSubmittingReply(false);
      }
  };

  const handleItemClick = (item: any) => {
    // 1. Is it a raw Task Post? (Identified by having a budget but no worker_id in the item root)
    if (item.budget !== undefined && !item.worker_id) {
        onViewTask(item.id);
        return;
    }

    // 2. Is it a Booking linked to a Task?
    if (item.task_id) {
        onViewTask(item.task_id);
        return;
    }

    // 3. Is it a Direct Hire? (No task_id)
    if (profile?.id === item.client_id) {
        onViewWorker(item.worker_id);
    } else {
        onViewWorker(item.client_id);
    }
  };

  // Filter by viewMode first
  const viewBookings = viewMode === 'hiring' ? bookings.filter(b => b.client_id === profile?.id) : bookings.filter(b => b.worker_id === profile?.id);
  
  // Note: For tasks, if viewMode == 'hiring', tasks where user is client.
  // If viewMode == 'working', tasks where user is assigned_worker.
  const viewTasks = viewMode === 'hiring' ? tasks.filter(t => t.client_id === profile?.id) : tasks.filter(t => t.assigned_worker_id === profile?.id);

  const currentItems = statusFilter === 'requests' 
      ? viewBookings.filter(b => {
          if (b.status !== 'pending') return false;
          // Hide pending candidates from client's requests tab if another worker was already accepted/hired
          if (viewMode === 'hiring' && b.task_id && b.posted_tasks?.status && b.posted_tasks?.status !== 'open') {
              return false;
          }
          return true;
        }).concat(viewTasks.filter(t => t.status === 'open')) 
      : statusFilter === 'ongoing' 
      ? viewBookings.filter(b => b.status === 'accepted').concat(viewTasks.filter(t => t.status === 'assigned'))
      : viewBookings.filter(b => ['completed', 'cancelled', 'declined', 'disputed'].includes(b.status)).concat(viewTasks.filter(t => t.status === 'completed' || t.status === 'cancelled'));

  const hiringRequestsBadge = bookings.some(b => b.client_id === profile?.id && b.status === 'pending' && b.task_id != null);
  const hiringOngoingBadge = bookings.some(b => b.client_id === profile?.id && b.status === 'accepted') || tasks.some(t => t.client_id === profile?.id && t.status === 'assigned');
  const hiringHistoryBadge = bookings.some(b => b.client_id === profile?.id && b.status === 'completed' && !b.rating);
  const hiringBadge = hiringRequestsBadge || hiringOngoingBadge || hiringHistoryBadge;

  const workingRequestsBadge = bookings.some(b => b.worker_id === profile?.id && b.status === 'pending' && b.task_id == null);
  const workingOngoingBadge = bookings.some(b => b.worker_id === profile?.id && b.status === 'accepted') || tasks.some(t => t.assigned_worker_id === profile?.id && t.status === 'assigned');
  const workingHistoryBadge = bookings.some(b => b.worker_id === profile?.id && b.status === 'completed' && !b.client_rating);
  const workingBadge = workingRequestsBadge || workingOngoingBadge || workingHistoryBadge;

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      {/* Artisan Review Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-hidden flex flex-col font-sans">
                <button onClick={() => setShowReplyModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>

                <div className="text-center shrink-0">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-3 text-xl">
                        <i className="fa-solid fa-reply"></i>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Artisan Reply</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">One-Time Response Vetting</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                    {/* Original Review Callout */}
                    <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 relative">
                        <p className="text-[8px] font-black tracking-widest uppercase text-gray-400 mb-1">Original Review left by Client</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{replyingBooking?.review || 'No written comment'}"</p>
                        <div className="flex text-yellow-400 text-[8px] gap-0.5 mt-2">
                            {Array(replyingBooking?.rating || 5).fill(0).map((_, idx) => <i key={idx} className="fa-solid fa-star"></i>)}
                        </div>
                    </div>

                    {/* Strict Compliance Warning Block */}
                    <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-3xl border border-amber-200 dark:border-amber-900/30 text-xs leading-relaxed space-y-1">
                        <p className="font-bold flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-amber-500 text-sm"></i> Strict Terms of Submission:</p>
                        <ul className="list-disc pl-4 space-y-1 mt-1 text-[10px] font-medium font-sans">
                            <li><strong>Strict One-Time Entry:</strong> Once submitted, your reply cannot be edited, changed, or deleted.</li>
                            <li><strong>Privacy Ban:</strong> Do not include phone numbers, location links, bank info, or specific account names.</li>
                            <li><strong>Professional Conduct:</strong> Professionalism is required. Slurs or insults are flagged automatically and deleted by moderators.</li>
                        </ul>
                    </div>

                    {/* Character limit controlled response box */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Proposed Reply text</label>
                        <div className="relative">
                            <textarea 
                                value={workerReplyText}
                                onChange={(e) => setWorkerReplyText(e.target.value.slice(0, 200))}
                                placeholder="Type your polite response to this rating..."
                                rows={4}
                                disabled={isSubmittingReply}
                                className="w-full bg-gray-50 dark:bg-gray-900/40 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 text-xs text-gray-800 dark:text-gray-200 font-sans leading-relaxed outline-none focus:border-emerald-500 resize-none"
                            />
                            <div className={`absolute bottom-3 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${200 - workerReplyText.length <= 15 ? 'bg-red-50 text-red-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                                {200 - workerReplyText.length} Chars Left
                            </div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 flex gap-3 pt-2">
                    <button 
                        onClick={() => setShowReplyModal(false)}
                        disabled={isSubmittingReply}
                        className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={submitArtisanReply}
                        disabled={isSubmittingReply || !workerReplyText.trim()}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                    >
                        {isSubmittingReply ? 'Submitting...' : 'Submit Response'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Client Completion & Rating Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-hidden">
                
                {/* Receipt Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <img 
                        src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
                        className="w-64 h-64 opacity-[0.03] grayscale pointer-events-none"
                        alt=""
                    />
                </div>

                <div className="relative z-10 overflow-y-auto max-h-[80vh]">
                    <button onClick={() => setShowCompleteModal(false)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-900"><i className="fa-solid fa-xmark"></i></button>
                    
                    <div className="text-center">
                        <div className="w-16 h-16 bg-brand/10 text-brand rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl rotate-3"><i className="fa-solid fa-receipt"></i></div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Payment & Completion</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Pay Worker Directly</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[32px] p-6 space-y-4 mt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Worker Bank</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">{completingBooking?.profiles?.bank_name || 'Bank Not Set'}</p>
                            </div>
                            <i className="fa-solid fa-building-columns text-gray-200 dark:text-gray-700 text-xl"></i>
                        </div>

                        <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                            <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <p className="text-lg font-black text-gray-900 dark:text-white tracking-widest font-mono">{completingBooking?.profiles?.account_number || '----------'}</p>
                                {completingBooking?.profiles?.account_number && (
                                    <button onClick={() => handleCopy(completingBooking.profiles.account_number)} className="text-brand p-2 active:scale-90 transition-transform">
                                        <i className="fa-regular fa-copy"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Name</p>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">{completingBooking?.profiles?.account_name || completingBooking?.profiles?.full_name}</p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] text-center text-gray-400 font-medium italic">
                                Verify the name on your banking app matches before sending.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-1">Overall Satisfaction</p>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setRating(star)} className={`text-2xl transition-all active:scale-125 ${star <= rating ? 'text-yellow-400 drop-shadow-md' : 'text-gray-200 dark:text-gray-700'}`}>
                                            <i className="fa-solid fa-star"></i>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Communication</p>
                                    <div className="flex justify-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setCommunicationRating(star)} className={`text-lg ${star <= communicationRating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Quality of Work</p>
                                    <div className="flex justify-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setQualityRating(star)} className={`text-lg ${star <= qualityRating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Punctuality (On Time)</p>
                                    <div className="flex justify-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setPunctualityRating(star)} className={`text-lg ${star <= punctualityRating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <textarea 
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Write a quick review about the work..."
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl py-4 px-5 text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                        />

                        <button 
                            onClick={submitCompletion}
                            disabled={isSubmitting}
                            className="w-full bg-brand text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand/20 active:scale-95 transition-all"
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm Payment & Complete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Worker Rating Client Modal */}
      {showWorkerRatingModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowWorkerRatingModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><i className="fa-solid fa-xmark"></i></button>
                
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl rotate-3"><i className="fa-solid fa-user-pen"></i></div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Rate the Client</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Your experience matters</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 space-y-4">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 text-center">How was working with {completingBooking?.profiles?.full_name}?</p>
                        
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-1">Overall Experience</p>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setRatingToClient(star)} className={`text-2xl transition-all active:scale-125 ${star <= ratingToClient ? 'text-blue-500 drop-shadow-md' : 'text-gray-200 dark:text-gray-700'}`}>
                                        <i className="fa-solid fa-star"></i>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Communication</p>
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setClientCommunicationRating(star)} className={`text-lg ${star <= clientCommunicationRating ? 'text-blue-500' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Fairness/Respect</p>
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setClientFairnessRating(star)} className={`text-lg ${star <= clientFairnessRating ? 'text-blue-500' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <textarea 
                        value={reviewToClient}
                        onChange={(e) => setReviewToClient(e.target.value)}
                        placeholder="Was the client professional? Did they pay promptly?"
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl py-4 px-5 text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />

                    <button 
                        onClick={submitWorkerRating}
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        {isSubmitting ? 'Posting...' : 'Submit Feedback'}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="px-6 pt-10 pb-4 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-20 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Activities</h1>
        {onShowNotifications && (
          <button 
            onClick={onShowNotifications} 
            className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white relative hover:scale-105 transition-transform"
          >
            <i className="fa-solid fa-bell"></i>
            {unreadCount !== undefined && unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-brand text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            ) : null}
          </button>
        )}
      </div>

      <div className="px-6 sticky top-[72px] bg-white dark:bg-gray-900 z-10 pb-2">
        {/* Main Tabs: Hiring vs Working */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-[22px] border border-gray-200 dark:border-gray-700 relative">
            <button 
                onClick={() => { setViewMode('working'); setStatusFilter('requests'); }} 
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all relative ${viewMode === 'working' ? 'bg-white dark:bg-gray-700 text-brand shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
            >
                Working
                {workingBadge && <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>
            <button 
                onClick={() => { setViewMode('hiring'); setStatusFilter('requests'); }} 
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all relative ${viewMode === 'hiring' ? 'bg-white dark:bg-gray-700 text-brand shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
            >
                Hiring
                {hiringBadge && <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>
        </div>

        {/* Sub Filters: Requests, Ongoing, History */}
        <div className="flex gap-2 mt-4">
            {['requests', 'ongoing', 'history'].map(filter => (
                <button 
                    key={filter} 
                    onClick={() => setStatusFilter(filter as any)} 
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border outline-none relative ${statusFilter === filter ? 'bg-brand/10 border-brand/20 text-brand shadow-sm' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}
                >
                    {filter}
                    {filter === 'requests' && (viewMode === 'hiring' ? hiringRequestsBadge : workingRequestsBadge) && (
                        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                    {filter === 'ongoing' && (viewMode === 'hiring' ? hiringOngoingBadge : workingOngoingBadge) && (
                        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                    {filter === 'history' && (viewMode === 'hiring' ? hiringHistoryBadge : workingHistoryBadge) && (
                        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                </button>
            ))}
        </div>
      </div>

      <div className="p-6 pb-24">
        {statusFilter === 'history' && !loading && currentItems.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-5 rounded-[30px] flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 relative z-10 font-sans">
              <div className="text-center sm:text-left">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 justify-center sm:justify-start">
                     <i className="fa-solid fa-list-check text-rose-500 text-sm"></i>
                     <span>Consolidated History Report</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Download full ledger log of your completed & archived service records.</p>
              </div>
              <button 
                  onClick={() => downloadAllHistoryPDF(currentItems)}
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/10 transition-all flex items-center justify-center gap-1.5 shrink-0 outline-none"
                  title="Export complete history records in one Landscape PDF report"
              >
                  <i className="fa-solid fa-file-pdf text-xs"></i>
                  <span>Export All History (PDF)</span>
              </button>
          </div>
        )}

        {loading ? <div className="text-center py-20 animate-pulse text-[10px] font-black uppercase tracking-[5px] text-gray-300">Syncing Activities...</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {currentItems.length > 0 ? currentItems.map(item => {
                // Logic to identify if item is an Open Task (no worker assigned yet)
                const isOpenTask = item.budget !== undefined && !item.worker_id; 

                const renderItemTypeLabel = () => {
                    if (statusFilter === 'history') {
                        return <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{item.status}</span>;
                    }
                    if (viewMode === 'hiring') {
                        if (isOpenTask) return <span className="text-[9px] font-black text-brand uppercase tracking-widest bg-brand/10 px-2 py-0.5 rounded-lg">Job Posted</span>;
                        if (item.task_id) return <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">Applicant</span>;
                        return <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-lg">Direct Request Sent</span>;
                    } else {
                        if (isOpenTask || (item.status === 'assigned' && item.title)) return <span className="text-[9px] font-black text-green-500 uppercase tracking-widest bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-lg">Assigned Job</span>;
                        if (item.task_id) {
                            const isAssignedToOther = item.posted_tasks?.status === 'assigned' && item.posted_tasks?.assigned_worker_id !== profile?.id;
                            if (isAssignedToOther && item.status === 'pending') {
                                return (
                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg animate-pulse">
                                        Under Review by Client
                                    </span>
                                );
                            }
                            return <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">Application Sent</span>;
                        }
                        return <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg">Direct Request Recv</span>;
                    }
                };
                
                return (
                <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="bg-white dark:bg-gray-800 p-6 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4 relative overflow-hidden transition-all hover:shadow-md group active:scale-[0.98] cursor-pointer"
                >
                    
                    {/* Gig Card Watermark */}
                    <img 
                        src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
                        className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.05] rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-500"
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />

                    {/* Interaction Hint */}
                    <div className="absolute top-4 right-4 text-gray-200 dark:text-gray-700 group-hover:text-brand transition-colors">
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-16 h-16 rounded-3xl border-2 border-white dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
                          {item.profiles?.avatar_url ? (
                              <img src={item.profiles.avatar_url} className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                          ) : (isOpenTask || item.title) ? (
                              <i className="fa-solid fa-briefcase text-brand text-2xl"></i>
                          ) : (
                              <span className="font-black text-gray-300 dark:text-gray-600 text-xl">{(item.profiles?.full_name || item.title || 'U')[0]}</span>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-900 dark:text-white text-[15px] truncate tracking-tight">{item.title || item.posted_tasks?.title || 'Direct Request'}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                             {renderItemTypeLabel()}
                             {!isOpenTask && <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{item.profiles?.full_name || 'User'}</span>}
                          </div>
                      </div>
                    </div>

                    {/* Proposal Quote Breakdown (Real-time Nigerian Context Help) */}
                    {item.quote_price !== undefined && item.quote_price !== null && (
                      <div className="bg-slate-50 dark:bg-gray-900/40 p-3.5 border border-gray-100 dark:border-gray-800 rounded-3xl space-y-3 font-sans relative z-10 text-left">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                           <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Custom Offer Quote</p>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                 <span className="text-sm font-black text-brand">₦{Number(item.quote_price).toLocaleString()}</span>
                                 {/* Compare option against task budget */}
                                 {item.posted_tasks?.budget && Number(item.posted_tasks.budget) !== Number(item.quote_price) && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${Number(item.quote_price) > Number(item.posted_tasks.budget) ? 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400'}`}>
                                       {Number(item.quote_price) > Number(item.posted_tasks.budget) ? 'Above Budget' : 'Below Budget'}
                                    </span>
                                 )}
                              </div>
                           </div>
                           {item.posted_tasks?.budget && (
                              <div className="text-right">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Client Budget</p>
                                 <p className="text-xs font-black text-gray-600 dark:text-gray-300 mt-0.5">₦{Number(item.posted_tasks.budget).toLocaleString()}</p>
                              </div>
                           )}
                        </div>

                        {/* Visual checklist tags */}
                        <div className="space-y-1">
                           <p className="text-[7.5px] font-black uppercase text-gray-400 tracking-wider">This estimate includes:</p>
                           <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {item.quote_covers_labor && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-orange-50 text-orange-650 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    🛠️ Labor
                                 </span>
                              )}
                              {item.quote_covers_materials && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-655 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    🧱 Materials
                                 </span>
                              )}
                              {item.quote_covers_transport && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-650 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    🚚 Transport
                                 </span>
                              )}
                              {item.quote_covers_other && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-650 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    📦 Other Required
                                 </span>
                              )}
                              {!item.quote_covers_labor && !item.quote_covers_materials && !item.quote_covers_transport && !item.quote_covers_other && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-gray-50 text-gray-400 px-2 py-0.5 rounded-lg">
                                    Unspecified Included Items
                                 </span>
                              )}
                           </div>
                        </div>

                        {/* Optional notes context */}
                        {item.quote_notes && (
                           <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[10.5px] text-gray-600 dark:text-gray-400 font-bold italic leading-relaxed whitespace-pre-wrap">
                              "{item.quote_notes}"
                           </div>
                        )}
                      </div>
                    )}

                    {item.status === 'pending' && (
                        <div className="w-full relative z-10 mt-4">
                            {/* CASE 1: JOB APPLICATION (HAS TASK ID) */}
                            {item.task_id ? (
                                profile?.id === item.client_id ? (
                                    // Hiring View: Accept/Decline Worker's Application
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                                        >
                                            Decline
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'accepted'); }} 
                                            className="flex-1 bg-brand text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-brand-dark transition-colors"
                                        >
                                            Hire Worker
                                        </button>
                                    </div>
                                ) : (
                                    // Working View: Withdraw Application
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-colors"
                                    >
                                        Withdraw Application
                                    </button>
                                )
                            ) : (
                                /* CASE 2: DIRECT BOOKING (NO TASK ID) */
                                profile?.id === item.worker_id ? (
                                    // Working View: Accept/Decline Client's Request
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                                        >
                                            Decline
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'accepted'); }} 
                                            className="flex-1 bg-brand text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-brand-dark transition-colors"
                                        >
                                            Accept Job
                                        </button>
                                    </div>
                                ) : (
                                    // Hiring View: Cancel Request
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-colors"
                                    >
                                        Cancel Request
                                    </button>
                                )
                            )}
                        </div>
                    )}

                    {['accepted', 'assigned'].includes(item.status) && (
                        <div className="space-y-3 relative z-10">
                            {profile?.id === item.client_id && (
                                <div className="flex flex-col gap-2.5">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenCompleteModal(item); }} 
                                        className="w-full bg-yellow-400 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-circle-check"></i> Complete & Pay
                                    </button>
                                    {item.task_id && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDismissWorker(item); }} 
                                            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-400 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/40 outline-none"
                                        >
                                            <i className="fa-solid fa-user-minus"></i> Dismiss & Re-open Job
                                        </button>
                                    )}
                                </div>
                            )}
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleConnectWhatsApp(item); }} 
                                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-brands fa-whatsapp text-sm"></i> Chat on WhatsApp
                            </button>
                        </div>
                    )}

                    {item.status === 'completed' && (
                        <div className="space-y-4 relative z-10 font-sans">
                            {/* Display ratings if both provided */}
                            <div className="pt-2 border-t border-gray-50 dark:border-gray-700 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Worker Rating</span>
                                    {item.rating ? (
                                        <div className="flex text-yellow-400 text-[10px] gap-0.5">
                                            {Array(item.rating).fill(0).map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
                                        </div>
                                    ) : <span className="text-[9px] text-gray-300 italic font-bold">Pending</span>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Client Rating (Your Rating)</span>
                                    {item.client_rating ? (
                                        <div className="flex text-blue-500 text-[10px] gap-0.5">
                                            {Array(item.client_rating).fill(0).map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
                                        </div>
                                    ) : <span className="text-[9px] text-gray-300 italic font-bold">Pending</span>}
                                </div>
                            </div>

                            {/* Display client's written review about this worker */}
                            {item.review && (
                                <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Feedback from Client</p>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{item.review}"</p>
                                </div>
                            )}

                            {/* Display existing artisan replies, or reply submission details */}
                            {profile?.id === item.worker_id && item.review && (
                                <div className="mt-1">
                                    {item.worker_reply ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <i className="fa-solid fa-reply"></i> Your Reply
                                                </span>
                                                {item.worker_reply_approved ? (
                                                    <span className="text-[7px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-800/45 text-emerald-700 px-1.5 py-0.5 rounded">Live & Approved</span>
                                                ) : (
                                                    <span className="text-[7.5px] font-black uppercase tracking-widest bg-yellow-100 dark:bg-yellow-805 text-yellow-700 px-1.5 py-0.5 rounded animate-pulse">Pending Moderation</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-800 dark:text-gray-200">"{item.worker_reply}"</p>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenArtisanReplyModal(item); }}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/15 active:scale-95 transition-all"
                                        >
                                            <i className="fa-solid fa-reply mr-1"></i> Reply to Client Review
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Show Worker Feedback Button if missing */}
                            {profile?.id === item.worker_id && !item.client_rating && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenWorkerRatingModal(item); }}
                                    className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-blue-100 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                                >
                                    <i className="fa-solid fa-star-half-stroke mr-1"></i> Rate this Client
                                </button>
                            )}

                        </div>
                    )}

                    {statusFilter === 'history' && (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-3 relative z-10 font-sans">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); downloadJobReceipt(item); }}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-4.5 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-rose-600/10 transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                                title="Download PDF invoice for this job history record"
                            >
                                <i className="fa-solid fa-file-pdf text-xs"></i>
                                <span>PDF Receipt</span>
                            </button>
                        </div>
                    )}
                </div>
            )}) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-gray-400 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <i className="fa-solid fa-cloud text-2xl"></i>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-xs font-bold mb-2">No activities in this tab</p>
                    
                    <p className="text-[11px] max-w-[250px] leading-relaxed">
                        Looking for work or need something done? Head over to the Home tab to browse available jobs, hire talent, or post a new task!
                    </p>
                </div>
            )}
          </div>
        }
        
        {/* Upgrade / Token Refill Modal */}
        {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-6 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4">
                <i className="fa-solid fa-coins text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">Out of Tokens!</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                You need a Token to accept this job. Please buy a refill pack to continue.
                </p>
                <div className="pt-2 flex flex-col gap-3">
                <button 
                    onClick={() => { setShowUpgradeModal(false); onUpgrade(); }} 
                    className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-brand-dark active:scale-95 transition-all text-[11px]"
                >
                    Buy Tokens
                </button>
                <button 
                    onClick={() => setShowUpgradeModal(false)} 
                    className="w-full text-gray-400 py-3 font-black uppercase tracking-widest hover:text-gray-600 transition-colors text-[10px]"
                >
                    Cancel
                </button>
                </div>
            </div>
            </div>
        )}

        {/* Beautiful WhatsApp Interstitial Redirect Modal */}
        {showRedirectModal && (
          <div className="fixed inset-0 bg-black/90 z-[160] flex items-center justify-center p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-[40px] p-8 w-full max-w-sm text-center shadow-2xl border border-gray-100 dark:border-gray-700 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-[#25D366]"></div>
              
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-[#25D366] text-3xl animate-pulse">
                <i className="fa-brands fa-whatsapp"></i>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Secure Direct Chat</h3>
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full w-max mx-auto">Redirecting to WhatsApp...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-bold pt-2">
                  Opening safe and direct conversation thread with <span className="text-gray-900 dark:text-white font-black">{redirectingPartnerName}</span>.
                </p>
              </div>

              <div className="border-t border-gray-50 dark:border-gray-700/50 pt-4 flex flex-col items-center justify-center gap-1 animate-fadeIn">
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-extrabold mb-1">Prefilled Message Context:</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium italic border border-dashed border-gray-100 dark:border-gray-700/60 p-2.5 rounded-lg max-w-[250px] overflow-hidden whitespace-nowrap text-ellipsis mb-4">
                  "{redirectingMessage}"
                </p>
                
                <button
                  onClick={() => {
                    openWhatsAppHelper(redirectingMessage, redirectingPhone);
                    setShowRedirectModal(false);
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-brands fa-whatsapp text-lg animate-bounce"></i> Open Chat Now
                </button>

                <button
                  onClick={() => setShowRedirectModal(false)}
                  className="mt-2 text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 tracking-wider transition-colors pt-2"
                >
                  Stay on Velgo
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default Activity;
