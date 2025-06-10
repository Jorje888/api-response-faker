### Team Allocation Strategy

To allow for parallel work, we'll divide the project into three main areas, focusing on distinct layers or functionalities:

- **Person 1: Core Backend & Database (Node.js/TypeScript, `better-sqlite3`)**
  - Focus: Setting up the server, database integration, persistent storage of rules, and the dynamic serving of fake API endpoints.
- **Person 2: Management Backend & Liveness Checks (Node.js/TypeScript)**
  - Focus: Implementing the CRUD API for managing rules and the periodic liveness checking process, including maintaining liveness status.
- **Person 3: Frontend (React/TypeScript)**
  - Focus: Building the user interface for rule management and displaying liveness status, including frontend-backend communication for CRUD and status polling.

---

### Consolidated ToDo List

#### Person 1: Core Backend & Database (Node.js/TypeScript, `better-sqlite3`)

**Goal**: Establish a functional Node.js server that serves dynamically loaded fake API endpoints from a persistent database.

- **Milestone 1.1: Basic Server Setup**

  - [ ] Create backend directory.
  - [ ] `npm init -y`
  - [ ] `npm install express typescript @types/express ts-node-dev better-sqlite3 @types/better-sqlite3`
  - [ ] Configure `tsconfig.json`.
  - [ ] Create `src/index.ts`.
  - [ ] Set up basic Express server in `src/index.ts` with a simple "Hello World" route.
  - [ ] Add `start` and `dev` scripts to `package.json`.

- **Milestone 1.2: Rule Persistence & Initial Loading**

  - [ ] Create `src/types/fakeApiRule.ts` with interface `FakeApiRule` (properties: `id: number`, `path: string`, `method: string`, `statusCode: number`, `contentType: string`, `responseBody: string`).
  - [ ] Implement a database utility (`src/db.ts`):
    - [ ] Initialize `better-sqlite3` connection.
    - [ ] Create `fake_api_rules` table on startup if it doesn't exist, including `id INTEGER PRIMARY KEY AUTOINCREMENT`, `path TEXT NOT NULL`, `method TEXT NOT NULL`, `status_code INTEGER NOT NULL`, `content_type TEXT NOT NULL`, `response_body TEXT NOT NULL`, and `UNIQUE(path, method)`.
  - [ ] **On Server Startup**:
    - [ ] Modify `src/index.ts` to load all existing `FakeApiRule` entries from the `fake_api_rules` table into an in-memory collection (e.g., a `Map` or `Array`) for quick lookup.
    - [ ] Dynamically register Express routes for each loaded `FakeApiRule` using `app[rule.method.toLowerCase()](rule.path, handler)`.

- **Milestone 1.3: Dynamic Request Matching & Response**
  - [ ] Implement a middleware or a catch-all route (`app.use('*', ...)`) _after_ your specific management API endpoints.
  - [ ] Inside this middleware/route, get `req.path` and `req.method`.
  - [ ] Develop logic to look up the matching `FakeApiRule` from the in-memory collection by path and method.
  - [ ] If a match is found:
    - [ ] Set `res.status(rule.statusCode)`.
    - [ ] Set `res.setHeader('Content-Type', rule.contentType)`.
    - [ ] Send back `rule.responseBody`.
  - [ ] Handle non-matching requests (e.g., `res.status(404).send('Not Found')`).

---

#### Person 2: Management Backend & Liveness Checks (Node.js/TypeScript)

**Goal**: Enable CRUD operations for rules via a dedicated API and implement the automatic liveness checking process.

- **Milestone 2.1: Rule Management API Endpoints**

  - [ ] Implement `POST /api/rules` endpoint:
    - [ ] Validate incoming request body against `FakeApiRule` interface (excluding `id`).
    - [ ] Insert new rule data into the `fake_api_rules` table via the `src/db.ts` utility.
    - [ ] **Dynamically register** the new fake API route in the running Express application.
    - [ ] Send back a `201 Created` response with the newly created rule (including its `id`).
  - [ ] Implement `GET /api/rules` endpoint:
    - [ ] Query `fake_api_rules` table to fetch all stored rules.
    - [ ] Respond with a JSON array of all rules.
  - [ ] Implement `GET /api/rules/:id` endpoint:
    - [ ] Query `fake_api_rules` table for the rule matching the provided `id`.
    - [ ] Respond with the rule as a JSON object, or a 404 if not found.
  - [ ] Implement `PUT /api/rules/:id` endpoint:
    - [ ] Validate incoming request body.
    - [ ] Update the corresponding rule in the `fake_api_rules` table.
    - [ ] **Crucially**: Remove the old dynamically registered fake API route and register the new one based on the updated rule data.
    - [ ] Respond with the updated rule or a success message.
  - [ ] Implement `DELETE /api/rules/:id` endpoint:
    - [ ] Delete the rule from the `fake_api_rules` table.
    - [ ] **Dynamically remove** the corresponding fake API route from the running Express application.
    - [ ] Respond with a `204 No Content` or success message.

- **Milestone 2.2: Automatic Liveness Checking**

  - [ ] Implement a background process/cron job (e.g., using `setInterval` or a library like `node-cron`) to run every **10 seconds**.
  - [ ] This process should:
    - [ ] Fetch all active `FakeApiRule`s (from the database or the in-memory collection).
    - [ ] For each rule, make an internal HTTP request to the _fake_ endpoint defined by the rule's `path` and `method`.
    - [ ] Compare the actual response's status code, `Content-Type` header, and response body (parsed if JSON/XML) against the `statusCode`, `contentType`, and `responseBody` defined in the rule.
    - [ ] Maintain an in-memory map/object to store the latest liveness status for each rule (`ruleId`, `isLive`, `lastChecked`, `failureReason`).

- **Milestone 2.3: Liveness Status API Endpoint**
  - [ ] Implement `GET /api/liveness-status` endpoint.
  - [ ] This endpoint should return the in-memory liveness status map/object as a JSON array (as per our specification).

---

#### Person 3: Frontend (React/TypeScript)

**Goal**: Build a user-friendly React application for managing and monitoring fake API rules.

- **Milestone 3.1: React Project Setup & Basic Layout**

  - [x] Initialize a React project with TypeScript (e.g., Vite/CRA).
  - [x] Set up basic component structure (e.g., `App.tsx`, `RuleForm.tsx`, `RuleList.tsx`).
  - [x] Implement basic styling (e.g., using CSS modules or a styling library).

- **Milestone 3.2: Rule Definition Form**

  - [ ] Create a `RuleForm` React component.
  - [ ] Include input fields for:
    - [ ] URL Path (text input).
    - [ ] HTTP Method (dropdown with GET, POST, PUT, DELETE, PATCH options).
    - [ ] Response Status Code (number input).
    - [ ] Response Content Type (dropdown with `application/json`, `text/plain`, `text/html`, `application/xml`).
    - [ ] Response Body (multi-line textarea).
  - [ ] Implement "Save Rule" and "Cancel" buttons.
  - [ ] Integrate this form into a modal dialog or a dedicated section on the main page.

- **Milestone 3.3: Rule Listing & Management**

  - [ ] Create a `RuleList` React component.
  - [ ] Fetch rules from the backend (`GET /api/rules`) on component mount and update.
  - [ ] Display rules in a table with columns for Method, Path, Status Code, Content Type, and a truncated Response Body preview.
  - [ ] Add "Edit" and "Delete" buttons/icons for each rule row.
    - [ ] "Edit" button should open the `RuleForm` modal pre-filled with the rule's data.
    - [ ] "Delete" button should trigger a confirmation and then send a `DELETE` request to `/api/rules/:id`.
  - [ ] Implement client-side data refreshing after adding/editing/deleting rules (re-fetch `GET /api/rules`).

- **Milestone 3.4: Liveness Status Display & Polling**
  - [ ] Implement polling logic in the main `App` component or a dedicated hook/context to fetch liveness status from `GET /api/liveness-status` every **5 seconds**.
  - [ ] Display an overall "Liveness Summary" (e.g., "X out of Y endpoints are Live") in the header or a prominent section.
  - [ ] Integrate a "Liveness Status" column into the `RuleList` table:
    - [ ] Display a color-coded indicator (green for live, red for down).
    - [ ] On hover/click, show a tooltip/pop-up with `lastChecked` timestamp and `failureReason` (if applicable).

---
