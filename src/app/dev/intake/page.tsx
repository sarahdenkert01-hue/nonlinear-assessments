import { redirect } from "next/navigation";

export default function DevIntakeRedirect() {
  redirect("/dev/preview");
}
