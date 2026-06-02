# Ollama Setup Guide for Auto Messenger

Your AI Auto Messenger now uses **Ollama** - a free, local AI model that runs on your machine. No API keys needed!

## Quick Start

### 1. Install Ollama

**Windows:**
- Download: https://ollama.ai/download/windows
- Run the installer and follow the prompts
- Ollama will start automatically

**Mac:**
- Download: https://ollama.ai/download/mac
- Drag Ollama.app to Applications folder

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

### 2. Download Mistral Model

Once Ollama is installed, open terminal/cmd and run:

```bash
ollama pull mistral
```

This downloads the Mistral 7B model (~4GB). Takes 2-5 minutes depending on internet speed.

### 3. Start Ollama Server

Ollama runs as a background service by default. To verify it's running:

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response with available models.

### 4. Update Backend

The backend is already configured to use Ollama. No code changes needed!

Verify `.env` has:
```env
OLLAMA_URL=http://localhost:11434
```

### 5. Test It

1. Start your backend: `npm run dev`
2. Start your frontend: `npm run dev`
3. Enable AI Settings in a private chat
4. Send a message and watch the AI respond contextually!

## What Changed?

✅ **Before:** Same generic reply "Hey! Let me get back to you on this 😊" for all messages (Gemini API failures)
✅ **Now:** Context-aware replies based on your message content
✅ **Avatar:** AI messages now show with a 🤖 emoji
✅ **Free:** Zero cost, unlimited API calls, runs locally
✅ **Private:** All conversation data stays on your machine

## Troubleshooting

### "Connection refused" error
- Ensure Ollama is running: `ollama serve` (if not auto-started)
- Check `http://localhost:11434` in browser - should load

### Slow responses
- Mistral 7B needs ~2-4GB RAM
- Reduce browser tabs or background apps
- First response is slowest, subsequent ones are faster

### Want a faster/smaller model?
Run any of these instead:
```bash
ollama pull neural-chat     # Faster, 4GB
ollama pull orca-mini       # Very fast, 1.3GB (less intelligent)
ollama pull dolphin-mixtral # More intelligent, 26GB (needs more RAM)
```

Then update `.env`:
```env
OLLAMA_MODEL=neural-chat
```

## Model Recommendations

| Model | Size | Speed | Quality | Command |
|-------|------|-------|---------|---------|
| mistral | 4GB | Medium | Good | `ollama pull mistral` |
| neural-chat | 4GB | Fast | Good | `ollama pull neural-chat` |
| orca-mini | 1.3GB | Very Fast | Fair | `ollama pull orca-mini` |
| dolphin-mixtral | 26GB | Slow | Excellent | `ollama pull dolphin-mixtral` |

## Features

### Context-Aware Replies
AI understands conversation history and responds appropriately:
- "Hi" → "Hey! How's it going? 😊"
- "What time is the meeting?" → "Let me check and get back to you!"
- "I need your help ASAP" → Flags for manual approval (critical message)

### Critical Keyword Detection
Messages with critical words automatically need your approval:
- Emergency: "urgent", "emergency", "hospital", "accident"
- Sensitive: "password", "bank account", "credit card", "ssn"
- Payment: "send money", "transfer", "invoice", "upi"
- Meeting: "tomorrow", "available", "schedule", "can we meet"

### Personality Settings
Customize how AI responds:
- Professional, Casual, Friendly, etc.
- Custom prompts for specific relationships
- Learning your texting style over time

## Next Steps

1. ✅ Install Ollama
2. ✅ Download mistral model
3. ✅ Test in your chat app
4. 🎯 Fine-tune personality settings
5. 🎯 Enable auto-reply modes (DRAFT_ONLY, AUTO)

Happy chatting! 🚀
