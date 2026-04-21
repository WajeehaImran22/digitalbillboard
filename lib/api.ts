/**
 * AXIOM TERMINAL // API ARCHITECTURE
 * Unified interface for backend communication and token management.
 */

// Use the environment variable for production (Vercel) or fallback to local
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://wajeehaaa-digitalbillboard.hf.space") as string;
const TOKEN_KEY = 'access_token';

/**
 * Persists the JWT token to local storage
 */
export const setToken = (token: string) => {
  if (typeof window !== 'undefined' && token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Retrieves the current token, filtering out invalid string states
 */
export const getToken = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
  }
  return null;
};

/**
 * Protocol: URL Token Capture
 * Use this in your Dashboard's useEffect to grab the token passed by the backend redirect.
 */
export const syncTokenFromUrl = () => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) {
        setToken(token);
        // Clean the URL hash for a professional UI and security
        window.history.replaceState({}, document.title, window.location.pathname);
        return token;
      }
    }
  }
  return null;
};

/**
 * Wipes local session and returns user to the gate
 */
export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/auth';
  }
};

/**
 * Enhanced fetch wrapper with automatic Authorization injection.
 * Handles Bearer tokens and cross-site credential requirements.
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}, isBlob = false) {
  const token = getToken();
  
  // URL Normalization
  const cleanBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});

  // Set JSON content-type unless we are sending FormData (uploads)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer Token if available
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { 
    ...options, 
    headers,
    // Critical for cross-domain cookie support if used
    credentials: 'include' 
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // Fallback for non-JSON error responses
    }
    
    // Auto-logout if unauthorized (Session Expired)
    if (response.status === 401) {
      console.warn("Session expired or invalid. Re-authenticating...");
      // logout(); // Uncomment this once production testing is finalized
    }
    
    throw new Error(errorMessage);
  }

  return isBlob ? response.blob() : response.json();
}

// --- Interfaces ---

export interface ProfileResponse {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  role?: 'user' | 'admin';
  avatar_url?: string;
}

export interface AdRecord {
  id: string;
  url: string;
  media_type: 'image' | 'video';
  prompt: string;
  time_of_day: string;
  weather_condition: string;
  created_at: string;
}

export interface VideoGenerateResponse {
  message: string;
  video_url: string;
}

// --- API Modules ---

export const authAPI = {
  login: (credentials: Record<string, string>): Promise<any> => 
    fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    
  signup: (credentials: Record<string, string>): Promise<any> => 
    fetchWithAuth('/auth/signup', { method: 'POST', body: JSON.stringify(credentials) }),

  forgotPassword: (email: string): Promise<any> => 
    fetchWithAuth('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  getGoogleAuthUrl: (): Promise<{ url: string }> => 
    fetchWithAuth('/auth/google', { method: 'GET' }),
};

export const profileAPI = {
  getMe: (): Promise<ProfileResponse> => 
    fetchWithAuth('/profile/me', { method: 'GET' }),
    
  updateProfile: (data: { full_name?: string; company_name?: string }): Promise<ProfileResponse> => 
    fetchWithAuth('/profile/me', { method: 'PUT', body: JSON.stringify(data) }),
    
  getHistory: (): Promise<AdRecord[]> => 
    fetchWithAuth('/profile/history', { method: 'GET' }),
};

export const scheduleAPI = {
  deploy: (data: {
    ad_id: string;
    media_url: string;   
    media_type: string;  
    date: string;
    time: string;
    duration_hours: number;
    tier: string;
    total_price: number;
  }): Promise<any> => 
    fetchWithAuth('/videos/schedules/deploy', { method: 'POST', body: JSON.stringify(data) }),
};

export const adminAPI = {
  getLogs: (): Promise<any[]> => 
    fetchWithAuth('/admin/logs', { method: 'GET' }),
};

export const adAPI = {
  enhanceVideoPrompt: (prompt: string): Promise<any> => 
    fetchWithAuth('/ads/enhance-prompt', { method: 'POST', body: JSON.stringify({ prompt }) }),
    
  enhanceImagePrompt: (prompt: string): Promise<any> => 
    fetchWithAuth('/ads/enhance-image-prompt', { method: 'POST', body: JSON.stringify({ prompt }) }),
};

export const mediaAPI = {
  generateImage: (data: { prompt: string, time_of_day?: string, weather_condition?: string }): Promise<Blob> => 
    fetchWithAuth('/images/generate', { method: 'POST', body: JSON.stringify(data) }, true),

  generateVideoSequence: (data: { prompts: string[], time_of_day?: string, weather_condition?: string }): Promise<VideoGenerateResponse> => 
    fetchWithAuth('/videos/generate', { method: 'POST', body: JSON.stringify(data) }),
};

export const videoAPI = {
  upload: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithAuth('/videos/upload', { 
      method: 'POST', 
      body: formData 
    });
  }
};

export const billboardAPI = {
  getActiveAd: (): Promise<any> => 
    fetchWithAuth('/billboard/active', { method: 'GET' }),
};