import { jsPDF } from 'jspdf';
import { Profile } from '../../lib/types';

export const downloadUsersCSV = (users: Profile[]) => {
  const downloadUsersCSVLogic = () => {
      if (!users || users.length === 0) {
          alert("No user records to download.");
          return;
      }

      // Column Headers
      const headers = [
          'ID',
          'Full Name',
          'Email',
          'Phone Number',
          'Role',
          'Address',
          'State',
          'LGA',
          'Verification Status',
          'ID Card URL',
          'Subscription Tier',
          'Tokens Balance',
          'Profile Score',
          'Created At'
      ];

      // Format Rows
      const rows = users.map(u => [
          u.id || '',
          u.full_name || '',
          u.email || '',
          u.phone_number || '',
          u.role || '',
          u.address || '',
          u.state || '',
          u.lga || '',
          u.is_verified ? 'Verified' : 'Unverified',
          u.nin_image_url || '',
          u.subscription_tier || 'basic',
          u.tokens ?? 0,
          u.profile_score ?? 0,
          u.updated_at || ''
      ]);

      // Utility to escape quotes and commas
      const escapeValue = (val: any) => {
          const stringified = String(val).replace(/"/g, '""');
          if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n') || stringified.includes('\r')) {
              return `"${stringified}"`;
          }
          return stringified;
      };

      const csvContent = [
          headers.map(escapeValue).join(','),
          ...rows.map(row => row.map(escapeValue).join(','))
      ].join('\n');

      // Generate blob with UTF-8 BOM so Excel opens it with the correct encoding automatically
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `velgo_users_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };
  return downloadUsersCSVLogic();
};

export const downloadUsersPDF = (users: Profile[]) => {
  const downloadUsersPDFLogic = () => {
      if (!users || users.length === 0) {
          alert("No user records to export.");
          return;
      }

      // Initialize jsPDF in Landscape mode, A4 size
      const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2); // 267

      // Professional Palette matching Slate/Corporate style
      const brandPrimary = [15, 23, 42]; // Slate 900
      const textGray = [100, 116, 139]; // Slate 500
      const zebraBg = [248, 250, 252]; // Slate 50
      
      let pageNum = 1;

      // Draw reusable page header and table header
      const drawHeader = (docInstance: any, page: number) => {
          // Top solid header banner
          docInstance.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
          docInstance.rect(margin, margin, contentWidth, 18, 'F');

          // Left titles
          docInstance.setTextColor(255, 255, 255);
          docInstance.setFont('helvetica', 'bold');
          docInstance.setFontSize(14);
          docInstance.text("VELGO NIGERIA", margin + 6, margin + 11);
          
          docInstance.setFont('helvetica', 'normal');
          docInstance.setFontSize(9);
          docInstance.text("ADMINISTRATIVE USER DIRECTORY & RECORDS AUDIT", margin + 6, margin + 18 - 3);

          // Right metadata
          docInstance.setFontSize(8);
          docInstance.setTextColor(203, 213, 225); // Slate 300
          const dateStr = new Date().toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC';
          docInstance.text(`Generated: ${dateStr}`, margin + contentWidth - 6, margin + 9, { align: 'right' });
          docInstance.text(`Total Records: ${users.length} | Page ${page}`, margin + contentWidth - 6, margin + 14, { align: 'right' });

          // Table column header background
          const tableHeaderY = margin + 24;
          docInstance.setFillColor(241, 245, 249); // slate 100
          docInstance.rect(margin, tableHeaderY, contentWidth, 8, 'F');
          
          docInstance.setDrawColor(226, 232, 240); // border
          docInstance.setLineWidth(0.1);
          docInstance.line(margin, tableHeaderY + 8, margin + contentWidth, tableHeaderY + 8);

          docInstance.setTextColor(71, 85, 105); // text slate 600
          docInstance.setFont('helvetica', 'bold');
          docInstance.setFontSize(8);

          // Headers mapping
          let currentX = margin;
          
          docInstance.text("S/N", currentX + 3, tableHeaderY + 5.5);
          currentX += 12;
          
          docInstance.text("FULL NAME", currentX + 3, tableHeaderY + 5.5);
          currentX += 50;
          
          docInstance.text("EMAIL ADDRESS", currentX + 3, tableHeaderY + 5.5);
          currentX += 60;
          
          docInstance.text("PHONE", currentX + 3, tableHeaderY + 5.5);
          currentX += 38;
          
          docInstance.text("ROLE", currentX + 3, tableHeaderY + 5.5);
          currentX += 22;
          
          docInstance.text("STATE & LGA", currentX + 3, tableHeaderY + 5.5);
          currentX += 55;
          
          docInstance.text("STATUS", currentX + 3, tableHeaderY + 5.5);
      };

      // Draw first page header
      drawHeader(doc, pageNum);

      let y = margin + 38; // Initial row printing height

      users.forEach((u, index) => {
          // Check for vertical page overflow (Landscape A4 is 210mm high)
          if (y > pageHeight - 15) {
              doc.addPage();
              pageNum++;
              drawHeader(doc, pageNum);
              y = margin + 38;
          }

          // Alternating zebra row backgrounds
          if (index % 2 === 1) {
              doc.setFillColor(zebraBg[0], zebraBg[1], zebraBg[2]);
              doc.rect(margin, y - 6, contentWidth, 8, 'F');
          }

          // Row font & size
          doc.setTextColor(51, 65, 85); // Slate 700
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          let currentX = margin;

          // 1. Serial Number
          doc.text(String(index + 1), currentX + 3, y - 0.5);
          currentX += 12;

          // 2. Full Name (with safety limit string truncation)
          const name = u.full_name || 'N/A';
          doc.setFont('helvetica', 'bold');
          doc.text(name.length > 25 ? name.substring(0, 23) + '...' : name, currentX + 3, y - 0.5);
          doc.setFont('helvetica', 'normal');
          currentX += 50;

          // 3. Email Address
          const email = u.email || 'N/A';
          doc.text(email.length > 32 ? email.substring(0, 30) + '...' : email, currentX + 3, y - 0.5);
          currentX += 60;

          // 4. Phone Number
          const phone = u.phone_number || 'N/A';
          doc.text(phone, currentX + 3, y - 0.5);
          currentX += 38;

          // 5. Role
          const role = (u.role || 'client').toUpperCase();
          if (role === 'ADMIN') {
              doc.setTextColor(147, 51, 234); // Purple
              doc.setFont('helvetica', 'bold');
          } else if (role === 'WORKER') {
              doc.setTextColor(13, 148, 136); // Teal
          } else {
              doc.setTextColor(59, 130, 246); // Blue
          }
          doc.text(role, currentX + 3, y - 0.5);
          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'normal');
          currentX += 22;

          // 6. Location (State & LGA)
          const location = `${u.state || 'N/A'}, ${u.lga || 'N/A'}`;
          doc.text(location.length > 28 ? location.substring(0, 26) + '...' : location, currentX + 3, y - 0.5);
          currentX += 55;

          // 7. Verification Status
          const isVerified = !!u.is_verified;
          if (isVerified) {
              doc.setTextColor(16, 185, 129); // Green 500
              doc.setFont('helvetica', 'bold');
              doc.text("VERIFIED", currentX + 3, y - 0.5);
          } else {
              doc.setTextColor(148, 163, 184); // Slate 400
              doc.text("UNVERIFIED", currentX + 3, y - 0.5);
          }

          // Post row horizontal border spacer
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.1);
          doc.line(margin, y + 2, margin + contentWidth, y + 2);

          y += 8; // Advance layout pointer
      });

      // Verify page placement space for stats footer
      if (y > pageHeight - 25) {
          doc.addPage();
          pageNum++;
          drawHeader(doc, pageNum);
          y = margin + 38;
      }

      // Close data table
      doc.setDrawColor(15, 23, 42); // deep slate
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + contentWidth, y);
      doc.line(margin, y + 0.8, margin + contentWidth, y + 0.8);

      // Auditing summary block
      y += 6;
      doc.setFillColor(248, 250, 252); // slate 50
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 18, 'S');

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("REPORT SUMMARY STATISTICS", margin + 5, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const totalWorkers = users.filter(u => u.category).length;
      const totalClients = users.filter(u => !u.category).length;
      const totalVerified = users.filter(u => u.is_verified).length;

      doc.text(`Total Registered Workers: ${totalWorkers}`, margin + 5, y + 10);
      doc.text(`Total Registered Clients/Consumers: ${totalClients}`, margin + 100, y + 10);
      doc.text(`Biometrics/NIN Verified Users: ${totalVerified}`, margin + 200, y + 10);
      doc.text("Velgo Nigeria Registry Database • Security & Integrity Verified.", margin + 5, y + 15);

      // Trigger standard local file download
      doc.save(`velgo_users_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  return downloadUsersPDFLogic();
};
export const downloadStatsPDF = (stats: any) => {
      const handleDownloadPdfLogic = () => {
        if (!stats) return;
        
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(15, 23, 42); // slate-900 background for a sleek header card
        doc.rect(10, 10, 190, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("VELGO NIGERIA compliance desk", 15, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(200, 200, 200);
        doc.text(`PLATFORM AUDIT & METRICS REPORT • GENERATED ON: ${new Date().toLocaleString()}`, 15, 28);
        
        // Section 1: Core User Stats
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("1. USER BASE & REGISTRATION METRICS", 12, 45);
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(10, 48, 200, 48);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        
        doc.text(`Total Registered Users: ${stats.totalUsers}`, 15, 55);
        doc.text(`Verified Users (NIN Badging): ${stats.verifiedCount} (${Math.round((stats.verifiedCount / (stats.totalUsers || 1)) * 100)}%)`, 15, 61);
        doc.text(`Weekly Active Users (7-day activity window): ${stats.weeklyActiveCount}`, 15, 67);
        
        // User Role Distribution table
        doc.text("User Roles Breakdown:", 120, 55);
        doc.text(`- Clients (Hiring accounts): ${stats.roles.client}`, 125, 61);
        doc.text(`- Professionals / Workers (Providing services): ${stats.roles.worker}`, 125, 67);
        doc.text(`- Platform Administrators: ${stats.roles.admin}`, 125, 73);
        
        // Section 2: Finances and Token Sales
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("2. PREMIUM TOKEN CONVERSION & REVENUE ANALYSIS", 12, 85);
        doc.line(10, 88, 200, 88);
        
        // Total Revenue
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Cumulative Revenue: NGN ${stats.revenueMRR.toLocaleString()}`, 15, 96);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text("(Based solely on standard token packages purchased by platform members)", 15, 102);
        
        // Package breakdown table
        doc.text(`- Starter Pack (NGN 900 • 1 Token): ${stats.tiers.basic || 0} packs sold (NGN ${((stats.tiers.basic || 0) * 900).toLocaleString()})`, 15, 110);
        doc.text(`- Standard Pack (NGN 3,999 • 5 Tokens): ${stats.tiers.lite || 0} packs sold (NGN ${((stats.tiers.lite || 0) * 3999).toLocaleString()})`, 15, 116);
        doc.text(`- Pro Pack (NGN 6,999 • 10 Tokens): ${stats.tiers.standard || 0} packs sold (NGN ${((stats.tiers.standard || 0) * 6999).toLocaleString()})`, 15, 122);
        doc.text(`- Power Pack (NGN 9,999 • 15 Tokens): ${stats.tiers.pro || 0} packs sold (NGN ${((stats.tiers.pro || 0) * 9999).toLocaleString()})`, 15, 128);
        
        // Section 3: Job Flow & Posting Volume
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("3. MARKETPLACE FLOWS & JOB METRICS", 12, 140);
        doc.line(10, 143, 200, 143);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        
        doc.text(`Unified Task Flow (Total Volume): ${stats.totalTasks + (stats.totalDirectBookings || 0)}`, 15, 150);
        doc.text(`- Marketplace Job Postings: ${stats.totalTasks}`, 15, 156);
        doc.text(`- Direct Worker Bookings/Hires: ${stats.totalDirectBookings || 0}`, 15, 162);
        doc.text(`- Applications / Bidding Volume: ${stats.totalApplications || 0}`, 15, 168);
        doc.text(`- Active/Completed Matches: ${stats.totalBookings}`, 15, 174);
        
        // Right col: financial metrics
        doc.text("Job Metrics Overview:", 120, 150);
        doc.text(`- Mean Client Budget: NGN ${stats.averageBudget.toLocaleString()}`, 125, 156);
        doc.text(`- Current Open Listings: ${stats.taskStatus.open || 0} tasks`, 125, 162);
        doc.text(`- Successful Matches (Completed): ${stats.bookingStatus.completed || 0} jobs`, 125, 168);
        
        // Section 4: Industry Categories
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("4. TOP DEMAND CATEGORIES & SECTORS", 12, 185);
        doc.line(10, 188, 200, 188);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        const sortedCats = Object.entries(stats.categoryDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
          
        let yOffset = 195;
        sortedCats.forEach(([cat, count], idx) => {
          const share = Math.round((count / (stats.totalTasks || 1)) * 100);
          if (yOffset <= 270) {
            doc.text(`${idx + 1}. ${cat}: ${count} posts (${share}% of platform traffic)`, 15, yOffset);
            yOffset += 6;
          }
        });
        
        // Footer notice
        doc.setDrawColor(226, 232, 240);
        doc.line(10, 278, 200, 278);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Confidential Internal Document. Designed for Velgo compliance desks & administrators in Nigeria.", 15, 283);
        doc.text("Velgo Nigeria Corp © 2026", 170, 283);
        
        doc.save(`Velgo-Nigeria-System-Audit-${new Date().toISOString().split('T')[0]}.pdf`);
      };
      return handleDownloadPdfLogic();
    };

export interface UserDossierData {
  profile: any;
  isDeleted: boolean;
  bookings: any[];
  reviews: any[];
  supportTickets: any[];
  safetyIncidents: any[];
  appRatings: any[];
  auditLogs: any[];
  fetchedAt: string;
}

export const exportUserDossierJSON = (dossier: UserDossierData) => {
  if (!dossier || !dossier.profile) {
    alert("No dossier data available to export.");
    return;
  }
  const u = dossier.profile;
  const nameSlug = (u.full_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `velgo_dossier_${nameSlug}_${new Date().toISOString().split('T')[0]}.json`;

  const jsonString = JSON.stringify(dossier, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportUserDossierCSV = (dossier: UserDossierData) => {
  if (!dossier || !dossier.profile) {
    alert("No dossier data available to export.");
    return;
  }
  const u = dossier.profile;
  const escapeVal = (val: any) => {
    const stringified = String(val ?? '').replace(/"/g, '""');
    if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n') || stringified.includes('\r')) {
      return `"${stringified}"`;
    }
    return stringified;
  };

  const sections: string[] = [];

  // Section 1: User Profile & Identity
  sections.push("--- USER PROFILE & IDENTITY ---");
  sections.push("ID,Full Name,Email,Phone Number,Role,Status,State,LGA,Created At");
  sections.push([
    u.id || u.user_id || '',
    u.full_name || '',
    u.email || '',
    u.phone_number || '',
    u.role || '',
    dossier.isDeleted ? 'Deleted / Blacklisted' : (u.is_verified ? 'Verified' : 'Unverified'),
    u.state || '',
    u.lga || '',
    u.created_at || u.deleted_at || ''
  ].map(escapeVal).join(','));

  // Section 2: Bookings History
  sections.push("\n--- BOOKINGS & SERVICE JOBS HISTORY ---");
  sections.push("Booking ID,Service Title,Role,Status,Amount (NGN),Created At");
  if (dossier.bookings && dossier.bookings.length > 0) {
    dossier.bookings.forEach((b: any) => {
      const userRole = (b.client_id === (u.id || u.user_id)) ? 'Client' : 'Worker/Artisan';
      sections.push([
        b.id || '',
        b.service_title || b.category || 'Job Booking',
        userRole,
        b.status || '',
        b.amount || 0,
        b.created_at || ''
      ].map(escapeVal).join(','));
    });
  } else {
    sections.push("No bookings recorded.");
  }

  // Section 3: Reviews
  sections.push("\n--- REVIEWS & RATINGS ---");
  sections.push("Review ID,Rating,Comment,Created At");
  if (dossier.reviews && dossier.reviews.length > 0) {
    dossier.reviews.forEach((r: any) => {
      sections.push([
        r.id || '',
        r.rating || 5,
        r.comment || r.review_text || '',
        r.created_at || ''
      ].map(escapeVal).join(','));
    });
  } else {
    sections.push("No reviews recorded.");
  }

  // Section 4: Support Tickets
  sections.push("\n--- SUPPORT TICKETS ---");
  sections.push("Ticket ID,Subject,Status,Message,Created At");
  if (dossier.supportTickets && dossier.supportTickets.length > 0) {
    dossier.supportTickets.forEach((t: any) => {
      sections.push([
        t.id || '',
        t.subject || t.category || '',
        t.status || '',
        t.message || t.description || '',
        t.created_at || ''
      ].map(escapeVal).join(','));
    });
  } else {
    sections.push("No support tickets recorded.");
  }

  const csvContent = sections.join('\n');
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const nameSlug = (u.full_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('download', `velgo_dossier_${nameSlug}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportUserDossierPDF = (dossier: UserDossierData) => {
  if (!dossier || !dossier.profile) {
    alert("No dossier data available to export.");
    return;
  }

  const u = dossier.profile;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let y = margin;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("VELGO NIGERIA", margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text("CONFIDENTIAL USER ACTIVITY DOSSIER & AUDIT REPORT", margin + 6, y + 17);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, margin + contentWidth - 6, y + 10, { align: 'right' });
  doc.text(`NDPR Security Compliant`, margin + contentWidth - 6, y + 16, { align: 'right' });

  y += 28;

  // Section 1: Subject Identity Snapshot
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 38, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("1. ACCOUNT & IDENTITY PROFILE", margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1X = margin + 5;
  const col2X = margin + 95;

  doc.text(`Full Name: ${u.full_name || 'N/A'}`, col1X, y + 14);
  doc.text(`User ID: ${u.id || u.user_id || 'N/A'}`, col2X, y + 14);

  doc.text(`Email Address: ${u.email || 'N/A'}`, col1X, y + 20);
  doc.text(`Phone Number: ${u.phone_number || 'N/A'}`, col2X, y + 20);

  doc.text(`Account Role: ${(u.role || 'user').toUpperCase()}`, col1X, y + 26);
  doc.text(`Status: ${dossier.isDeleted ? 'DELETED / BLACKLISTED' : (u.is_verified ? 'VERIFIED' : 'UNVERIFIED')}`, col2X, y + 26);

  doc.text(`State & LGA: ${u.state || 'N/A'}, ${u.lga || 'N/A'}`, col1X, y + 32);
  doc.text(`Subscription Tier: ${(u.subscription_tier || 'basic').toUpperCase()}`, col2X, y + 32);

  y += 44;

  // Section 2: Summary Metrics
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("2. ACTIVITY SUMMARY & METRICS", margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`• Total Bookings / Jobs Recorded: ${dossier.bookings.length}`, col1X, y);
  doc.text(`• Reviews & Feedback Entries: ${dossier.reviews.length}`, col2X, y);
  y += 6;
  doc.text(`• Support Tickets Opened: ${dossier.supportTickets.length}`, col1X, y);
  doc.text(`• Safety / Dispute Incidents: ${dossier.safetyIncidents.length}`, col2X, y);
  y += 6;
  doc.text(`• Admin Audit Actions Logged: ${dossier.auditLogs.length}`, col1X, y);

  y += 12;

  // Section 3: Bookings Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("3. SERVICE BOOKINGS & TRANSACTIONS", margin, y);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  y += 8;

  if (dossier.bookings.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No bookings found for this user.", margin + 5, y);
    y += 10;
  } else {
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    doc.text("S/N", margin + 3, y + 5);
    doc.text("SERVICE / TITLE", margin + 18, y + 5);
    doc.text("ROLE", margin + 105, y + 5);
    doc.text("AMOUNT (NGN)", margin + 135, y + 5);
    doc.text("STATUS", margin + 175, y + 5);

    y += 9;

    dossier.bookings.slice(0, 10).forEach((b: any, index: number) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      const title = b.service_title || b.category || 'Job Booking';
      const roleStr = (b.client_id === (u.id || u.user_id)) ? 'Client' : 'Worker';

      doc.text(String(index + 1), margin + 3, y);
      doc.text(title.length > 42 ? title.substring(0, 40) + '...' : title, margin + 18, y);
      doc.text(roleStr, margin + 105, y);
      doc.text(`NGN ${(b.amount || 0).toLocaleString()}`, margin + 135, y);
      doc.text(String(b.status || 'pending').toUpperCase(), margin + 175, y);

      y += 6;
    });
    if (dossier.bookings.length > 10) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`... and ${dossier.bookings.length - 10} additional booking records.`, margin + 3, y);
      y += 8;
    }
  }

  y += 6;

  // Section 4: Reviews & Support Overview
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("4. REVIEWS & SUPPORT SUMMARY", margin, y);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  if (dossier.reviews.length > 0) {
    const firstRev = dossier.reviews[0];
    doc.text(`Latest Review (${firstRev.rating || 5}/5 stars): "${(firstRev.comment || firstRev.review_text || 'No comment').substring(0, 70)}"`, margin + 3, y);
    y += 6;
  } else {
    doc.text("No reviews available.", margin + 3, y);
    y += 6;
  }

  if (dossier.supportTickets.length > 0) {
    const firstTicket = dossier.supportTickets[0];
    doc.text(`Latest Support Ticket (${firstTicket.status || 'open'}): "${(firstTicket.subject || firstTicket.message || 'Ticket').substring(0, 70)}"`, margin + 3, y);
    y += 6;
  } else {
    doc.text("No support tickets available.", margin + 3, y);
    y += 6;
  }

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 15, margin + contentWidth, pageHeight - 15);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Velgo Nigeria Corp • Official Administrative Activity Dossier", margin, pageHeight - 10);
  doc.text("Page 1 of 1", margin + contentWidth - 15, pageHeight - 10);

  const nameSlug = (u.full_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`velgo_dossier_${nameSlug}_${new Date().toISOString().split('T')[0]}.pdf`);
};

