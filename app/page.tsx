'use client';

import { useState, useEffect } from 'react';
import DisasterMap from '@/components/DisasterMap';
import FilterPanel from '@/components/FilterPanel';
import DetailPanel from '@/components/DetailPanel';
import type { PostWithAnalysis, FilterOptions } from '@/types';

export default function Home() {
  const [posts, setPosts] = useState<PostWithAnalysis[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithAnalysis[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostWithAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showIsolatedAreas, setShowIsolatedAreas] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [posts, filters]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filters.severity) {
        params.append('severity', filters.severity.join(','));
      }
      if (filters.disaster_type) {
        params.append('disaster_type', filters.disaster_type.join(','));
      }
      if (filters.area) {
        params.append('area', filters.area);
      }

      const response = await fetch(`/api/posts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched posts:', data.posts?.length || 0);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...posts];

    if (filters.severity && filters.severity.length > 0) {
      filtered = filtered.filter(
        (post) => post.analysis && filters.severity!.includes(post.analysis.severity)
      );
    }

    if (filters.disaster_type && filters.disaster_type.length > 0) {
      filtered = filtered.filter(
        (post) => post.analysis && filters.disaster_type!.includes(post.analysis.disaster_type as any)
      );
    }

    if (filters.area) {
      const areaLower = filters.area.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.location_text?.toLowerCase().includes(areaLower) ||
          post.analysis?.location_extracted?.toLowerCase().includes(areaLower)
      );
    }

    setFilteredPosts(filtered);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Disaster Monitoring
              </h1>
              <p className="text-sm text-gray-600">
                Aceh, Sumatra Utara, Sumatra Barat
              </p>
            </div>
            <a
              href="/admin"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Admin Panel
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Sidebar */}
        <aside className="hidden lg:block w-80 bg-gray-50 p-4 overflow-y-auto">
          <FilterPanel onFilterChange={handleFilterChange} />
        </aside>

        {/* Map Area */}
        <main className="flex-1 relative min-h-0">
          <DisasterMap
            posts={filteredPosts}
            onMarkerClick={setSelectedPost}
            showIsolatedAreas={showIsolatedAreas}
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading disaster data...</p>
              </div>
            </div>
          )}

          {/* Mobile Filter Toggle */}
          <div className="lg:hidden absolute top-4 left-4 z-20">
            <button
              className="bg-white px-4 py-2 rounded-md shadow-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                // Toggle mobile filter panel (you can implement a drawer/modal)
                alert('Mobile filter panel - to be implemented');
              }}
            >
              Filters
            </button>
          </div>

          {/* Stats and Controls */}
          <div className="absolute top-4 right-4 z-20 space-y-2">
            {/* Stats */}
            <div className="bg-white px-4 py-2 rounded-md shadow-lg">
              <div className="text-sm">
                <span className="font-medium text-gray-700">
                  {filteredPosts.length}
                </span>
                <span className="text-gray-600"> lokasi ditemukan</span>
              </div>
            </div>
            
            {/* Toggle Isolated Areas */}
            <div className="bg-white px-4 py-3 rounded-md shadow-lg">
              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={showIsolatedAreas}
                  onChange={(e) => setShowIsolatedAreas(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Tampilkan Area Terisolasi
                </span>
              </label>
              {showIsolatedAreas && (
                <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Area Terisolasi (Parah)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Area Terdampak (Sedang)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Area Terpantau (Aman)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Detail Panel */}
      <DetailPanel post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
}
