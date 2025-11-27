'use client';

import { useEffect } from 'react';
import type { PostWithAnalysis } from '@/types';

interface DetailPanelProps {
  post: PostWithAnalysis | null;
  onClose: () => void;
}

export default function DetailPanel({ post, onClose }: DetailPanelProps) {
  useEffect(() => {
    if (post) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [post]);

  if (!post) return null;

  const severity = post.analysis?.severity || null;
  const severityColor =
    severity === 'Parah'
      ? 'bg-red-100 text-red-800 border-red-300'
      : severity === 'Sedang'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
      : 'bg-green-100 text-green-800 border-green-300';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          post ? 'translate-x-0' : 'translate-x-full'
        } overflow-y-auto`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Detail Informasi</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Image */}
          {post.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img
                src={post.image_url}
                alt="Post"
                className="w-full h-64 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                }}
              />
            </div>
          )}

          {/* Location */}
          {post.location_text && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-medium">{post.location_text}</span>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {post.analysis && (
            <div className="mb-4 space-y-3">
              <div className={`inline-block px-3 py-1 rounded-full border ${severityColor}`}>
                <span className="text-sm font-semibold">
                  {post.analysis.severity} - {post.analysis.category}
                </span>
              </div>

              {post.analysis.disaster_type && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Jenis Bencana: </span>
                  <span className="text-sm text-gray-600">{post.analysis.disaster_type}</span>
                </div>
              )}

              {post.analysis.urgent_needs && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Kebutuhan Mendesak: </span>
                  <span className="text-sm text-gray-600">{post.analysis.urgent_needs}</span>
                </div>
              )}

              {post.analysis.confidence && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Tingkat Keyakinan: </span>
                  <span className="text-sm text-gray-600">
                    {(post.analysis.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Post Text */}
          {post.text && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Deskripsi Postingan</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.text}</p>
            </div>
          )}

          {/* Timestamp */}
          {post.timestamp && (
            <div className="text-xs text-gray-500">
              {new Date(post.timestamp).toLocaleString('id-ID')}
            </div>
          )}

          {/* Source Link */}
          <div className="mt-4 pt-4 border-t">
            <a
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-2"
            >
              <span>Lihat di Instagram</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

