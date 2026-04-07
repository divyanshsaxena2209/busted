import { Router } from 'express';
import { supabase } from '../db/supabaseClient.ts';

const router = Router();

// ✅ CREATE REPORT
router.post('/log', async (req, res) => {
  try {
    const body = req.body;

    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    const { data, error } = await supabase
      .from('reports')
      .insert([{
        report_id: body.report_id,
        user_id: body.user_id,
        issue_type: body.issue_type,
        state: body.state,
        latitude: body.latitude,
        longitude: body.longitude,
        formatted_address: body.formatted_address,
        selected_handle: body.selected_handle,
        created_at: body.timestamp,
        message_preview: body.message_preview,
        channel_type: body.channel_type,
        status: body.status
      }]);

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Report saved",
      data
    });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});

// ✅ GET HISTORY
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

export const reportRoutes = router;
