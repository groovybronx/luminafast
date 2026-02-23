import React, { useState, useEffect } from 'react';
import { parseSearchQuery } from '@/lib/searchParser';
import type { SearchQuery } from '@/types/search';

interface SearchBarProps {
  onSearch: (query: SearchQuery) => void;
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');

  // Debounce : appelle onSearch après 500ms d'inactivité
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim()) {
        const query = parseSearchQuery(input);
        onSearch(query);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [input, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const query = parseSearchQuery(input);
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <input
        type="text"
        className="flex-1 px-3 py-2 rounded border"
        placeholder="Recherche (ex: iso:>3200 star:4)"
        value={input}
        onChange={handleChange}
        disabled={isLoading}
        aria-label="Recherche catalogue"
      />
      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? 'Recherche…' : 'Rechercher'}
      </button>
    </form>
  );
};
