"use client";
import { useOptimistic } from "react";

import { deleteReservation } from "../_lib/actions";
import ReservationCard from "./ReservationCard";
//first argument is current state
//second is callback function that recieves the current state and the value we passed with the function we got as second argument in array destruction(optimisticDelete in this scenario)
//we need to render the optimistic state, if an error will occured it will show the original state after the 'fake optimistic' render
export default function ReservationList({ bookings }) {
  const [optimisticBookings, optimisticDelete] = useOptimistic(
    bookings,
    (curBookings, bookingId) => {
      return curBookings.filter((booking) => booking.id !== bookingId);
    }
  );
  async function handleDelete(bookingId) {
    optimisticDelete(bookingId); //fake optimistic delete
    await deleteReservation(bookingId); //actual delete
  }

  return (
    <ul className="space-y-6">
      {optimisticBookings.map((booking) => (
        <ReservationCard
          booking={booking}
          key={booking.id}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  );
}
