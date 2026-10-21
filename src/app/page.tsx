import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/utils/session";

/** 根路径：已登录进后台，未登录去登录页 */
export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? "/products" : "/login");
}
