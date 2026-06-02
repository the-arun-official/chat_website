# Production Setup Guide: Multi-Provider AI with Fallback

Your chat app now has a **production-grade AI fallback system**:
- **Primary**: Ollama (local, free, private)
- **Fallback 1**: Together AI (cloud, free tier)
- **Fallback 2**: HuggingFace (cloud, free tier)

## Architecture

```
User sends message
    ↓
Try Ollama (local)
    ↓ (if down/slow)
Try Together AI (cloud)
    ↓ (if rate limited)
Try HuggingFace (cloud)
    ↓ (if all fail)
Safe fallback: "I'll respond shortly"
```

## Quick Start (Production)

### 1. Primary: Ollama on Dedicated Server

**Option A: Bare Metal (AWS EC2, DigitalOcean, etc.)**

```bash
# SSH into server (Ubuntu 22.04)
ssh ubuntu@your-server.com

# Install Ollama
curl https://ollama.ai/install.sh | sh

# Download model (background process)
nohup ollama pull mistral > ollama.log 2>&1 &

# Enable auto-start
sudo systemctl enable ollama
sudo systemctl start ollama

# Verify
curl http://localhost:11434/api/tags
```

**Option B: Docker (Recommended for cloud)**

```dockerfile
# Dockerfile.ollama
FROM ollama/ollama:latest

# Pre-download model
RUN ollama pull mistral

EXPOSE 11434
CMD ["ollama", "serve"]
```

```bash
# Build and run
docker build -f Dockerfile.ollama -t ollama-mistral .
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama-data:/root/.ollama \
  ollama-mistral
```

**Server Specs:**
- **CPU**: 4+ cores (8 recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **GPU**: NVIDIA GPU recommended (10x faster)
  - With GPU: ~2-4s per reply
  - Without GPU: ~5-15s per reply
- **Disk**: 20GB+ (for models)

### 2. Fallback 1: Together AI (Free Tier)

**Get API Key:**
1. Go to https://www.together.ai/
2. Sign up (free account)
3. Get API key from dashboard → API
4. Free tier: 1M tokens/month (~500k messages)

**Add to `.env`:**
```bash
TOGETHER_AI_KEY=your_api_key_here
```

### 3. Fallback 2: HuggingFace (Free Tier)

**Get API Key:**
1. Go to https://huggingface.co/
2. Sign up (free account)
3. Go to Settings → Access Tokens → Create token
4. Free tier: Rate limited (~500 requests/day)

**Add to `.env`:**
```bash
HUGGINGFACE_API_KEY=your_api_key_here
```

## Production `.env` Configuration

```bash
# Primary: Ollama (on your server)
OLLAMA_URL=http://YOUR_OLLAMA_SERVER:11434
OLLAMA_MODEL=mistral

# Fallback 1: Together AI
TOGETHER_AI_KEY=sk-xxxxxxxxxxxxx

# Fallback 2: HuggingFace
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
```

## Monitoring & Health Checks

### Check Provider Status

```bash
# API endpoint (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://your-api.com/auto-messenger/health/providers
```

**Response:**
```json
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

### Backend Logs

Monitor provider selection:
```bash
tail -f /var/log/app.log | grep AIProvider
```

You'll see:
```
[AIProvider] Attempting with Ollama
[AIProvider] Success with Ollama
```

Or if Ollama is down:
```
[AIProvider] Ollama is unavailable
[AIProvider] Attempting with TogetherAI
[AIProvider] Success with TogetherAI
```

## Performance Targets

| Provider | Speed | Cost | Uptime | Privacy |
|----------|-------|------|--------|---------|
| Ollama | 2-5s | $0 | ~99.5% | Local |
| TogetherAI | 1-3s | $0-100/mo | 99.9%+ | Cloud |
| HuggingFace | 3-8s | $0-50/mo | 99% | Cloud |

## Cost Estimation (Monthly)

**Small users (< 1K messages/day):**
- All free tiers: **$0**

**Medium users (1K-10K messages/day):**
- Ollama: $50-200 (server cost only)
- Fallbacks: $0 (free tier)
- **Total: $50-200**

**Large users (> 50K messages/day):**
- Option 1: Ollama on bigger server ($500+) + free fallback
- Option 2: Pure cloud: Together AI ($200-500/mo)
- **Total: $200-700**

## Deployment Checklist

- [ ] Deploy backend with new provider system
- [ ] Set `OLLAMA_URL` to your Ollama server
- [ ] Set `TOGETHER_AI_KEY` (get free account)
- [ ] Optional: Set `HUGGINGFACE_API_KEY`
- [ ] Test with: `curl /auto-messenger/health/providers`
- [ ] Monitor logs for provider switching
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Plan failover (Ollama restart script)

## Troubleshooting

### "All providers failed"

**Check Ollama:**
```bash
curl http://your-ollama-server:11434/api/tags
```

If timeout: SSH into server, restart Ollama
```bash
sudo systemctl restart ollama
```

**Check Together AI key:**
```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.together.xyz/v1/models/list
```

### Slow responses

**If Ollama slow (>10s):**
- Check CPU load: `ssh user@server && top`
- Add GPU support: Install CUDA drivers
- Reduce concurrent users

**If cloud provider slow:**
- Check network latency
- Try different fallback model
- Upgrade to premium tier

### High costs

**If Together AI charges high:**
- Switch to Ollama-only (self-host)
- Use Groq instead (even faster, free tier)
- Implement caching (don't regenerate same messages)

## Scaling Tips

1. **< 100 users**: Ollama on 4-core server
2. **100-1K users**: Ollama on 8-core + GPU OR hybrid approach
3. **1K+ users**: Dedicated Ollama cluster + cloud fallback
4. **10K+ users**: Pure cloud (Together AI or Groq)

## Next Steps

1. Spin up Ollama server
2. Get Together AI API key
3. Update `.env` with endpoints
4. Deploy: `npm install && npm run build && npm start`
5. Monitor: Check health endpoint daily
6. Scale: Add GPU if responses slow

Questions? Check logs at `/auto-messenger/health/providers` 🚀
