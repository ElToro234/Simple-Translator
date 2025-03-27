require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { language, message } = req.body;
    
    const response = await openai.chat.completions.create({
      messages: [{ 
        role: 'user', 
        content: `Translate this into ${language}: ${message}` 
      }],
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      max_tokens: 100
    });

    const translatedText = response.choices[0].message.content.trim();
    res.json({ translation: translatedText });
    
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
  
  // Create Translation schema
  const translationSchema = new mongoose.Schema({
    originalText: String,
    translatedText: String,
    language: String,
    createdAt: { type: Date, default: Date.now }
  });
  
  const Translation = mongoose.model('Translation', translationSchema);
  
  // Update translation endpoint to save to DB
  app.post('/api/translate', async (req, res) => {
    try {
      const { language, message } = req.body;
      
      const response = await openai.chat.completions.create({
        messages: [{ role: 'user', content: `Translate this into ${language}: ${message}` }],
        model: 'gpt-3.5-turbo'
      });
  
      const translatedText = response.choices[0].message.content.trim();
      
      // Save to database
      const newTranslation = new Translation({
        originalText: message,
        translatedText,
        language
      });
      
      await newTranslation.save();
      
      res.json({ translation: translatedText });
      
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Translation failed' });
    }
  });
  
  // Add endpoint to get translation history
  app.get('/api/translations', async (req, res) => {
    try {
      const translations = await Translation.find().sort({ createdAt: -1 });
      res.json(translations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch translations' });
    }
  });