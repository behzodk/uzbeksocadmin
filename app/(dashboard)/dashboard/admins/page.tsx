import { getAdmins } from "@/actions/admins"
import { AdminsClient } from "./admins-client"

export const metadata = {
    title: "Admins | Dashboard",
    description: "Manage administrators and their permissions",
}

export default async function AdminsPage() {
    const admins = await getAdmins()

    return <AdminsClient initialAdmins={admins} />
}
