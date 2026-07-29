import { redirect } from "next/navigation";
export default function SellBrandsPage() {
  redirect("/sell?type=brand");
}
