import { db } from './firebase';
import type { 
  InstagramAccount, 
  Post, 
  AIAnalysis, 
  PostWithAnalysis,
  Location,
  FilterOptions 
} from '@/types';

// Account operations
export async function getAllAccounts(): Promise<InstagramAccount[]> {
  if (!db) throw new Error('Firebase not initialized');
  
  const accountsRef = db.collection('instagram_accounts');
  // Query without orderBy to avoid index requirement, then sort in memory
  const snapshot = await accountsRef.where('is_active', '==', true).get();
  
  const accounts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as InstagramAccount[];
  
  // Sort by created_at in memory (descending)
  accounts.sort((a, b) => {
    const dateA = a.created_at instanceof Date ? a.created_at.getTime() : new Date(a.created_at).getTime();
    const dateB = b.created_at instanceof Date ? b.created_at.getTime() : new Date(b.created_at).getTime();
    return dateB - dateA;
  });
  
  return accounts;
}

export async function addAccount(accountUrl: string, username?: string): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');
  
  const accountsRef = db.collection('instagram_accounts');
  const docRef = await accountsRef.add({
    account_url: accountUrl,
    account_username: username || null,
    created_at: new Date(),
    last_scraped_at: null,
    is_active: true,
  });
  
  return docRef.id;
}

export async function deleteAccount(id: string): Promise<boolean> {
  if (!db) throw new Error('Firebase not initialized');
  
  try {
    await db.collection('instagram_accounts').doc(id).update({
      is_active: false,
    });
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    return false;
  }
}

// Post operations
export async function addPost(post: Omit<Post, 'id' | 'scraped_at'>): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');
  
  const postsRef = db.collection('posts');
  const docRef = await postsRef.add({
    ...post,
    hashtags: post.hashtags || [],
    scraped_at: new Date(),
  });
  
  return docRef.id;
}

export async function getPostByUrl(postUrl: string): Promise<Post | null> {
  if (!db) throw new Error('Firebase not initialized');
  
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.where('post_url', '==', postUrl).limit(1).get();
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Post;
}

export async function getPostsWithAnalysis(
  filters?: FilterOptions
): Promise<PostWithAnalysis[]> {
  if (!db) {
    console.warn('Firebase not initialized, returning empty array');
    return [];
  }
  
  try {
    let query: FirebaseFirestore.Query = db.collection('posts');
    
    // Fetch posts (without orderBy to avoid index requirement, will sort in memory)
    // Limit to reasonable number to avoid performance issues
    query = query.limit(1000);
    
    const snapshot = await query.get();
  let posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Post[];
  
  // Sort by timestamp in memory (descending)
  posts.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    const dateA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
    const dateB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
  
  // Fetch analysis for each post
  const postsWithAnalysis: PostWithAnalysis[] = [];
  
  for (const post of posts) {
    const analysisSnapshot = await db.collection('ai_analysis')
      .where('post_id', '==', post.id)
      .limit(1)
      .get();
    
    const analysis = analysisSnapshot.empty ? null : {
      id: analysisSnapshot.docs[0].id,
      ...analysisSnapshot.docs[0].data(),
    } as AIAnalysis;
    
    // Fetch account
    const accountSnapshot = await db.collection('instagram_accounts')
      .doc(post.account_id)
      .get();
    
    const account = accountSnapshot.exists ? {
      id: accountSnapshot.id,
      ...accountSnapshot.data(),
    } as InstagramAccount : null;
    
    // Apply filters
    if (filters?.severity && filters.severity.length > 0) {
      if (!analysis || !filters.severity.includes(analysis.severity)) {
        continue;
      }
    }
    
    if (filters?.disaster_type && filters.disaster_type.length > 0) {
      if (!analysis || !filters.disaster_type.includes(analysis.disaster_type as any)) {
        continue;
      }
    }
    
    if (filters?.area) {
      const areaLower = filters.area.toLowerCase();
      const locationMatch = post.location_text?.toLowerCase().includes(areaLower) ||
                           analysis?.location_extracted?.toLowerCase().includes(areaLower);
      if (!locationMatch) {
        continue;
      }
    }
    
    postsWithAnalysis.push({
      ...post,
      analysis,
      account,
    });
  }
  
  return postsWithAnalysis;
  } catch (error) {
    console.error('Error fetching posts from Firestore:', error);
    return [];
  }
}

// AI Analysis operations
export async function addAnalysis(
  postId: string, 
  analysis: Omit<AIAnalysis, 'id' | 'post_id' | 'analyzed_at'>
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');
  
  const analysisRef = db.collection('ai_analysis');
  const docRef = await analysisRef.add({
    post_id: postId,
    ...analysis,
    analyzed_at: new Date(),
  });
  
  return docRef.id;
}

export async function getAnalysisByPostId(postId: string): Promise<AIAnalysis | null> {
  if (!db) throw new Error('Firebase not initialized');
  
  const analysisRef = db.collection('ai_analysis');
  const snapshot = await analysisRef.where('post_id', '==', postId).limit(1).get();
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as AIAnalysis;
}

export async function updateAnalysis(
  analysisId: string,
  updates: Partial<Omit<AIAnalysis, 'id' | 'post_id' | 'analyzed_at'>>
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  await db.collection('ai_analysis').doc(analysisId).update({
    ...updates,
    analyzed_at: new Date(), // Update analyzed_at when updating
  });
}

// Location operations
export async function getLocationByName(locationName: string): Promise<Location | null> {
  if (!db) throw new Error('Firebase not initialized');
  
  const locationsRef = db.collection('locations');
  const snapshot = await locationsRef.where('location_name', '==', locationName).limit(1).get();
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Location;
}

export async function addLocation(
  location: Omit<Location, 'id' | 'created_at'>
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');
  
  const locationsRef = db.collection('locations');
  const docRef = await locationsRef.add({
    ...location,
    created_at: new Date(),
  });
  
  return docRef.id;
}

// Instagram credentials and session operations
export interface InstagramCredentials {
  id?: string;
  username: string;
  password: string; // In production, this should be encrypted
  cookies?: any[];
  last_login?: Date;
  is_valid?: boolean;
}

export async function getInstagramCredentials(): Promise<InstagramCredentials | null> {
  if (!db) throw new Error('Firebase not initialized');
  
  const credsRef = db.collection('instagram_credentials');
  const snapshot = await credsRef.limit(1).get();
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    username: data.username,
    password: data.password,
    cookies: data.cookies || [],
    last_login: data.last_login?.toDate(),
    is_valid: data.is_valid !== false,
  };
}

export async function saveInstagramCredentials(
  credentials: InstagramCredentials
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');
  
  const credsRef = db.collection('instagram_credentials');
  
  // Check if credentials already exist
  const existing = await getInstagramCredentials();
  
  if (existing?.id) {
    // Update existing
    await credsRef.doc(existing.id).update({
      username: credentials.username,
      password: credentials.password,
      cookies: credentials.cookies || [],
      last_login: new Date(),
      is_valid: true,
    });
    return existing.id;
  } else {
    // Create new
    const docRef = await credsRef.add({
      username: credentials.username,
      password: credentials.password,
      cookies: credentials.cookies || [],
      last_login: new Date(),
      is_valid: true,
    });
    return docRef.id;
  }
}

export async function saveInstagramCookies(cookies: any[]): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const credsRef = db.collection('instagram_credentials');
  const snapshot = await credsRef.limit(1).get();
  
  if (snapshot.empty) {
    console.warn('No credentials found to save cookies to');
    return;
  }
  
  // Clean cookies to remove undefined values and non-serializable properties
  const cleanCookies = cookies.map(cookie => {
    const clean: any = {};
    // Only include properties that are valid Firestore values
    if (cookie.name !== undefined) clean.name = cookie.name;
    if (cookie.value !== undefined) clean.value = cookie.value;
    if (cookie.domain !== undefined) clean.domain = cookie.domain;
    if (cookie.path !== undefined) clean.path = cookie.path;
    if (cookie.expires !== undefined) clean.expires = cookie.expires;
    if (cookie.httpOnly !== undefined) clean.httpOnly = cookie.httpOnly;
    if (cookie.secure !== undefined) clean.secure = cookie.secure;
    if (cookie.sameSite !== undefined) clean.sameSite = cookie.sameSite;
    return clean;
  }).filter(cookie => cookie.name && cookie.value); // Only keep cookies with name and value
  
  await credsRef.doc(snapshot.docs[0].id).update({
    cookies: cleanCookies,
    last_login: new Date(),
  });
}

// Post update operation
export async function updatePost(
  postId: string,
  updates: Partial<Omit<Post, 'id' | 'scraped_at'>>
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  await db.collection('posts').doc(postId).update({
    ...updates,
    scraped_at: new Date(), // Update scraped_at when updating
  });
}

export async function getPostIdByUrl(postUrl: string): Promise<string | null> {
  if (!db) throw new Error('Firebase not initialized');
  
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.where('post_url', '==', postUrl).limit(1).get();
  
  if (snapshot.empty) return null;
  
  return snapshot.docs[0].id;
}
