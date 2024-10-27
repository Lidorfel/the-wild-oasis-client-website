"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import { supabase } from "./supabase";
import { getBookings } from "./data-service";
import { redirect } from "next/navigation";

export async function createReservation(reservationData, formData) {
  const session = await auth();
  if (!session)
    throw new Error("You must be logged in order to create reservation");
  const newBooking = {
    ...reservationData,
    guestId: session.user.guestId,
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
    extrasPrice: 0,
    totalPrice: reservationData.cabinPrice,
    status: "unconfirmed",
    isPaid: false,
    hasBreakfast: false,
  };
  //validation that the dates are not occupied for that cabin

  const { error } = await supabase.from("bookings").insert([newBooking]);

  if (error) {
    console.error(error);
    throw new Error("Booking could not be created");
  }
  revalidatePath("account/reservations");
  revalidatePath(`/cabins/${reservationData.cabinId}`);
  redirect("/cabins/thankyou");
}

export async function updateGuestProfile(formData) {
  const session = await auth();
  if (!session)
    throw new Error("You must be logged in order to update profile");

  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  const regexForNationalID = /^[a-zA-Z0-9]{6,12}$/;
  if (!regexForNationalID.test(nationalID))
    throw new Error("Please provide a valid national ID");

  const updateData = { nationality, countryFlag, nationalID };
  const { data, error } = await supabase
    .from("guests")
    .update(updateData)
    .eq("id", session.user.guestId);

  if (error) throw new Error("Guest could not be updated");

  // very important to revalidate the cache
  // inorder to see the changes in the browser
  revalidatePath("/account/profile");
}

export async function deleteReservation(bookingId) {
  const session = await auth();
  if (!session)
    throw new Error("You must be logged in order to delete a reservation");

  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);
  if (!guestBookingIds.includes(bookingId))
    throw new Error("You are not allowed to delete this reservation");

  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw new Error("Booking could not be deleted");
  revalidatePath("/account/reservations");
  revalidatePath(`/cabins/${data.cabinId}`);
}

export async function updateReservation(formData) {
  const session = await auth();
  if (!session)
    throw new Error("You must be logged in order to edit reservation");

  const reservationId = Number(formData.get("reservationId"));

  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);
  if (!guestBookingIds.includes(reservationId))
    throw new Error("You are not allowed to edit this reservation");

  const numGuests = Number(formData.get("numGuests"));
  const observations = formData.get("observations");

  const updateData = { numGuests, observations: observations.slice(0, 1000) };
  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", reservationId);

  if (error) throw new Error("Booking could not be edited");
  const path = "/account/reservations";
  revalidatePath(path);
  revalidatePath(`${path}/edit/${reservationId}`);
  redirect(path);
}

//Auth

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
