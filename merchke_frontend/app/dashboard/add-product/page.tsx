import { redirect } from "next/navigation";

// Old URL kept so existing links keep working.
export default function AddProductRedirect() {
  redirect("/dashboard/products/new");
}
