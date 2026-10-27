import { redirect } from "next/navigation";

// Old URL kept so existing links keep working.
export default function CreateEventRedirect() {
  redirect("/dashboard/events/new");
}
