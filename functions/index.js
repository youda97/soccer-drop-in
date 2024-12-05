const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Stripe = require("stripe");
const functions = require("firebase-functions");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Load environment variables from the .env file
dotenv.config();

// Firestore reference
const db = admin.firestore();

const app = express();

// Enable CORS
app.use(cors());

// Middleware
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || functions.config().stripe.key);

// Use the environment variables
const { SENDER_EMAIL, SENDER_PASSWORD } = process.env;

// Payment Intent Route
app.post('/createPaymentIntent', async (req, res) => {
  const { user, amount } = req.body; // Get amount in cents from frontend

  if (!user || !amount) {
    return res.status(400).send({ error: "Invalid request payload" });
  }

  try {
    const db = getFirestore();
    const userId = user.uid
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    let customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) {
      // Create a new customer if no Stripe customer ID exists
      const customer = await stripe.customers.create({
        metadata: { userId }, // Optionally store userId in Stripe metadata
        name: user.email,
        email: user.email,  
      });

      customerId = customer.id;

      // Update Firestore with the new customer ID
      await userRef.update({ stripeCustomerId: customerId });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'cad',
      payment_method_types: ["card"],
      customer: customerId,
    });

    return res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return res.status(500).json({ error: error });
  }
});

app.post("/savePaymentMethod", async (req, res) => {
  const { user, paymentMethodId } = req.body;

  if (!user || !paymentMethodId) {
    return res.status(400).send({ error: "Invalid request payload" });
  }

  try {
    const db = getFirestore();
    const userId = user.uid;
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    let customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      // Create a new customer if no Stripe customer ID exists
      const customer = await stripe.customers.create({
        metadata: { userId }, // Optionally store userId in Stripe metadata
        name: user.email,
        email: user.email,  
      });

      customerId = customer.id;

      // Update Firestore with the new customer ID
      await userRef.update({ stripeCustomerId: customerId });
    }

    // Retrieve the payment method to get its fingerprint
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod) {
      return res.status(400).send("Invalid payment method ID.");
    }

    const paymentMethodFingerprint = paymentMethod.card?.fingerprint;

    // Fetch all payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    // Check if the payment method fingerprint is already saved
    const isDuplicate = paymentMethods.data.some(
      (method) => method.card?.fingerprint === paymentMethodFingerprint
    );

    if (!isDuplicate) {
      // Attach the payment method to the customer only if it's not a duplicate
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });   
    }

    // Proceed with the payment intent creation or further actions
    return res.send({ success: true, message: "Payment method processed successfully." });
  } catch (error) {
    console.error("Error saving payment method:", error);
    return res.status(500).send({ error: error });
  }
});


app.get("/getSavedCards/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) return res.status(404).send("Customer not found");

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return res.send(paymentMethods.data);
  } catch (error) {
    return res.status(500).send({ error: error });
  }
});

// Backend endpoint for confirming the payment intent
app.post("/chargeUser", async (req, res) => {
  const { paymentIntentId, paymentMethodId, userId } = req.body;

  try {
    // Retrieve the PaymentIntent to check for an existing payment method
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.payment_method) {
      if (!paymentMethodId) {
        return res
          .status(400)
          .send({ success: false, message: "Payment method is required." });
      }

      // Retrieve the customer associated with the user
      const customer = await stripe.customers.retrieve(userId); // Assuming userId is passed as part of the request

      if (!customer) {
        return res.status(400).send({ success: false, message: "Customer not found." });
      }

      // Attach the payment method to the PaymentIntent
      await stripe.paymentIntents.update(paymentIntentId, {
        payment_method: paymentMethodId,
        customer: customer.id,
      });
    }


    // Confirm the PaymentIntent
    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentId
    );

    return res.status(200).send({ success: true, paymentIntent: confirmedPaymentIntent });
  } catch (error) {
    console.error("Error confirming PaymentIntent:", error);
    return res.status(500).send({ success: false, message: error });
  }
});

app.get('/paymentIntents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    res.json(paymentIntent);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    res.status(400).json({ success: false, message: error });
  }
});

app.post('/refund', async (req, res) => {
  const { chargeId } = req.body;

  try {
    // Step 1: Retrieve the charge details
    const charge = await stripe.charges.retrieve(chargeId);

    // Step 2: Calculate the processing fee (2.9% + 0.30 CAD)
    const chargeAmount = charge.amount; // Amount is in cents
    const stripeFee = Math.round(chargeAmount * 0.029) + 30; // Fee in cents
    const refundAmount = chargeAmount - stripeFee; // Deduct fee

    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: refundAmount
    });
    res.json({ success: true, data: refund });
  } catch (error) {
    console.error('Error issuing refund:', error);
    res.status(400).json({ success: false, message: error });
  }
});

// Firestore Trigger on Document Creation
const notifyUsersOnEventCreated = onDocumentCreated(
  "events/{eventId}",
  async (event) => {
    // Extract document snapshot and route parameters
    const snapshot = event.data;
    const params = event.params || {};

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
      const emailPromises = [];

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
        user: SENDER_EMAIL || functions.config().email.user,
        pass: SENDER_PASSWORD || functions.config().email.pass,
      },
  });

/**
 * Sends an email notification to a user about a new event.
 * @param email - The recipient's email address.
 * @param eventData - The event data to include in the email.
 */
async function sendEmailNotification(email, eventData) {
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

// Export Firestore trigger
exports.notifyUsersOnEventCreated = notifyUsersOnEventCreated;  

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
