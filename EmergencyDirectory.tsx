import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  MapPin, 
  Search, 
  ShieldAlert, 
  Info, 
  Copy, 
  Check, 
  RotateCcw,
  AlertTriangle,
  HeartHandshake,
  ArrowRight,
  Stethoscope,
  ChevronRight,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { getLocationDetailsFromIP, getLocationDetailsFromCoords } from '../lib/location';
import { getEmergencyContact, emergencyDatabase, ResolvedEmergencyContact } from '../lib/emergencyData';
import { toast } from 'sonner';

interface EmergencyDirectoryProps {
  initialCountry?: string;
  onReturnHome?: () => void;
}

export default function EmergencyDirectory({ initialCountry, onReturnHome }: EmergencyDirectoryProps) {
  const { t, language } = useTranslation();
  
  // Detection States
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [detectedLocation, setDetectedLocation] = useState<{ country: string; state?: string }>({ 
    country: initialCountry || 'International' 
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Custom Override States
  const [selectedCountryKey, setSelectedCountryKey] = useState<string>('');
  const [selectedStateKey, setSelectedStateKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customAmbulance, setCustomAmbulance] = useState<string>('');
  
  // Display active contact
  const [contact, setContact] = useState<ResolvedEmergencyContact>({
    countryName: 'International',
    ambulance: '112',
    police: '112',
    fire: '112',
    dispatcherName: 'Universal Emergency Operator (GSM)',
    notes: 'Primary standard cell carrier dial is 112. Dialing 112 safely bridges local responder coordinates.',
    isCustomSelection: false
  });

  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Auto detect coordinates immediately
  const handleDetectLocation = async () => {
    setIsLoading(true);
    setAddress('Locating close GPS satellites...');
    
    const fallbackIP = async () => {
      try {
        const details = await getLocationDetailsFromIP();
        setDetectedLocation(details);
        const activeContact = getEmergencyContact(details.country, details.state);
        setContact(activeContact);
        setCustomAmbulance('');
      } catch (err) {
        console.warn("Could not determine IP location");
      } finally {
        setIsLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lon: longitude });
          try {
            const details = await getLocationDetailsFromCoords(latitude, longitude);
            setDetectedLocation({ country: details.country, state: details.state });
            
            const fullAddress = [details.city, details.state, details.country].filter(Boolean).join(', ');
            setAddress(fullAddress || `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
            
            const activeContact = getEmergencyContact(details.country, details.state);
            setContact(activeContact);
            setCustomAmbulance('');
            toast.success(`Position locked: ${details.country}`);
          } catch (e) {
            fallbackIP();
          } finally {
            setIsLoading(false);
          }
        },
        async (error) => {
          console.warn("Geolocation permission denied, falling back to IP...");
          fallbackIP();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      fallbackIP();
    }
  };

  useEffect(() => {
    handleDetectLocation();
  }, []);

  // Handle dropdown / custom selections
  useEffect(() => {
    if (selectedCountryKey) {
      const countryEntry = emergencyDatabase[selectedCountryKey];
      let stateName = '';
      if (selectedStateKey && countryEntry.states) {
        stateName = selectedStateKey;
      }
      
      const activeContact = getEmergencyContact(countryEntry.countryName, stateName);
      setContact({
        ...activeContact,
        isCustomSelection: true
      });
      setCustomAmbulance('');
    }
  }, [selectedCountryKey, selectedStateKey]);

  // Reset dropdown settings and run discovery again
  const handleResetToAuto = () => {
    setSelectedCountryKey('');
    setSelectedStateKey('');
    setSearchQuery('');
    handleDetectLocation();
  };

  const copyCoordinates = () => {
    let textToCopy = '';
    if (coords) {
      textToCopy += `Latitude: ${coords.lat.toFixed(6)}, Longitude: ${coords.lon.toFixed(6)}`;
    }
    if (address) {
      textToCopy += `\nAddress: ${address}`;
    }
    if (!textToCopy) {
      textToCopy = `Detected Country: ${contact.countryName}`;
    }
    
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    toast.success("Current location details copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filter countries for selector
  const sortedCountryKeys = Object.keys(emergencyDatabase).sort();
  const filteredCountryKeys = sortedCountryKeys.filter(k => 
    emergencyDatabase[k].countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none animate-fade-in pb-12">
      {/* Return to Dashboard */}
      {onReturnHome && (
        <button 
          onClick={onReturnHome}
          className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors font-mono uppercase text-xs tracking-widest no-print"
        >
          <span className="text-sm">←</span> Return to Dashboard
        </button>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Grid: Geographic Locators, Multi-Country Dial Directory */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header Card */}
          <div className="bg-surface border border-border p-6 rounded-[2rem] shadow-sm relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-coral/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 text-coral mb-2">
              <ShieldAlert className="w-5 h-5 animate-bounce shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">Live Responder Directory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight uppercase font-display leading-tight">
              Emergency SOS Workspace
            </h2>
            <p className="text-[11px] text-text-muted font-semibold mt-1 max-w-lg">
              Auto-discover secure ambulance lines, select specific sub-regions/states directories, or study critical airway and cardiac resuscitation protocols.
            </p>
          </div>

          {/* Location Discovery Card */}
          <div className="p-5 rounded-3xl bg-surface border border-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20 text-accent shrink-0 animate-pulse">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted block">Active Location Stream</span>
                <div className="text-sm sm:text-base font-extrabold text-text-primary">
                  {isLoading ? (
                    <span className="text-text-muted text-xs flex items-center gap-1.5 font-semibold">
                      <span className="animate-spin text-accent">●</span> Syncing GPS satellites & local IP bounds...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald shrink-0" />
                      {detectedLocation.country}
                      {detectedLocation.state && (
                        <span className="text-text-secondary font-bold text-xs">
                          ({detectedLocation.state})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {address && !isLoading && (
                  <p className="text-[11px] text-text-muted font-semibold truncate max-w-[280px] sm:max-w-[400px]">
                    📍 {address}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <button 
                onClick={copyCoordinates}
                disabled={isLoading}
                title="Copy coordinates and address to send to responders"
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl border border-border bg-bg-warm/30 text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
              >
                {copiedLink ? <Check className="w-4.5 h-4.5 text-emerald" /> : <Copy className="w-4.5 h-4.5" />}
                <span>Copy Specs</span>
              </button>
              <button 
                onClick={handleResetToAuto}
                disabled={isLoading}
                title="Force refresh current coordinate discovery"
                className="flex-1 md:flex-initial p-2.5 rounded-xl border border-border bg-bg-warm/30 text-text-secondary hover:text-accent hover:border-accent/40 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Primary Action Panel */}
          <div className="bg-gradient-to-br from-surface to-bg-warm/10 rounded-[2rem] border-2 border-coral/30 p-6 shadow-md space-y-5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-[9px] font-black uppercase bg-coral/10 text-coral border border-coral/20 rounded-md tracking-wider">
                {contact.isCustomSelection ? "Manual Selection Filter" : "Auto Geographic Routing Active"}
              </span>
              <span className="text-[10px] font-mono text-text-muted font-black uppercase tracking-wider">
                {contact.countryName} {contact.stateName ? `// ${contact.stateName}` : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Dial Box Left */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">Direct Medical Dispatch</span>
                
                <a 
                  href={`tel:${customAmbulance || contact.ambulance}`}
                  className="block w-full text-center bg-coral hover:bg-coral-bright active:scale-[0.99] transition-all py-7 px-4 rounded-[1.75rem] shadow-md text-white font-black hover:shadow-lg shadow-coral/15"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center shadow-inner animate-pulse">
                      <PhoneCall className="w-5.5 h-5.5 text-white" />
                    </div>
                    <span className="text-4xl font-mono tracking-widest leading-none drop-shadow-sm">
                      {customAmbulance || contact.ambulance}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                      Click to Dial Ambulance
                    </span>
                  </div>
                </a>
              </div>

              {/* Responder Meta Details */}
              <div className="flex flex-col justify-between py-1 space-y-3">
                <div className="p-4 bg-bg-warm/40 border border-border rounded-2xl flex items-start gap-2.5 h-full">
                  <Info className="w-5 h-5 text-coral shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-text-primary uppercase tracking-tight font-display">{contact.dispatcherName}</p>
                    <p className="text-[11px] text-text-secondary leading-relaxed font-semibold">{contact.notes}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrated Police and Fire Secondary Channels */}
            <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-border/40">
              <a 
                href={`tel:${contact.police}`}
                className="py-3 px-4 rounded-xl border border-border bg-surface text-center font-bold text-xs uppercase text-text-secondary hover:text-text-primary hover:border-coral/20 flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Police Desk: {contact.police}</span>
              </a>
              <a 
                href={`tel:${contact.fire}`}
                className="py-3 px-4 rounded-xl border border-border bg-surface text-center font-bold text-xs uppercase text-text-secondary hover:text-text-primary hover:border-coral/20 flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber shrink-0" />
                <span>Fire Rescue: {contact.fire}</span>
              </a>
            </div>
          </div>

          {/* Worldwide Directory Selectors & Custom Overrides */}
          <div className="bg-surface p-6 border border-border rounded-3xl shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-black text-text-primary tracking-tight uppercase font-display flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-accent" />
                Worldwide Emergency Registry Lookup
              </h3>
              <p className="text-[10.5px] text-text-muted mt-1 leading-normal font-semibold">
                Override detected values or search emergency response phone codes across our global clinical network database.
              </p>
            </div>

            {/* Selector country filter input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Type to filter country directory (e.g., India, Pakistan, United Kingdom...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-warm/50 border border-border focus:border-coral/35 focus:ring-1 focus:ring-coral/20 rounded-xl pl-10 pr-4 py-2 text-xs text-text-primary font-semibold outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector Country */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block">Select Country (Database-Matched)</label>
                <select 
                  value={selectedCountryKey}
                  onChange={(e) => {
                    setSelectedCountryKey(e.target.value);
                    setSelectedStateKey('');
                  }}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-bold outline-none cursor-pointer focus:border-coral/30"
                >
                  <option value="">-- Detected: {detectedLocation.country} --</option>
                  {filteredCountryKeys.map(key => (
                    <option key={key} value={key}>
                      {emergencyDatabase[key].countryName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector State / Override */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block">Select Regional State Override</label>
                <select 
                  value={selectedStateKey}
                  onChange={(e) => setSelectedStateKey(e.target.value)}
                  disabled={!selectedCountryKey || !emergencyDatabase[selectedCountryKey]?.states}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-bold outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:border-coral/30"
                >
                  <option value="">-- Nationwide / Primary --</option>
                  {selectedCountryKey && emergencyDatabase[selectedCountryKey]?.states && 
                    Object.keys(emergencyDatabase[selectedCountryKey].states || {}).sort().map(sk => (
                      <option key={sk} value={sk}>
                        {sk.toUpperCase()}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Manual dial pad override */}
            <div className="pt-3 border-t border-border/40 flex items-center gap-3">
              <span className="text-[9.5px] font-black uppercase text-text-muted tracking-wider shrink-0">Custom Dial:</span>
              <div className="flex gap-2 w-full">
                <input 
                  type="tel" 
                  placeholder="Or enter a specific emergency digits..."
                  value={customAmbulance}
                  onChange={(e) => setCustomAmbulance(e.target.value.replace(/[^0-9]/g, ''))}
                  className="flex-1 bg-bg-warm/30 border border-border focus:border-coral/30 rounded-xl px-3 py-2 font-mono text-xs text-text-primary font-bold"
                />
                {customAmbulance && (
                  <button 
                    onClick={() => setCustomAmbulance('')}
                    className="px-3 bg-bg-warm text-text-muted rounded-xl hover:text-text-primary text-xs font-bold border border-border cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Grid: Golden Guidelines & Live Support Measures */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Rescue Operations Warning Alert */}
          <div className="p-5 rounded-3xl bg-amber/5 border border-amber/20 space-y-2 select-none shadow-xs">
            <div className="flex items-center gap-2 text-amber">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-xs font-black uppercase tracking-wider font-display">Resuscitation Sequence Priority</h4>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed font-semibold">
              While waiting for the dispatch ambulance crew, establish safe conditions. Delegate dialing, coordinate street access clear of blockages, retrieve medical history logs or active prescriptions, and keep the airway clear.
            </p>
          </div>

          {/* Guidelines accordion block */}
          <div className="space-y-4">
            
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted px-1 block select-none">
              Resuscitation & Airway Guidelines
            </span>

            {/* 1. Adult CPR Card */}
            <div className="bg-surface border border-border p-5 rounded-[1.75rem] space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-coral text-[11px] text-white flex items-center justify-center font-black shadow-xs">1</span>
                <div>
                  <h4 className="text-xs font-black uppercase text-text-primary tracking-wider font-display">Cardiac CPR Compressions</h4>
                  <span className="text-[9px] text-coral font-black font-mono">100 - 120 COMPRESSIONS / MIN</span>
                </div>
              </div>
              <div className="space-y-2 text-[11px] text-text-secondary leading-normal font-semibold pl-1.5">
                <div className="flex gap-2 items-start">
                  <span className="text-coral shrink-0">•</span>
                  <p>Place the heel of a hand directly over the center of chest. Interlock second hand securely on top.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-coral shrink-0">•</span>
                  <p>Incline weight forward and push hard & deep (2–2.4 inches / 5-6 cm depth).</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-coral shrink-0">•</span>
                  <p>Do not lean: allow perfect, full chest recoil after every single deep stroke.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-coral shrink-0">•</span>
                  <p>Maintain precise pacing rhythm synced to tempo of "Stayin' Alive" by Bee Gees.</p>
                </div>
              </div>
            </div>

            {/* 2. Choking Airway Card */}
            <div className="bg-surface border border-border p-5 rounded-[1.75rem] space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-coral text-[11px] text-white flex items-center justify-center font-black shadow-xs">2</span>
                <div>
                  <h4 className="text-xs font-black uppercase text-text-primary tracking-wider font-display">Airway Blockages (Choking)</h4>
                  <span className="text-[9px] text-amber font-black font-mono">BACK BLOWS & HEIMLICH SEQUENCE</span>
                </div>
              </div>
              <div className="space-y-2 text-[11px] text-text-secondary leading-normal font-semibold pl-1.5">
                <div className="flex gap-2 items-start">
                  <span className="text-amber shrink-0">•</span>
                  <p>Lean the patient forward. Deliver 5 sharp back blows between shoulder blades using the heel of your hand.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-amber shrink-0">•</span>
                  <p>If object remains lodged, position yourself behind, wrap arms around, and perform 5 internal upward abdominal thrusts.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-amber shrink-0">•</span>
                  <p>Continue cycling 5 blows and 5 thrusts continuously until paramedics arrive.</p>
                </div>
              </div>
            </div>

            {/* 3. Severe Bleeding Card */}
            <div className="bg-surface border border-border p-5 rounded-[1.75rem] space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-coral text-[11px] text-white flex items-center justify-center font-black shadow-xs">3</span>
                <div>
                  <h4 className="text-xs font-black uppercase text-text-primary tracking-wider font-display">Hemorrhage & Traumatic Shock</h4>
                  <span className="text-[9px] text-emerald font-black font-mono">HEMOSTASIS & THERMAL SUPPORT</span>
                </div>
              </div>
              <div className="space-y-2 text-[11px] text-text-secondary leading-normal font-semibold pl-1.5">
                <div className="flex gap-2 items-start">
                  <span className="text-emerald shrink-0">•</span>
                  <p>Apply firm, sustained, direct manual pressure on the wound using a clean sterile bandage, pad, or clean clothing.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-emerald shrink-0">•</span>
                  <p>Keep patient still and fully prone, elevating legs 12 inches if no spine trauma is suspected.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-emerald shrink-0">•</span>
                  <p>Trap core metabolic warmth: wrap the patient in thermal blankets to prevent critical hypothermic shock onset.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Secure Medical Standard Footnote */}
          <div className="p-4 border border-border rounded-2xl bg-bg-warm/15 text-center flex flex-col items-center justify-center gap-1 opacity-95">
            <span className="text-[9.5px] font-black text-text-muted uppercase tracking-[0.2em] font-display flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" /> Clinical Quality Assurance Portal
            </span>
            <p className="text-[9px] text-text-muted max-w-[320px] leading-tight font-semibold">
              Emergency dialing activates direct standard network communication lines. Support summaries represent generic offline consensus models. Always prioritize nearby primary medical practitioners.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
