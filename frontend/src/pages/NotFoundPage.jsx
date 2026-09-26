import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";

const NotFoundPage = () => (
  <main className="empty-page">
    <p className="empty-page__code">404</p>
    <h1>This page is not available</h1>
    <p>The address may be incorrect, or the page may have moved.</p>
    <Link to="/" className="btn btn-primary">
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Back to conversations
    </Link>
  </main>
);

export default NotFoundPage;

