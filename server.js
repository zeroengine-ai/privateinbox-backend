const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const generateEmail = () => {
  const names = ['alex.johnson', 'sarah.wilson', 'mike.brown', 'lisa.davis', 'john.smith', 'emma.taylor'];
  const domains = ['privateinbox.net', 'securemail.space', 'privacybox.io'];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  const randomNum = Math.floor(Math.random() * 999);
  
  return `${randomName}${randomNum}@${randomDomain}`;
};

app.post('/api/generate-email', async (req, res) => {
  try {
    const email = generateEmail();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('temp_emails')
      .insert([{
        email_address: email,
        expires_at: expiresAt,
        is_active: true,
        plan_type: 'free'
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      email: email,
      expires_at: expiresAt,
      id: data.id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/emails/:emailAddress', async (req, res) => {
  try {
    const { emailAddress } = req.params;
    
    const { data, error } = await supabase
      .from('received_emails')
      .select('*')
      .eq('recipient_email', emailAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      emails: data || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PrivateInbox API is running!',
    timestamp: new Date().toISOString()
  });
});

const cleanupExpiredEmails = async () => {
  try {
    await supabase
      .from('temp_emails')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

setInterval(cleanupExpiredEmails, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`PrivateInbox server running on port ${PORT}`);
});

module.exports = app;
