# Vision Analytics Platform - User Guide

This document provides a detailed walkthrough for deploying and using the Vision Analytics Platform. The platform turns standard cameras mounted on trains into AI-powered video analytics systems, with real-time inference running on edge devices. This guide covers everything from starting the application in Docker to configuring cameras on edge devices so they dynamically begin processing.

---

## 1. Docker Deployment

### 1.1 Running the Container

Use the following command to start the application. It runs the container in the background, binds it to your server's IP address on two ports, mounts the database and public asset directories so all data persists on the host machine, and ensures the container automatically restarts if it crashes or the machine reboots.

```bash
docker run -d \
  --name videorecorder \
  --restart unless-stopped \
  -p 192.168.0.243:3000:3000 \
  -p 192.168.0.243:3001:3001 \
  -e DATABASE_URL="file:/app/prisma/dev.db" \
  -v $(pwd)/prisma:/app/prisma \
  -v $(pwd)/public:/app/public \
  videorecorder:v2
```

Here is what each flag does:

| Flag | Purpose |
|------|---------|
| `-d` | Runs the container in detached mode (in the background), so it does not block your terminal. |
| `--name videorecorder` | Assigns the name "videorecorder" to the container so you can reference it easily in future commands like `docker stop videorecorder` or `docker logs videorecorder`. |
| `--restart unless-stopped` | Tells Docker to automatically restart the container if it crashes or if the host machine reboots. The only way it stays stopped is if you explicitly run `docker stop videorecorder`. This ensures the application stays available without manual intervention. |
| `-p 192.168.0.243:3000:3000` | Maps port 3000 inside the container to port 3000 on the host machine at the specified IP address. This is the port for the web UI — you will open this in your browser to access the application. |
| `-p 192.168.0.243:3001:3001` | Maps port 3001 inside the container to port 3001 on the host. This port is used for WebSocket and relay server communication between the application and edge devices. |
| `-e DATABASE_URL="file:/app/prisma/dev.db"` | Sets an environment variable inside the container that tells the application where to find its SQLite database file. The path `/app/prisma/dev.db` is the location inside the container, which maps to your local `prisma/` directory thanks to the volume mount below. |
| `-v $(pwd)/prisma:/app/prisma` | Mounts your local `prisma/` directory into the container at `/app/prisma`. This means the database file (`dev.db`) lives on your host machine and persists even if the container is destroyed and recreated. Any database changes (new trains, cameras, edge devices) are saved to your local disk. |
| `-v $(pwd)/public:/app/public` | Mounts your local `public/` directory into the container at `/app/public`. This is where the application stores uploaded blueprints, camera snapshots, and other static assets. By mounting it, these files persist on your host machine across container restarts. |
| `videorecorder:v2` | The Docker image name and tag to use. This must match the image you have built or pulled. |

### 1.2 Starting an Existing Container

If the container already exists but has been stopped (for example, you manually ran `docker stop videorecorder`), you do not need to run the full `docker run` command again. Simply start the existing container:

```bash
docker start videorecorder
```

This brings the container back up with all the same configuration (ports, volumes, environment variables, restart policy) that were set during the original `docker run` command.

To verify the container is running:

```bash
docker ps --filter name=videorecorder
```

---

## 2. Accessing the Application

Once the container is running, open a web browser on any machine that can reach the server and navigate to:

```
http://192.168.0.243:3000
```

This loads the home page of the Vision Analytics Platform, where you will see all configured trains displayed as cards.

---

## 3. Home Page - Train Cards

The home page is the starting point of the application. It displays all registered trains as a responsive grid of cards. The layout automatically adjusts to your screen size — more columns appear on wider screens, fewer on narrow ones.

### 3.1 Filtering and Searching

At the top of the page, you will find two ways to narrow down the list of trains:

**State Filter Buttons** — A row of buttons showing each state where trains are registered (e.g., Karnataka, Tamil Nadu, etc.). Click a state button to show only trains in that state. An "ALL" button resets the filter to show every train. The currently active filter is highlighted.

**Search Bar** — On the right side, there is a search icon button. Clicking it expands a text input field where you can type a train name or number. The card list filters in real time as you type (with a short debounce delay to avoid unnecessary requests). When you have typed something, a small "X" button appears inside the search field to clear your search. If no trains match your search, a message is shown: "No trains found for [your search term]".

### 3.2 Train Cards

Below the filters, trains are displayed in a grid under the heading **"Trains"**. Each card shows the following information about a train:

- **Train Number** — Extracted from the brand field, displayed prominently at the top of the card
- **Brand Name** — The full name of the train, shown below the number
- **Location** — The city and state where the train is registered, with a pink map pin icon. Below the city/state line, the exact GPS coordinates (latitude, longitude) are shown in smaller text
- **Coach** — The number of coaches, shown with a yellow train icon
- **Manager** — The name of the manager responsible for this train, shown with a blue person icon
- **Contact** — The manager's phone number, shown with a red phone icon

A faded train icon watermark appears in the top-right corner of each card as a visual accent. When you hover over a card, it lifts slightly with an enhanced shadow effect.

### 3.3 Adding a New Train

A floating action button (a "+" icon with a pulse animation) is fixed in the corner of the screen. Clicking it opens the **Add New Train** modal where you can register a new train in the system.

### 3.4 Entering a Train

Click on any train card to enter that train's management view. When you do this, a new tab is added to the tab bar at the top of the application, allowing you to switch between multiple trains without losing your place.

---

## 4. Inside a Train - Blueprint and Camera Management

After clicking a train card, you enter the train detail page. This is the central hub for managing everything within a single train: the blueprint, cameras, zones, edge devices, and diagnostics.

### 4.1 Blueprint View

The main content area of the page displays the **train blueprint** — a floor plan, layout diagram, or site map image. This is the visual representation of the train where camera positions are plotted.

**If no blueprint has been uploaded yet**, you will see a drag-and-drop upload area with a camera icon and instructions. You can either drag a JPG or PNG image file onto this area, or click it to open a file picker. Once uploaded, the blueprint image fills the main content area.

**Once a blueprint is uploaded**, it becomes an interactive canvas:

- **Camera Icons** — Each camera assigned to this train appears as an icon placed on the blueprint at its configured position. Next to each camera icon is the camera name and a color-coded **status badge**:
  - **Green** = Online (camera is reachable and streaming)
  - **Red** = Offline (camera is not responding)
  - **Yellow** = No RTSP configured (camera exists but has no stream URL set up)
  - **Gray** = Unknown status

- **Dragging Cameras** — You can click and drag any camera icon to reposition it on the blueprint. The new coordinates are saved automatically, so the next time you open this page, the camera will be where you left it.

- **Cropped View** — A blue rectangle overlay (slider) on the blueprint lets you select a specific region to zoom into. The cropped region is shown in a separate panel for closer inspection. Cameras within the cropped region are displayed with their relative positions preserved.

- **Clicking a Camera** — Click on any camera icon on the blueprint to view its most recent **snapshot** image. This is a still frame captured by the camera, useful for verifying that the camera is pointed correctly and functioning. Snapshots are captured via the Device Manager (covered in section 4.3).

### 4.2 Left Panel - Camera and Zone Management

The left sidebar is resizable (drag the edge to make it wider or narrower) and collapsible (click the toggle to minimize it). This is where you manage the train's organizational structure.

#### Zones

Zones are logical groupings within a train — for example, "Coach 1", "Coach 2", "Entrance", "Vestibule", etc. Each zone can contain multiple cameras.

- **Creating a Zone** — Click the **"Add Zone"** button at the bottom of the sidebar. A form appears where you enter the zone name. Click save to create it.
- **Viewing Zones** — Each zone is displayed as a collapsible section in the sidebar. The zone name is shown alongside a count of how many cameras it contains. Click the zone name or the chevron icon to expand or collapse it.
- **Editing a Zone** — Expand a zone, then use the edit controls to rename it.

#### Cameras

Within each expanded zone, you will see the list of cameras belonging to that zone. Each camera entry shows its name, status, and available actions.

**Creating a Camera** — Click the **"+"** button within a zone to add a new camera. Fill in the following fields:
- Device name (e.g., "Coach 1 - Front Camera")
- IP address of the camera
- RTSP link (the streaming URL)
- Username and password for RTSP authentication

**Editing a Camera** — Click the edit button (pencil icon) on any camera entry. The camera details expand into editable text fields where you can modify the name, IP address, RTSP credentials, and protocol settings. Click save to apply your changes.

**Additional Camera Actions:**
- **View Status** (eye icon) — Opens a quick status modal showing whether the camera is reachable, its connection details, and protocol information
- **Reset Position** (refresh icon) — Resets the camera's position on the blueprint back to the origin point (0, 0), useful if a camera icon has been accidentally dragged off-screen
- **Delete** — Removes the camera from the train entirely
- **Run Diagnostics** — Opens the Camera Diagnostics tool (covered in section 4.4)

### 4.3 Device Manager

The **Device Manager** is a modal you open from the train page. It is the control center for managing the edge device(s) linked to this train. This is one of the most important tools in the application because it is where you push camera configuration changes to the edge device.

When you open the Device Manager, you will see:

#### Edge Device Selector

If multiple edge devices are assigned to this train, a dropdown at the top lets you switch between them. If only one is assigned, it is selected automatically.

#### Device Status

Two status indicators show the current state of the device's key tasks:
- **Registration** — Shows whether the device registration task is active or inactive, along with the timestamp of the last run
- **Snapshots** — Shows whether the snapshot capture task is active or inactive, along with the timestamp of the last run

#### Registration Settings

This is an expandable section where you configure the registration endpoint. It contains fields for the base URL and IP address of the edge device.

**Why registration matters:** Whenever you make changes to cameras — adding new ones, editing existing ones, deleting them, or changing their zone assignments — those changes only exist in the platform's database until you explicitly push them to the edge device. Clicking **"Run Registration"** sends the updated camera configuration to the edge device. Without this step, the edge device continues operating with its previous configuration and will not pick up any of your changes.

After running registration, the edge device fetches the updated camera list and reconfigures itself accordingly. This is the mechanism that makes camera management dynamic — you manage cameras in the web UI, then push the configuration to the device with a single click.

#### Snapshot Capture Settings

Similar to registration, this section lets you configure and trigger snapshot capture. When you click **"Run Snapshot Capture"**, the edge device connects to each of its assigned cameras, captures a still frame from each one, and uploads the images back to the platform. These are the snapshots that appear when you click on a camera icon on the blueprint.

Snapshots are useful for:
- Verifying that a camera is functioning and properly aimed
- Getting a visual preview without needing to watch a live stream
- Confirming that the edge device can reach each camera on the network

#### Device Task Schedules

Instead of manually running registration and snapshot capture every time, you can set up automated schedules. Click **"Add Schedule"** to create one. The schedule creation form includes:

- **Schedule Name** — A descriptive name like "Hourly Registration" or "Morning Snapshots"
- **Task Type** — Choose between "Device Registration" or "Camera Snapshots"
- **Schedule Type** — Two options:
  - **Time-Based** — Runs once per day at a specific time (e.g., 09:00)
  - **Interval-Based** — Runs repeatedly at a set interval. Choose from presets (every 5 minutes, every 15 minutes, every 30 minutes, every 1 hour, every 2 hours, every 6 hours, every 12 hours, every 24 hours) or enter a custom interval in minutes. You can also set a start time and end time to limit when the interval is active.
- **Active Days** — Checkboxes for each day of the week (Monday through Sunday). All weekdays are checked by default.
- **Enable Immediately** — A checkbox (checked by default) that activates the schedule as soon as it is created.

All existing schedules are listed in a grid view showing their name, task type, frequency description, and active/inactive status. You can delete individual schedules or clear all of them at once. A refresh button reloads the schedule list from the edge device.

### 4.4 Camera Diagnostics

The **Camera Diagnostics** tool is a comprehensive three-column dashboard for testing and monitoring camera connectivity in real time. It connects to the edge device via WebSocket, so test results stream in live as they are produced.

#### Left Column - Camera Status and Live Results

- **Camera Status** — Shows the current overall status of the selected camera, derived from the latest diagnostic probes. Includes parallel execution statistics: how many commands are currently in-flight, how many have completed, and how many were successful.
- **Live Results** — As tests run, their results appear here in real time. Each result shows the protocol name, a color-coded status badge (green for success, red for failure, yellow for pending/running), and a brief result description. The most recent results appear at the top.

#### Middle Column - Manual Tests and Scheduler

This column contains buttons to run individual diagnostic tests or all of them at once.

**Network Tests** (arranged in a 2-column grid):
- **Ping** — Tests basic network reachability to the camera's IP address
- **Traceroute** — Maps the network path from the edge device to the camera
- **RTSP** — Tests whether the camera's RTSP stream URL is accessible and responding

**ONVIF Actions:**
- **Get Device Info & RTSP** — Queries the camera using the ONVIF protocol to retrieve its device information and discover its RTSP stream URLs automatically

Each section has a **"Run All"** button that executes every test in that category simultaneously, and a **"Clear Results"** button to remove the displayed results.

**Scheduler** — Below the manual tests, a scheduler section lets you configure automated diagnostic runs with countdown timers showing when the next run will execute.

#### Right Column - Diagnostics History

A filterable, paginated table of all past diagnostic results stored in the database. Filter buttons let you view: All results, Successes only, Failures only, Scheduled runs only, or Manual runs only. Each history entry shows the test name, result status, timestamp, and how long the test took to complete. You can clear the entire diagnostics database if you want to start fresh.

---

## 5. Recordings Page

Navigate to the **Recordings** page by clicking the **"View Recordings"** button from the train page. This page is divided into two main areas: a fixed sidebar on the left for filters and controls, and the main content area on the right showing the video list.

### 5.1 Left Sidebar - Filters and Controls

#### Edge Device Connection

At the top of the sidebar, the connected edge device is displayed with its hostname, IP address, and a color-coded status dot:
- **Green** = Online and reachable
- **Red** = Offline / unreachable
- **Yellow** = Checking connection

If the edge device is offline, an alert message appears with a "Retry" button. If multiple edge devices are assigned to this train, a dropdown lets you switch between them.

#### Action Buttons

Below the device status, three action buttons are available:

**Health** — Opens the **Health Modal**, which shows real-time system metrics from the edge device. This is useful for monitoring whether the device is under stress or running low on resources. The modal displays:
- **System Information** — Platform type, machine architecture, and uptime formatted as days/hours/minutes
- **CPU Temperature** — A large temperature reading, color-coded: green below 70C, yellow between 70-80C, red above 80C
- **CPU Usage** — Usage percentage with a colored progress bar, plus core count, frequency, and load average
- **Memory** — Usage percentage with a progress bar, showing used/total/available in GB
- **Storage** — Disk usage percentage with a progress bar, showing used/total/free in GB, and a separate line showing how much space is consumed by video recordings specifically
- **Network Statistics** — Bytes sent and received (in GB), packets sent and received

All progress bars are color-coded by severity: green when usage is below 70%, yellow between 70-80%, and red above 80%. A "Refresh" button fetches updated metrics, and the last-updated timestamp is shown.

**Device** — Opens the edge device's own web interface in a new browser tab, giving you direct access to the device's management UI.

**Manual/Scheduler** — Opens the **Recording Scheduler** modal (covered in detail in section 5.3). This button also shows a count of how many recording schedules are configured, and a status dot indicating whether a recording is currently in progress (red) or not (green).

#### Filters

**Search** — A search input field lets you filter videos by filename. As you type, the video list updates in real time. A clear button ("X") appears when text has been entered.

**Date** — A dropdown listing all available recording dates. Select a date to show only videos recorded on that day.

**Camera** — A dropdown listing all cameras with their zone names and individual video counts. Select a specific camera to filter, or choose "All Cameras" to show everything.

**Time** — A dropdown with preset time windows: All Day, Morning, Afternoon, Evening, Night.

#### Bottom Controls

**Auto-Refresh** — A checkbox toggle that, when enabled, automatically refreshes the video list at regular intervals. A green pulsing dot appears next to it when active, so you can tell at a glance whether auto-refresh is on.

**Refresh** — A manual refresh button (full width) that reloads the video list from the edge device. It shows a spinning icon and "Loading..." text while fetching.

**Bookmarks** — A toggle button that switches between showing all videos and showing only your bookmarked/favorited videos. The button displays the current bookmark count.

**Auto-Delete** — Opens the **Auto-Delete Configuration** modal where you can set up automatic cleanup of old recordings to manage storage space:
- **Enable/Disable** — A toggle switch to turn auto-delete on or off
- **Delete files older than** — A number input (1 to 365 days, default 7) that sets the age threshold
- **Cleanup Time** — A time picker (24-hour format, default 02:00) that sets when the daily cleanup runs
- **Run Cleanup Now** — A button to trigger an immediate cleanup without waiting for the scheduled time
- **Current Status** — A read-only display showing whether auto-delete is enabled, the current threshold, and the scheduled time

### 5.2 Right Side - Video List and Playback

The main content area displays video statistics, an interactive timeline, and the list of recorded videos.

#### Statistics Bar

At the top, three statistics are displayed:
- **Videos** — The total number of videos matching the current filters
- **Total Size** — The combined file size of all listed videos (e.g., "125.5 GB")
- **Time Range** — The earliest and latest recording times for the selected day (e.g., "06:30 - 22:15")

#### Hour Bar

Below the statistics, an interactive horizontal timeline spans hours 1 through 24. Blue blocks indicate which hours have recordings. You can click on a specific hour to filter the list, or drag across the timeline to select a range. Hovering over an hour shows a tooltip with the hour number and how many videos exist for that hour.

#### View Modes

Two buttons in the top-right let you toggle between:
- **Grid View** — Videos displayed as thumbnail cards in a responsive grid. Each card shows a video thumbnail image, the camera name, a bookmark toggle (heart icon), and overlay buttons for play and download.
- **List View** — Videos displayed as compact horizontal rows. Each row shows a small thumbnail on the left, video metadata in the center, and play/download/bookmark buttons on the right.

#### Playing a Video

Click on any video (either the thumbnail or the play button) to open the **Video Player Modal**. The modal provides:

- **Video Player** — A full HTML5 video player with standard browser controls: play/pause, seek bar, volume, fullscreen. The player supports MP4 format natively. For MKV or H.265 encoded files, a compatibility warning may appear if your browser does not support the codec.
- **Video Metadata** — Displayed below the player: camera name, file size, recording date, and a current time / total duration counter.
- **Volume Slider** — Fine-grained volume control from 0 to 100%.
- **Playback Speed** — A dropdown to change playback rate: 0.5x, 0.75x, 1x (normal), 1.25x, 1.5x, or 2x.
- **Download** — A button in the header that downloads the video file to your local machine.
- **Effects** — A button that toggles open a side panel with post-processing controls: brightness, contrast, and saturation sliders, a crop tool with percentage-based dimensions, and an export button to download the processed version of the video.

### 5.3 Manual and Scheduled Recording

Click the **"Manual/Scheduler"** button in the sidebar to open the Recording Scheduler modal. This is where you control active recordings and manage automated recording schedules.

#### Quick Recording Control

At the top of the modal, a large status indicator shows the current recording state:
- **Red pulsing dot** = RECORDING — the edge device is actively recording
- **Yellow pulsing dot** = STARTING or STOPPING — the recording is in a transitional state
- **Gray dot** = STOPPED — no recording is in progress

**Recording Mode** — Before starting a recording, select one of two modes:
- **Continuous Recording** — Records video continuously from all cameras, saving everything to disk. Use this when you want to capture every moment without gaps.
- **Stream Only** — Streams the camera feed in real time without saving any recordings to disk. Use this when you only need live monitoring.

**Resolution** — Select the recording resolution from a dropdown (e.g., Native, 720p, 1080p). The "Native" option uses whatever resolution the camera provides by default. This setting cannot be changed while a recording is running — you must stop the current recording first.

**Start / Stop** — Click **"Start Recording"** to begin. The button text includes the selected mode (e.g., "Start Recording (Continuous)"). Once recording starts, the button changes to a red **"Stop Recording"** button. The status indicator at the top updates to show the recording is active.

Once started, the edge device begins recording and streaming from all assigned cameras in the selected mode and resolution. You will be able to see new recordings appearing on the Recordings page (use the refresh or auto-refresh feature).

#### Recording Schedules

Below the quick controls, you can create and manage automated recording schedules so that recording starts and stops at predefined times without manual intervention.

**Creating a Schedule:**
1. Enter a **schedule name** (e.g., "Business Hours", "Night Shift", "Weekday Continuous")
2. Toggle the **status** to Enabled or Disabled
3. Set the **start time** and **end time** in 24-hour format (e.g., start at 08:00, end at 18:00)
4. Select the **days of the week** by clicking the day buttons: Mon, Tue, Wed, Thu, Fri, Sat, Sun. Selected days are highlighted in blue. You can select any combination of days.
5. Click **"Create Schedule"** to save

**Managing Existing Schedules:**
- All schedules are listed below the creation form
- Each schedule card shows its name, an enabled/disabled badge, the time range (with a clock icon), and the active days (with a calendar icon)
- Enabled schedules have a green border, disabled ones have a gray border
- Click the **trash icon** on any schedule to delete it
- A **refresh button** reloads the list from the edge device
- The scheduler status badge at the section header shows whether the scheduler service is "Running" (green) or "Stopped" (gray)

---

## 6. Snapshots and Live View

### 6.1 Viewing Snapshots

There are two ways to view camera snapshots from the train page:

1. **Click the path/line toggle button** in the top bar to switch to the path view, then click on any camera to see its latest snapshot.
2. **Go back to the blueprint view** and click directly on a camera icon on the blueprint. The most recent snapshot captured by that camera will be displayed.

Snapshots are captured in two ways:
- **Manually** — By clicking "Run Snapshot Capture" in the Device Manager
- **Automatically** — Via a snapshot schedule configured in the Device Manager (e.g., every 15 minutes during business hours)

### 6.2 Live Streaming Page

Click the **"Live"** button from the train page to navigate to the live streaming view. This page shows real-time video from all cameras assigned to the train, streamed via **WebRTC** (with HLS.js as a fallback).

#### Setting Up Streams

When the page loads, it automatically fetches the list of cameras configured for this train. Camera names are populated in a text area (one per line or comma-separated). You can manually edit this list to add or remove specific cameras if needed.

Three control buttons sit alongside the text area:

- **Load Streams** — Renders the video tiles on the page for all listed cameras. You must click this to initialize the video grid.
- **Play All** — Starts playback on every stream simultaneously.
- **Stop All** — Stops all active streams at once.

The streaming server URL and train ID are displayed for reference.

#### Video Grid and Layout

Streams are displayed in a responsive grid layout that adapts based on how many cameras are active:
- **1 stream** — Full width, centered, with a maximum width for comfortable viewing
- **2 streams** — Side by side in a two-column layout with flexible widths
- **3 streams** — Three-column layout
- **4 or more streams** — 2x2 grid layout
- **On mobile** — All streams stack into a single column

Each video tile includes:
- **Camera name** in the header bar
- **Status indicator** — A green dot with a glow effect when the stream is active, gray when inactive
- **Individual Play and Stop buttons** — Control each stream independently
- **16:9 aspect ratio** video player with a black background

#### Layout Customization

You can customize the viewing experience in several ways:
- **Select different grid layouts** to arrange camera feeds according to your preference
- **Resize individual camera panels** by adjusting the grid configuration
- **Rearrange cameras** by reordering them in the camera name list and reloading

The page uses a dark theme with gradient backgrounds and glass-morphism effects for an immersive monitoring experience. Streams are configured for low-latency playback with automatic reconnection if a stream drops.

---

## 7. Edge Devices Page

Navigate to the **Edge Devices** page from the sidebar menu. This is the central management page for all edge devices across the entire platform — not just one train, but every edge device in the system.

### 7.1 Page Overview

The page displays edge devices as cards in a paginated grid (4 per page). At the top of the page:

- **Search** — A text input to filter edge devices by hostname
- **Status Filter** — A dropdown to show All, Active, Pending, or Inactive devices
- **Refresh** — A button to reload the edge device list
- **Register Device** — A button that navigates to the device registration page (covered in section 7.5)

### 7.2 Edge Device Cards

Each edge device card displays:

- **Hostname** — The device's network hostname (main title)
- **Train name** — Which train this device is assigned to (if any), shown with a building icon
- **Status** — A color-coded indicator with the status label (Active, Pending, or Inactive)
- **MAC Address** — Shown with a WiFi icon
- **Camera count** — How many cameras are assigned to this device, shown with an activity icon

**Action buttons available on each card:**

| Button | Icon | What it does |
|--------|------|--------------|
| **Details** | Eye | Opens a detailed view of the device: ID, hostname, status, MAC address, IP address, assigned train, configuration data, list of assigned cameras, and 3D visualizer configurations |
| **History** | History/Clock | Shows a table of all configuration changes over time, with timestamps, hostname, MAC address, IP address, status, and train assignment for each historical entry |
| **Approve** | Checkmark (yellow, only visible for pending devices) | Activates a device that is in "pending" status. New devices start as pending until an administrator approves them. |
| **Assign Train** | Building (only visible if no train is assigned) | Opens a dialog where you search for and select a train to assign this device to |
| **Change Train** | Building (only visible if a train is already assigned) | Opens the same assignment dialog to switch the device to a different train |
| **Delete** | Trash | Permanently deletes the edge device. A confirmation dialog warns that this action is irreversible and that all camera assignments will be removed. |

### 7.3 Camera Assignment

Each edge device card has a collapsible **"Assigned Cameras"** section. Click the chevron to expand it and see all cameras currently linked to this edge device.

**Assigning Cameras:**
Click the **"Add Camera"** button (or the "+" icon) to open the camera assignment dialog. This dialog shows all available cameras organized by zone:
- Each zone is displayed as a section header with a "Select All / Deselect All" toggle
- Individual cameras within each zone have checkboxes
- A search field at the top filters cameras by name
- A badge shows how many cameras are available for assignment
- The footer shows a count of how many cameras you have selected
- Click **"Assign Selected"** to link the chosen cameras to this edge device

**Removing Cameras:**
Each assigned camera has a red "X" button. Clicking it prompts for confirmation before unassigning the camera from the edge device.

**Configuring Camera Use Cases:**
Each assigned camera also has a **settings (gear) icon** button that opens the **Configure Capabilities** modal. This is where you define what AI processing each camera should perform.

The modal has two sections:

**Standard Protocols** — A grid of clickable cards, each representing a predefined AI use case. Click a card to toggle it on or off. Selected cards are highlighted in blue with a checkmark icon. Available protocols may include: Crowd Analytics, Vehicle Tracking, Face Detection, Safety Detection, Intrusion Detection, and others depending on your deployment.

**Custom Internal Tags** — A text area where you can enter custom tags, one per line. These tags are used for internal routing and organization within the platform. They do not affect what the edge device processes — only the standard protocols above control that.

Click **"Save Changes"** to apply the use case configuration to the camera.

### 7.4 Important: Pushing Changes to the Edge Device

After making any changes on the Edge Devices page — assigning cameras, removing cameras, or configuring use cases — you must go to the **Device Manager** inside the train page and **run registration** for the changes to take effect on the edge device.

The workflow is:
1. Make your changes on the Edge Devices page (assign/remove/configure cameras)
2. Navigate to the train that the edge device belongs to
3. Open the **Device Manager** modal
4. Click **"Run Registration"**

This pushes the updated configuration to the edge device. The device then dynamically fetches the new camera list and reconfigures its processing pipeline. Without this step, the edge device continues running with its old configuration.

## 8. End-to-End Workflow

Here is the complete workflow from initial deployment to live AI processing, summarizing how all the pieces fit together:

1. **Deploy the application** using the `docker run` command from section 1.
2. **Open the browser** and navigate to `http://192.168.0.243:3000`.
3. **Click on a train card** from the home page to enter it.
4. **Upload a blueprint** image if one does not exist yet.
5. **Create zones** in the left panel to organize your cameras (e.g., "Coach 1", "Coach 2").
6. **Add cameras** within each zone — enter the camera name, IP address, RTSP URL, and credentials. Position the camera icons on the blueprint by dragging them.
7. **Navigate to the Edge Devices page** from the sidebar menu.
8. **Register a new edge device** if one does not exist, or find the existing device in the list.
9. **Assign the train** to the edge device using the "Assign Train" button on the card.
10. **Assign cameras** to the edge device by clicking "Add Camera" and selecting the cameras you just created.
11. **Configure use cases** for each camera — click the settings icon and select which AI protocols should run (crowd analytics, vehicle tracking, safety detection, etc.).
12. **Go back to the train page** and open the **Device Manager**.
13. **Run Registration** — This pushes the full camera configuration to the edge device. The device now knows which cameras to connect to, what RTSP URLs to use, and which AI models to run on each camera.
14. **Run Snapshot Capture** — This verifies that the edge device can reach each camera by capturing and uploading a snapshot from each one. Check the blueprint to confirm snapshots appear when you click camera icons.
15. Optionally, **set up schedules** in the Device Manager for automated registration and snapshot capture (e.g., registration every hour, snapshots every 15 minutes).

Once registration is complete, the edge device **dynamically fetches** all assigned cameras and their configurations from the platform. It then automatically:

- **Connects** to each camera via its RTSP URL
- **Runs AI inference** based on the configured use cases for each camera
- **Streams** processed video feeds that become available on the **Live** page via WebRTC
- **Records** video when you start a manual recording or when a recording schedule triggers

From this point, you can:
- **Watch live streams** on the Live page
- **Start and stop recordings** from the Recordings page using manual or scheduled modes
- **Review recorded videos** with filtering by date, camera, time, and search
- **Monitor edge device health** via the Health modal on the Recordings page
- **Run camera diagnostics** to troubleshoot connectivity or quality issues
- **Manage storage** with auto-delete policies for old recordings
