# Quick AI Panel Testing Guide

## Step-by-Step Testing

### 1. Start Backend
```bash
cd chat-backend
npm start
```

### 2. Start Frontend
```bash
cd chat-frontend
npm run dev
```

### 3. Open Browser
```
http://localhost:3000
```

### 4. Login to Chat
- Enter credentials
- Open any chat

### 5. Open DevTools
- Press **F12** on keyboard
- Click **Console** tab

### 6. Click "Ask with AI"
- Hover over any message
- Click purple "Ask with AI" button

### 7. Watch Console
You should see logs like:
```
Fetching AI analysis: { 
  messageId: "...", 
  chatId: "...", 
  userId: "..." 
}
```

### 8. Check Results

#### ✅ If Working
- Panel shows "Analyzing..."
- After 1-2 seconds, displays:
  - Original message
  - Meaning, Tone, Intent
  - Emotions (chips)
  - Suggested Replies (5 options)
- Console shows reply response logs

#### ❌ If Not Working
- Panel shows error message
- Console shows red error text
- Check error message
- Report the error

---

## Common Checks

### Check 1: User ID
In console, should show:
```
Fetching AI analysis: { userId: "user_..." }
```
If `userId: undefined` → user not loaded from Redux

### Check 2: Network Request
In Network tab, look for POST request to:
```
/api/ai-assistant/analyze-message
```
Response should be `200` (success) or show error code

### Check 3: Error Message
If panel shows error, it will display:
```
Error: [message]
Check browser console for details
```

---

## Troubleshooting

### Problem: "Failed to load analysis"
**Solution:**
1. Check console for detailed error
2. Verify user ID is showing in logs
3. Check backend is running
4. Look at Network tab response

### Problem: Nothing happens when clicking "Ask with AI"
**Solution:**
1. Check browser console for errors
2. Check if button is disabled (gray)
3. Try refreshing page
4. Try different message

### Problem: "Unauthorized" error
**Solution:**
1. Make sure you're logged in
2. Make sure you're in the chat
3. Refresh page
4. Login again

### Problem: "Message not found"
**Solution:**
1. Try with different message
2. Make sure message is TEXT type (not image/file)
3. Make sure message not deleted

---

## What to Report If Broken

If AI panel is not working, please share:

1. **Console Error Message**
   - Open F12 → Console
   - Screenshot or copy the error

2. **Network Response**
   - Open F12 → Network
   - Click "Ask with AI"
   - Look for `/ai-assistant/analyze-message` request
   - Click it and check Response tab
   - Share the response status or error

3. **User ID Value**
   - In console logs, what does it show for userId?
   - Is it undefined or a value?

4. **Message Details**
   - What message are you testing with?
   - Is it a text message?
   - Are you in the correct chat?

---

## Expected Timeline

1. **Click "Ask with AI"** → Panel opens, shows "Analyzing..."
2. **Wait 1-2 seconds** → API call to backend
3. **Backend processes** → Analyzes message content
4. **Panel updates** → Shows analysis and replies

---

## Success Criteria

✅ **All Working:**
- Panel opens smoothly
- Shows "Analyzing..." briefly
- Displays analysis data
- Shows 5 suggested replies
- Copy button works
- Use button works

✅ **Debugging Info:**
- Console shows request logs
- Console shows response data
- No red errors in console

---

## Quick Checklist

- [ ] Backend running (npm start)
- [ ] Frontend running (npm run dev)
- [ ] Logged into chat
- [ ] DevTools open (F12)
- [ ] Console tab active
- [ ] Message visible in chat
- [ ] Click "Ask with AI"
- [ ] Check console logs
- [ ] Check panel result
- [ ] Report any errors

---

## Need Help?

If AI panel doesn't work:
1. Check console (F12)
2. Share error message
3. Check Network tab
4. Share response status
5. I'll debug from there

🚀 **Ready to test!**

