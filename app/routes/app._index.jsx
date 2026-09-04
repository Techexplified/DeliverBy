import { redirect } from "react-router";

export function loader({ request }) {
    const url = new URL(request.url);
    return redirect(`/app/overview?${url.searchParams.toString()}`);
}