export async function getCountryFromIP(): Promise<string> {
  const providers = [
    'https://ipapi.co/json/',
    'https://ipwho.is/',
    'https://api.iplocation.net/?cmd=get-country'
  ];

  for (const url of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      const data = await response.json();
      
      // Handle different formats
      const country = data.country_name || data.country || data.country_name;
      if (country) return country;
    } catch (e) {
      // Silently try next provider
    }
  }

  return 'International';
}

export async function getLocationDetailsFromIP(): Promise<{ country: string; state?: string }> {
  const providers = [
    { url: 'https://ipapi.co/json/', countryField: 'country_name', stateField: 'region' },
    { url: 'https://ipwho.is/', countryField: 'country', stateField: 'region' }
  ];

  for (const prov of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(prov.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      const data = await response.json();
      
      const country = data[prov.countryField];
      const state = data[prov.stateField];
      if (country) {
        return { country, state: state || undefined };
      }
    } catch (e) {
      // Silently try next provider
    }
  }

  // Final fallback
  try {
    const rawCountry = await getCountryFromIP();
    return { country: rawCountry };
  } catch {
    return { country: 'International' };
  }
}

export async function getCountryFromCoords(lat: number, lon: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'Accept-Language': 'en' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) return 'International';
    const data = await response.json();
    return data.address?.country || 'International';
  } catch (error) {
    return 'International';
  }
}

export async function getLocationDetailsFromCoords(lat: number, lon: number): Promise<{ country: string; state?: string; city?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'MedScanEmergencySOS/1.0' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) return { country: 'International' };
    const data = await response.json();
    
    const country = data.address?.country || 'International';
    const state = data.address?.state || data.address?.province || data.address?.region || data.address?.state_district;
    const city = data.address?.city || data.address?.town || data.address?.village;
    
    return { 
      country, 
      state: state || undefined,
      city: city || undefined
    };
  } catch (error) {
    return { country: 'International' };
  }
}
