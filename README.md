# Soccer-drop-in

An intuitive soccer drop-in app that lets players join and track local games easily and securely. Admins can efficiently manage and organize events for a seamless experience. Payments are securely processed using Stripe, and players can be added to waitlists to automatically join events when spots open up. Players can also request a refund (minus a processing fee) if they wish to cancel.

## Features

- **Players**: 
  - Join local soccer games, view upcoming events, and track your game participation.
  - Add yourself to waitlists for events, and join automatically when a spot opens up.
  - Request refunds (minus a processing fee) for event cancellations.
  
- **Admins**:
  - Efficiently organize and manage soccer events, view and track participants, and manage event cancellations.

- **Payments**:
  - Secure payments using Stripe for charging players and processing refunds.
  - Payment intents are created and managed in the backend.
  
- **Secure Authentication**:
  - Ensure only authorized users can access sensitive information using Firebase for authentication.

## Tech Stack

- **Frontend**:
  - React
  - Stripe for payments
  - Tailwind CSS

- **Backend**:
  - Node.js
  - Express
  - Stripe for payment intents, managing payments, charging users, and issuing refunds.
  - Firebase for authentication and real-time database.
  
## Installation

### Frontend

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/soccer-drop-in.git
   cd soccer-drop-in
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Backend
1. Navigate to the backend directory:
   ```bash
   cd firebase-admin-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Set Up Environment Variables

### Frontend
1. Create a `.env` file in the root of the `Frontend` directory and add the following variables:
   ```makefile
   REACT_APP_STRIPE_PUBLIC_KEY=<your-stripe-public-key>
   GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
   FIREBASE_API_KEY=<your-firebase-api-key>
   FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
   FIREBASE_APP_ID=<your-firebase-app-id>
   FIREBASE_MEASUREMENT_ID=<your-firebase-measurement-id>
   ```

### Backend
1. Create a `.env` file in the root of the `firebase-admin-server` directory and add the following variable:
   ```makefile
   stripe_secret_key=<your-stripe-secret-key>
   ```

2. Ensure you have a `serviceAccountKey.json` file to set admin permissions for users.

## Run the App Locally

### Frontend
1. To start the frontend app, run:
   ```bash
   npm start
   ```
   The frontend will be available at [http://localhost:3000](http://localhost:3000) (or another port if specified).

### Backend
1. To start the backend server, run:
   ```bash
   node paymentServer.js
   ```
   The backend API will now be running locally (or specify the port you are using).

## Usage

### Players
- Sign up/sign in via Firebase Authentication
- Browse available games
- Join games
- Add yourself to waitlists
- Request refunds for cancellations

### Admins
- Log in to the admin panel
- Create new events
- Track player participation
- Manage payments
- Cancel games and issue refunds

## Contact
Created by Yousef Ouda
Email: ouda.yousef@gmail.com
GitHub: https://github.com/youda97

