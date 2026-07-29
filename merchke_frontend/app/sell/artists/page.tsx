import { redirect } from "next/navigation";
export default function SellArtistsPage() {
  redirect("/sell?type=artist");
}
