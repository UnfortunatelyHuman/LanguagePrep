import { redirect } from "next/navigation";

// The dashboard always lives under a track, so "/" picks the English one.
export default function Home() {
  redirect("/en");
}
