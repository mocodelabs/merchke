import { redirect } from "next/navigation";
export default function JerseysPage() {
  redirect("/store?category=jerseys-sportswear");
}
