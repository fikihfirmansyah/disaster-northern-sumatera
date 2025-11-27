'use client';

import { useState } from 'react';
import type { Severity, DisasterType, FilterOptions } from '@/types';

interface FilterPanelProps {
  onFilterChange: (filters: FilterOptions) => void;
}

const severityOptions: Severity[] = ['Parah', 'Sedang', 'Aman'];
const disasterTypeOptions: DisasterType[] = [
  'Banjir',
  'Longsor',
  'Gempa',
  'Kebakaran',
  'Angin Kencang',
  'Lainnya',
];

export default function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<Severity[]>([]);
  const [selectedDisasterTypes, setSelectedDisasterTypes] = useState<DisasterType[]>([]);
  const [areaSearch, setAreaSearch] = useState('');

  const handleSeverityToggle = (severity: Severity) => {
    const newSelection = selectedSeverity.includes(severity)
      ? selectedSeverity.filter(s => s !== severity)
      : [...selectedSeverity, severity];
    setSelectedSeverity(newSelection);
    onFilterChange({
      severity: newSelection.length > 0 ? newSelection : undefined,
      disaster_type: selectedDisasterTypes.length > 0 ? selectedDisasterTypes : undefined,
      area: areaSearch || undefined,
    });
  };

  const handleDisasterTypeToggle = (type: DisasterType) => {
    const newSelection = selectedDisasterTypes.includes(type)
      ? selectedDisasterTypes.filter(t => t !== type)
      : [...selectedDisasterTypes, type];
    setSelectedDisasterTypes(newSelection);
    onFilterChange({
      severity: selectedSeverity.length > 0 ? selectedSeverity : undefined,
      disaster_type: newSelection.length > 0 ? newSelection : undefined,
      area: areaSearch || undefined,
    });
  };

  const handleAreaSearch = (value: string) => {
    setAreaSearch(value);
    onFilterChange({
      severity: selectedSeverity.length > 0 ? selectedSeverity : undefined,
      disaster_type: selectedDisasterTypes.length > 0 ? selectedDisasterTypes : undefined,
      area: value || undefined,
    });
  };

  const handleClearFilters = () => {
    setSelectedSeverity([]);
    setSelectedDisasterTypes([]);
    setAreaSearch('');
    onFilterChange({});
  };

  const hasActiveFilters = selectedSeverity.length > 0 || selectedDisasterTypes.length > 0 || areaSearch.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Severity Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Tingkat Keparahan</h3>
        <div className="space-y-2">
          {severityOptions.map((severity) => (
            <label
              key={severity}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedSeverity.includes(severity)}
                onChange={() => handleSeverityToggle(severity)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{severity}</span>
              <span
                className={`w-3 h-3 rounded-full ${
                  severity === 'Parah'
                    ? 'bg-red-500'
                    : severity === 'Sedang'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Disaster Type Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Jenis Bencana</h3>
        <div className="space-y-2">
          {disasterTypeOptions.map((type) => (
            <label
              key={type}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedDisasterTypes.includes(type)}
                onChange={() => handleDisasterTypeToggle(type)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Area Search */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Cari Area</h3>
        <input
          type="text"
          placeholder="Kabupaten/Kota..."
          value={areaSearch}
          onChange={(e) => handleAreaSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

