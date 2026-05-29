export interface EmergencyDetails {
  ambulance: string;
  police?: string;
  fire?: string;
  notes?: string;
  dispatcherName?: string;
}

export interface CountryEmergencyDetails extends EmergencyDetails {
  countryName: string;
  states?: { [stateKey: string]: EmergencyDetails };
}

export const emergencyDatabase: { [countryKey: string]: CountryEmergencyDetails } = {
  "india": {
    countryName: "India",
    ambulance: "108",
    police: "112",
    fire: "101",
    dispatcherName: "National Health Mission Emergency Response System",
    notes: "Dial 108 for free critical care medical transport, support, and trauma services. Dial 102 for basic maternity and infant transit.",
    states: {
      "andhra pradesh": { ambulance: "108", police: "100", fire: "101", notes: "Andhra Pradesh NHS Emergency Medical Services (108)." },
      "arunachal pradesh": { ambulance: "108", police: "112", fire: "101" },
      "assam": { ambulance: "108", notes: "Mrityunjoy 108 Emergency Ambulance Service." },
      "bihar": { ambulance: "102", notes: "Primary referral transit is 102 (Janani Shishu Suraksha Karyakram). Dial 108 for critical emergencies." },
      "chandigarh": { ambulance: "108", police: "112" },
      "chhattisgarh": { ambulance: "108" },
      "delhi": { ambulance: "102", police: "112", notes: "CAT (Centralized Accident & Trauma Services) ambulance: 102 or 1099." },
      "goa": { ambulance: "108", police: "112" },
      "gujarat": { ambulance: "108", notes: "GVK EMRI 108 emergency response service." },
      "haryana": { ambulance: "108" },
      "himachal pradesh": { ambulance: "108", notes: "National Rural Health Mission 108 GVK EMRI." },
      "jammu and kashmir": { ambulance: "108" },
      "jharkhand": { ambulance: "108" },
      "karnataka": { ambulance: "108", notes: "Arogya Kavacha 108 Emergency Ambulance Service." },
      "kerala": { ambulance: "108", notes: "Kanivu 108 ambulance scheme." },
      "madhya pradesh": { ambulance: "108", notes: "Sanjeevani 108 ambulance." },
      "maharashtra": { ambulance: "108", notes: "Maharashtra Emergency Medical Services (MEMS) - 108." },
      "manipur": { ambulance: "108" },
      "meghalaya": { ambulance: "108" },
      "mizoram": { ambulance: "108" },
      "nagaland": { ambulance: "108" },
      "odisha": { ambulance: "108", notes: "Odisha Emergency Medical Services (108)." },
      "puducherry": { ambulance: "108" },
      "punjab": { ambulance: "108", notes: "Punjab GVK EMRI 108 Emergency Services." },
      "rajasthan": { ambulance: "108", notes: "108 Emergency Integrated Ambulance." },
      "sikkim": { ambulance: "108" },
      "tamil nadu": { ambulance: "108", notes: "Tamil Nadu GVK EMRI 108 Emergency Response." },
      "telangana": { ambulance: "108", notes: "Telangana GVK EMRI 108 Service." },
      "tripura": { ambulance: "108" },
      "uttar pradesh": { ambulance: "108", notes: "Dial 108 for emergency trauma cases, dial 102 for maternity transport." },
      "uttarakhand": { ambulance: "108", notes: "Satyendra Devli 108 Emergency Service." },
      "west bengal": { ambulance: "108", notes: "West Bengal Free Health Transit System (108/102)." }
    }
  },
  "pakistan": {
    countryName: "Pakistan",
    ambulance: "1122",
    police: "15",
    fire: "16",
    dispatcherName: "Rescue Emergency Services (1122) / Edhi (115)",
    notes: "Rescue 1122 is the highly responsive, state-managed emergency service in Punjab and KPK. For other regions, or as a secondary reliable backup, dial 115 for the renowned Edhi Foundation Ambulance.",
    states: {
      "punjab": { ambulance: "1122", police: "15", fire: "16", notes: "Punjab Rescue 1122 Emergency Ambulance and Medical Team." },
      "sindh": { ambulance: "115", police: "15", notes: "Edhi Ambulance (115) or Aman Health Service (1021/115). Rescue 1122 is also active in Karachi (dial 1122)." },
      "khyber pakhtunkhwa": { ambulance: "1122", police: "15", fire: "16", notes: "KPK Rescue 1122 Emergency Management." },
      "balochistan": { ambulance: "115", notes: "Edhi Foundation (115) represents primary ambulance fleet. Rescue 1122 covers Quetta as well." },
      "islamabad": { ambulance: "1122", police: "15", fire: "16", notes: "Islamabad Capital Territory Capital Rescue (1122)." },
      "azad kashmir": { ambulance: "1122", notes: "AJ&K Emergency Services Rescue 1122." },
      "gilgit-baltistan": { ambulance: "1122", notes: "GB Rescue 1122 Emergency Response." }
    }
  },
  "united states": {
    countryName: "United States",
    ambulance: "911",
    police: "911",
    fire: "911",
    dispatcherName: "Integrated E911 Emergency Dispatch",
    notes: "Dial 911 for primary dispatch of fire, ambulance, and safety squads. For general health information or community referral resources, dial 211. Poison control can be reached at 1-800-222-1222.",
    states: {
      "new york": { ambulance: "911", police: "911", notes: "NYC E911 System. For non-emergencies or city services, dial 311." },
      "california": { ambulance: "911", police: "911", notes: "California State EMS. Dial 211 for preventative community assistance." },
      "texas": { ambulance: "911", notes: "Texas Department of State Health Services. E911 Dispatch." },
      "florida": { ambulance: "911", notes: "Florida EMS Emergency Dispatch." },
      "illinois": { ambulance: "911" },
      "pennsylvania": { ambulance: "911" },
      "ohio": { ambulance: "911" },
      "georgia": { ambulance: "911" },
      "north carolina": { ambulance: "911" },
      "michigan": { ambulance: "911" }
    }
  },
  "united kingdom": {
    countryName: "United Kingdom",
    ambulance: "999",
    police: "999",
    fire: "999",
    dispatcherName: "NHS Emergency & Accident Services (999)",
    notes: "Dial 999 for primary immediate ambulance dispatch. For non-life-threatening clinical inquiries, triage issues, or local pharmacy referents, dial NHS 111.",
    states: {
      "england": { ambulance: "999", notes: "England NHS Trusts. Use 111 for non-emergency clinical guidance." },
      "scotland": { ambulance: "999", notes: "Scottish Ambulance Service (999). Non-emergency NHS 24: dial 111." },
      "wales": { ambulance: "999", notes: "Welsh Ambulance Services Trust. Non-emergency dial 111 (or 0845 46 47)." },
      "northern ireland": { ambulance: "999", notes: "Northern Ireland Ambulance Service HSC (999)." }
    }
  },
  "canada": {
    countryName: "Canada",
    ambulance: "911",
    police: "911",
    fire: "911",
    dispatcherName: "Public Safety Canada 911 Systems",
    notes: "Emergency dispatcher responds to ambulance, rescue, or law requests. Dial Telehealth at 811 for free non-emergency health inquiries.",
    states: {
      "ontario": { ambulance: "911", notes: "Ontario EMS. For free professional medical advice, dial Telehealth Ontario at 811 (formerly 1-866-797-0000)." },
      "quebec": { ambulance: "911", notes: "Quebec Emergency Info. Dial Info-Santé at 811 for non-urgent clinical guidance." },
      "british columbia": { ambulance: "911", notes: "BC Emergency Health Services. Dial HealthLinkBC at 811." },
      "alberta": { ambulance: "911", notes: "Alberta Health Services. Dial Health Link at 811." }
    }
  },
  "australia": {
    countryName: "Australia",
    ambulance: "000",
    police: "000",
    fire: "000",
    dispatcherName: "Triple Zero (000) National Service",
    notes: "Triple Zero is the primary Australian emergency coordinator. From GSM mobile phones, 112 also routes to 000. For mental health support crises, dial Lifeline at 13 11 14."
  },
  "germany": {
    countryName: "Germany",
    ambulance: "112",
    police: "110",
    fire: "112",
    dispatcherName: "Rettungsdienst (112)",
    notes: "Dial 112 for acute medical ambulances. For non-urgent on-call doctor house visits or prescription guidance, dial 116 117 (Bereitschaftsdienst)."
  },
  "france": {
    countryName: "France",
    ambulance: "15",
    police: "17",
    fire: "18",
    dispatcherName: "SAMU Service d'Aide Médicale Urgente (15)",
    notes: "Dial 15 for SAMU critical medical ambulances, or dial the European unified 112. Fire brigade emergency (Sapeurs-Pompiers) is 18."
  },
  "saudi arabia": {
    countryName: "Saudi Arabia",
    ambulance: "997",
    police: "999",
    fire: "998",
    dispatcherName: "Saudi Red Crescent Authority (997)",
    notes: "Dial 997 for emergency ambulances and first-aid response squads."
  },
  "united arab emirates": {
    countryName: "United Arab Emirates",
    ambulance: "998",
    police: "999",
    fire: "997",
    dispatcherName: "National Ambulance Services (998)",
    notes: "Dial 998 for immediate medical first response. Standard unified emergency dial: 999."
  },
  "bangladesh": {
    countryName: "Bangladesh",
    ambulance: "999",
    police: "999",
    fire: "999",
    notes: "Bangladesh National Emergency Service (999) integrates police, fire, and ambulance coordinates."
  },
  "china": {
    countryName: "China",
    ambulance: "120",
    police: "110",
    fire: "119",
    dispatcherName: "Municipal Emergency Centers (120)",
    notes: "Dial 120 for public hospital emergency ambulances. Police help is 110."
  },
  "japan": {
    countryName: "Japan",
    ambulance: "119",
    police: "110",
    fire: "119",
    dispatcherName: "Fire and Disaster Management Ambulance (119)",
    notes: "Dial 119 to call for an ambulance (Kyukyusha) or fire engine. Press 'Kyukyudesu' for emergency health aid."
  },
  "russia": {
    countryName: "Russia",
    ambulance: "103",
    police: "102",
    fire: "101",
    dispatcherName: "Skoraya Pomoshch Ambulance (103)",
    notes: "Dial 103 from any landline or mobile for ambulance. Unified multi-service emergency is 112."
  },
  "brazil": {
    countryName: "Brazil",
    ambulance: "192",
    police: "190",
    fire: "193",
    dispatcherName: "SAMU - Serviço de Atendimento Móvel de Urgência (192)",
    notes: "Dial 192 for the public emergency medical response service."
  },
  "south africa": {
    countryName: "South Africa",
    ambulance: "10177",
    police: "10111",
    notes: "Dial 10177 for public emergency ambulance. Dial 112 from any mobile grid to be redirected."
  },
  "turkey": {
    countryName: "Turkey",
    ambulance: "112",
    police: "112",
    fire: "112",
    notes: "Turkey has consolidated all emergency lines (ambulance, health, police, forestry, coast) under the unified 112 hotline."
  },
  "egypt": {
    countryName: "Egypt",
    ambulance: "123",
    police: "122",
    fire: "180"
  },
  "mexico": {
    countryName: "Mexico",
    ambulance: "911",
    police: "911",
    fire: "911",
    notes: "National emergency dial is 911 (subsumes Red Cross ambulances and local rescue)."
  },
  "nigeria": {
    countryName: "Nigeria",
    ambulance: "112",
    police: "112",
    notes: "National toll-free line is 112. In Lagos State, you can also dial 767 or 112."
  },
  "singapore": {
    countryName: "Singapore",
    ambulance: "995",
    police: "999",
    fire: "995",
    dispatcherName: "SCDF Emergency Medical Services (995)",
    notes: "Dial 995 for emergency critical care transport. For non-life-threatening events, dial 1777."
  },
  "indonesia": {
    countryName: "Indonesia",
    ambulance: "118",
    police: "110",
    fire: "113",
    notes: "Dial 118 or 119 for state emergency medical response. Integrated ambulance networks."
  },
  "malaysia": {
    countryName: "Malaysia",
    ambulance: "999",
    police: "999",
    fire: "999",
    notes: "Malaysia Emergency National Service (MERS 999)."
  },
  "philippines": {
    countryName: "Philippines",
    ambulance: "911",
    police: "911",
    fire: "911",
    notes: "National emergency response number is 911 (replaces 117)."
  },
  "vietnam": {
    countryName: "Vietnam",
    ambulance: "115",
    police: "113",
    fire: "114",
    notes: "Dial 115 for public medical emergency ambulances."
  },
  "spain": {
    countryName: "Spain",
    ambulance: "112",
    police: "091",
    fire: "080",
    notes: "Integrated European number 112 is fully operational. Ambulance-only can also be reached on 061."
  },
  "italy": {
    countryName: "Italy",
    ambulance: "112",
    police: "112",
    notes: "Unified emergency number 112 handles all ambulance and rescue requests. 118 can also be dialed directly."
  },
  "new zealand": {
    countryName: "New Zealand",
    ambulance: "111",
    police: "111",
    fire: "111",
    notes: "Unified National Emergency hotline is 111 (handles St John ambulance dispatch)."
  },
  "switzerland": {
    countryName: "Switzerland",
    ambulance: "144",
    police: "117",
    fire: "118",
    notes: "Dial 144 for sanitarians/ambulance services. 112 provides global routing."
  },
  "canada-intl": {
    countryName: "Canada",
    ambulance: "911"
  }
};

export const normalizeString = (str: string): string => {
  return str.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
};

export interface ResolvedEmergencyContact {
  countryName: string;
  stateName?: string;
  ambulance: string;
  police: string;
  fire: string;
  notes: string;
  dispatcherName: string;
  isCustomSelection: boolean;
}

export function getEmergencyContact(country: string, state?: string): ResolvedEmergencyContact {
  const normCountry = normalizeString(country);
  const normState = state ? normalizeString(state) : "";

  // Direct exact match
  let matchedCountryKey = "";
  if (normCountry === "usa" || normCountry === "united states of america" || normCountry === "us") {
    matchedCountryKey = "united states";
  } else if (normCountry === "uk" || normCountry === "gb" || normCountry === "great britain" || normCountry === "united kingdom of great britain and northern ireland") {
    matchedCountryKey = "united kingdom";
  } else if (normCountry === "uae") {
    matchedCountryKey = "united arab emirates";
  } else {
    // Look for key match
    const keys = Object.keys(emergencyDatabase);
    const foundKey = keys.find(k => normCountry.includes(k) || k.includes(normCountry));
    if (foundKey) {
      matchedCountryKey = foundKey;
    }
  }

  // Fallback to default if no country found
  if (!matchedCountryKey) {
    return {
      countryName: country || "International",
      stateName: state,
      ambulance: "112",
      police: "112",
      fire: "112",
      dispatcherName: "Universal Emergency Operator (GSM Redirect)",
      notes: "Detected: " + (country || "Unknown Location") + ". Universal mobile SOS standard is 112. Dial 112 and your mobile carrier will patch you through to your closest local ambulance dispatch.",
      isCustomSelection: false
    };
  }

  const countryEntry = emergencyDatabase[matchedCountryKey];
  let ambulance = countryEntry.ambulance;
  let police = countryEntry.police || "112";
  let fire = countryEntry.fire || "112";
  let notes = countryEntry.notes || `Emergency details for ${countryEntry.countryName}.`;
  let dispatcherName = countryEntry.dispatcherName || `${countryEntry.countryName} Central Dispatch`;
  let resolvedStateName: string | undefined = undefined;

  // Let's resolve state overrides
  if (normState && countryEntry.states) {
    const stateKeys = Object.keys(countryEntry.states);
    // Exact or loose match
    const foundStateKey = stateKeys.find(sk => normState.includes(sk) || sk.includes(normState));
    if (foundStateKey) {
      const stateEntry = countryEntry.states[foundStateKey];
      ambulance = stateEntry.ambulance || ambulance;
      police = stateEntry.police || police;
      fire = stateEntry.fire || fire;
      notes = stateEntry.notes || notes;
      dispatcherName = stateEntry.dispatcherName || dispatcherName;
      resolvedStateName = countryEntry.states[foundStateKey].notes ? foundStateKey.toUpperCase() : state;
    }
  }

  return {
    countryName: countryEntry.countryName,
    stateName: resolvedStateName || state || undefined,
    ambulance,
    police,
    fire,
    notes,
    dispatcherName,
    isCustomSelection: false
  };
}
