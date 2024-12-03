import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaCalendar,
  FaClock,
  FaMapMarkerAlt,
  FaDollarSign,
  FaShareAlt,
  FaFutbol,
} from "react-icons/fa";
import PaymentModal from "../components/PaymentModal"; // Assuming you have a PaymentModal component
import {
  arrayRemove,
  arrayUnion,
  doc,
  DocumentData,
  DocumentReference,
  GeoPoint,
  getDoc,
  getFirestore,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { format, differenceInHours } from "date-fns"; // Import date-fns for date formatting
import { Event } from "../types/event";
import Map from "../components/Map";
import { useAuth } from "../components/Auth";
import axios from "axios";
import CancelModal from "../components/cancelModal";
import { Helmet } from "react-helmet";

interface EventDetailsProps {
  showNotification: (message: string) => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({ showNotification }) => {
  const { id: eventId } = useParams<{ id: string }>(); // Get eventId from params and specify type

  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelEventModalOpen, setIsCancelEventModalOpen] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isUserAlreadyJoined, setIsUserAlreadyJoined] = useState(false);
  const [isPlayer, setIsPlayer] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [event, setEvent] = useState<Event | null>(null); // State to hold event data
  const [playerList, setPlayerList] = useState<(string | null)[]>([]);
  const [goalkeeperList, setGoalkeeperList] = useState<(string | null)[]>([]);
  const [playerWaitList, setPlayerWaitList] = useState<(string | null)[]>([]);
  const [goalkeeperWaitList, setGoalkeeperWaitList] = useState<
    (string | null)[]
  >([]);

  const db = getFirestore();
  const { user } = useAuth(); // Get current logged-in user

  // Function to fetch event data from Firestore
  const fetchEvent = async (eventId: string): Promise<Event | null> => {
    const eventDoc = await getDoc(doc(db, "events", eventId));

    if (eventDoc.exists()) {
      const eventData = eventDoc.data() as Event; // This will be of type DocumentData
      return { ...eventData, id: eventId }; // Include id
    } else {
      console.error("No such document!");
      return null; // Handle case where the event doesn't exist
    }
  };

  const fetchUserNames = async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return [];

    const fetchedNames = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return `${userData.firstName} ${userData.lastName}`;
          } else {
            return null;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          return null;
        }
      })
    );

    return fetchedNames.filter((name) => name !== null);
  };

  // useEffect to call fetchEvent when the component mounts or eventId changes
  useEffect(() => {
    const getEventData = async () => {
      if (eventId) {
        setPageLoading(true); // Set loading to true when fetching starts

        try {
          // Check if eventId is defined
          const eventData = await fetchEvent(eventId);
          setEvent(eventData); // Set the fetched event data into state
        } catch (error) {
          console.error("Failed to fetch event data.");
        } finally {
          setPageLoading(false);
        }
      } else {
        console.error("Event ID is undefined");
      }
    };

    getEventData();
  }, [eventId]); // Dependency array: fetch event whenever eventId changes

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!event?.players) return;

      const fetchedPlayers = await fetchUserNames(event.players);
      setPlayerList(fetchedPlayers);
    };

    fetchPlayers();
  }, [event?.players, user?.uid]);

  useEffect(() => {
    const fetchGoalkeepers = async () => {
      if (!event?.goalkeepers) return;

      const fetchedGoalkeepers = await fetchUserNames(event.goalkeepers);
      setGoalkeeperList(fetchedGoalkeepers);
    };

    fetchGoalkeepers();
  }, [event?.goalkeepers, user?.uid]);

  useEffect(() => {
    const fetchPlayersFromWaitlist = async () => {
      if (!event?.playerWaitList) return;

      const fetchedPlayers = await fetchUserNames(event.playerWaitList);
      setPlayerWaitList(fetchedPlayers);
    };

    fetchPlayersFromWaitlist();
  }, [event?.playerWaitList]);

  useEffect(() => {
    const fetchGoalkeepersFromWaitlist = async () => {
      if (!event?.goalkeeperWaitList) return;

      const fetchedGoalkeepers = await fetchUserNames(event.goalkeeperWaitList);
      console.log(fetchedGoalkeepers);
      setGoalkeeperWaitList(fetchedGoalkeepers);
    };

    fetchGoalkeepersFromWaitlist();
  }, [event?.goalkeeperWaitList]);

  useEffect(() => {
    if (event && user?.uid) {
      const hoursUntilEvent = event.startDate
        ? differenceInHours(
            event.startDate.toDate(), // Convert Firestore Timestamp to JavaScript Date
            new Date()
          )
        : 0;
      const isInPlayers = event.players?.includes(user.uid);
      const isInGoalkeepers = event.goalkeepers?.includes(user.uid);
      const isInPlayersWaitlist = event.playerWaitList?.includes(user.uid);
      const isInGoalkeepersWaitlist = event.goalkeeperWaitList?.includes(
        user.uid
      );

      setIsUserAlreadyJoined(
        isInPlayers ||
          isInGoalkeepers ||
          isInPlayersWaitlist ||
          isInGoalkeepersWaitlist
      );

      // Allow cancellation if the event is more than 24 hours away and user is in a list
      setCanCancel(
        hoursUntilEvent >= 24 &&
          (isInPlayers ||
            isInGoalkeepers ||
            isInPlayersWaitlist ||
            isInGoalkeepersWaitlist)
      );
    }
  }, [event, user?.uid]);

  const handleJoinPlayer = async () => {
    if (!event || !user?.uid) {
      console.error("Event or user is undefined");
      return;
    }

    if (event.players?.includes(user.uid)) {
      console.warn("User is already in the players list");
      return;
    }
    if (event.goalkeepers && event.goalkeepers.includes(user.uid)) {
      console.warn("User is already in the goalkeepers list");
      return;
    }

    // Check if the player cost is greater than 0
    if (event.cost > 0) {
      // Show the payment modal if the cost is more than 0
      setIsPlayer(true);
      setIsModalOpen(true);
      return;
    }

    if (event.players?.length >= event.maxPlayers) {
      // Add to player waitlist if max players reached
      const updatedPlayerWaitList = [...(event.playerWaitList || []), user.uid];
      try {
        await updateDoc(doc(db, "events", event.id), {
          playerWaitList: updatedPlayerWaitList,
        });

        // Update local state to reflect the change without needing a refresh
        setEvent((prev) =>
          prev ? { ...prev, playerWaitList: updatedPlayerWaitList } : prev
        );

        console.log("Added to player waitlist");
      } catch (error) {
        console.error("Error updating player waitlist:", error);
      }
      return;
    }

    // If there's no cost, add the user directly to the player list
    const updatedPlayers = [...(event.players || []), user.uid];

    try {
      await updateDoc(doc(db, "events", event.id), {
        players: updatedPlayers,
      });

      setEvent((prev) => (prev ? { ...prev, players: updatedPlayers } : prev));
      setHasJoined(true);
    } catch (error) {
      console.error("Error updating players:", error);
    }
  };

  const handleJoinGoalkeeper = async () => {
    if (!event || !user?.uid) {
      console.error("Event or user is undefined");
      return;
    }

    if (event.players?.includes(user.uid)) {
      console.warn("User is already in the players list");
      return;
    }
    if (event.goalkeepers && event.goalkeepers.includes(user.uid)) {
      console.warn("User is already in the goalkeepers list");
      return;
    }

    // Check if the goalkeeper cost is greater than 0
    if (event.goalkeeperCost > 0) {
      // Show the payment modal if the cost is more than 0
      setIsPlayer(false);
      setIsModalOpen(true);
      return;
    }

    if (event.goalkeepers?.length >= event.maxGoalkeepers) {
      // Add to goalkeeper waitlist if max goalkeepers reached
      const updatedGoalkeeperWaitList = [
        ...(event.goalkeeperWaitList || []),
        user.uid,
      ];
      try {
        await updateDoc(doc(db, "events", event.id), {
          goalkeeperWaitList: updatedGoalkeeperWaitList,
        });

        // Update local state to reflect the change without needing a refresh
        setEvent((prev) =>
          prev
            ? { ...prev, goalkeeperWaitList: updatedGoalkeeperWaitList }
            : prev
        );

        console.log("Added to goalkeeper waitlist");
      } catch (error) {
        console.error("Error updating goalkeeper waitlist:", error);
      }
      return;
    }

    // If there's no cost, add the user directly to the goalkeeper list
    const updatedGoalkeepers = [...(event.goalkeepers || []), user.uid];

    try {
      await updateDoc(doc(db, "events", event.id), {
        goalkeepers: updatedGoalkeepers,
      });

      setEvent((prev) =>
        prev ? { ...prev, goalkeepers: updatedGoalkeepers } : prev
      );
      setHasJoined(true);
    } catch (error) {
      console.error("Error updating goalkeepers:", error);
    }
  };

  const addUserToPlayerList = async (
    paymentIntentId: string,
    paymentMethodId: string
  ) => {
    if (event && user?.uid) {
      if (event.players.includes(user.uid)) {
        console.warn("User is already in the players list");
        return;
      }

      if (event.players.length >= event.maxPlayers) {
        // Add to player waitlist
        const updatedWaitList = [...event.playerWaitList, user.uid];
        try {
          await updateDoc(doc(db, "events", event.id), {
            playerWaitList: updatedWaitList,
            [`payments.${user.uid}`]: {
              paymentIntentId,
              paymentMethodId,
            }, // Save in Firestore
            refundedUsers: arrayRemove(user.uid),
          });

          // Update local state to reflect the change without needing a refresh
          setEvent((prev) =>
            prev ? { ...prev, playerWaitList: updatedWaitList } : prev
          );

          console.log("Added to goalkeeper waitlist");
          showNotification(
            "You have been successfully added to the Player Waitlist!"
          );
        } catch (error) {
          console.error("Error updating goalkeeper waitlist:", error);
        }
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user?.uid));
      const userData = userDoc.data();

      const response = await axios.post("/chargeUser", {
        paymentIntentId,
        paymentMethodId,
        userId: userData?.stripeCustomerId,
      });

      if (response.data.success) {
        try {
          const updatedPlayers = [...event.players, user.uid];

          await updateDoc(doc(db, "events", event.id), {
            players: updatedPlayers,
            [`payments.${user.uid}`]: {
              paymentIntentId,
              paymentMethodId,
            }, // Save in Firestore
            refundedUsers: arrayRemove(user.uid),
          });
          setEvent((prev) =>
            prev ? { ...prev, players: updatedPlayers } : prev
          );
          setHasJoined(true);
          console.log(`${user.uid} charged successfully`);
          showNotification(
            "You have been successfully added to the Player List!"
          );
        } catch (error) {
          console.error("Error updating players:", error);
        }
      } else {
        console.error("Error charging user:", response.data.message);
      }
    } else {
      console.error("Event or user is undefined");
    }
  };

  const addUserToGoalkeeperList = async (
    paymentIntentId: string,
    paymentMethodId: string
  ) => {
    if (event && user?.uid) {
      if (event.goalkeepers.length >= event.maxPlayers) {
        // Add to goalkeeper waitlist if max goalkeepers reached
        const updatedGoalkeeperWaitList = [
          ...(event.goalkeeperWaitList || []),
          user.uid,
        ];
        try {
          await updateDoc(doc(db, "events", event.id), {
            goalkeeperWaitList: updatedGoalkeeperWaitList,
            [`payments.${user.uid}`]: {
              paymentIntentId,
              paymentMethodId,
            }, // Save in Firestore
            refundedUsers: arrayRemove(user.uid),
          });

          // Update local state to reflect the change without needing a refresh
          setEvent((prev) =>
            prev
              ? { ...prev, goalkeeperWaitList: updatedGoalkeeperWaitList }
              : prev
          );

          console.log("Added to goalkeeper waitlist");
          showNotification(
            "You have been successfully added to the Goalkeeper Waitlist!"
          );
        } catch (error) {
          console.error("Error updating goalkeeper waitlist:", error);
        }
        return;
      }

      const updatedGoalkeepers = [...(event.goalkeepers || []), user.uid];

      const userDoc = await getDoc(doc(db, "users", user?.uid));
      const userData = userDoc.data();

      const response = await axios.post("/chargeUser", {
        paymentIntentId,
        paymentMethodId,
        userId: userData?.stripeCustomerId,
      });

      if (response.data.success) {
        try {
          await updateDoc(doc(db, "events", event.id), {
            goalkeepers: updatedGoalkeepers,
            [`payments.${user.uid}`]: {
              paymentIntentId,
              paymentMethodId,
            }, // Save in Firestore
            refundedUsers: arrayRemove(user.uid),
          });
          setEvent((prev) =>
            prev ? { ...prev, goalkeepers: updatedGoalkeepers } : prev
          );
          setHasJoined(true);
          console.log(`${user.uid} charged successfully`);
          showNotification(
            "You have been successfully added to the Goalkeeper List!"
          );
        } catch (error) {
          console.error("Error updating goalkeepers:", error);
        }
      } else {
        console.error("Error charging user:", response.data.message);
      }
    } else {
      console.error("Event or user is undefined");
    }
  };

  // Promote a user from the waitlist and charge them
  async function promoteWaitlistUser(
    eventDocRef: DocumentReference<DocumentData, DocumentData>,
    listType: string
  ) {
    try {
      if (!user) return;

      const eventDoc = await getDoc(eventDocRef);
      const eventData = eventDoc.data();

      if (!eventDoc.exists || !eventData) {
        console.error("Event not found or data is undefined");
        return;
      }

      const waitlistType =
        listType === "players" ? "playerWaitList" : "goalkeeperWaitList";
      const promotedUserId = eventData[waitlistType]?.[0];

      const list = [...eventData[listType], promotedUserId];
      const waitList = eventData[waitlistType].slice(1);

      if (promotedUserId && eventData.goalkeeperCost > 0) {
        const paymentIntentId =
          eventData.payments[promotedUserId].paymentIntentId;
        if (!paymentIntentId) {
          console.error(
            "Payment intent not found for promoted user:",
            promotedUserId
          );
          return;
        }

        const paymentMethodId =
          eventData.payments[promotedUserId].paymentMethodId;
        if (!paymentMethodId) {
          console.error(
            "Payment method not found for promoted user:",
            promotedUserId
          );
          return;
        }

        const userDoc = await getDoc(doc(db, "users", promotedUserId));
        const userData = userDoc.data();

        // Confirm payment intent via backend for charging promoted user
        const response = await axios.post("/chargeUser", {
          paymentIntentId,
          paymentMethodId,
          userId: userData?.stripeCustomerId,
        });

        if (response.data.success) {
          try {
            // Add promoted user to the main list
            await updateDoc(eventDocRef, {
              [listType]: list,
              [waitlistType]: waitList,
              refundedUsers: arrayRemove(user?.uid),
            });

            setEvent((prev) =>
              prev
                ? { ...prev, [listType]: list, [waitlistType]: waitList }
                : prev
            );
            console.log(`Promoted user ${promotedUserId} charged successfully`);
          } catch (error) {
            console.error("Error promoting and charging user:", error);
          }
        } else {
          console.error("Error charging promoted user:", response.data.message);
        }
      } else {
        try {
          // Add promoted user to the main list
          await updateDoc(eventDocRef, {
            [listType]: list,
            [waitlistType]: waitList,
          });

          setEvent((prev) =>
            prev
              ? { ...prev, [listType]: list, [waitlistType]: waitList }
              : prev
          );
          console.log(`Promoted user ${promotedUserId} charged successfully`);
        } catch (error) {
          console.error("Error promoting and charging user:", error);
        }
      }
    } catch (error) {
      console.error("Error during promotion:", error);
    }
  }

  // Helper function to remove a user from either the players or goalkeepers list
  async function removeFromList(
    eventDocRef: DocumentReference<DocumentData, DocumentData>,
    listType: string,
    userId: string
  ) {
    const eventDoc = await getDoc(eventDocRef);
    const eventData = eventDoc.data();

    if (!eventDoc.exists) {
      console.error("Event not found");
      return false;
    }

    if (!eventData) {
      console.error("Event Data is undefined!");
      return;
    }

    const list = eventData[listType].filter((id: string) => id !== userId);

    await updateDoc(eventDocRef, {
      [listType]: list,
    });

    setEvent((prev) => (prev ? { ...prev, [listType]: list } : prev));
    setHasJoined(false);
  }

  // Helper function to remove a user from both waitlists (playerWaitList and goalkeeperWaitList)
  async function removeFromWaitlist(
    eventDocRef: DocumentReference<DocumentData, DocumentData>,
    userId: string
  ) {
    const eventDoc = await getDoc(eventDocRef);
    const eventData = eventDoc.data();

    if (!eventDoc.exists) {
      console.error("Event not found");
      return false;
    }

    if (!eventData) {
      console.error("Event Data is undefined!");
      return;
    }

    const playerWaitList = eventData["playerWaitList"].filter(
      (id: string) => id !== userId
    );

    const goalkeeperWaitList = eventData["goalkeeperWaitList"].filter(
      (id: string) => id !== userId
    );

    await updateDoc(eventDocRef, {
      playerWaitList: playerWaitList,
      goalkeeperWaitList: goalkeeperWaitList,
    });

    setEvent((prev) =>
      prev
        ? {
            ...prev,
            playerWaitList: playerWaitList,
            goalkeeperWaitList: playerWaitList,
          }
        : prev
    );
    setHasJoined(false);
  }

  // Issue a refund using the /refund API endpoint with Stripe
  async function issueRefund(
    paymentIntentId: string,
    eventRef: DocumentReference<DocumentData, DocumentData>
  ) {
    let latestChargeId = null;

    try {
      // Step 1: Retrieve the payment intent details
      const paymentIntent = await axios.get(
        `/paymentIntents/${paymentIntentId}`
      );
      latestChargeId = paymentIntent.data.latest_charge;

      console.log(paymentIntent.data);
      if (!latestChargeId) {
        console.error("No charge found associated with this payment intent");
        return {
          success: false,
          message: "No charge associated with this payment intent",
        };
      }

      // Step 2: Issue refund using the charge ID instead of the paymentIntentId
      const response = await axios.post("/refund", {
        chargeId: latestChargeId,
      });
      // return response.data;

      if (response.data.success) {
        // Add the player to the refundedUsers list in Firestore
        await updateDoc(eventRef, {
          refundedUsers: arrayUnion(user?.uid),
        });

        console.log(`Refund issued for player ${user?.uid}`);
        return { success: true, message: "Refund issued successfully" };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      // Type guard to check if 'error' is an instance of Error
      if (error instanceof Error) {
        console.error(
          "Error issuing refund for chargeId:",
          latestChargeId,
          error.message
        );
        return { success: false, message: error.message };
      } else {
        console.error("An unknown error occurred");
        return { success: false, message: "An unknown error occurred" };
      }
    }
  }

  const refundPlayer = async (
    userId: string,
    eventRef: DocumentReference<DocumentData, DocumentData>,
    eventData: DocumentData | undefined
  ) => {
    if (!eventData) {
      console.error("Event not found or data is undefined");
      return { success: false, message: "Event not found" };
    }

    if (
      eventData["players"].includes(userId) ||
      (eventData["goalkeepers"].includes(userId) &&
        eventData.goalkeeperCost > 0)
    ) {
      // Step 2: Retrieve the associated paymentIntentId from the payments map
      const paymentIntentId = eventData.payments[userId].paymentIntentId;
      if (!paymentIntentId) {
        throw new Error("No payment intent found for this user");
      }

      // Step 3: Issue a refund if the user is in the players or goalkeepers list
      const refundResponse = await issueRefund(paymentIntentId, eventRef);

      if (!refundResponse.success) {
        throw new Error(`Error issuing refund: ${refundResponse}`);
      }

      console.log(`Refund successful for paymentIntentId: ${paymentIntentId}`);
      showNotification("Refund successful!");
    }
  };

  const handleCancel = async () => {
    setIsLoading(true); // Start loading
    try {
      if (!user?.uid || !event) {
        console.error("Event or user is undefined");
        return;
      }

      const eventRef = doc(db, "events", event.id);
      const eventDoc = await getDoc(eventRef);
      const eventData = eventDoc.data();

      if (!eventDoc.exists || !eventData) {
        console.error("Event not found or data is undefined");
        return { success: false, message: "Event not found" };
      }

      refundPlayer(user.uid, eventRef, eventData);

      // Step 4: Remove the user from the specified list
      if (eventData["players"].includes(user.uid)) {
        await removeFromList(eventRef, "players", user.uid);
        if (eventData.playerWaitList.length > 0) {
          await promoteWaitlistUser(eventRef, "players");
        }
        console.log(`${user.uid} has been removed from players list`);
      } else if (eventData["goalkeepers"].includes(user.uid)) {
        await removeFromList(eventRef, "goalkeepers", user.uid);
        if (eventData.goalkeeperWaitList.length > 0) {
          await promoteWaitlistUser(eventRef, "goalkeepers");
        }
        console.log(`${user.uid} has been removed from goalkeepers list`);
      } else if (
        eventData["playerWaitList"].includes(user.uid) ||
        eventData["goalkeeperWaitList"].includes(user.uid)
      ) {
        await removeFromWaitlist(eventRef, user.uid);
        console.log(`${user.uid} has been removed from wait list`);
      }
      setIsCancelModalOpen(false);
    } catch (error) {
      console.error("Error during cancellation:", error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleCancelEvent = async () => {
    if (!event) return;
    setIsLoading(true);

    try {
      const db = getFirestore();
      const eventRef = doc(db, "events", event.id);
      const eventDoc = await getDoc(eventRef);
      const eventData = eventDoc.data();

      // Refund players and goalkeepers
      const refundPromises = [
        ...event.players.map((player) =>
          refundPlayer(player, eventRef, eventData)
        ),
        ...event.goalkeepers.map((goalkeeper) =>
          refundPlayer(goalkeeper, eventRef, eventData)
        ),
      ];
      await Promise.all(refundPromises);

      // Mark event as cancelled
      await updateDoc(eventRef, { status: "cancelled" });

      // Update local state
      setEvent((prev) => (prev ? { ...prev, status: "cancelled" } : null));

      showNotification("Event cancelled, and all users refunded.");
      setIsCancelEventModalOpen(false);
    } catch (error) {
      console.error("Error cancelling event:", error);
      showNotification("Failed to cancel the event.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format timestamps to a readable date format
  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "N/A"; // Handle missing timestamp
    const date = (timestamp as Timestamp).toDate(); // Convert to JS Date
    return date.toLocaleString(); // Format the date as a string
  };

  if (pageLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) {
    return !pageLoading && <div>Event not found.</div>; // Handle case where event is not found
  }

  const convertedLocation =
    event.location && event.location instanceof GeoPoint
      ? { lat: event.location.latitude, lng: event.location.longitude }
      : null;

  return (
    <>
      <Helmet>
        <title>{event.title}</title>
        <meta property="og:title" content={event.title} />
        <meta
          property="og:description"
          content={
            `Join us for ${event.title}. Date: ${format(
              formatDate(event.startDate),
              "EEE, MMMM d"
            )}. Duration: ${format(
              formatDate(event.startDate),
              "h:mm a"
            )} - ${format(formatDate(event.endDate), "h:mm a")}}. Location: ${
              event.location
            }. Player Cost: ${event.cost}.` + event.includeGoalkeepers
              ? "Goalkeeper Cost: " +
                (event.goalkeeperCost > 0
                  ? "$" + event.goalkeeperCost?.toFixed(2)
                  : "Free")
              : ""
          }
        />
        {/* <meta property="og:image" content={event.image} /> */}
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      {isLoading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        </div>
      )}

      {event.endDate &&
        event.endDate.toDate() < new Date() &&
        event.status !== "cancelled" && (
          <div className="bg-green-500 text-white text-center py-4 sticky md:top-[62px]">
            <h2 className="text-3xl font-bold">Event Completed</h2>
          </div>
        )}

      {event.status === "cancelled" && (
        <div className="bg-red-600 text-white text-center py-4 sticky md:top-[62px]">
          <h2 className="text-3xl font-bold">Event Cancelled</h2>
        </div>
      )}

      <div className="flex flex-col md:flex-row bg-gray-100 min-h-screen">
        {/* Sidebar */}
        <aside
          className={`${
            event.status === "cancelled" ||
            (event.endDate && event.endDate.toDate() < new Date())
              ? "md:h-[calc(100vh-130px)] md:top-[130px]"
              : "md:h-[calc(100vh-62px)] md:top-[62px]"
          } bg-white sm:shadow-md p-6 w-full md:w-1/3 lg:w-1/4 border-r flex flex-col justify-between 
            sticky md:sticky overflow-auto`}
        >
          <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-4">
              {event.title}
            </h1>
            <p className="flex items-center text-gray-600 mb-2">
              <FaMapMarkerAlt className="mr-2 text-emerald-600" />
              {event.locationName}
            </p>
            <p className="flex items-center text-gray-600 mb-2">
              <FaCalendar className="mr-2 text-emerald-600" />
              {format(formatDate(event.startDate), "MMMM d, yyyy")}
            </p>
            <p className="flex items-center text-gray-600 mb-2">
              <FaClock className="mr-2 text-emerald-600" />
              {format(formatDate(event.startDate), "h:mm a")} -{" "}
              {format(formatDate(event.endDate), "h:mm a")}
            </p>
            {event.field && (
              <p className="flex items-center text-gray-600 mb-2">
                <FaFutbol className="mr-2 text-emerald-600" />
                {event.field}
              </p>
            )}
            <p className="flex items-center text-gray-600 mb-2">
              <FaDollarSign className="mr-2 text-emerald-600" />
              Player - ${event.cost?.toFixed(2)}
            </p>
            {event.includeGoalkeepers && (
              <p className="flex items-center text-gray-600 mb-2">
                <FaDollarSign className="mr-2 text-emerald-600" />
                Goalkeeper -{" "}
                {event.goalkeeperCost > 0
                  ? "$" + event.goalkeeperCost?.toFixed(2)
                  : "Free"}
              </p>
            )}
            <div className="mt-6">
              <button
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded w-full flex items-center justify-center"
                onClick={() =>
                  navigator.share({
                    title: event.title,
                    url: window.location.href,
                  })
                }
              >
                <FaShareAlt className="mr-2" />
                Share Event
              </button>
            </div>

            <p className="text-gray-700 mt-6">
              Please note that if you are joining the waitlist, you will not be
              charged until you secure a spot. If someone cancels their spot and
              you are next in line, you will be automatically charged as soon as
              a spot becomes available
            </p>
          </div>

          {event.endDate && event.endDate.toDate() > new Date() && (
            <div className="hidden sm:flex flex-col gap-4 mt-6">
              {event.status === "cancelled" ? (
                <div className="alert alert-danger">
                  This event has been cancelled.
                </div>
              ) : (
                <>
                  {/* Join/Cancel Buttons for Larger Screens */}
                  {canCancel ? (
                    <>
                      <p className="mt-4 text-red-500">
                        You are already registered on one of the lists.
                      </p>
                      <button
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        onClick={() => setIsCancelModalOpen(true)}
                        disabled={isLoading}
                      >
                        Cancel Registration
                      </button>
                    </>
                  ) : (
                    <>
                      {event.endDate && event.endDate.toDate() > new Date() && (
                        <p className="mt-4 text-gray-500">
                          You can only cancel your registration up to 24 hours
                          before the event.
                        </p>
                      )}
                    </>
                  )}

                  {!isUserAlreadyJoined && !hasJoined && (
                    <>
                      <button
                        onClick={handleJoinPlayer}
                        className="bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 focus:outline-none transition-colors duration-200"
                      >
                        Join as Player
                      </button>
                      {event.includeGoalkeepers && (
                        <button
                          onClick={handleJoinGoalkeeper}
                          className="bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 focus:outline-none transition-colors duration-200"
                        >
                          Join as Goalkeeper
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {user?.isAdmin && event.status !== "cancelled" && (
                <button
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={() => setIsCancelEventModalOpen(true)}
                  disabled={isLoading}
                >
                  Cancel Event & Refund
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 pb-[192px] overflow-y-auto flex-grow sm:pb-6">
          {/* Players and Waitlists */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Players</h2>
            <ul className="border rounded-lg p-4">
              {Array.from({ length: event.maxPlayers }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between border-b py-2 last:border-b-0"
                >
                  <span>
                    {playerList[index] ? (
                      playerList[index]
                    ) : (
                      <span className="text-gray-400">
                        Spot {index + 1} - Open
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Player Waitlist</h2>
            <ul className="border rounded-lg p-4">
              {playerWaitList.length > 0 ? (
                playerWaitList.map((playerName, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between border-b py-2 last:border-b-0"
                  >
                    {playerName}
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No players on the waitlist</li>
              )}
            </ul>
          </div>

          {/* Goalkeeper List and Waitlists*/}
          {event.includeGoalkeepers && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">Goalkeepers</h2>
                <ul className="border rounded-lg p-4">
                  {Array.from({ length: event.maxGoalkeepers }, (_, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between border-b py-2 last:border-b-0"
                    >
                      <span>
                        {goalkeeperList[index] ? (
                          goalkeeperList[index]
                        ) : (
                          <span className="text-gray-400">
                            Goalkeeper Spot {index + 1} - Open
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-semibold">Goalkeeper Waitlist</h2>
                <ul className="border rounded-lg p-4">
                  {goalkeeperWaitList.length > 0 ? (
                    goalkeeperWaitList.map((goalkeeperName, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between border-b py-2 last:border-b-0"
                      >
                        {goalkeeperName}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">
                      No players on the waitlist
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}

          {/* Map */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-4">Event Location</h2>
            <div className="w-full bg-gray-200 rounded-lg">
              <Map location={convertedLocation} />
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-gray-600">
              <strong>Organizer: </strong>Yousef Ouda
            </p>
            <p className="text-gray-600">
              <strong>Email: </strong>
              <a
                href="mailto:ouda.yousef@gmail.com"
                className="text-blue-500 underline"
              >
                ouda.yousef@gmail.com
              </a>
            </p>
          </div>
        </main>
      </div>

      {/* Sticky Footer for Smaller Screens */}
      {event.endDate && event.endDate.toDate() > new Date() && (
        <div className="sm:hidden fixed bottom-0 left-0 w-full bg-white shadow-lg p-4 flex flex-col gap-2 justify-center text-center">
          {event.status === "cancelled" ? (
            <div className="alert alert-danger">
              This event has been cancelled.
            </div>
          ) : (
            <>
              {canCancel ? (
                <>
                  <p className="mt-4 text-red-500 text-center">
                    You are already registered on one of the lists.
                  </p>
                  <button
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    onClick={() => setIsCancelModalOpen(true)}
                    disabled={isLoading}
                  >
                    Cancel Registration
                  </button>
                </>
              ) : (
                <>
                  {event.endDate && event.endDate.toDate() > new Date() && (
                    <p className="mt-4 text-gray-500">
                      You can only cancel your registration up to 24 hours
                      before the event.
                    </p>
                  )}
                </>
              )}

              {!isUserAlreadyJoined && !hasJoined && (
                <>
                  <button
                    onClick={handleJoinPlayer}
                    className="bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 focus:outline-none transition-colors duration-200"
                  >
                    Join as Player
                  </button>
                  {event.includeGoalkeepers && (
                    <button
                      onClick={handleJoinGoalkeeper}
                      className="bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 focus:outline-none transition-colors duration-200"
                    >
                      Join as Goalkeeper
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {user?.isAdmin && event.status !== "cancelled" && (
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={() => setIsCancelEventModalOpen(true)}
              disabled={isLoading}
            >
              Cancel Event & Refund
            </button>
          )}
        </div>
      )}

      <CancelModal
        onCancel={handleCancelEvent}
        onModalClose={() => setIsCancelEventModalOpen(false)}
        isModalOpen={isCancelEventModalOpen}
        title="Confirm Event Cancellation"
        description="Are you sure you want to cancel this event? This action will
                  refund all participants and prevent further registrations."
      />

      <CancelModal
        onCancel={handleCancel}
        onModalClose={() => setIsCancelModalOpen(false)}
        isModalOpen={isCancelModalOpen}
        title="Confirm Cancellation"
        description={`Are you sure you want to cancel your spot for this event? 
            Your spot will be released, and a refund will be processed. 
            Please note that the processing fee of $${
              user && event["players"].includes(user.uid)
                ? typeof event.cost === "number" && !isNaN(event.cost)
                  ? (event.cost * 0.029 + 0.3).toFixed(2)
                  : "0.00" // Default to '0.00' if the cost is invalid
                : typeof event.goalkeeperCost === "number" &&
                  !isNaN(event.goalkeeperCost)
                ? (event.goalkeeperCost * 0.029 + 0.3).toFixed(2)
                : "0.00" // Default to '0.00' if the goalkeeper cost is invalid
            } 
            will be deducted from your refund.`}
      />

      <PaymentModal
        isOpen={isModalOpen}
        amount={isPlayer ? event.cost : event.goalkeeperCost}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async (paymentIntentId, paymentMethodId) => {
          if (isPlayer) {
            await addUserToPlayerList(paymentIntentId, paymentMethodId);
          } else {
            await addUserToGoalkeeperList(paymentIntentId, paymentMethodId);
          }
        }}
      />
    </>
  );
};

export default EventDetails;
