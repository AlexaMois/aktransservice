# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Manual Test Cases

Before releasing, verify these scenarios work correctly:

### Search
- [ ] Enter any text in "Поиск…" field → no white screen, results filter or show empty list
- [ ] Enter special characters → no crash

### Announcements  
- [ ] Open "Объявления" tab → announcements load
- [ ] Click on announcement card → detail modal opens
- [ ] Close modal with X or "Закрыть" → "Новое" badge disappears
- [ ] Refresh page → announcement stays read (no "Новое" badge)

### User Display
- [ ] Header shows "Гость • XXXX" label in public mode
- [ ] Badge shows "Публичный доступ"

### Voice Input
- [ ] "Голосом" button is visible
- [ ] If browser doesn't support microphone → button disabled with tooltip
- [ ] If supported → clicking starts recording

### Feedback
- [ ] "Оставить фидбэк" button visible in header on desktop and mobile
- [ ] Clicking opens feedback form modal

### Task Deletion
- [ ] Open any task card → trash icon visible in header
- [ ] Click trash → confirmation dialog appears
- [ ] Confirm → task deleted, modal closes

### Error Handling
- [ ] If any error occurs → error boundary shows friendly message instead of white screen
