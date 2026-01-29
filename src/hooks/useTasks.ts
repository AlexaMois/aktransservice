/**
 * Task hooks - Google Sheets is the ONLY source of truth
 * 
 * IMPORTANT: This file re-exports GSheets hooks only
 * Supabase hooks for non-task entities (legacy support)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DigitizationQueueItem, NotAutomatingItem, ExperimentItem } from '@/types/task';
import { mapToDigitizationQueueItem, mapToNotAutomatingItem, mapToExperimentItem } from '@/lib/typeGuards';

// Re-export GSheets hooks - these are the ONLY way to work with tasks
export { useGSheetsTasks, useGSheetsComments } from './useGSheetsTasks';

// NOTE: useTasks() for tasks has been REMOVED
// All task operations MUST go through useGSheetsTasks()

// Legacy Supabase hooks for non-task entities

export function useDigitizationQueue() {
  const [items, setItems] = useState<DigitizationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('digitization_queue')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching digitization queue:', error);
        setItems([]);
      } else if (data) {
        const mapped = data.map(row => mapToDigitizationQueueItem(row as Record<string, unknown>));
        setItems(mapped);
      } else {
        setItems([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { items, loading };
}

export function useNotAutomating() {
  const [items, setItems] = useState<NotAutomatingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('not_automating')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching not automating:', error);
        setItems([]);
      } else if (data) {
        const mapped = data.map(row => mapToNotAutomatingItem(row as Record<string, unknown>));
        setItems(mapped);
      } else {
        setItems([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { items, loading };
}

export function useExperiments() {
  const [items, setItems] = useState<ExperimentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching experiments:', error);
        setItems([]);
      } else if (data) {
        const mapped = data.map(row => mapToExperimentItem(row as Record<string, unknown>));
        setItems(mapped);
      } else {
        setItems([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { items, loading };
}
