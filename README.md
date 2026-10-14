# Dateboard

A desk board for dates, events and loose tasks. Runs as a static site on GitHub Pages. Your data stays in your browser and, if you set up sync, in a private GitHub repo that only you can read.

Files:

- `index.html`: markup
- `style.css`: styles
- `app.js`: the board, tasks panel and sync logic
- `sync.js`: GitHub storage and merging

## Setup

You need two repos. One holds the app and is public, because free GitHub Pages only serves public repos. It contains no personal data. The other holds your data and is private.

### 1. Publish the app

1. On GitHub, click **New repository**. Name it `dateboard`. Set it to **Public**. Tick **Add a README file** only if you want one; this README can replace it.
2. Click **Add file > Upload files** and drag in `index.html`, `style.css`, `app.js` and `sync.js`. Commit.
3. Go to **Settings > Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main**, folder to **/ (root)**. Save.
4. Wait a minute or two. The site appears at `https://YOUR-USERNAME.github.io/dateboard/`.

The board already works at this point. Sync is optional.

### 2. Create the private data repo

1. Click **New repository**. Name it `dateboard-data`.
2. Set it to **Private**.
3. Tick **Add a README file**. This matters: GitHub needs at least one commit in the repo before the app can write to it.
4. Create it. Leave it alone after that. The app creates and updates `data.json` itself.

### 3. Create an access token

The token lets the app write to the data repo, and nothing else.

1. Click your profile photo, then **Settings**.
2. Scroll to **Developer settings > Personal access tokens > Fine-grained tokens**.
3. Click **Generate new token**.
4. Name: `dateboard`. Expiration: the longest option offered.
5. Under **Repository access**, choose **Only select repositories** and pick `dateboard-data`.
6. Under **Permissions > Repository permissions**, set **Contents** to **Read and write**. Leave everything else alone.
7. Click **Generate token** and copy it. It starts with `github_pat_`. GitHub shows it once.

### 4. Connect the app

1. Open your Dateboard site and click the cloud icon in the top bar.
2. Data repo: `YOUR-USERNAME/dateboard-data`
3. File: leave as `data.json`
4. Access token: paste the token.
5. Click **Save and sync**.

A green dot on the cloud icon means it worked. After that, every change uploads a couple of seconds later, and the board checks for changes from other devices every 90 seconds and whenever you switch back to the window.

### 5. Add it to your Mac

- Safari: open the site, then **File > Add to Dock**.
- Chrome: **Menu > Cast, save and share > Install page as app**.

Either gives you a standalone window with its own icon. Keep it on a desktop space next to where the sticky notes used to be.

### 6. Add it to your phone

Open the site in Safari on iPhone, tap **Share > Add to Home Screen**. Then connect sync using the same repo name and token. Your board appears with everything from the Mac.

Do this on each device. The token is stored per browser, so each one needs it pasted in once.

## Using it

- **Add a date:** the round + button, or press `N`.
- **Edit:** click a card.
- **Multi-day:** fill in the Ends field. The card shows the range and counts days.
- **Repeat:** weekly, monthly or yearly. The card always shows the next occurrence. Marking it done only covers that occurrence.
- **Overlaps:** the add form lists anything already booked on the dates you pick. Cards that overlap show an amber badge.
- **Tags:** type a new tag in the form or pick an existing one. Use the chips under the title to filter.
- **Past dates:** hidden by default. The clock button shows them.
- **Tasks:** the side panel holds items with no date. Press `T` to jump to it. Click a task to rename it. Done tasks collapse under the list.
- **Projects:** a project groups several tasks, like a website build. Open the Projects view (the stacked-layers button), press `N` or the + button, name it, and create it. The dialog stays open so you can type tasks and press Enter after each one. A project card shows a progress bar and its next open tasks. Tick tasks off right on the card.
- **Project deadlines:** a deadline is optional. A project with one also appears on the date board with a progress bar, and turns amber if it runs overdue. Projects without a deadline only show in the Projects view.
- **Moving tasks into a project:** hover a task in the side panel and click the folder icon, then pick a project. The same menu moves a task back out. Tasks inside a project no longer appear in the side panel.
- **Finished projects:** once every task is done, the project fades and hides from the Projects view. The clock button shows completed ones again.
- **Search:** press `/`.
- **Views:** board or list, with the buttons next to the cloud.

## Updating the app

Upload the new files to the app repo, replacing the old ones, and commit. Pages takes a minute or two to publish. Then refresh each device with a hard refresh (Cmd+Shift+R on a Mac) or close and reopen the Dock app. Update every device before you edit on any of them. A device still running the old version does not know about projects and can overwrite them in the cloud copy.

## Backups

The ⋯ menu has **Export backup**, which downloads a JSON file, and **Import backup**, which replaces the board with a file. With sync on, the data repo's commit history also keeps every earlier version of `data.json`.

## How sync handles two devices

Each date and task has a last-edited time. When two devices have changed the same item, the newer edit wins. Deleting an item beats an older edit of it. Edits to different items on different devices all survive. The first time a fresh device connects, it takes the cloud copy and drops its sample cards.

## Troubleshooting

| Message | Fix |
| --- | --- |
| GitHub rejected the token | The token expired or was pasted wrong. Generate a new one and paste it in the sync settings. |
| Repo not found, or the token has no access | Check the repo spelling. Check that the token lists `dateboard-data` under repository access. |
| The token lacks permission | Open the token and set **Contents** to **Read and write**. |
| No connection to GitHub | You are offline. Changes stay in the browser and upload when the connection returns. |

Other notes:

- Clearing site data for the page removes the token and the local copy. The cloud copy is untouched. Paste the token again to get everything back.
- The token sits in the browser's local storage. Because it only reaches one private repo, the worst case if it leaks is someone editing `data.json`. You can revoke it anytime under Developer settings.
- Do not put the token in any file in the app repo.
