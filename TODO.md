# TODO: Update Frontend to Use Production Backend URLs

## Completed Tasks
- [x] Update all fetch URLs in client/src/App.jsx from 'http://localhost:5000' to 'https://linkup-redo-2.onrender.com'
- [x] Update WebSocket URL in client/src/App.jsx from 'ws://localhost:5000' to 'wss://linkup-redo-2.onrender.com'
- [x] Update fetch URLs in client/src/Chat.jsx for chat history and WebSocket connection
- [x] Update fetch URLs in client/src/Inbox.jsx for accepted-matches and image sources
- [x] Update fetch URLs in client/src/MatchesDashboard.jsx for my-purposes/interests, accept-interest, and image sources
- [x] Update fetch URLs in client/src/MyInterests.jsx for my-interests, match/accept, and image sources
- [x] Update fetch URL in client/src/ProfileForm.jsx for profile POST
- [x] Update fetch URLs in client/src/ProfileView.jsx for profile GET/PUT and image sources
- [x] Update fetch URL in client/src/PurposeForm.jsx for purpose/create
- [x] Update fetch URLs in client/src/PurposeSwiper.jsx for purposes, swipe-left, and swipe-right

## Next Steps
- [ ] Rebuild and redeploy the frontend to apply the URL changes
- [ ] Test the deployed frontend to ensure it connects to the backend properly
- [ ] Verify that all API calls, WebSocket connections, and image loads work in production
