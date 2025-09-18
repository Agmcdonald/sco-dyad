# Project Documentation

This document provides a high-level overview of the Super Comic Organizer application's architecture and project structure. It is intended to help new developers understand how the different parts of the application fit together.

## Project Structure

The project is organized into several key directories:

-   `electron/`: Contains all the code for the Electron main process. This is the backend of the application, responsible for managing windows, interacting with the file system, and handling other native functionalities.
    -   `main.js`: The entry point for the Electron application. It creates the browser window and handles system events.
    -   `ipcManager.js`: Manages all the Inter-Process Communication (IPC) channels between the main process (backend) and the renderer process (frontend).
    -   `database.js`: Handles all interactions with the application's database.
    -   `fileHandler.js`: Contains the logic for file system operations like reading, writing, and moving comic files.
-   `src/`: Contains all the source code for the React frontend application (the renderer process).
    -   `components/`: Contains reusable React components used throughout the application.
    -   `pages/`: Contains the main page components that are mapped to routes.
    -   `context/`: Holds React context providers for managing global application state.
    -   `lib/`: Contains core business logic for the frontend, such as filename parsing, metadata scraping, etc.
    -   `hooks/`: Contains custom React hooks that encapsulate reusable logic.
    -   `services/`: Contains services that abstract away data fetching and communication with the Electron backend.
    -   `App.tsx`: The root component of the React application, which sets up the routing.
    -   `main.tsx`: The entry point for the React application.
-   `public/`: Contains static assets like images and icons that are served directly.
-   `build/`: Contains build-related files, like icons for the distributable application.
-   `release/`: This directory is created during the packaging process and contains the distributable application installers. It is not checked into version control.

## Architecture Overview

Super Comic Organizer is a desktop application built with Electron and React. This architecture is composed of two main processes:

1.  **Main Process (Backend):**
    -   Runs in a Node.js environment.
    -   The code for this process is located in the `electron/` directory.
    -   It is responsible for creating and managing application windows (`BrowserWindow`), handling native OS integrations (like menus and dialogs), and performing backend tasks like file system access and database management.
    -   It exposes functionalities to the frontend via Inter-Process Communication (IPC).

2.  **Renderer Process (Frontend):**
    -   Runs in a Chromium browser environment.
    -   The code for this process is located in the `src/` directory.
    -   It is a standard React single-page application (SPA) responsible for rendering the user interface.
    -   It cannot directly access the file system or other native resources. Instead, it communicates with the Main Process using the IPC channels defined in `electron/ipcManager.js` to request backend operations.

### Data Flow

A typical data flow looks like this:

1.  The user interacts with the React UI (Renderer Process).
2.  When a user action requires a backend operation (e.g., adding a file), the frontend sends a message to the Main Process via an IPC channel.
3.  The Main Process receives the message, performs the requested operation (e.g., copies the file and updates the database), and sends a response back to the frontend if needed.
4.  The frontend updates the UI based on the response from the Main Process.

This separation of concerns makes the application more robust, as a crash in the renderer process (the UI) will not necessarily crash the main process.
