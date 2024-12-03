import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as dotenv from 'dotenv';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Load environment variables from the .env file
dotenv.config();

// Firestore reference
const db = admin.firestore();

// Use the environment variables
const { SENDER_EMAIL, SENDER_PASSWORD } = process.env;

// Firestore Trigger on Document Creation
export const notifyUsersOnEventCreated = onDocumentCreated(
  "events/{eventId}",
  async (event) => {
    // Extract document snapshot and route parameters
    const snapshot: QueryDocumentSnapshot | undefined = event.data;
    const params: { [key: string]: string } = event.params || {};

    // Ensure snapshot exists
    if (!snapshot) {
      logger.error("No data in the snapshot.");
      return;
    }

    // Access the event data
    const eventData = snapshot.data();
    logger.info("New event created:", eventData);

    // Access route parameters (e.g., eventId)
    const { eventId } = params;
    if (!eventId) {
      logger.error("No eventId found in the path parameters.");
      return;
    }

    try {
      // Fetch all users to notify
      const usersQuerySnapshot = await db.collection("users").get();
      const emailPromises: Promise<void>[] = [];

      // Iterate over users and send email notifications
      usersQuerySnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const userEmail = userData.email;

        if (userEmail) {
          emailPromises.push(sendEmailNotification(userEmail, eventData));
        }
      });

      // Wait for all email promises to complete
      await Promise.all(emailPromises);

      logger.info(`Notification emails sent for event ID: ${eventId}`);
    } catch (error) {
      logger.error("Error notifying users:", error);
    }
  }
);

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail", // Use your email provider
    auth: {
        user: SENDER_EMAIL,
        pass: SENDER_PASSWORD,
      },
  });

/**
 * Sends an email notification to a user about a new event.
 * @param email - The recipient's email address.
 * @param eventData - The event data to include in the email.
 */
async function sendEmailNotification(email: string, eventData: admin.firestore.DocumentData): Promise<void> {
    const startDate = new Date(eventData.startDate._seconds * 1000);
    const date = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long',  day: 'numeric', timeZone: 'America/New_York' });
    const endDate = new Date(eventData.endDate._seconds * 1000);
    const startTime = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true,  timeZone: 'America/New_York' });
    const endTime = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true,  timeZone: 'America/New_York' });
    const location = eventData.locationName;
    const cost = eventData.cost;
    const maxPlayers = eventData.maxPlayers;
    const includeGoalkeepers = eventData.includeGoalkeepers ? "Yes" : "No";
    const goalkeeperCost = eventData.goalkeeperCost;
    const maxGoalkeepers = eventData.maxGoalkeepers;

    const goalkeeperDetails = eventData.includeGoalkeepers
        ? `Goalkeeper cost: ${goalkeeperCost}\nMax goalkeepers: ${maxGoalkeepers}`
        : "";

    const mailOptions = {
        from: SENDER_EMAIL,
        to: email,
        subject: `New Event: ${eventData.title}`,
        text: `A new event has been created!\n
Date: ${date}
Time: ${startTime} - ${endTime}
Location: ${location}
Player cost: ${cost}
Max players: ${maxPlayers}
Includes Goalkeepers: ${includeGoalkeepers}
${goalkeeperDetails}`,
        };

        await transporter.sendMail(mailOptions);
}
