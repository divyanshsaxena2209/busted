import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

const router = Router();

// Log a new report (Traffic or Civic)
router.post('/log', async (req, res) => {
  const { 
    report_id, 
    user_id, 
    issue_type, 
    state, 
    latitude, 
    longitude, 
    formatted_address, 
    selected_handle, 
    timestamp, 
    message_preview, 
    channel_type, 
    status 
  } = req.body;

  try {
    // Attempt to insert into Supabase if configured
    if (supabase) {
      const { data, error } = await supabase
        .from('reports')
        .insert([
          { 
            report_id, 
            user_id, 
            issue_type, 
            state, 
            latitude, 
            longitude, 
            formatted_address, 
            selected_handle, 
            timestamp, 
            message_preview, 
            channel_type, 
            status 
          }
        ]);
      
      if (error) throw error;
      res.status(201).json({ message: 'Report logged successfully', data });
    } else {
      // Fallback: Log to console if no DB configured
      console.log('[BACKEND LOG] Report received:', req.body);
      res.status(201).json({ message: 'Report logged locally (DB not configured)', data: req.body });
    }
  } catch (error: any) {
    console.error('Error logging report:', error.message);
    res.status(500).json({ error: 'Failed to log report' });
  }
});

// Get report history for a user
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      res.json(data);
    } else {
      // Mock data if no DB
      res.json([]);
    }
  } catch (error: any) {
    console.error('Error fetching history:', error.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export const reportRoutes = router;
