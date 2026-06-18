export const policeHandles: Record<string, string> = {
  // States
  andhrapradesh: "@APPOLICE100",
  arunachalpradesh: "@ArunachalPolice",
  assam: "@assampolice",
  bihar: "@bihar_police",
  chhattisgarh: "@CG_Police",
  goa: "@Goa_Police",
  gujarat: "@GujaratPolice",
  haryana: "@police_haryana",
  himachalpradesh: "@himachalpolice",
  jharkhand: "@JharkhandPolice",
  karnataka: "@BlrCityPolice",
  kerala: "@TheKeralaPolice",
  madhyapradesh: "@MPPoliceDeptt",
  maharashtra: "@MTPHereToHelp",
  manipur: "@manipur_police",
  meghalaya: "@MeghalayaPolice",
  mizoram: "@mizorampolice",
  nagaland: "@DGPNagaland",
  odisha: "@odisha_police",
  punjab: "@PunjabPoliceInd",
  rajasthan: "@PoliceRajasthan",
  sikkim: "@SikkimPolice",
  tamilnadu: "@tnpoliceoffl",
  telangana: "@HYDTP",
  tripura: "@Tripura_Police",
  uttarpradesh: "@Uppolice",
  uttarakhand: "@uttarakhandcops",
  westbengal: "@WBPolice",

  // Union Territories
  andamannicobarislands: "@AndamanPolice",
  chandigarh: "@trafficchd",
  dadranagarhavelianddamandiu: "@ddpolice",
  delhi: "@dtptraffic",
  jammukashmir: "@JmuKmrPolice",
  ladakh: "@LadakhPolice",
  lakshadweep: "@LakshadweepPol",
  puducherry: "@PuducherryPol"
};

export interface ComplaintXData {
  violationType: string;
  plateNumber: string;
  district?: string;
  city?: string;
  state?: string;
  timestamp: string;
}

export const getPoliceHandleByState = (state: string): string | null => {
  if (!state) return null;
  // Normalize state name: lowercase and strip non-alphanumeric chars
  let normalized = state.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Handle common variations and abbreviations
  if (normalized.includes('andaman') || normalized.includes('nicobar')) {
    normalized = 'andamannicobarislands';
  } else if (
    normalized.includes('dadra') || 
    normalized.includes('nagar') || 
    normalized.includes('haveli') || 
    normalized.includes('daman') || 
    normalized.includes('diu')
  ) {
    normalized = 'dadranagarhavelianddamandiu';
  } else if (normalized.includes('jammu') || normalized.includes('kashmir')) {
    normalized = 'jammukashmir';
  } else if (normalized === 'ap') {
    normalized = 'andhrapradesh';
  } else if (normalized === 'hp') {
    normalized = 'himachalpradesh';
  } else if (normalized === 'mp') {
    normalized = 'madhyapradesh';
  } else if (normalized === 'up') {
    normalized = 'uttarpradesh';
  } else if (normalized === 'tn') {
    normalized = 'tamilnadu';
  } else if (normalized === 'wb') {
    normalized = 'westbengal';
  }

  return policeHandles[normalized] || null;
};

export const cmoHandles: Record<string, string> = {
  // 28 STATES
  "andhra pradesh": "@AndhraPradeshCM",
  "arunachal pradesh": "@PemaKhanduBJP",
  "assam": "@CMOfficeAssam",
  "bihar": "@NitishKumar",
  "chhattisgarh": "@ChhattisgarhCMO",
  "goa": "@DrPramodPSawant",
  "gujarat": "@CMOGuj",
  "haryana": "@cmohry",
  "himachal pradesh": "@CMOFFICEHP",
  "jharkhand": "@HemantSorenJMM",
  "karnataka": "@CMofKarnataka",
  "kerala": "@CMOKerala",
  "madhya pradesh": "@CMMadhyaPradesh",
  "maharashtra": "@CMOMaharashtra",
  "manipur": "@NBirenSingh",
  "meghalaya": "@SangmaConrad",
  "mizoram": "@CMOMizoram",
  "nagaland": "@Neiphiu_Rio",
  "odisha": "@CMO_Odisha",
  "punjab": "@BhagwantMann",
  "rajasthan": "@RajCMO",
  "sikkim": "@GolayPs",
  "tamil nadu": "@CMOTamilnadu",
  "telangana": "@TelanganaCMO",
  "tripura": "@DrManikSaha2",
  "uttar pradesh": "@myogioffice",
  "uttarakhand": "@pushkardhami",
  "west bengal": "@MamataOfficial",

  // 8 UNION TERRITORIES
  "andaman and nicobar islands": "@AandN_Admin",
  "chandigarh": "@chandigarh_admn",
  "dadra and nagar haveli and daman and diu": "@dddnicollector",
  "delhi": "@CMODelhi",
  "jammu and kashmir": "@CM_JnK",
  "ladakh": "@lg_ladakh",
  "lakshadweep": "@LakshadweepUT",
  "puducherry": "@CM_Puducherry"
};

export const getCMOHandleByState = (state: string): string | null => {
  if (!state) return null;
  const normalizedInput = state.toLowerCase().trim();

  let lookupKey = normalizedInput;
  if (lookupKey.includes('andaman') || lookupKey.includes('nicobar')) {
    lookupKey = 'andaman and nicobar islands';
  } else if (
    lookupKey.includes('dadra') || 
    lookupKey.includes('nagar') || 
    lookupKey.includes('haveli') || 
    lookupKey.includes('daman') || 
    lookupKey.includes('diu')
  ) {
    lookupKey = 'dadra and nagar haveli and daman and diu';
  } else if (lookupKey.includes('jammu') || lookupKey.includes('kashmir')) {
    lookupKey = 'jammu and kashmir';
  } else if (lookupKey === 'ap') {
    lookupKey = 'andhra pradesh';
  } else if (lookupKey === 'hp') {
    lookupKey = 'himachal pradesh';
  } else if (lookupKey === 'mp') {
    lookupKey = 'madhya pradesh';
  } else if (lookupKey === 'up') {
    lookupKey = 'uttar pradesh';
  } else if (lookupKey === 'tn') {
    lookupKey = 'tamil nadu';
  } else if (lookupKey === 'wb') {
    lookupKey = 'west bengal';
  }

  if (cmoHandles[lookupKey]) {
    return cmoHandles[lookupKey];
  }

  const cleanInput = lookupKey.replace(/[^a-z0-9]/g, '');
  for (const [key, val] of Object.entries(cmoHandles)) {
    const cleanKey = key.replace(/[^a-z0-9]/g, '');
    if (cleanKey === cleanInput) {
      return val;
    }
  }

  return null;
};

export const formatComplaintForX = (data: ComplaintXData): string => {
  const policeTag = getPoliceHandleByState(data.state || '');
  const cmoTag = getCMOHandleByState(data.state || '');
  const tags = [policeTag, cmoTag].filter(Boolean).join(' ');
  
  const vehicle = data.plateNumber ? data.plateNumber : 'Vehicle unidentified';
  
  const locParts = [];
  if (data.district) locParts.push(data.district);
  if (data.city && data.city !== data.district) locParts.push(data.city);
  if (data.state) locParts.push(data.state);
  const locationLine = locParts.length > 0 ? `📍 ${locParts.join(', ')}` : '';
  
  const violationHashtag = data.violationType ? `#${data.violationType.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  const allHashTags = `#RoadSafety #TrafficViolation #TrafficRules #DriveSafe ${violationHashtag} #SafeRoads #TrafficAwareness #BustedAI`.replace(/\s+/g, ' ');
  
  const buildTweet = (includeAI: boolean, hashTagsStr: string, locLine: string) => {
    let text = `🚨Traffic Violation Reported\n`;
    text += `Violation: ${data.violationType}\n`;
    text += `Vehicle: ${vehicle}\n`;
    if (data.timestamp) {
      text += `Date: ${data.timestamp}\n`;
    }
    if (locLine) {
      text += `${locLine}\n`;
    }
    
    if (includeAI) {
      text += `\nGenerated with the assistance of Busted AI for traffic safety review.\n`;
    }
    
    let foot = `\n`;
    if (tags) {
      foot += `${tags}\n`;
    }
    if (hashTagsStr) {
      foot += hashTagsStr;
    }
    
    return text + foot;
  };
  
  let tweet = buildTweet(true, allHashTags, locationLine);
  if (tweet.length <= 280) return tweet;
  
  // Strategy 1: Reduce hashtags
  const essentialHashTags = `#RoadSafety #TrafficViolation ${violationHashtag}`.replace(/\s+/g, ' ');
  tweet = buildTweet(true, essentialHashTags, locationLine);
  if (tweet.length <= 280) return tweet;
  
  // Strategy 2: Remove AI text
  tweet = buildTweet(false, essentialHashTags, locationLine);
  if (tweet.length <= 280) return tweet;
  
  // Strategy 3: Remove all hashtags
  tweet = buildTweet(false, '', locationLine);
  if (tweet.length <= 280) return tweet;
  
  // Strategy 4: Truncate location instead of body
  if (locationLine.length > 10) {
    const locPrefix = `📍 `;
    const availableForLoc = 280 - buildTweet(false, '', '').length - locPrefix.length;
    if (availableForLoc > 5) {
      const truncatedLoc = locationLine.substring(3, 3 + availableForLoc).trim();
      tweet = buildTweet(false, '', locPrefix + truncatedLoc);
      if (tweet.length <= 280) return tweet;
    }
  }
  
  return buildTweet(false, '', '').substring(0, 280);
};

﻿export interface ContactEmail { email: string; verified: boolean; }
export interface StateEmailContacts { traffic?: ContactEmail; cmo?: ContactEmail; dgp?: ContactEmail; }
export const stateEmailContacts: Record<string, StateEmailContacts> = {
  "andaman and nicobar islands": {
    "dgp": {
      "email": "dgp@and.nic.in",
      "verified": true
    },
    "traffic": {
      "email": "spsa.and@nic.in",
      "verified": false
    },
    "cmo": {
      "email": "lg.and@nic.in",
      "verified": false
    }
  },
  "arunachal pradesh": {
    "traffic": {
      "email": "cc-polita-arn@nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cm-arunachal@nic.in",
      "verified": true
    },
    "dgp": {
      "email": "dgp-polita-arn@nic.in",
      "verified": false
    }
  },
  "assam": {
    "dgp": {
      "email": "dgp@assampolice.gov.in",
      "verified": true
    },
    "traffic": {
      "email": "adgp-stf@assampolice.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "cm@assam.gov.in",
      "verified": true
    }
  },
  "bihar": {
    "dgp": {
      "email": "dgp-bih@nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cmbihar@nic.in",
      "verified": true
    },
    "traffic": {
      "email": "traffic-bih@nic.in",
      "verified": false
    }
  },
  "chandigarh": {
    "traffic": {
      "email": "police-chd@nic.in",
      "verified": true
    },
    "dgp": {
      "email": "dgp-chd@nic.in",
      "verified": false
    },
    "cmo": {
      "email": "hs-chd@nic.in",
      "verified": false
    }
  },
  "chhattisgarh": {
    "dgp": {
      "email": "dgp.cg@gov.in",
      "verified": false
    },
    "cmo": {
      "email": "cmoffice.cg@gov.in",
      "verified": false
    },
    "traffic": {
      "email": "igtraffic.cg@gov.in",
      "verified": false
    }
  },
  "goa": {
    "dgp": {
      "email": "dgpgoa@goapolice.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "cm.goa@nic.in",
      "verified": true
    },
    "traffic": {
      "email": "trafficcell@goapolice.gov.in",
      "verified": false
    }
  },
  "gujarat": {
    "dgp": {
      "email": "dgp-gs@gujarat.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "cmog@gujarat.gov.in",
      "verified": true
    },
    "traffic": {
      "email": "trafficbranch@gujarat.gov.in",
      "verified": false
    }
  },
  "haryana": {
    "dgp": {
      "email": "police@hry.nic.in",
      "verified": true
    },
    "traffic": {
      "email": "sp.traffic@hry.nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cmharyana@nic.in",
      "verified": true
    }
  },
  "himachal pradesh": {
    "dgp": {
      "email": "dgp-hp@nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cm-hp@nic.in",
      "verified": true
    },
    "traffic": {
      "email": "traffic-hp@nic.in",
      "verified": false
    }
  },
  "jharkhand": {
    "dgp": {
      "email": "dgp-control@jhpolice.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "secretarytocmjharkhand@gmail.com",
      "verified": true
    },
    "traffic": {
      "email": "igtraffic-jhr@nic.in",
      "verified": false
    }
  },
  "karnataka": {
    "dgp": {
      "email": "police@ksp.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "cm@karnataka.gov.in",
      "verified": true
    },
    "traffic": {
      "email": "adgp-trafsafe@ksp.gov.in",
      "verified": false
    }
  },
  "kerala": {
    "dgp": {
      "email": "dgp.pol@kerala.gov.in",
      "verified": true
    },
    "traffic": {
      "email": "igptraffic.pol@kerala.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "chiefminister@kerala.gov.in",
      "verified": true
    }
  },
  "madhya pradesh": {
    "dgp": {
      "email": "dgpmp@mppolice.gov.in",
      "verified": false
    },
    "cmo": {
      "email": "cmhelpline@mp.gov.in",
      "verified": false
    },
    "traffic": {
      "email": "adgtraffic@mppolice.gov.in",
      "verified": false
    }
  },
  "maharashtra": {
    "dgp": {
      "email": "dgpms.mumbai@mahapolice.gov.in",
      "verified": true
    },
    "traffic": {
      "email": "adg.traffic.hsp@mahapolice.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "cm@maharashtra.gov.in",
      "verified": false
    }
  },
  "manipur": {
    "dgp": {
      "email": "dgcrmanipur100@gmail.com",
      "verified": false
    },
    "cmo": {
      "email": "mpccimail@gmail.com",
      "verified": false
    },
    "traffic": {
      "email": "manipurpolice@gmail.com",
      "verified": false
    }
  },
  "meghalaya": {
    "dgp": {
      "email": "dgp-meg@nic.in",
      "verified": false
    },
    "cmo": {
      "email": "cm-meg@nic.in",
      "verified": false
    },
    "traffic": {
      "email": "addlsptraffic@gmail.com",
      "verified": false
    }
  },
  "mizoram": {
    "dgp": {
      "email": "mizopol@rediffmail.com",
      "verified": true
    },
    "cmo": {
      "email": "cm@mizoram.gov.in",
      "verified": true
    },
    "traffic": {
      "email": "mizorampolicecontrolroom@gmail.com",
      "verified": false
    }
  },
  "nagaland": {
    "dgp": {
      "email": "dgpnld@yahoo.co.in",
      "verified": true
    },
    "cmo": {
      "email": "cmo@nagaland.gov.in",
      "verified": false
    },
    "traffic": {
      "email": "trafficpolicenagaland@gmail.com",
      "verified": false
    }
  },
  "odisha": {
    "dgp": {
      "email": "dgpolice.or@nic.in",
      "verified": false
    },
    "cmo": {
      "email": "cmo@nic.in",
      "verified": true
    },
    "traffic": {
      "email": "traffic.odpol@nic.in",
      "verified": false
    }
  },
  "puducherry": {
    "dgp": {
      "email": "dgp.pon@nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cm@py.gov.in",
      "verified": false
    },
    "traffic": {
      "email": "sptraffic.pon@nic.in",
      "verified": false
    }
  },
  "punjab": {
    "dgp": {
      "email": "dgp.punjab.police@punjab.gov.in",
      "verified": true
    },
    "cmo": {
      "email": "cmo@punjab.gov.in",
      "verified": false
    },
    "traffic": {
      "email": "traffic@punjabpolice.gov.in",
      "verified": false
    }
  },
  "rajasthan": {
    "traffic": {
      "email": "igtraffic-rj@nic.in",
      "verified": false
    },
    "cmo": {
      "email": "cmo@rajasthan.gov.in",
      "verified": false
    },
    "dgp": {
      "email": "dgp-rj@nic.in",
      "verified": false
    }
  },
  "sikkim": {
    "traffic": {
      "email": "traffic@sikkimpolice.nic.in",
      "verified": false
    },
    "dgp": {
      "email": "sikphq@hotmail.com",
      "verified": true
    },
    "cmo": {
      "email": "cmo.skm2019@sikkim.gov.in",
      "verified": true
    }
  },
  "tamil nadu": {
    "dgp": {
      "email": "phq@tn.nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cmcell@tn.gov.in",
      "verified": false
    },
    "traffic": {
      "email": "adgptraffic@tnpolice.gov.in",
      "verified": false
    }
  },
  "telangana": {
    "traffic": {
      "email": "addlcptraffic-hyd@tspolice.gov.in",
      "verified": false
    },
    "cmo": {
      "email": "cmo@telangana.gov.in",
      "verified": false
    },
    "dgp": {
      "email": "dgp@tspolice.gov.in",
      "verified": false
    }
  },
  "tripura": {
    "dgp": {
      "email": "dgp@tripurapolice.nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cmo-tripura@nic.in",
      "verified": false
    },
    "traffic": {
      "email": "sptraffic-trp@nic.in",
      "verified": false
    }
  },
  "uttar pradesh": {
    "dgp": {
      "email": "dgpcontrol-up@nic.in",
      "verified": true
    },
    "cmo": {
      "email": "cmup@nic.in",
      "verified": false
    },
    "traffic": {
      "email": "adgtraffic-up@nic.in",
      "verified": false
    }
  },
  "uttarakhand": {
    "dgp": {
      "email": "jspndy@yahoo.co.in",
      "verified": true
    },
    "cmo": {
      "email": "cm-uttarakhand@nic.in",
      "verified": false
    },
    "traffic": {
      "email": "igtraffic-ua@nic.in",
      "verified": false
    }
  },
  "west bengal": {
    "dgp": {
      "email": "dgpwestbengal@gmail.com",
      "verified": true
    },
    "cmo": {
      "email": "cmo.wb@gmail.com",
      "verified": false
    },
    "traffic": {
      "email": "igtraffic@wbpolice.gov.in",
      "verified": false
    }
  },
  "andhra pradesh": {
    "traffic": {
      "email": "contact@appolice.gov.in",
      "verified": false
    }
  },
  "dadra and nagar haveli and daman and diu": {
    "traffic": {
      "email": "ddtrafficpolice@gmail.com",
      "verified": false
    }
  },
  "delhi": {
    "traffic": {
      "email": "grievance.traffic@delhipolice.gov.in",
      "verified": false
    }
  },
  "jammu and kashmir": {
    "traffic": {
      "email": "traffic@jkpolice.gov.in",
      "verified": false
    }
  },
  "ladakh": {
    "traffic": {
      "email": "trafficpoliceladakh@gmail.com",
      "verified": false
    }
  },
  "lakshadweep": {
    "traffic": {
      "email": "kvr-lad@nic.in",
      "verified": false
    }
  }
};


export interface ComplaintEmailResult {
  primary: string;
  cc: string[];
}

export const getComplaintEmailContacts = (state: string): ComplaintEmailResult | null => {
  if (!state) return null;
  const normalizedInput = state.toLowerCase().trim();

  let lookupKey = normalizedInput;
  if (lookupKey.includes('andaman') || lookupKey.includes('nicobar')) {
    lookupKey = 'andaman and nicobar islands';
  } else if (
    lookupKey.includes('dadra') || 
    lookupKey.includes('nagar') || 
    lookupKey.includes('haveli') || 
    lookupKey.includes('daman') || 
    lookupKey.includes('diu')
  ) {
    lookupKey = 'dadra and nagar haveli and daman and diu';
  } else if (lookupKey.includes('jammu') || lookupKey.includes('kashmir')) {
    lookupKey = 'jammu and kashmir';
  } else if (lookupKey === 'ap') {
    lookupKey = 'andhra pradesh';
  } else if (lookupKey === 'hp') {
    lookupKey = 'himachal pradesh';
  } else if (lookupKey === 'mp') {
    lookupKey = 'madhya pradesh';
  } else if (lookupKey === 'up') {
    lookupKey = 'uttar pradesh';
  } else if (lookupKey === 'tn') {
    lookupKey = 'tamil nadu';
  } else if (lookupKey === 'wb') {
    lookupKey = 'west bengal';
  } else if (lookupKey === 'delhi ncr') {
    lookupKey = 'delhi';
  }

  let stateData = stateEmailContacts[lookupKey];

  if (!stateData) {
    const cleanInput = lookupKey.replace(/[^a-z0-9]/g, '');
    for (const [key, val] of Object.entries(stateEmailContacts)) {
      const cleanKey = key.replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanInput) {
        stateData = val;
        break;
      }
    }
  }

  if (!stateData) return null;

  const contacts = [];
  if (stateData.traffic && stateData.traffic.email) contacts.push({ type: 'traffic', ...stateData.traffic });
  if (stateData.cmo && stateData.cmo.email) contacts.push({ type: 'cmo', ...stateData.cmo });
  if (stateData.dgp && stateData.dgp.email) contacts.push({ type: 'dgp', ...stateData.dgp });

  if (contacts.length === 0) return null;

  const typePriority = { traffic: 1, cmo: 2, dgp: 3 };
  contacts.sort((a, b) => {
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    return typePriority[a.type] - typePriority[b.type];
  });

  const primary = contacts[0].email;
  const cc = contacts.slice(1).map(c => c.email);
  return { primary, cc };
};

export const getTrafficComplaintEmail = (state: string): string | null => {
  const result = getComplaintEmailContacts(state);
  return result ? result.primary : null;
};
