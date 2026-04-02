export interface StateHandle {
  state: string;
  city?: string;
  handle: string;
  has_dedicated_system: boolean;
}

// Simulating database table 'state_handles'
export const STATE_HANDLES_DB: StateHandle[] = [
  { state: "Delhi", city: "Delhi", handle: "dtptraffic", has_dedicated_system: true },
  { state: "Maharashtra", city: "Mumbai", handle: "MTPHereToHelp", has_dedicated_system: true },
  { state: "Maharashtra", city: "Pune", handle: "PuneCityTraffic", has_dedicated_system: true },
  { state: "Maharashtra", handle: "MaharashtraPlc", has_dedicated_system: true },
  { state: "Karnataka", city: "Bengaluru", handle: "blrcitytraffic", has_dedicated_system: true },
  { state: "Karnataka", handle: "DgpKarnataka", has_dedicated_system: false },
  { state: "Uttar Pradesh", city: "Noida", handle: "noidatraffic", has_dedicated_system: true },
  { state: "Uttar Pradesh", city: "Lucknow", handle: "lkopolice", has_dedicated_system: true },
  { state: "Uttar Pradesh", handle: "Uppolice", has_dedicated_system: true },
  { state: "Telangana", city: "Hyderabad", handle: "HYDTP", has_dedicated_system: true },
  { state: "Telangana", handle: "TelanganaDGP", has_dedicated_system: false },
  { state: "Tamil Nadu", city: "Chennai", handle: "ChennaiTraffic", has_dedicated_system: true },
  { state: "Tamil Nadu", handle: "tnpoliceoffl", has_dedicated_system: false },
  { state: "West Bengal", city: "Kolkata", handle: "KPTrafficDept", has_dedicated_system: true },
  { state: "West Bengal", handle: "WBPolice", has_dedicated_system: false },
  { state: "Gujarat", city: "Ahmedabad", handle: "AhmedabadPolice", has_dedicated_system: true },
  { state: "Gujarat", handle: "GujaratPolice", has_dedicated_system: false },
  { state: "Rajasthan", city: "Jaipur", handle: "Traffic_Jaipur", has_dedicated_system: true },
  { state: "Rajasthan", handle: "PoliceRajasthan", has_dedicated_system: false },
  { state: "Haryana", city: "Gurugram", handle: "TrafficGGM", has_dedicated_system: true },
  { state: "Haryana", handle: "Haryana_Police", has_dedicated_system: false },
  { state: "Punjab", handle: "PunjabPoliceInd", has_dedicated_system: false },
  { state: "Madhya Pradesh", city: "Indore", handle: "traffic_indore", has_dedicated_system: true },
  { state: "Madhya Pradesh", handle: "MPPoliceDept", has_dedicated_system: false },
  { state: "Kerala", city: "Kochi", handle: "KochiTraffic", has_dedicated_system: true },
  { state: "Kerala", handle: "TheKeralaPolice", has_dedicated_system: false },
  { state: "Bihar", city: "Patna", handle: "PatnaPolice24x7", has_dedicated_system: false },
  { state: "Bihar", handle: "bihar_police", has_dedicated_system: false },
  { state: "Assam", city: "Guwahati", handle: "GhtyTrafficPol", has_dedicated_system: true },
  { state: "Assam", handle: "assampolice", has_dedicated_system: false },
  { state: "Odisha", city: "Bhubaneswar", handle: "cpbbsrctc", has_dedicated_system: true },
  { state: "Odisha", handle: "Odisha_Police", has_dedicated_system: false },
  { state: "Andhra Pradesh", city: "Visakhapatnam", handle: "vizagcitypolice", has_dedicated_system: true },
  { state: "Andhra Pradesh", handle: "APPOLICE100", has_dedicated_system: false },
  { state: "Uttarakhand", handle: "uttarakhandcops", has_dedicated_system: false },
  { state: "Himachal Pradesh", handle: "himachalpolice", has_dedicated_system: false },
  { state: "Jharkhand", handle: "JharkhandPolice", has_dedicated_system: false },
  { state: "Chhattisgarh", handle: "CG_Police", has_dedicated_system: false },
  { state: "Goa", handle: "Goa_Police", has_dedicated_system: false },
];
