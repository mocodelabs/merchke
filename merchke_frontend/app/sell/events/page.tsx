import { redirect } from "next/navigation";
export default function SellEventsPage() {
  redirect("/sell?type=events");
}
