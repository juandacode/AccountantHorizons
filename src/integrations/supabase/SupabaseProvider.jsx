import React, { createContext, useContext, useState, useEffect } from 'react';

const SupabaseContext = createContext(null);

export const SupabaseProvider = ({ children }) => {
  const [supabase, setSupabase] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          console.warn("Supabase URL or Anon Key is not defined. Supabase client not initialized. Please complete Supabase integration steps.");
          setError(new Error("Supabase URL or Anon Key is not defined. Please complete Supabase integration steps."));
          setSupabase(null);
          setLoading(false);
          return;
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabase(supabaseClient);
        
      } catch (e) {
        console.error("Error initializing Supabase client:", e);
        setError(e);
        setSupabase(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSupabase();
  }, []);

  const value = {
    supabase,
    error,
    loading,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  if (context === null) {
     return { supabase: null, error: new Error("Supabase context is null, integration might be incomplete."), loading: false };
  }
  return context;
};