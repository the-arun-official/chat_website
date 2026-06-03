# AI Panel Debug Guide

## Status: Enhanced with Better Error Handling

### Changes Made to Fix AI Panel

#### 1. Added Error State
```typescript
const [error, setError] = useState<string | null>(null);
```

#### 2. Improved useEffect Dependencies
```typescript
// Before
useEffect(() => {
  if (isOpen) {
    fetchAnalysis();
  }
}, [isOpen, messageId]);

// After
useEffect(() => {
  if (isOpen && messageId && chatId && user?.id) {
    fetchAnalysis();
  }
}, [isOpen, messageId, chatId, user?.id]);
```

#### 3. Added Console Logging
```typescript
console.log('Fetching AI analysis:', { messageId, chatId, userId: user?.id });
console.log('Analysis response:', analysisResponse.data);
console.log('Replies response:', repliesResponse.data);
console.error('Error details:', error.response?.data || error.message);
```

#### 4. Better Error Display
```typescript
: error ? (
  <div className="ai-panel-error">
    <p>Error: {error}</p>
    <p style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
      Check browser console for details
    </p>
  </div>
) : (
  <div className="ai-panel-error">
    <p>No data loaded</p>
  </div>
)
```

---

## How to Debug

### Step 1: Open Browser Developer Tools
- Press `F12` or Right-click → Inspect
- Go to `Console` tab

### Step 2: Click "Ask with AI" on a Message
- Watch the console for log messages
- You should see:
  ```
  Fetching AI analysis: { messageId: "...", chatId: "...", userId: "..." }
  ```

### Step 3: Check for Errors
If you see an error, it will show:
```
Error details: { error: "..." }
```

### Possible Issues & Solutions

#### Issue 1: `user?.id` is undefined
**Symptom:** Console shows `userId: undefined`
**Solution:** 
- Check if you're logged in
- Check if Redux store has user data
- Verify auth state is loading correctly

#### Issue 2: 404 Message Not Found
**Symptom:** Error shows "Message not found"
**Solution:**
- Verify messageId is correct
- Verify you have permission to access the message
- Verify message exists in the chat

#### Issue 3: 404 Chat Not Found
**Symptom:** Error shows "Chat not found"
**Solution:**
- Verify chatId is correct
- Verify you're a participant in the chat

#### Issue 4: 403 Unauthorized
**Symptom:** Error shows "Unauthorized"
**Solution:**
- Verify you're a participant in the chat
- Verify your user ID matches

#### Issue 5: Network Error
**Symptom:** Error shows network error or 500
**Solution:**
- Check backend is running
- Verify API base URL is correct
- Check backend logs for errors

---

## Backend Debugging

### Check API Routes Registered
```bash
# In backend directory
grep -r "ai-assistant" src/
# Should show routes registered in app.ts
```

### Check Handler Functions
```bash
# Look for these files:
# src/controllers/aiAssistant.controller.ts
# src/services/aiAssistant.service.ts
# src/routes/aiAssistant.routes.ts
```

### Check Backend Logs
```bash
# When clicking "Ask with AI", backend should log:
[AIAssistant] Analysis request
[AIAssistant] Generating replies
```

---

## Common Fixes

### 1. Restart Backend
```bash
cd chat-backend
npm start
```

### 2. Restart Frontend
```bash
cd chat-frontend
npm run dev
```

### 3. Clear Redux Store
- Press F12 in browser
- Go to Application tab
- Clear all storage
- Refresh page
- Login again

### 4. Check Network Tab
- Press F12
- Go to Network tab
- Click "Ask with AI"
- Look for `/api/ai-assistant/analyze-message` request
- Check response status and data

---

## Expected Behavior

### When AI Panel Works ✅
1. Click "Ask with AI"
2. Panel shows "Analyzing your message..."
3. After ~1-2 seconds, analysis appears with:
   - Original message
   - Meaning
   - Tone (badge)
   - Intent
   - Emotions (chips)
   - Confidence bar
   - Suggested replies (5 options)

### When There's an Error ❌
1. Click "Ask with AI"
2. Panel shows "Error: [error message]"
3. Console shows detailed error
4. Check the debug guide above to fix

---

## Testing Checklist

- [ ] User is logged in
- [ ] User is in a chat
- [ ] Message is TEXT type (not media)
- [ ] Message is not deleted
- [ ] Browser console shows no errors
- [ ] Network request shows 200 status
- [ ] Response has data with meaning, tone, intent, emotions

---

## File Modified

- `src/components/panels/AIPanelBox.tsx`
  - Added error state
  - Improved useEffect dependencies
  - Added console logging
  - Better error display

---

## Build Status

✅ No new errors introduced
✅ Build successful
✅ Ready for testing

---

## Next Steps

1. **Test in browser**
   - Open dev tools (F12)
   - Go to Console tab
   - Click "Ask with AI"
   - Watch console for logs
   - Report any error messages you see

2. **Share console error** (if any)
   - Screenshot the error
   - Or copy error text from console

3. **I'll help debug** based on the error shown

