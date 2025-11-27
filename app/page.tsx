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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
                Disaster Monitoring
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Aceh, Sumatra Utara, Sumatra Barat
              </p>
            </div>
            <a
              href="/admin"
              className="ml-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
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

          {/* Mobile Controls - Top Left */}
          <div className="lg:hidden absolute top-3 left-3 z-20 flex flex-col gap-2">
            {/* Mobile Filter Toggle */}
            <button
              className="bg-white px-3 py-2 rounded-md shadow-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-1"
              onClick={() => setShowMobileFilters(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter</span>
            </button>
          </div>

          {/* Mobile Stats - Top Center */}
          <div className="lg:hidden absolute top-3 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-white px-3 py-1.5 rounded-md shadow-lg">
              <div className="text-xs text-center">
                <span className="font-semibold text-gray-800">{filteredPosts.length}</span>
                <span className="text-gray-600"> lokasi</span>
              </div>
            </div>
          </div>

          {/* Desktop Stats and Controls - Top Right */}
          <div className="hidden lg:block absolute top-4 right-4 z-20 space-y-2">
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

          {/* Mobile Toggle Isolated Areas - Bottom Right */}
          <div className="lg:hidden absolute bottom-3 right-3 z-20">
            <button
              className="bg-white px-3 py-2 rounded-md shadow-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-1"
              onClick={() => setShowIsolatedAreas(!showIsolatedAreas)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>{showIsolatedAreas ? 'Sembunyikan' : 'Tampilkan'} Area</span>
            </button>
          </div>
        </main>
      </div>

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="lg:hidden fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FilterPanel onFilterChange={handleFilterChange} />
            </div>
          </div>
        </>
      )}

      {/* Detail Panel */}
      <DetailPanel post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
}
