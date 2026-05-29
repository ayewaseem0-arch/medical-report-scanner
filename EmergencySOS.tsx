import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  MapPin, 
  Search, 
  ShieldAlert, 
  Info, 
  Copy, 
  Check, 
  Globe, 
  HeartHandshake, 
  RotateCcw,
  Navigation,
  X,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { getLocationDetailsFromIP, getLocationDetailsFromCoords } from '../lib/location';
import { getEmergencyContact, emergencyDatabase, ResolvedEmergencyContact } from '../lib/emergencyData';
import { toast } from 'sonner';

interface EmergencySOSProps {
  isOpen: boolean;
  onClose: () => void;
  initialCountry?: string;
}

export default function EmergencySOS({ isOpen, onClose, initialCountry }: EmergencySOSProps) {
  const { t } = useTranslation();
  
  // Detection States
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [detectedLocation, setDetectedLocation] = useState<{ country: string; state?: string }>({ country: initialCountry || 'International' });
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
  const [activeTab, setActiveTab] = useState<'dial' | 'guide'>('dial');

  // Trigger geolocation + fallback location detection
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
        toast.error("Could not determine IP location");
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
            
            // Build detailed printable address
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
    if (isOpen) {
      handleDetectLocation();
    }
  }, [isOpen]);

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-surface border-2 border-coral/30 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh] z-10"
          >
            {/* Urgent Warning Ribbon */}
            <div className="bg-gradient-to-r from-coral to-coral-bright text-white uppercase tracking-widest text-[10px] sm:text-xs font-black text-center py-2 px-4 shadow-sm flex items-center justify-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 animate-bounce" />
              <span>Medical Emergency SOS Services</span>
            </div>

            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border/65 flex items-center justify-between bg-gradient-to-b from-bg-warm/15 via-transparent to-transparent">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-text-primary tracking-tight font-display uppercase">Ambulance SOS</h3>
                <p className="text-xs text-text-muted font-bold font-mono">Location-Aware Immediate First Responders</p>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl bg-bg-warm hover:bg-coral/10 hover:text-coral transition-colors duration-200 border border-border"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* View selectors */}
            <div className="flex border-b border-border/50 px-5 bg-bg-warm/5">
              <button
                onClick={() => setActiveTab('dial')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2",
                  activeTab === 'dial' ? "border-coral text-coral" : "border-transparent text-text-muted hover:text-text-primary"
                )}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Dispatch Dial
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={cn(
                  "py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2",
                  activeTab === 'guide' ? "border-coral text-coral" : "border-transparent text-text-muted hover:text-text-primary"
                )}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                First Aid Guidelines
              </button>
            </div>

            {/* Scrollable Content (No standard browser scrollbars - custom styled fallback) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              
              {activeTab === 'dial' ? (
                <>
                  {/* Location Discovery Area */}
                  <div className="p-4 rounded-2xl bg-bg-warm/30 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0 animate-pulse">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Detected Location</span>
                        <div className="text-sm font-extrabold text-text-primary">
                          {isLoading ? (
                            <span className="text-text-muted text-xs flex items-center gap-1">
                              <span className="animate-spin text-accent">●</span> Discovering precise coordinates...
                            </span>
                          ) : (
                            <>
                              {detectedLocation.country}
                              {detectedLocation.state && <span className="text-text-secondary font-bold text-xs ml-1.5">({detectedLocation.state})</span>}
                            </>
                          )}
                        </div>
                        {address && !isLoading && (
                          <p className="text-[11px] text-text-muted font-semibold truncate max-w-[250px] sm:max-w-[300px]">
                            {address}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={copyCoordinates}
                        disabled={isLoading}
                        title="Copy coordinates and address to send via text"
                        className="flex-1 sm:flex-initial p-2 rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-accent/25 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={handleResetToAuto}
                        disabled={isLoading}
                        title="Force refresh coordinates"
                        className="flex-1 sm:flex-initial p-2 rounded-xl border border-border bg-surface text-text-secondary hover:text-accent hover:border-accent/25 transition-colors flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="inline sm:hidden">Refresh</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Call Action Card */}
                  <div className="bg-gradient-to-br from-surface-raised via-surface to-bg-warm/5 rounded-3xl border-2 border-coral/30 p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-[-5px] right-[-5px] w-24 h-24 bg-coral/5 rounded-full blur-xl group-hover:bg-coral/10 transition-all duration-300 pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 text-[8.5px] font-black uppercase bg-coral/10 text-coral border border-coral/20 rounded-md tracking-wider">
                        {contact.isCustomSelection ? "Manual Selection" : "Automatic Location Filter"}
                      </span>
                      <span className="text-[9.5px] font-mono text-text-muted font-bold">
                        {contact.countryName} {contact.stateName ? `// ${contact.stateName}` : ''}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-text-muted mb-4 uppercase tracking-wider leading-none">
                      Primary Ambulance Dispatch
                    </h4>

                    {/* Highly clickable Dial Box */}
                    <a 
                      href={`tel:${customAmbulance || contact.ambulance}`}
                      className="block w-full text-center bg-coral hover:bg-coral-bright active:scale-[0.99] transition-all py-6 sm:py-7 rounded-2xl sm:rounded-3xl shadow-md text-white font-black hover:shadow-lg shadow-coral/15"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-white/20 border border-white/20 flex items-center justify-center shadow-inner animate-pulse">
                          <PhoneCall className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-4xl sm:text-5xl font-mono tracking-widest leading-none drop-shadow-sm">
                          {customAmbulance || contact.ambulance}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/90">
                          Click to Dial Ambulance
                        </span>
                      </div>
                    </a>

                    {/* Details Box */}
                    <div className="mt-4 p-3 bg-bg-warm/30 rounded-xl border border-border/80 flex items-start gap-2">
                      <Info className="w-4.5 h-4.5 text-coral shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-text-primary font-display">{contact.dispatcherName}</p>
                        <p className="text-[10.5px] text-text-secondary leading-normal font-medium">{contact.notes}</p>
                      </div>
                    </div>

                    {/* Integrated Police and Fire Secondary Channels */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <a 
                        href={`tel:${contact.police}`}
                        className="py-2.5 px-3 rounded-xl border border-border bg-surface text-center font-bold text-xs uppercase text-text-secondary hover:text-text-primary hover:border-coral/20 flex items-center justify-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4 text-blue-500" />
                        <span>Police: {contact.police}</span>
                      </a>
                      <a 
                        href={`tel:${contact.fire}`}
                        className="py-2.5 px-3 rounded-xl border border-border bg-surface text-center font-bold text-xs uppercase text-text-secondary hover:text-text-primary hover:border-coral/20 flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber" />
                        <span>FireDept: {contact.fire}</span>
                      </a>
                    </div>
                  </div>

                  {/* Manual Location Override & World Search Database Dropdown */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Need a different country?</span>
                      {(selectedCountryKey || customAmbulance) && (
                        <button 
                          onClick={handleResetToAuto}
                          className="text-[9.5px] font-black text-coral uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Reset to automatic
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 bg-surface p-4 border border-border rounded-2xl shadow-sm">
                      {/* Search box */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                        <input 
                          type="text" 
                          placeholder="Search worldwide emergency database..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-bg-warm/40 border border-border focus:border-coral/30 focus:ring-1 focus:ring-coral/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary font-semibold outline-none transition-all"
                        />
                      </div>

                      {/* Flex dropdown panels */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Selector Country */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block">Select Country (Directory)</label>
                          <select 
                            value={selectedCountryKey}
                            onChange={(e) => {
                              setSelectedCountryKey(e.target.value);
                              setSelectedStateKey('');
                            }}
                            className="w-full bg-surface border border-border rounded-xl px-2.5 py-2 text-xs text-text-primary font-bold outline-none cursor-pointer focus:border-coral/30"
                          >
                            <option value="">-- Detected: {detectedLocation.country} --</option>
                            {filteredCountryKeys.map(key => (
                              <option key={key} value={key}>
                                {emergencyDatabase[key].countryName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selector State */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block">Select State/Province</label>
                          <select 
                            value={selectedStateKey}
                            onChange={(e) => setSelectedStateKey(e.target.value)}
                            disabled={!selectedCountryKey || !emergencyDatabase[selectedCountryKey]?.states}
                            className="w-full bg-surface border border-border rounded-xl px-2.5 py-2 text-xs text-text-primary font-bold outline-none cursor-not-allowed disabled:opacity-50 focus:border-coral/30"
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

                      {/* Manual overriding dial pad */}
                      <div className="mt-2.5 pt-2.5 border-t border-border/50">
                        <div className="flex gap-2">
                          <input 
                            type="tel" 
                            placeholder="Or type a custom emergency number to dial..."
                            value={customAmbulance}
                            onChange={(e) => setCustomAmbulance(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 bg-bg-warm/40 border border-border focus:border-coral/30 rounded-xl px-3 py-1.5 font-mono text-xs text-text-primary font-bold"
                          />
                          {customAmbulance && (
                            <button 
                              onClick={() => setCustomAmbulance('')}
                              className="px-2 bg-bg-warm text-text-muted rounded-xl hover:text-text-primary text-xs font-bold border border-border"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              ) : (
                /* Emergency Guidelines and CPR support */
                <div className="space-y-4">
                  
                  <div className="p-4 rounded-2xl bg-amber/5 border border-amber/15 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="text-xs font-black uppercase tracking-wider text-amber font-display">Time-Critical Support Guidance</h5>
                      <p className="text-[10.5px] text-text-secondary leading-relaxed font-semibold">
                        While waiting for the ambulance, stay composed. Clear the path for paramedics, gather prescription grids, and stabilize the patient's airway.
                      </p>
                    </div>
                  </div>

                  {/* CPR Standard Steps Card */}
                  <div className="p-4 border border-border rounded-2xl bg-surface space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-coral text-[10px] text-white flex items-center justify-center font-black">1</span>
                      <h4 className="text-xs font-black uppercase text-text-primary tracking-wider font-display">Adult Chest Compressions (CPR)</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-[10.5px] text-text-secondary pl-1 font-semibold">
                      <li>Place heel of one hand on the center of the chest. Interlock other hand.</li>
                      <li>Push hard and fast (100–120 compressions per minute).</li>
                      <li>Allow complete chest recoil between compressions.</li>
                      <li>Keep tempo to the song "Stayin' Alive" by the Bee Gees.</li>
                    </ul>
                  </div>

                  {/* Airway management */}
                  <div className="p-4 border border-border rounded-2xl bg-surface space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-coral text-[10px] text-white flex items-center justify-center font-black">2</span>
                      <h4 className="text-xs font-black uppercase text-text-primary tracking-wider font-display">Airway Clearance (Choking)</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-[10.5px] text-text-secondary pl-1 font-semibold">
                      <li>Deliver 5 back blows between the shoulder blades with the heel of your hand.</li>
                      <li>If object doesn't eject, perform 5 abdominal thrusts (Heimlich Maneuver).</li>
                      <li>Repeat till emergency responder teams arrive.</li>
                    </ul>
                  </div>

                  {/* Severe bleeding and burns */}
                  <div className="p-4 border border-border rounded-2xl bg-surface space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-coral text-[10px] text-white flex items-center justify-center font-black">3</span>
                      <h4 className="text-xs font-black uppercase text-text-primary tracking-wider font-display">Severe Bleeding & Shock</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-[10.5px] text-text-secondary pl-1 font-semibold">
                      <li>Apply constant firm, direct pressure securely on wound using a sterile cloth.</li>
                      <li>Elevate the bleeding limb above the heart if possible.</li>
                      <li>Keep the patient warm to combat metabolic shock.</li>
                    </ul>
                  </div>

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/60 bg-bg-warm/15 text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] font-display flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" /> MD-SECURE EMERGENCY BACKUP
              </span>
              <p className="text-[8.5px] text-text-muted max-w-[400px] leading-tight font-semibold">
                This panel is an educational locator tool. Triggering dial connects standard phone line calls directly using your carrier’s routing logic. Always coordinate with nearby responders in severe events.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
