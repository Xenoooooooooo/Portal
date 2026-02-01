# Message Requests Feature - Debug Guide

## What I Fixed

1. **Added Console Logging**: Added detailed console.log statements to track:
   - When renderMessageRequests() is called
   - When the icon is clicked (console.log in onclick)
   - When showAllMessageRequestsModal() opens
   - What messageRequests array contains

2. **Fixed Event Handling**: 
   - Added `pointer-events: auto` to ensure the div is clickable
   - Added `pointer-events: none` to SVG to prevent event blocking

3. **Added Z-index**: Modal now has explicit z-index: 1001

4. **Added Real-time Listener**: setupMessageRequestsListener() now monitors Firebase for changes to message requests

5. **Added Helper Functions** (call these in browser console):
   - `refreshMessageRequests()` - Reload message requests from Firebase
   - `sendTestMessageRequest()` - Send a test message request to the first available user

## How to Test

1. **Open Browser DevTools** (F12)
2. **Open Console tab**
3. **Check current state**:
   ```javascript
   console.log(messageRequests);
   ```

4. **Send a test request** (to yourself from another user):
   ```javascript
   // Log in with one user, then in another browser/incognito, log in with a different user
   // Then have the second user send a request to the first
   ```

   OR use the helper function:
   ```javascript
   sendTestMessageRequest();
   ```

5. **Refresh requests**:
   ```javascript
   refreshMessageRequests();
   ```

6. **Verify modal displays** by clicking the notification icon

## Expected Behavior

1. Icon should render with notification bell SVG
2. Badge should show count if messageRequests.length > 0
3. Clicking icon should log "Icon clicked" in console
4. Modal should appear showing list of requesters
5. Clicking Accept/Decline should work

## Debugging Steps

If nothing appears:

1. **Check console logs** - Look for any errors
2. **Verify messageRequests array**: `console.log(messageRequests)`
3. **Check Firebase data** - Make sure messageRequests/{userId} exists
4. **Verify DOM element** - `document.getElementById('messageRequestsIcon')`
5. **Check if function exists** - `console.log(window.showAllMessageRequestsModal)`

## Firebase Structure Expected

```
messageRequests/
  {recipientUserId}/
    {requestId}/
      senderUid: "user123"
      message: "Hello!"
      createdAt: "2024-01-01..."
```
