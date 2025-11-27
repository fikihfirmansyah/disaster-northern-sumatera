export type Severity = 'Parah' | 'Sedang' | 'Aman';

export type DisasterType = 
  | 'Banjir' 
  | 'Longsor' 
  | 'Gempa' 
  | 'Kebakaran' 
  | 'Angin Kencang' 
  | 'Lainnya';

export interface InstagramAccount {
  id: string;
  account_url: string;
  account_username: string | null;
  created_at: string | Date;
  last_scraped_at: string | Date | null;
  is_active: boolean | number;
}

export interface Post {
  id: string;
  account_id: string;
  post_url: string;
  image_url: string | null;
  image_r2_key: string | null;
  text: string | null;
  caption: string | null;
  hashtags: string[];
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: string | Date | null;
  scraped_at: string | Date;
}

export interface AIAnalysis {
  id: string;
  post_id: string;
  severity: Severity;
  category: string;
  urgent_needs: string | null;
  disaster_type: string | null;
  location_extracted: string | null;
  confidence: number | null;
  analyzed_at: string | Date;
}

export interface PostWithAnalysis extends Post {
  analysis: AIAnalysis | null;
  account: InstagramAccount | null;
}

export interface Location {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  region: string | null;
  created_at: string | Date;
}

export interface ScrapeRequest {
  account_url?: string;
  hashtag?: string;
}

export interface AnalyzeRequest {
  text: string;
  image_url?: string;
  location_text?: string;
}

export interface AnalyzeResponse {
  severity: Severity;
  category: string;
  urgent_needs: string[];
  disaster_type: DisasterType;
  location_extracted: string | null;
  confidence: number;
}

export interface FilterOptions {
  severity?: Severity[];
  disaster_type?: DisasterType[];
  area?: string;
}

export interface IsolatedArea {
  id: string;
  name: string;
  type: 'isolated' | 'congested' | 'warning' | 'blocked_route';
  coordinates: Array<{ lat: number; lng: number }>;
  severity: Severity;
  description?: string;
  post_count?: number;
}

