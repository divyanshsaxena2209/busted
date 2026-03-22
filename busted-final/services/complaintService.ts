import { STATE_HANDLES_DB, StateHandle } from '../data/state_handles_db';

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
  const baseMessage = `Traffic Violation Report

Vehicle: ${data.vehicleNumber}
Violation: ${data.violationType}
Location: ${data.location}
Time: ${data.date} approx ${data.time}

Requesting necessary action. Evidence attached.

@${handle}`;

  const hashtags = `\n#TrafficViolation #RoadSafety`;
  
  // Full message construction
  let finalMessage = `${baseMessage}${hashtags}`;

  // Truncation Logic
  if (finalMessage.length <= 280) return finalMessage;

  // Step 1: Remove additional notes (description is not in base template, so this step is implicitly done by not including it in baseMessage unless it was part of location/notes)
  // The prompt says "Remove additional notes". If notes were added, remove them. 
  // In my baseMessage, I didn't include notes. Let's assume 'Location' might be long.
  
  // Step 2: Shorten location string
  // We can try to truncate location to fit.
  // Calculate available space: 280 - (baseMessage without location + hashtags)
  // But baseMessage includes location.
  
  // Let's re-construct to handle truncation dynamically.
  
  const templateStart = `Traffic Violation Report

Vehicle: ${data.vehicleNumber}
Violation: ${data.violationType}
Location: `;
  
  const templateEnd = `
Time: ${data.date} approx ${data.time}

Requesting necessary action. Evidence attached.

@${handle}`;

  const fullLocation = data.location;
  
  // Check with full location and hashtags
  if ((templateStart + fullLocation + templateEnd + hashtags).length <= 280) {
    return templateStart + fullLocation + templateEnd + hashtags;
  }

  // Step 3: Remove hashtags (The prompt says Step 3, but Step 2 is shorten location. Let's try shortening location first as per prompt)
  // Actually, removing hashtags is Step 3. So we should try to shorten location first.
  // But how much to shorten?
  // Let's try to keep hashtags if possible, but if location is huge, we must truncate it.
  
  // Let's try to truncate location to fit WITH hashtags first.
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
  
  // If still too long, we are in trouble, but we return what we can (Step 4: Trim trailing spaces is implicit)
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
    
    msg += `\n\n@${handle}`;
    
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
