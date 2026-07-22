# Run this from inside your ExpendiTracker repo folder (where gh already detects the repo)
# Usage: .\setup-board.ps1

$repo = "Gojatora/ExpendiTracker"

# ---------- MILESTONES (Sprint 2 - 10; Sprint 1 already created) ----------
for ($i = 2; $i -le 10; $i++) {
    gh api "repos/$repo/milestones" -f title="Sprint $i"
}

# ---------- LABELS ----------
gh label create "must-have"           --color "d73a4a" --repo $repo
gh label create "should-have"         --color "fbca04" --repo $repo
gh label create "nice-to-have"        --color "c2e0c6" --repo $repo
gh label create "backend"             --color "1d76db" --repo $repo
gh label create "mobile"              --color "0e8a16" --repo $repo
gh label create "setup"               --color "cfd3d7" --repo $repo
gh label create "auth"                --color "5319e7" --repo $repo
gh label create "database"            --color "006b75" --repo $repo
gh label create "data"                --color "bfd4f2" --repo $repo
gh label create "testing"             --color "e99695" --repo $repo
gh label create "deployment"          --color "0052cc" --repo $repo
gh label create "documentation"       --color "0075ca" --repo $repo
gh label create "polish"              --color "f9d0c4" --repo $repo
gh label create "core-feature"        --color "b60205" --repo $repo
gh label create "backend-integration" --color "1d76db" --repo $repo

# ---------- ISSUES ----------

# Sprint 1
gh issue create --repo $repo --title "Set up repository structure and Git workflow" `
  --body "Initialize the repo with proper folder structure (src/, routers/, services/, models/, schemas/, db/, tests/), .gitignore, requirements.txt, and README.`n`nTasks:`n- [ ] Create folder structure`n- [ ] Add .gitignore and .env.example`n- [ ] Write initial README with setup instructions`n- [ ] Set up branch protection on main (require PRs)" `
  --label "setup,must-have" --milestone "Sprint 1"

gh issue create --repo $repo --title "Design database schema" `
  --body "Design tables for users, expenses, and regional_benchmarks, including relationships and keys.`n`nTasks:`n- [ ] Draft ER diagram`n- [ ] Define SQLAlchemy models`n- [ ] Review schema for normalization issues" `
  --label "backend,database,must-have" --milestone "Sprint 1"

gh issue create --repo $repo --title "Load initial regional benchmark dataset" `
  --body "Write a script to clean and load public cost-of-living/expenditure benchmark data into the regional_benchmarks table.`n`nTasks:`n- [ ] Source and download benchmark dataset`n- [ ] Clean into region, category, avg_spend format`n- [ ] Write and run loader script`n- [ ] Verify data via SQL query" `
  --label "backend,data,must-have" --milestone "Sprint 1"

# Sprint 2
gh issue create --repo $repo --title "User registration endpoint" `
  --body "As a user, I want to create an account, so that my expense data is saved and private to me.`n`nTasks:`n- [ ] POST /auth/register endpoint`n- [ ] Hash passwords before storing (never plaintext)`n- [ ] Validate duplicate email handling`n- [ ] Write unit tests" `
  --label "backend,auth,must-have" --milestone "Sprint 2"

gh issue create --repo $repo --title "User login endpoint" `
  --body "As a user, I want to log in, so that I can access my saved expense data.`n`nAcceptance Criteria:`n- [ ] POST /auth/login returns a token for valid credentials`n- [ ] Invalid credentials return a clear error message`n- [ ] Write unit tests" `
  --label "backend,auth,must-have" --milestone "Sprint 2"

gh issue create --repo $repo --title "Expense creation endpoint" `
  --body "As a user, I want to log my daily expenses, so that I can track my spending.`n`nAcceptance Criteria:`n- [ ] POST /expenses accepts amount, category, date, optional note`n- [ ] Expense is linked to the authenticated user`n- [ ] Write unit tests" `
  --label "backend,must-have" --milestone "Sprint 2"

gh issue create --repo $repo --title "Expense edit/delete endpoints" `
  --body "As a user, I want to edit or delete a logged expense, so that I can correct mistakes.`n`nAcceptance Criteria:`n- [ ] PUT /expenses/{id} updates an existing expense`n- [ ] DELETE /expenses/{id} removes an expense`n- [ ] Only the owning user can edit/delete their own expenses`n- [ ] Write unit tests" `
  --label "backend,must-have" --milestone "Sprint 2"

gh issue create --repo $repo --title "Expense history endpoint" `
  --body "Return a user's logged expenses so the app can display history immediately after logging.`n`nTasks:`n- [ ] GET /expenses?user_id=X with optional date/category filters`n- [ ] Write unit tests" `
  --label "backend,must-have" --milestone "Sprint 2"

# Sprint 3
gh issue create --repo $repo --title "Comparison logic - spending vs. benchmark" `
  --body "As a user, I want to see my spending compared to regional benchmarks, so that I have a reference for budgeting.`n`nAcceptance Criteria:`n- [ ] GET /comparison?user_id=X&region=Y returns per-category totals vs. benchmark`n- [ ] Response indicates above/below benchmark per category`n- [ ] Handles missing benchmark data gracefully" `
  --label "backend,core-feature,must-have" --milestone "Sprint 3"

gh issue create --repo $repo --title "Unit tests for comparison calculations" `
  --body "Cover the comparison logic with tests, since it's the app's core value-add feature.`n`nTasks:`n- [ ] Test normal case (user has expenses + benchmark exists)`n- [ ] Test edge case: no expenses logged yet`n- [ ] Test edge case: no benchmark data for region" `
  --label "backend,testing,must-have" --milestone "Sprint 3"

# Sprint 4
gh issue create --repo $repo --title "Set up React Native/Expo project" `
  --body "Tasks:`n- [ ] npx create-expo-app`n- [ ] Confirm app runs on physical device via Expo Go`n- [ ] Set up project folder structure (screens, components, api/)" `
  --label "mobile,setup" --milestone "Sprint 4"

gh issue create --repo $repo --title "Set up navigation structure" `
  --body "Implement bottom tab navigation for Home, Add Expense, Comparison, and Settings screens.`n`nTasks:`n- [ ] Install and configure react-navigation`n- [ ] Create placeholder screens for each tab`n- [ ] Verify navigation between tabs works" `
  --label "mobile,must-have" --milestone "Sprint 4"

gh issue create --repo $repo --title "Build API client" `
  --body "Create a reusable API client (axios/fetch wrapper) pointing to the FastAPI backend, with auth token handling.`n`nTasks:`n- [ ] Create api/client.js with base URL config`n- [ ] Add auth token storage and attach to requests`n- [ ] Test against a live backend endpoint" `
  --label "mobile,backend-integration" --milestone "Sprint 4"

# Sprint 5
gh issue create --repo $repo --title "Build Home/Dashboard screen" `
  --body "As a user, I want to see a summary of my spending, so that I get a quick overview when I open the app.`n`nAcceptance Criteria:`n- [ ] Shows current month's spending by category`n- [ ] Shows quick above/below benchmark indicator`n- [ ] Pulls data from backend on load" `
  --label "mobile,must-have" --milestone "Sprint 5"

gh issue create --repo $repo --title "Build Add Expense screen" `
  --body "As a user, I want to log an expense from my phone, so that I can track spending on the go.`n`nAcceptance Criteria:`n- [ ] Form fields: amount, category (dropdown), date, optional note`n- [ ] Submits to POST /expenses`n- [ ] Shows confirmation and updates history immediately" `
  --label "mobile,must-have" --milestone "Sprint 5"

# Sprint 6
gh issue create --repo $repo --title "Build Comparison screen with charts" `
  --body "As a user, I want to see a visual comparison of my spending vs. regional benchmarks.`n`nAcceptance Criteria:`n- [ ] Bar chart of user spending vs. benchmark, per category`n- [ ] Uses react-native-chart-kit or victory-native`n- [ ] Handles loading and empty states" `
  --label "mobile,core-feature,must-have" --milestone "Sprint 6"

gh issue create --repo $repo --title "Build Login/Registration screens" `
  --body "Acceptance Criteria:`n- [ ] Registration form with validation`n- [ ] Login form with error handling for invalid credentials`n- [ ] Successful login persists session/token" `
  --label "mobile,auth,must-have" --milestone "Sprint 6"

# Sprint 7
gh issue create --repo $repo --title "Manual location setting" `
  --body "As a user, I want to set my location, so that my dashboard reflects benchmarks for my specific region.`n`nAcceptance Criteria:`n- [ ] User can select region/state during onboarding or settings`n- [ ] Dashboard updates to reflect selected region`n- [ ] Falls back to national average if no location is set" `
  --label "should-have,mobile,backend" --milestone "Sprint 7"

gh issue create --repo $repo --title "End-of-day reminder notifications" `
  --body "As a user, I want a daily reminder, so that I build a habit of logging expenses.`n`nAcceptance Criteria:`n- [ ] Configurable push notification time`n- [ ] Skipped if user already logged an expense that day`n- [ ] User can disable in settings" `
  --label "should-have,mobile" --milestone "Sprint 7"

# Sprint 8
gh issue create --repo $repo --title "Offline expense logging" `
  --body "As a user, I want to log expenses without internet, so that I can keep tracking spending offline.`n`nAcceptance Criteria:`n- [ ] Expenses store locally when offline`n- [ ] Auto-sync to backend once connectivity returns`n- [ ] Visual indicator for entries pending sync" `
  --label "nice-to-have,mobile" --milestone "Sprint 8"

gh issue create --repo $repo --title "Previous vs. current month comparison" `
  --body "As a user, I want to compare this month's spending to last month's, so that I can see how my habits are changing.`n`nAcceptance Criteria:`n- [ ] Side-by-side or delta view per category, across two months`n- [ ] Percentage change shown per category`n- [ ] Updates automatically as the current month progresses" `
  --label "nice-to-have,mobile,backend" --milestone "Sprint 8"

# Sprint 9
gh issue create --repo $repo --title "Bug fixes and UI polish" `
  --body "Tasks:`n- [ ] Review and fix issues found during internal testing`n- [ ] Polish loading/error states across screens" `
  --label "polish" --milestone "Sprint 9"

gh issue create --repo $repo --title "Deploy backend" `
  --body "Tasks:`n- [ ] Dockerize FastAPI backend`n- [ ] Deploy to Render/Railway`n- [ ] Verify live endpoint works with mobile app" `
  --label "deployment,must-have" --milestone "Sprint 9"

gh issue create --repo $repo --title "Package mobile build" `
  --body "Tasks:`n- [ ] Build via Expo (EAS Build) for Android/iOS`n- [ ] Test installed build on physical device" `
  --label "deployment,mobile,must-have" --milestone "Sprint 9"

gh issue create --repo $repo --title "Finalize documentation" `
  --body "Tasks:`n- [ ] Update README with final setup and architecture overview`n- [ ] Add screenshots/demo GIF`n- [ ] Confirm all user stories map to shipped features" `
  --label "documentation" --milestone "Sprint 9"

# Sprint 10
gh issue create --repo $repo --title "Final QA pass" `
  --body "Tasks:`n- [ ] Walk through all Must-Have user stories end-to-end`n- [ ] Fix any remaining blocking issues`n- [ ] Confirm app is demoable for defense/submission" `
  --label "testing,must-have" --milestone "Sprint 10"

Write-Host "Done. Check your repo's Issues tab and Milestones page to confirm everything was created."
