# Real-Time Poll Rooms: Complete System Design Document

## 📋 Assignment Overview

**Objective:** Build a web app that lets someone create a poll, share it via a link, and collect votes while results update in real time for all viewers.

**Tech Stack:**
- **Backend:** Node.js + Express + MongoDB
- **Frontend:** React + Vite + Tailwind CSS
- **Real-Time:** Server-Sent Events (SSE)
- **Deployment:** Backend (Render/Railway) + Frontend (Vercel/Netlify)

---

## 🏗️ Architectural Overview

### Core Architecture Pattern
This application uses a **decoupled Client-Server architecture** with real-time streaming.

### Backend Responsibilities (Node.js/Express + MongoDB)
- **Source of Truth:** All poll data and votes are persisted in MongoDB
- **RESTful API:** Handles mutations (create poll, register votes)
- **Anti-Abuse Enforcement:** Tracks voter IPs and enforces fairness rules
- **Real-Time Streaming:** Pushes state updates to connected clients via SSE

### Frontend Responsibilities (React/Vite + Tailwind)
- **Presentation Layer:** Renders UI and handles user interactions
- **Dynamic Routing:** Routes users based on short poll IDs
- **Local Fairness Lock:** Uses localStorage to prevent honest repeat voting
- **Real-Time Listener:** Consumes SSE stream and updates UI automatically

### Why SSE Over WebSockets?
- **Unidirectional:** We only need server → client updates (not bidirectional)
- **Simpler:** Built into browsers via EventSource API, no external libraries needed
- **Auto-Reconnect:** Browser handles reconnection automatically
- **Sufficient:** Perfect for our read-heavy use case (many viewers, fewer voters)

---

## 📁 Production-Grade Folder Structure

### Backend Structure (Node.js / Express)
Organized by **feature/domain** for modularity and scalability.

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection logic
│   ├── models/
│   │   └── Poll.js               # Mongoose schema (embedded options & votedIps)
│   ├── controllers/
│   │   └── pollController.js     # Business logic (create, vote, SSE)
│   ├── routes/
│   │   └── pollRoutes.js         # Express router (API endpoints)
│   ├── middleware/
│   │   └── errorHandler.js       # Centralized error handling
│   └── server.js                 # Express app initialization
├── .env                          # Environment variables (MONGO_URI, PORT)
├── .gitignore
└── package.json
```

### Frontend Structure (React / Vite)
Organized by **routes and reusable components**.

```
frontend/
├── src/
│   ├── components/
│   │   ├── PollForm.jsx          # Form to create poll (dynamic options)
│   │   ├── VoteOption.jsx        # Individual voting button with live count
│   │   ├── LoadingSpinner.jsx    # Reusable loading state component
│   │   └── ErrorMessage.jsx      # Reusable error display component
│   ├── pages/
│   │   ├── CreatePoll.jsx        # Landing page (/)
│   │   ├── PollRoom.jsx          # Poll viewing/voting page (/poll/:pollId)
│   │   └── NotFound.jsx          # 404 page for invalid poll IDs
│   ├── utils/
│   │   └── api.js                # Centralized API call functions
│   ├── App.jsx                   # React Router configuration
│   ├── main.jsx                  # React DOM entry point
│   └── index.css                 # Tailwind CSS imports
├── .env                          # Environment variables (VITE_API_BASE_URL)
├── .gitignore
├── tailwind.config.js
└── package.json
```

---

## 🗄️ Database Schema Design

### Poll Model (MongoDB/Mongoose)

```javascript
{
  _id: ObjectId,                    // Auto-generated MongoDB ID
  pollId: String,                   // 8-character NanoID (shareable short ID)
  question: String,                 // The poll question
  options: [
    {
      _id: ObjectId,                // Auto-generated for each option
      text: String,                 // Option text (e.g., "Option A")
      votes: Number                 // Current vote count (default: 0)
    }
  ],
  votedIps: [String],               // Array of IP addresses that have voted
  createdAt: Date,                  // Timestamp (auto-generated)
  totalVotes: Number                // Computed: sum of all option votes
}
```

**Key Design Decisions:**
- **Embedded options:** Simpler queries, atomic updates
- **votedIps array:** Enables O(n) lookup for duplicate IP checking
- **NanoID for pollId:** Short, URL-friendly, collision-resistant
- **totalVotes:** Denormalized for quick display (updated on each vote)

---

## 🔄 Application Flow & User Journey

### Flow 1: Creating a Poll

```
User → CreatePoll Page → Fills Form → Clicks "Create"
  ↓
Frontend validates (min 2 options, no empty fields)
  ↓
POST /api/polls { question, options: ["A", "B", "C"] }
  ↓
Backend generates NanoID, saves to MongoDB
  ↓
Returns { pollId: "abc123xy", ... }
  ↓
Frontend redirects to /poll/abc123xy
```

### Flow 2: Joining a Poll

```
User receives link: https://app.com/poll/abc123xy
  ↓
Frontend extracts pollId from URL
  ↓
GET /api/polls/abc123xy
  ↓
Backend fetches poll from MongoDB
  ↓
If found: Returns poll data { question, options, totalVotes }
If not found: Returns 404
  ↓
Frontend renders poll or shows "Poll Not Found" page
  ↓
Frontend establishes SSE connection: GET /api/polls/abc123xy/stream
  ↓
User sees live results (connected to real-time stream)
```

### Flow 3: Voting on a Poll

```
User clicks a vote button
  ↓
Frontend checks localStorage: "poll_abc123xy_voted"
  ↓
If exists: Block vote (already voted from this browser)
  ↓
If not exists: POST /api/polls/abc123xy/vote { optionId }
  ↓
Backend extracts IP address (req.ip)
  ↓
Backend checks if IP exists in votedIps array
  ↓
If exists: Return 403 Forbidden { error: "Already voted" }
  ↓
If not exists:
  - Increment option.votes
  - Push IP to votedIps array
  - Update totalVotes
  - Save to MongoDB
  ↓
Backend broadcasts updated poll to all SSE clients for this pollId
  ↓
Frontend receives 200 OK
  ↓
Frontend writes to localStorage: "poll_abc123xy_voted" = true
  ↓
Frontend disables voting buttons
  ↓
All connected clients receive SSE update → UI auto-refreshes
```

---

## 🛡️ Fairness & Anti-Abuse Mechanisms

### Mechanism 1: Backend IP Tracking
**What it prevents:** Multiple votes from the same IP address
**How it works:**
1. Extract IP from `req.ip` (Express with trust proxy enabled)
2. Check if IP exists in `votedIps` array
3. Reject vote with 403 if already present
4. Add IP to array after successful vote

**Known Limitations:**
- ❌ Multiple users behind same NAT/proxy appear as one IP (corporate/school networks)
- ❌ Mobile users switching networks get new IPs (could vote again)
- ❌ VPN users can bypass by changing IPs

### Mechanism 2: Frontend localStorage Lock
**What it prevents:** Honest users accidentally voting twice from same browser
**How it works:**
1. After successful vote (200 OK), write flag to localStorage
2. On page load, check if flag exists → disable buttons immediately
3. This happens before any API call

**Known Limitations:**
- ❌ Easily bypassed with incognito mode or different browsers
- ❌ Cleared when user clears browser data
- ❌ Not effective against malicious actors

### Why Two Layers?
- **Backend layer:** Hard enforcement (cannot be bypassed by client)
- **Frontend layer:** Instant UX feedback (no wasted API calls)
- **Together:** Catches both malicious (IP) and accidental (localStorage) repeat votes

---

## 🚨 Edge Cases & Error Handling

### Edge Case 1: Invalid Poll ID
**Scenario:** User visits `/poll/nonexistent`
**Handling:**
- Backend returns 404 on `GET /api/polls/:pollId`
- Frontend catches 404 → renders `NotFound.jsx` component
- Show message: "This poll doesn't exist or has been removed"

### Edge Case 2: Poll Creation Validation
**Scenarios:**
- User submits empty question
- User submits only 1 option
- User submits duplicate option names

**Handling:**
- Frontend validation before API call:
  - Question: Must be non-empty (trim whitespace)
  - Options: Minimum 2, maximum 10 (reasonable limit)
  - Options: Remove duplicates or warn user
- Backend validation (defense in depth):
  - Return 400 Bad Request if validation fails
  - Include descriptive error message

### Edge Case 3: SSE Connection Failures
**Scenarios:**
- Network drops
- Server restarts
- Connection timeout

**Handling:**
- **EventSource auto-reconnects** (browser built-in)
- Frontend shows connection status indicator:
  - 🟢 "Live" when connected
  - 🟡 "Reconnecting..." when disconnected
- On reconnect, fetch latest poll data (GET /api/polls/:pollId)

### Edge Case 4: Vote API Failure
**Scenarios:**
- Network error
- 403 Forbidden (already voted)
- 500 Internal Server Error

**Handling:**
- Frontend does NOT write to localStorage on error
- Display error toast/message to user
- Keep voting buttons enabled (for network errors only)
- For 403: Lock buttons and show "You've already voted"

### Edge Case 5: Race Conditions (Multiple Rapid Clicks)
**Scenario:** User double-clicks vote button
**Handling:**
- Disable button immediately onClick (before API call)
- Show loading spinner on button
- Only re-enable if API returns error (network issue)

### Edge Case 6: Empty Database on First Load
**Scenario:** Fresh deployment, no polls exist yet
**Handling:**
- Landing page shows empty state with clear CTA
- "Create your first poll!" message

### Edge Case 7: Very Long Poll Questions/Options
**Scenario:** User enters 500-character question
**Handling:**
- Frontend: Input maxLength validation (e.g., 200 chars)
- Backend: Schema validation with character limits
- CSS: Text truncation with ellipsis for display

---

## 🔌 API Endpoint Specifications

### 1. Create Poll
```
POST /api/polls
Content-Type: application/json

Request Body:
{
  "question": "What's your favorite color?",
  "options": ["Red", "Blue", "Green"]
}

Success Response (201 Created):
{
  "pollId": "abc123xy",
  "question": "What's your favorite color?",
  "options": [
    { "_id": "...", "text": "Red", "votes": 0 },
    { "_id": "...", "text": "Blue", "votes": 0 },
    { "_id": "...", "text": "Green", "votes": 0 }
  ],
  "totalVotes": 0,
  "createdAt": "2025-02-14T10:30:00Z"
}

Error Response (400 Bad Request):
{
  "error": "Question and at least 2 options required"
}
```

### 2. Get Poll
```
GET /api/polls/:pollId

Success Response (200 OK):
{
  "pollId": "abc123xy",
  "question": "What's your favorite color?",
  "options": [
    { "_id": "...", "text": "Red", "votes": 5 },
    { "_id": "...", "text": "Blue", "votes": 3 },
    { "_id": "...", "text": "Green", "votes": 2 }
  ],
  "totalVotes": 10
}

Error Response (404 Not Found):
{
  "error": "Poll not found"
}
```

### 3. Vote on Poll
```
POST /api/polls/:pollId/vote
Content-Type: application/json

Request Body:
{
  "optionId": "507f1f77bcf86cd799439011"
}

Success Response (200 OK):
{
  "pollId": "abc123xy",
  "question": "What's your favorite color?",
  "options": [
    { "_id": "...", "text": "Red", "votes": 6 },  // Incremented
    { "_id": "...", "text": "Blue", "votes": 3 },
    { "_id": "...", "text": "Green", "votes": 2 }
  ],
  "totalVotes": 11
}

Error Response (403 Forbidden):
{
  "error": "You have already voted in this poll"
}

Error Response (404 Not Found):
{
  "error": "Poll or option not found"
}
```

### 4. Real-Time Stream (SSE)
```
GET /api/polls/:pollId/stream

Headers:
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

Event Format:
data: {"pollId":"abc123xy","question":"...","options":[...],"totalVotes":11}

data: {"pollId":"abc123xy","question":"...","options":[...],"totalVotes":12}
```

---

## 🎨 Frontend Implementation Details

### State Management Strategy

**Page: CreatePoll.jsx**
- Local state: `question`, `options` (array), `loading`, `error`
- On submit: POST to API → Redirect on success

**Page: PollRoom.jsx**
- Local state: `poll`, `loading`, `error`, `hasVoted`, `isConnected`, `votingInProgress`
- On mount: 
  1. Check localStorage for existing vote
  2. Fetch poll data (GET)
  3. Establish SSE connection
- On vote: 
  1. Disable buttons
  2. POST to API
  3. On success → Update localStorage + set hasVoted
  4. On error → Show message, re-enable buttons

### Loading States

**Skeleton Loading:**
- Show during initial poll fetch
- Display placeholder UI (shimmer effect)

**Button Loading:**
- Show spinner inside button during vote submission
- Disable all buttons to prevent race conditions

**Connection Status:**
- Small indicator at top: "● Live" (green) or "○ Reconnecting..." (yellow)

### Visual Feedback After Voting

**Before Vote:**
- All buttons enabled
- Show current vote counts with progress bars

**After Vote:**
- Disable all buttons
- Highlight voted option (green border + checkmark icon)
- Show "You voted for: [Option]" message
- Continue showing live updates

---

## 🚀 Step-by-Step Implementation Roadmap

### Phase 1: Foundation (Database & Basic API)
**Goal:** Create and fetch polls via Postman

**Tasks:**
1. Initialize Node.js project: `npm init -y`
2. Install dependencies: `express`, `mongoose`, `nanoid`, `cors`, `dotenv`
3. Create `db.js`: MongoDB connection with error handling
4. Create `Poll.js`: Mongoose schema with validation
5. Create `pollController.js`: 
   - `createPoll`: Generate NanoID, validate, save
   - `getPoll`: Fetch by pollId
6. Create `pollRoutes.js`: Define POST and GET endpoints
7. Create `server.js`: Initialize Express, add middleware, mount routes
8. Test with Postman: Create poll → Get poll by ID

**Success Criteria:**
- ✅ Can create a poll and receive pollId
- ✅ Can fetch poll data using pollId
- ✅ Invalid pollId returns 404

---

### Phase 2: Frontend Setup & Poll Creation
**Goal:** Users can create polls and get shareable links

**Tasks:**
1. Initialize Vite React: `npm create vite@latest`
2. Install dependencies: `react-router-dom`, `tailwindcss`
3. Configure Tailwind CSS
4. Create `App.jsx`: React Router with routes
5. Create `CreatePoll.jsx`:
   - Form with question input
   - Dynamic option addition (+ button)
   - Validation before submit
   - POST to `/api/polls`
   - Redirect to `/poll/:pollId` on success
6. Create `api.js`: Centralized fetch functions with error handling
7. Test: Create poll → Verify redirect with correct URL

**Success Criteria:**
- ✅ Can create poll with 2+ options
- ✅ Validation prevents empty submissions
- ✅ Redirects to poll page after creation
- ✅ Shows error messages on failure

---

### Phase 3: Poll Viewing & Voting
**Goal:** Users can vote and see results (no real-time yet)

**Tasks:**
1. Create `PollRoom.jsx`:
   - Extract pollId from URL params
   - Fetch poll on mount (GET `/api/polls/:pollId`)
   - Show loading spinner while fetching
   - Render question and options
   - Show 404 page if poll doesn't exist
2. Create `VoteOption.jsx`:
   - Button component with vote count
   - Progress bar showing percentage
   - onClick handler
3. Create `NotFound.jsx`: Friendly error page
4. Backend: Implement `vote` controller:
   - Extract IP from request
   - Check votedIps array
   - Increment vote count
   - Return updated poll
5. Frontend: Handle vote submission:
   - POST to `/api/polls/:pollId/vote`
   - Check localStorage first
   - Update localStorage on success
   - Disable buttons after voting
   - Manual refresh to see updates (for now)

**Success Criteria:**
- ✅ Can view poll from shareable link
- ✅ Can vote on an option
- ✅ Cannot vote twice (localStorage + IP)
- ✅ 403 error handled gracefully
- ✅ Results update after manual refresh

---

### Phase 4: Real-Time Updates (SSE)
**Goal:** Results update automatically for all viewers

**Tasks:**
1. Backend: Create SSE endpoint:
   - `GET /api/polls/:pollId/stream`
   - Set SSE headers
   - Store response object in clients Map (key: pollId)
   - Send initial poll data on connect
   - Implement cleanup on connection close
2. Backend: Modify vote controller:
   - After successful vote, broadcast to all SSE clients
   - Use `res.write()` to push updated poll data
3. Frontend: Add SSE listener in `PollRoom.jsx`:
   - `useEffect` hook with EventSource
   - Connect to stream endpoint
   - Update state on message received
   - Handle connection status (open, error)
   - Cleanup on unmount
4. Add connection indicator in UI

**Success Criteria:**
- ✅ Multiple users see votes update instantly
- ✅ New users joining see current results
- ✅ Connection status indicator works
- ✅ Auto-reconnects on disconnect

---

### Phase 5: Polish & Edge Cases
**Goal:** Handle all edge cases gracefully

**Tasks:**
1. Add comprehensive error handling:
   - Try-catch blocks in all controllers
   - Centralized error middleware
   - Descriptive error messages
2. Improve UX:
   - Loading skeletons
   - Toast notifications for errors
   - Copy-link button with clipboard API
   - Visual indication of voted option
3. Add input validation:
   - Frontend: Max lengths, trim whitespace
   - Backend: Schema validation
4. Add rate limiting (optional):
   - Prevent spam poll creation
5. Test all edge cases:
   - Invalid URLs
   - Network failures
   - Rapid clicking
   - Very long text

**Success Criteria:**
- ✅ All edge cases handled
- ✅ No console errors
- ✅ Smooth user experience
- ✅ Clear error messages

---

### Phase 6: Deployment
**Goal:** Ship a publicly accessible product

**Tasks:**
1. Backend deployment (Render/Railway):
   - Create new web service
   - Connect to GitHub repo
   - Set environment variables (MONGO_URI, PORT)
   - Configure build command
   - Enable trust proxy for IP detection
2. Frontend deployment (Vercel/Netlify):
   - Connect to GitHub repo
   - Set environment variable (VITE_API_BASE_URL)
   - Configure build settings
3. CORS configuration:
   - Update backend to allow frontend domain
4. Final testing:
   - Test on mobile
   - Test shareable links
   - Test real-time updates across devices

**Success Criteria:**
- ✅ App accessible via public URL
- ✅ All features work in production
- ✅ No CORS errors
- ✅ SSL enabled (HTTPS)

---

### Phase 7: Documentation
**Goal:** Clear README for submission

**Content:**
1. **Overview:** What the app does
2. **Tech Stack:** List all technologies
3. **Architecture:** Brief explanation of SSE choice
4. **Fairness Mechanisms:**
   - IP tracking (what it prevents + limitations)
   - localStorage (what it prevents + limitations)
5. **Edge Cases Handled:** List all
6. **Known Limitations:**
   - In-memory SSE clients (single-instance only)
   - IP blocking affects NAT users
   - localStorage easily bypassed
   - No poll expiration/cleanup
7. **Future Improvements:** (optional)
   - Redis pub/sub for multi-instance support
   - User authentication
   - Poll closing/deletion
   - Analytics dashboard

---

## ⚠️ Known Limitations & Trade-offs

### 1. In-Memory SSE Client Storage
**Limitation:** Clients are stored in server memory (Map object)
**Impact:**
- Cannot scale horizontally (multiple backend instances won't share clients)
- All connections lost on server restart
- Suitable for single-instance deployment only

**Mitigation:**
- EventSource auto-reconnects on disconnect
- Frontend fetches latest data on reconnect
- For production scale: Use Redis pub/sub

### 2. IP-Based Voting Prevention
**Limitation:** IP address is not a reliable user identifier
**Impact:**
- Corporate/school networks: Many users = 1 IP (all blocked after first vote)
- Mobile users: IP changes when switching networks
- VPN users: Can bypass by changing IPs

**Mitigation:**
- Combined with localStorage for honest users
- For stricter enforcement: Add browser fingerprinting or require authentication

### 3. No Poll Management
**Limitation:** Polls cannot be closed, edited, or deleted
**Impact:**
- Database grows indefinitely
- No way to stop active polls
- Creator has no control after creation

**Future Enhancement:**
- Add creator authentication
- Store creator token in localStorage
- Provide management dashboard

### 4. No Rate Limiting
**Limitation:** No protection against spam poll creation
**Impact:**
- Malicious users could flood database

**Future Enhancement:**
- Add express-rate-limit middleware
- Implement CAPTCHA for poll creation

---

## 🎯 Success Metrics

**Before considering the project complete, verify:**

- ✅ Can create a poll with a question and 2+ options
- ✅ Shareable link works and persists after refresh
- ✅ Anyone can vote on a poll (single choice)
- ✅ Votes update in real-time without refresh
- ✅ Cannot vote twice (localStorage + IP tracking)
- ✅ Edge cases handled gracefully (invalid URLs, errors, etc.)
- ✅ App deployed and publicly accessible
- ✅ README documents fairness mechanisms and limitations

---

## 📚 Dependencies

### Backend
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "nanoid": "^3.3.7",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "tailwindcss": "^3.3.5"
}
```

---

## 🔗 Useful Resources

- [Server-Sent Events (SSE) - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [NanoID Documentation](https://github.com/ai/nanoid)
- [Mongoose Schema Validation](https://mongoosejs.com/docs/validation.html)
- [React Router v6 Guide](https://reactrouter.com/en/main)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## ✅ Pre-Submission Checklist

Before submitting:

- [ ] All required features implemented and tested
- [ ] Edge cases handled (invalid URLs, errors, rapid clicks)
- [ ] Loading states and error messages everywhere
- [ ] Code is clean and well-organized
- [ ] No console errors in browser or terminal
- [ ] App deployed and publicly accessible
- [ ] Shareable links work correctly
- [ ] Real-time updates work across multiple browsers/devices
- [ ] README written with:
  - [ ] Two fairness mechanisms explained
  - [ ] Edge cases documented
  - [ ] Known limitations listed
  - [ ] Architecture decisions explained
- [ ] Test on mobile device
- [ ] Test in incognito mode
- [ ] Test with poor network conditions

---

**Document Version:** 2.0  
**Last Updated:** February 14, 2025  
**Assignment Status:** Ready for Implementation