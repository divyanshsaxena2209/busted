import { STATE_HANDLES_DB, StateHandle } from '../data/state_handles_db';
import { getCMOHandleByState } from '../src/utils/policeHandles';

interface ComplaintData {
  vehicleNumber: string;
  violationType: string;
  location: string;
  date: string;
  time: string;
  state: string;
  city?: string;
  description?: string;
}

interface CivicIssueData {
  issueType: string;
  location: string;
  landmark?: string;
  date: string;
  time: string;
  state: string;
  city?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

interface LogEntry {
  report_id: string;
  user_id: string;
  state: string;
  selected_handle: string;
  timestamp: string;
  message_preview: string;
  channel_type: 'X';
  status: 'draft_redirected';
  issue_type?: string; // Added for civic issues
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
}

// Simulating database query
export const getOfficialHandle = (state: string, city?: string): StateHandle | null => {
  // 1. Try to find city-specific handle first
  if (city) {
    const cityHandle = STATE_HANDLES_DB.find(
      h => h.state.toLowerCase() === state.toLowerCase() && 
           h.city?.toLowerCase() === city.toLowerCase()
    );
    if (cityHandle) return cityHandle;
  }

  // 2. Fallback to state police handle (where city is undefined)
  const stateHandle = STATE_HANDLES_DB.find(
    h => h.state.toLowerCase() === state.toLowerCase() && !h.city
  );
  
  return stateHandle || null;
};

export const generateXMessage = (data: ComplaintData, handle: string): string => {
  const cmoTag = getCMOHandleByState(data.state);
  const mentions = [`@${handle}`, cmoTag].filter(Boolean).join(' ');

  const baseMessage = `Traffic Violation Report

Vehicle: ${data.vehicleNumber}
Violation: ${data.violationType}
Location: ${data.location}
Time: ${data.date} approx ${data.time}

Requesting necessary action. Evidence attached.

${mentions}`;

  const hashtags = `\n#TrafficViolation #RoadSafety`;
  
  // Full message construction
  let finalMessage = `${baseMessage}${hashtags}`;

  // Truncation Logic
  if (finalMessage.length <= 280) return finalMessage;

  // Step 1: Remove additional notes
  
  // Step 2: Shorten location string
  const templateStart = `Traffic Violation Report

Vehicle: ${data.vehicleNumber}
Violation: ${data.violationType}
Location: `;
  
  const templateEnd = `
Time: ${data.date} approx ${data.time}

Requesting necessary action. Evidence attached.

${mentions}`;

  const fullLocation = data.location;
  
  // Check with full location and hashtags
  if ((templateStart + fullLocation + templateEnd + hashtags).length <= 280) {
    return templateStart + fullLocation + templateEnd + hashtags;
  }

  // Step 3: Remove hashtags
  let availableForLocation = 280 - (templateStart.length + templateEnd.length + hashtags.length);
  
  if (availableForLocation > 10) { // If we have at least 10 chars for location
    const truncatedLocation = fullLocation.substring(0, availableForLocation - 3) + '...';
    return templateStart + truncatedLocation + templateEnd + hashtags;
  }
  
  // If still too long, Step 3: Remove hashtags.
  // Recalculate available for location without hashtags.
  availableForLocation = 280 - (templateStart.length + templateEnd.length);
  
  if (availableForLocation > 10) {
    const truncatedLocation = fullLocation.substring(0, availableForLocation - 3) + '...';
    return templateStart + truncatedLocation + templateEnd; // No hashtags
  }
  
  // If still too long, we return what we can
  return (templateStart + fullLocation + templateEnd).substring(0, 280);
};

export const generateCivicMessage = (data: CivicIssueData, handle: string): string => {
  // Format:
  // Civic Issue Report
  // Issue: {issue_type}
  // Location: {formatted_address}
  // Landmark: {landmark_if_any}
  // Time: {date} approx {time}
  // Requesting authorities to review and take necessary action.
  // Location Map: {google_maps_link}
  // @{official_handle}
  // #CivicIssue #RoadSafety

  const mapsLink = data.latitude && data.longitude 
    ? `https://maps.google.com/?q=${data.latitude},${data.longitude}` 
    : '';

  const baseTemplate = (location: string, landmark: string, description: string, includeHashtags: boolean) => {
    let msg = `Civic Issue Report\n\nIssue: ${data.issueType}`;
    
    // Add description if provided (Step 1 allows removing it, so we add it initially)
    if (description) {
        msg += `\nDetails: ${description}`;
    }

    msg += `\nLocation: ${location}`;
    
    if (landmark) {
      msg += `\nLandmark: ${landmark}`;
    }
    
    msg += `\nTime: ${data.date} approx ${data.time}`;
    msg += `\n\nRequesting authorities to review and take necessary action.`;
    
    if (mapsLink) {
      msg += `\nLocation Map: ${mapsLink}`;
    }
    
    const cmoTag = getCMOHandleByState(data.state);
    const mentions = [`@${handle}`, cmoTag].filter(Boolean).join(' ');
    msg += `\n\n${mentions}`;
    
    if (includeHashtags) {
      msg += `\n\n#CivicIssue #RoadSafety`;
    }
    
    return msg;
  };

  // Initial attempt: Full message
  let message = baseTemplate(data.location, data.landmark || '', data.description || '', true);
  if (message.length <= 280) return message;

  // Step 1: Remove description text
  message = baseTemplate(data.location, data.landmark || '', '', true);
  if (message.length <= 280) return message;

  // Step 2: Remove landmark
  message = baseTemplate(data.location, '', '', true);
  if (message.length <= 280) return message;

  // Step 3: Remove hashtags
  message = baseTemplate(data.location, '', '', false);
  if (message.length <= 280) return message;

  // If still too long, truncate location (implicit fallback to ensure it fits)
  // We need to calculate how much space we have for location
  // Fixed parts length (approx):
  // "Civic Issue Report\n\nIssue: " + issueType + "\nLocation: " + ... + "\nTime: " + date + " approx " + time + ... + mapsLink + handle
  
  const fixedPart = baseTemplate('', '', '', false);
  const available = 280 - fixedPart.length;
  
  if (available > 10) {
     const truncatedLoc = data.location.substring(0, available - 3) + '...';
     return baseTemplate(truncatedLoc, '', '', false);
  }

  return message.substring(0, 280);
};

export const logComplaintAction = async (entry: LogEntry) => {
  console.log('[SERVICE LOG]', entry);
  
  try {
    const response = await fetch('/api/reports/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      throw new Error('Failed to log report to backend');
    }
    
    const result = await response.json();
    console.log('[BACKEND RESPONSE]', result);
  } catch (error) {
    console.error('Backend logging failed, falling back to local storage:', error);
    // Fallback: Simulating DB storage
    const logs = JSON.parse(localStorage.getItem('complaint_logs') || '[]');
    logs.push(entry);
    localStorage.setItem('complaint_logs', JSON.stringify(logs));
  }
};

export interface EmailComplaintData {
  violationType: string;
  vehicleNumber: string;
  location: string;
  date: string;
  time: string;
  state: string;
  userEmail: string;
  userName?: string;
  userMobile?: string;
  recipientEmail: string;
  ccEmails?: string[];
}

export const generateFormalComplaintEmail = (data: EmailComplaintData) => {
  const subject = `Traffic Violation Report Submitted via Busted AI`;
  
  const vehicleLine = data.vehicleNumber ? data.vehicleNumber : 'Vehicle unidentified';
  const locationLine = data.location ? `* Location: ${data.location}` : '';
  
  let body = `Respected Sir/Madam,

I would like to report a potential traffic violation detected through the Busted AI-assisted traffic monitoring platform for your review and necessary action.

Violation Details:

* Violation Type: ${data.violationType}
* Vehicle Number: ${vehicleLine}
`;

  if (locationLine) {
    body += `${locationLine}\n`;
  }
  
  body += `* Date & Time: ${data.date} ${data.time}

Complainant Information:
* Name: ${data.userName || 'Not provided'}
* Mobile: ${data.userMobile || 'Not provided'}
* Email: ${data.userEmail}

The attached evidence was generated through AI-assisted traffic analysis and is being submitted in the interest of public road safety and civic awareness.

Kindly review the matter and take appropriate action if deemed necessary.

Thank you.

Regards,
Busted AI Platform`;

  // Do not CC the reporter. Only CC official contacts.
  const ccEmailsEnc = data.ccEmails && data.ccEmails.length > 0 ? encodeURIComponent(data.ccEmails.join(',')) : '';

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${data.recipientEmail}&cc=${ccEmailsEnc}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  return gmailUrl;
};

export const openEmailClient = (url: string) => {
  window.open(url, '_blank');
};
