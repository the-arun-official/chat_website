# Production AI Fallback System - Quick Reference

## What Was Built

✅ **Multi-Provider System** with automatic fallback
- Try Ollama (local) → Try Together AI (cloud) → Try HuggingFace (cloud) → Safe fallback
- Health checks every 5 minutes
- Automatic provider switching on failure
- Zero downtime if one provider fails

## File Structure

```
chat-backend/src/ai/
├── providers.ts          [NEW] Multi-provider abstraction + fallback logic
├── replyEngine.ts        [UPDATED] Uses provider manager
└── personality.ts
```

## Environment Variables

```bash
# Primary (Local - no key needed)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Fallback 1 (get free key: https://www.together.ai/)
TOGETHER_AI_KEY=sk_xxxxxxxxxxxxx

# Fallback 2 (get free key: https://huggingface.co/)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
```

## API Endpoint

```bash
# Check all provider status
GET /auto-messenger/health/providers
Authorization: Bearer YOUR_TOKEN

# Response
{
  "timestamp": "2024-06-02T10:30:00Z",
  "providers": [
    { "name": "Ollama", "healthy": true },
    { "name": "TogetherAI", "healthy": true },
    { "name": "HuggingFace", "healthy": true }
  ],
  "allHealthy": true
}
```

## Production Deployment Steps

### 1. Set Up Ollama Server

```bash
# Option A: Self-hosted VPS
curl https://ollama.ai/install.sh | sh
ollama pull mistral
sudo systemctl enable ollama

# Option B: Docker
docker run -d -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
docker exec ollama ollama pull mistral

# Verify
curl http://your-ollama-server:11434/api/tags
```

### 2. Get Free Cloud API Keys

**Together AI** (1M tokens/month free):
```
1. Go to https://www.together.ai/
2. Sign up → Get API key
3. Add to .env: TOGETHER_AI_KEY=your_key
```

**HuggingFace** (free with rate limits):
```
1. Go to https://huggingface.co/
2. Settings → Access Tokens → Create token
3. Add to .env: HUGGINGFACE_API_KEY=your_key
```

### 3. Deploy Backend

```bash
cd chat-backend
npm install
npm run build
npm start

# In production:
# - Set NODE_ENV=production
# - Use PM2 or systemd for auto-restart
```

### 4. Test & Monitor

```bash
# Check health
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://your-api.com/auto-messenger/health/providers

# Watch logs for provider switching
tail -f /var/log/app.log | grep AIProvider

# Expected output:
# [AIProvider] Attempting with Ollama
# [AIProvider] Success with Ollama
```

## Cost Breakdown (Monthly)

| Scenario | Cost | Setup Time |
|----------|------|-----------|
| Dev (Ollama local) | $0 | 10 min |
| Prod Small (Ollama only) | $50-100 | 30 min |
| Prod Medium (Ollama + backups) | $50-150 | 1 hour |
| Prod Large (Cloud backup) | $200-500 | 2 hours |

## Handling Different Scale

**Small (< 1K users):**
- Just Ollama, no need for fallbacks
- Works: `4-core server, 8GB RAM`

**Medium (1K-10K users):**
- Ollama primary + Together AI fallback
- Works: `8-core server with GPU, 16GB RAM`

**Large (> 10K users):**
- Dedicated Ollama cluster OR
- Pure cloud: Together AI / Groq
- Works: `Managed service like Together AI`

## Failover Examples

**Ollama server down:**
```
User message → Try Ollama (fail) → Try Together AI (success) → Reply sent
Time to fallback: < 5 seconds
```

**Together AI rate limit hit:**
```
User message → Try Ollama (fail) → Try Together AI (rate limited) → Try HuggingFace (success)
Time to fallback: < 10 seconds
```

**All providers down:**
```
User message → Try all → All fail → Safe fallback reply
Response: "Thanks for reaching out! I'll respond shortly."
```

## Monitoring Checklist

- [ ] Health endpoint returns `"allHealthy": true`
- [ ] Logs show provider selection
- [ ] Test with Ollama down → fallback works
- [ ] Response times < 10s in production
- [ ] API key quotas not exceeded
- [ ] Server resources not maxed

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Ollama is unavailable" | SSH to server, run `ollama serve` |
| "All providers failed" | Check all API keys in .env |
| "Slow responses" | Add GPU to Ollama OR upgrade fallback |
| "High costs" | Switch to Ollama-only OR use Groq |

## Next Steps

1. ✅ Code updated (you're done here!)
2. 🚀 Deploy Ollama on server
3. 🔑 Get Together AI API key
4. 🔧 Update .env + redeploy
5. ✅ Test with health endpoint
6. 📊 Monitor in production

## Documentation

- `OLLAMA_SETUP.md` - Local development setup
- `PRODUCTION_SETUP.md` - Full production guide
- Check logs: `grep AIProvider /var/log/app.log`

**Questions?** Check provider status: `/auto-messenger/health/providers` 🚀
