'use client';

import { useState, useEffect } from 'react';
import type { InstagramAccount } from '@/types';

export default function AdminPanel() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [newAccountUrl, setNewAccountUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountUrl.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_url: newAccountUrl }),
      });

      if (response.ok) {
        setNewAccountUrl('');
        fetchAccounts();
      } else {
        alert('Failed to add account');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Error adding account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const response = await fetch(`/api/accounts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAccounts();
      } else {
        alert('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account');
    }
  };

  const handleTriggerScrape = async () => {
    if (!confirm('Trigger scraping for all accounts? This may take a while.')) return;

    try {
      setScrapingStatus('Scraping in progress...');
      const response = await fetch('/api/scrape/trigger', {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok) {
        setScrapingStatus(`Success! Processed ${data.total_processed} posts.`);
      } else {
        setScrapingStatus('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error triggering scrape:', error);
      setScrapingStatus('Error triggering scrape');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-600 mt-2">Manage Instagram accounts and scraping</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Map
          </a>
        </div>

        {/* Add Account Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Instagram Account</h2>
          <form onSubmit={handleAddAccount} className="flex space-x-4">
            <input
              type="url"
              value={newAccountUrl}
              onChange={(e) => setNewAccountUrl(e.target.value)}
              placeholder="https://www.instagram.com/username/"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Account'}
            </button>
          </form>
        </div>

        {/* Scrape Trigger */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Scraping Control</h2>
          <button
            onClick={handleTriggerScrape}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Trigger Scraping for All Accounts
          </button>
          {scrapingStatus && (
            <p className="mt-4 text-sm text-gray-600">{scrapingStatus}</p>
          )}
        </div>

        {/* Accounts List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Configured Accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-gray-500">No accounts configured yet.</p>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <a
                      href={account.account_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {account.account_username || account.account_url}
                    </a>
                    {account.last_scraped_at && (
                      <p className="text-sm text-gray-500 mt-1">
                        Last scraped: {new Date(account.last_scraped_at).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

